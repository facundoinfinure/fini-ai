import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
import { ConversationService, MessageService } from '@/lib/database/client';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';
import { conversationTitleService } from '@/lib/services/conversation-title-service';
import { segmentServerAnalytics } from '@/lib/analytics/index';
import type { AgentContext } from '@/lib/agents/types';

/**
 * 🔄 CHAT API: Bidirectional Dashboard ↔ WhatsApp Sync
 * Mensajes enviados desde dashboard llegan también por WhatsApp
 * Integra con namespaces específicos de cada cliente
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[CHAT-SYNC] Processing bidirectional chat message...');
    const startTime = Date.now();

    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('[CHAT-SYNC] Authentication failed:', authError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { message, storeId, conversationId, whatsappNumber, sendToWhatsApp = true } = body;

    // Validate required fields
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mensaje requerido' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID requerido' },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    console.log('[CHAT-SYNC] Message received:', { 
      userId: user.id, 
      storeId, 
      messageLength: trimmedMessage.length,
      conversationId: conversationId || 'new',
      whatsappNumber: whatsappNumber || 'none',
      sendToWhatsApp
    });

    // 3. Get or create unified conversation (dashboard + WhatsApp)
    let conversation;
    let finalConversationId = conversationId;
    let customerWhatsApp = whatsappNumber;

    if (conversationId) {
      // Get existing conversation
      const convResult = await ConversationService.getConversationsByUserId(user.id);
      if (convResult.success && convResult.conversations) {
        conversation = convResult.conversations.find(c => c.id === conversationId);
        customerWhatsApp = conversation?.customer_number;
      }
    }

    if (!conversation) {
      // Create new unified conversation (dashboard + WhatsApp)
      const newConvResult = await ConversationService.createConversation({
        user_id: user.id,
        store_id: storeId,
        whatsapp_number: process.env.TWILIO_PHONE_NUMBER || 'dashboard-sync',
        customer_number: customerWhatsApp || user.email || 'dashboard-user',
        conversation_id: `unified_${user.id}_${storeId}_${Date.now()}`,
        status: 'active',
        last_message_at: new Date().toISOString(),
        message_count: 1
      });

      if (newConvResult.success && newConvResult.conversation) {
        conversation = newConvResult.conversation;
        finalConversationId = conversation.id;
        customerWhatsApp = conversation.customer_number;
        console.log('[CHAT-SYNC] Created new unified conversation:', finalConversationId);
        
        // Track conversation started
        await segmentServerAnalytics.trackConversationStarted(user.id, {
          conversationId: finalConversationId,
          storeId,
          source: 'dashboard'
        });
      } else {
        console.error('[CHAT-SYNC] Failed to create conversation:', newConvResult.error);
        return NextResponse.json(
          { success: false, error: 'Error creando conversación' },
          { status: 500 }
        );
      }
    }

    // 4. Save user message to database
    const userMessageResult = await MessageService.createMessage({
      conversation_id: finalConversationId,
      direction: 'inbound',
      body: trimmedMessage,
      created_at: new Date().toISOString()
    });

    if (!userMessageResult.success) {
      console.error('[CHAT-SYNC] Failed to save user message:', userMessageResult.error);
    }

    // 5. Build agent context with store-specific namespace
    const agentContext: AgentContext = {
      userId: user.id,
      storeId,
      conversationId: finalConversationId,
      userMessage: trimmedMessage,
      metadata: {
        platform: 'dashboard',
        userEmail: user.email,
        timestamp: new Date().toISOString(),
        sessionType: 'unified_chat',
        whatsappNumber: customerWhatsApp,
        // 🎯 NAMESPACE ESPECÍFICO: Cada cliente tiene su propio contexto
        namespace: `store-${storeId}`,
        customerContext: {
          customerId: user.id,
          storeId: storeId,
          conversationId: finalConversationId
        }
      }
    };

    // 6. Process with multi-agent system using customer-specific namespace
    const agentSystem = new FiniMultiAgentSystem();
    let agentResponse;

    try {
      console.log('[CHAT-SYNC] Processing with multi-agent system...');
      console.log('[CHAT-SYNC] Using namespace:', agentContext.metadata.namespace);
      
      agentResponse = await agentSystem.processMessage(agentContext);
      console.log('[CHAT-SYNC] Agent response received:', {
        agentType: agentResponse.agentType,
        confidence: agentResponse.confidence,
        hasResponse: !!agentResponse.response,
        namespace: agentContext.metadata.namespace
      });
    } catch (agentError) {
      console.error('[CHAT-SYNC] Agent processing error:', agentError);
      agentResponse = {
        success: false,
        response: 'Lo siento, hay un problema técnico temporal. Por favor intenta nuevamente en unos momentos.',
        agentType: 'orchestrator',
        confidence: 0,
        reasoning: 'System error during processing',
        metadata: {
          error: agentError instanceof Error ? agentError.message : 'Unknown error',
          systemFailure: true,
          namespace: agentContext.metadata.namespace
        }
      };
    }

    // 7. Save agent response to database
    const processingTimeMs = Math.round(agentResponse.metadata?.systemExecutionTime || Date.now() - startTime);
    const botMessageResult = await MessageService.createMessage({
      conversation_id: finalConversationId,
      direction: 'outbound',
      body: agentResponse.response || 'Error procesando respuesta',
      agent_type: agentResponse.agentType as 'orchestrator' | 'analytics' | 'customer_service' | 'marketing',
      confidence: agentResponse.confidence,
      processing_time_ms: processingTimeMs,
      created_at: new Date().toISOString()
    });

    if (!botMessageResult.success) {
      console.error('[CHAT-SYNC] Failed to save bot message:', botMessageResult.error);
    }

    // Track chat message and AI agent usage
    await segmentServerAnalytics.trackChatMessage(user.id, {
      conversationId: finalConversationId,
      storeId,
      messageType: 'user',
      messageLength: trimmedMessage.length,
      query: trimmedMessage,
      success: true
    });

    await segmentServerAnalytics.trackAIAgentUsed(user.id, {
      agentType: agentResponse.agentType,
      query: trimmedMessage,
      responseTime: processingTimeMs,
      confidence: agentResponse.confidence || 0,
      success: agentResponse.success !== false,
      conversationId: finalConversationId
    });

    // 7.5. 🎯 AUTO-GENERATE TITLE: Generate conversation title after a few messages
    try {
      // Check if conversation needs a title (no title and has enough messages)
      if (!conversation?.title && finalConversationId) {
        const messagesResult = await MessageService.getMessagesByConversationId(finalConversationId);
        
        if (messagesResult.success && messagesResult.messages && messagesResult.messages.length >= 3) {
          console.log('[CHAT-SYNC] Auto-generating title for conversation with', messagesResult.messages.length, 'messages');
          
          // Generate title asynchronously (don't block response)
          conversationTitleService.generateTitle(messagesResult.messages)
            .then(async (generatedTitle) => {
              // Update conversation with generated title
              const supabaseForTitle = createClient();
              const { error: titleUpdateError } = await supabaseForTitle
                .from('conversations')
                .update({ 
                  title: generatedTitle,
                  updated_at: new Date().toISOString()
                })
                .eq('id', finalConversationId);
              
              if (titleUpdateError) {
                console.error('[CHAT-SYNC] Failed to update conversation title:', titleUpdateError.message);
              } else {
                console.log(`[CHAT-SYNC] ✅ Auto-generated title: "${generatedTitle}"`);
              }
            })
            .catch((titleError) => {
              console.error('[CHAT-SYNC] Error in async title generation:', titleError);
            });
        }
      }
    } catch (titleError) {
      console.error('[CHAT-SYNC] Title generation error (non-blocking):', titleError);
    }

    // 8. 🔄 BIDIRECTIONAL SYNC: Send response to WhatsApp if customer has WhatsApp number
    let whatsappSent = false;
    let whatsappError;

    if (sendToWhatsApp && customerWhatsApp && customerWhatsApp !== 'dashboard-user' && customerWhatsApp.includes('+')) {
      try {
        console.log('[CHAT-SYNC] Sending response to WhatsApp:', customerWhatsApp);
        
        const twilioService = createTwilioWhatsAppService();
        const whatsappResult = await twilioService.sendMessage({
          from: process.env.TWILIO_PHONE_NUMBER || 'whatsapp:+14155238886',
          to: customerWhatsApp,
          body: agentResponse.response || 'Respuesta desde dashboard'
        });

        if (whatsappResult.success) {
          whatsappSent = true;
          console.log('[CHAT-SYNC] ✅ Message successfully sent to WhatsApp:', whatsappResult.messageSid);
        } else {
          whatsappError = whatsappResult.error;
          console.warn('[CHAT-SYNC] ⚠️ Failed to send to WhatsApp:', whatsappError);
        }
      } catch (error) {
        whatsappError = error instanceof Error ? error.message : 'WhatsApp send error';
        console.error('[CHAT-SYNC] WhatsApp send error:', error);
      }
    }

    // 9. Return comprehensive response
    const processingTime = Date.now() - startTime;
    console.log(`[CHAT-SYNC] Message processed successfully in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      response: {
        message: agentResponse.response,
        agentType: agentResponse.agentType,
        confidence: agentResponse.confidence,
        conversationId: finalConversationId,
        timestamp: new Date().toISOString(),
        processingTime,
        namespace: agentContext.metadata.namespace
      },
      sync: {
        whatsappSent,
        whatsappError,
        customerWhatsApp,
        realTimeNotified: true
      },
      metadata: {
        messagesSaved: userMessageResult.success && botMessageResult.success,
        routing: agentResponse.metadata?.routingDecision,
        ragUsed: agentResponse.metadata?.ragUsed || false,
        unifiedConversation: true,
        customerNamespace: agentContext.metadata.namespace
      }
    });

  } catch (error) {
    console.error('[CHAT-SYNC] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor. Por favor intenta nuevamente.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 💬 GET: Conversation history with real-time updates
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[CHAT-SYNC] Getting unified conversation history...');

    // 1. Authenticate user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const storeId = searchParams.get('storeId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const since = searchParams.get('since'); // For polling updates

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'Store ID requerido' },
        { status: 400 }
      );
    }

    // 3. Get conversations for user
    const conversationsResult = await ConversationService.getConversationsByUserId(user.id);
    
    if (!conversationsResult.success) {
      console.error('[CHAT-SYNC] Failed to get conversations:', conversationsResult.error);
      return NextResponse.json(
        { success: false, error: 'Error obteniendo conversaciones' },
        { status: 500 }
      );
    }

    // Filter by storeId and conversationId if provided
    const conversations = conversationsResult.conversations?.filter(conv => {
      if (conv.store_id !== storeId) return false;
      if (conversationId && conv.id !== conversationId) return false;
      // Filter by timestamp if 'since' parameter provided (for polling)
      if (since && new Date(conv.last_message_at) <= new Date(since)) return false;
      return true;
    }) || [];

    // 4. Get messages for conversations
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const messagesResult = await MessageService.getMessagesByConversationId(conv.id);
        let messages = messagesResult.success ? messagesResult.messages || [] : [];
        
        // Filter messages by timestamp if polling
        if (since) {
          messages = messages.filter(msg => new Date(msg.created_at) > new Date(since));
        }
        
        return {
          ...conv,
          messages: messages.slice(-limit),
          namespace: `store-${conv.store_id}`
        };
      })
    );

    console.log('[CHAT-SYNC] Retrieved unified conversations:', {
      total: conversations.length,
      withMessages: conversationsWithMessages.length,
      pollingMode: !!since
    });

    return NextResponse.json({
      success: true,
      conversations: conversationsWithMessages,
      total: conversations.length,
      unified: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[CHAT-SYNC] Error getting conversation history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error obteniendo historial de conversaciones',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
