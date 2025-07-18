/**
 * Public WhatsApp Webhook API - NO AUTH REQUIRED
 * This endpoint is specifically designed to be accessible without authentication
 * for Twilio WhatsApp webhooks
 */

import { NextRequest, NextResponse } from 'next/server';

import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
import type { AgentContext } from '@/lib/agents/types';
import { StoreService, ConversationService, MessageService } from '@/lib/database/client';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';

const _twilioService = createTwilioWhatsAppService();
const _agentSystem = new FiniMultiAgentSystem();

export async function POST(request: NextRequest) {
  const _startTime = Date.now();
  
  // Log all headers for debugging
  console.log('[PUBLIC-WEBHOOK] Headers:', Object.fromEntries(request.headers.entries()));
  
  try {
    console.log('[PUBLIC-WEBHOOK] Received WhatsApp webhook');
    
    // Get request body - Twilio sends form data, not JSON
    const _formData = await request.formData();
    const body: any = {};
    _formData.forEach((value, key) => {
      body[key] = value;
    });
    
    console.log('[PUBLIC-WEBHOOK] WhatsApp message received:', JSON.stringify(body, null, 2));

    // Validate webhook signature (Twilio) - Skip in development
    const _twilioSignature = request.headers.get('x-twilio-signature');
    const _isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!_twilioSignature && !_isDevelopment) {
      console.error('[PUBLIC-WEBHOOK] Missing Twilio signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (_isDevelopment && !_twilioSignature) {
      console.log('[PUBLIC-WEBHOOK] Development mode: skipping signature validation');
    }

    // Process incoming WhatsApp message
    if (body.MessageSid && body.From && body.Body) {
      const _messageData = {
        messageId: body.MessageSid,
        from: body.From,
        to: body.To,
        body: body.Body,
        timestamp: new Date(),
        mediaUrl: body.MediaUrl0 || null,
        mediaContentType: body.MediaContentType0 || null,
      };
      
      const _phoneNumber = _messageData.from.replace('whatsapp:', '');

      // 1. Lookup WhatsApp config and store by phone number
      const _configRes = await StoreService.getStoresByUserId(_phoneNumber);
      let userId: string | undefined = undefined;
      let storeId: string | undefined = undefined;
      let storeName = 'Tienda Nube';
      
      if (_configRes.success && _configRes.stores && _configRes.stores.length > 0) {
        const _store = _configRes.stores.find(s => s.id === _phoneNumber);
        if (_store) {
          userId = _store.user_id;
          storeId = _store.id;
          storeName = _store.name;
        }
      } else {
        // Fallback: no config found
        console.log('[PUBLIC-WEBHOOK] No WhatsApp config found for number:', _phoneNumber);
      }

      // 2. Persist inbound message and conversation
      let conversationId = `conv_${_phoneNumber}`;
      let conversation = null;
      
      if (userId) {
        // Try to find existing conversation
        const _convRes = await ConversationService.getConversationByCustomerNumber(userId, _phoneNumber);
        if (_convRes.success && _convRes.conversation) {
          conversation = _convRes.conversation;
          conversationId = conversation.id;
        } else {
          // Create new conversation
          const _newConvRes = await ConversationService.createConversation({
            user_id: userId,
            store_id: storeId,
            whatsapp_number: body.To.replace('whatsapp:', ''),
            customer_number: _phoneNumber,
            conversation_id: conversationId,
            status: 'active',
            last_message_at: new Date().toISOString(),
            message_count: 1
          });
          
          if (_newConvRes.success && _newConvRes.conversation) {
            conversation = _newConvRes.conversation;
            conversationId = conversation.id;
          }
        }
      }
      
      // Persist inbound message
      await MessageService.createMessage({
        conversation_id: conversationId,
        twilio_message_sid: _messageData.messageId,
        direction: 'inbound',
        body: _messageData.body,
        media_url: _messageData.mediaUrl,
        created_at: new Date().toISOString()
      });

      // 3. Build agent context
      const agentContext: AgentContext = {
        userId: userId || 'demo-user-id',
        storeId: storeId || 'demo-store-id',
        conversationId,
        userMessage: _messageData.body,
        metadata: {
          phoneNumber: _phoneNumber,
          storeName,
          platform: 'whatsapp',
          timestamp: _messageData.timestamp
        }
      };

      // 4. Process message with multi-agent system
      let agentResponse;
      try {
        agentResponse = await _agentSystem.processMessage(agentContext);
        console.log('[PUBLIC-WEBHOOK] Agent response:', agentResponse);
      } catch (agentError) {
        console.error('[PUBLIC-WEBHOOK] Agent processing error:', agentError);
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
      const _sendResult = await _twilioService.sendMessage({
        to: _phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        body: agentResponse.response || 'Lo siento, no pude procesar tu mensaje en este momento. Por favor intenta nuevamente.'
      });
      
      console.log('[PUBLIC-WEBHOOK] Response sent:', _sendResult);
    }

    const _processingTime = Date.now() - _startTime;
    console.log(`[PUBLIC-WEBHOOK] Message processed in ${_processingTime}ms`);
    
    return NextResponse.json({
      status: 'success',
      message: 'Message processed',
      processingTime: _processingTime
    });
    
  } catch (error) {
    const _processingTime = Date.now() - _startTime;
    console.error('[ERROR] Public webhook processing failed:', error);
    
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: _processingTime
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification (if needed)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const _mode = searchParams.get('hub.mode');
    const _token = searchParams.get('hub.verify_token');
    const _challenge = searchParams.get('hub.challenge');
    
    console.log('[PUBLIC-WEBHOOK] WhatsApp webhook verification attempt');
    
    if (_mode === 'subscribe' && _token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('[PUBLIC-WEBHOOK] WhatsApp webhook verified successfully');
      return new NextResponse(_challenge, { status: 200 });
    }
    
    console.error('[PUBLIC-WEBHOOK] WhatsApp webhook verification failed');
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    
  } catch (error) {
    console.error('[PUBLIC-WEBHOOK] WhatsApp verification error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 