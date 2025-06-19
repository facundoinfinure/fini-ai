/**
 * WhatsApp Webhook API
 * Handles incoming WhatsApp messages from Twilio
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';
import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
import type { AgentContext } from '@/lib/agents/types';
import { WhatsAppConfigService, StoreService, ConversationService, MessageService } from '@/lib/database/client';

const twilioService = createTwilioWhatsAppService();
const agentSystem = new FiniMultiAgentSystem();

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    console.log('[WEBHOOK] Received WhatsApp webhook');
    // Get request body - Twilio sends form data, not JSON
    const formData = await request.formData();
    const body: any = {};
    formData.forEach((value, key) => {
      body[key] = value;
    });
    console.log('[WEBHOOK] WhatsApp message received:', JSON.stringify(body, null, 2));

    // Validate webhook signature (Twilio) - Skip in development
    const twilioSignature = request.headers.get('x-twilio-signature');
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!twilioSignature && !isDevelopment) {
      console.error('[WEBHOOK] Missing Twilio signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isDevelopment && !twilioSignature) {
      console.log('[WEBHOOK] Development mode: skipping signature validation');
    }

    // Process incoming WhatsApp message
    if (body.MessageSid && body.From && body.Body) {
      const messageData = {
        messageId: body.MessageSid,
        from: body.From,
        to: body.To,
        body: body.Body,
        timestamp: new Date(),
        mediaUrl: body.MediaUrl0 || null,
        mediaContentType: body.MediaContentType0 || null,
      };
      const phoneNumber = messageData.from.replace('whatsapp:', '');

      // 1. Lookup WhatsApp config and store by phone number
      const configRes = await WhatsAppConfigService.getConfigByUserId(phoneNumber);
      let userId: string | undefined = undefined;
      let storeId: string | undefined = undefined;
      let storeName = 'Tienda Nube';
      if (configRes.success && configRes.config) {
        userId = configRes.config.user_id;
        storeId = configRes.config.store_id || undefined;
        // Lookup store name
        if (storeId) {
          const storeRes = await StoreService.getStoresByUserId(userId);
          if (storeRes.success && storeRes.stores && storeRes.stores.length > 0) {
            const store = storeRes.stores.find(s => s.id === storeId);
            if (store) storeName = store.store_name;
          }
        }
      } else {
        // Fallback: no config found
        console.warn('[WEBHOOK] No WhatsApp config found for number:', phoneNumber);
      }

      // 2. Persist inbound message and conversation
      let conversationId = `conv_${phoneNumber}`;
      let conversation = null;
      if (userId) {
        // Try to find existing conversation
        const convRes = await ConversationService.getConversationByCustomerNumber(userId, phoneNumber);
        if (convRes.success && convRes.conversation) {
          conversation = convRes.conversation;
          conversationId = conversation.id;
        } else {
          // Create new conversation
          const newConvRes = await ConversationService.createConversation({
            user_id: userId,
            store_id: storeId,
            whatsapp_number: body.To.replace('whatsapp:', ''),
            customer_number: phoneNumber,
            conversation_id: conversationId,
            status: 'active',
            last_message_at: new Date().toISOString(),
            message_count: 1
          });
          if (newConvRes.success && newConvRes.conversation) {
            conversation = newConvRes.conversation;
            conversationId = conversation.id;
          }
        }
      }
      // Persist inbound message
      await MessageService.createMessage({
        conversation_id: conversationId,
        twilio_message_sid: messageData.messageId,
        direction: 'inbound',
        body: messageData.body,
        media_url: messageData.mediaUrl,
        created_at: new Date().toISOString()
      });

      // 3. Build agent context
      const agentContext: AgentContext = {
        userId: userId || 'demo-user-id',
        storeId: storeId || 'demo-store-id',
        conversationId: conversationId,
        userMessage: messageData.body,
        metadata: {
          phoneNumber: phoneNumber,
          storeName: storeName,
          platform: 'whatsapp',
          timestamp: messageData.timestamp
        }
      };

      // 4. Process message with multi-agent system
      let agentResponse;
      try {
        agentResponse = await agentSystem.processMessage(agentContext);
        console.log('[WEBHOOK] Agent response:', agentResponse);
      } catch (agentError) {
        console.error('[WEBHOOK] Agent processing error:', agentError);
        agentResponse = {
          success: false,
          response: 'Hay un problema técnico temporal. Nuestro equipo está trabajando para resolverlo. Por favor intenta más tarde.',
          agentType: 'orchestrator',
          confidence: 0,
          reasoning: 'System error',
          metadata: {},
          error: agentError instanceof Error ? agentError.message : 'Unknown error'
        };
      }

      // 5. Persist outbound message
      await MessageService.createMessage({
        conversation_id: conversationId,
        direction: 'outbound',
        body: agentResponse.response,
        agent_type: (agentResponse.agentType as 'orchestrator' | 'analytics' | 'customer_service' | 'marketing' | undefined),
        confidence: agentResponse.confidence,
        processing_time_ms: agentResponse.metadata && 'systemExecutionTime' in agentResponse.metadata ? agentResponse.metadata.systemExecutionTime : undefined,
        created_at: new Date().toISOString()
      });

      // 6. Send response back via WhatsApp
      await twilioService.sendMessage({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        body: agentResponse.response || 'Lo siento, no pude procesar tu mensaje en este momento. Por favor intenta nuevamente.'
      });
      console.log('[WEBHOOK] Response sent successfully');
    }

    const processingTime = Date.now() - startTime;
    console.log(`[WEBHOOK] Message processed in ${processingTime}ms:`, {
      success: true,
      message: 'Message processed'
    });
    return NextResponse.json({
      status: 'success',
      message: 'Message processed',
      processingTime
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('[ERROR] Webhook processing failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');
    console.log('[WEBHOOK] WhatsApp webhook verification attempt');
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('[WEBHOOK] WhatsApp webhook verified successfully');
      return new NextResponse(challenge, { status: 200 });
    }
    console.error('[WEBHOOK] WhatsApp webhook verification failed');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error) {
    console.error('[WEBHOOK] WhatsApp verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 