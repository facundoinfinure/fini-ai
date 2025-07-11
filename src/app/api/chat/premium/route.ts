import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { premiumRAG } from '@/lib/rag/premium-rag-engine';
import { MessageService } from '@/lib/database/client';

// Force dynamic rendering to prevent static build errors
export const dynamic = 'force-dynamic';

/**
 * Premium Chat Endpoint - ChatGPT-like experience with enhanced RAG
 * POST /api/chat/premium
 */
export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, storeId, streaming = false } = await request.json();

    console.log(`[PREMIUM-CHAT] New message: "${message}" for store: ${storeId}`);

    // Validate input
    if (!message || !conversationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message and conversation ID are required' 
      }, { status: 400 });
    }

    // Get user and validate access
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    // Use provided storeId or get first store
    let targetStoreId = storeId;
    if (!targetStoreId) {
      const { data: stores } = await supabase
        .from('stores')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);
      
      if (stores && stores.length > 0) {
        targetStoreId = stores[0].id;
      } else {
        // No store available - still provide helpful response
        targetStoreId = 'no-store';
      }
    }

    const startTime = Date.now();

    // Use premium RAG engine
    const ragResponse = await premiumRAG.chat(
      message,
      targetStoreId,
      conversationId,
      {
        config: {
          k: 8,
          scoreThreshold: 0.25, // Lower threshold for better recall
          useHybridSearch: true,
          rerankResults: true,
        },
        streaming,
      }
    );

    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Save message to database (if user has store)
    if (targetStoreId !== 'no-store') {
      try {
        await MessageService.createMessage({
          conversation_id: conversationId,
          body: message,
          direction: 'inbound',
          processing_time_ms: Math.round(processingTime),
          confidence: ragResponse.confidence,
          reasoning: ragResponse.reasoning,
        });

        await MessageService.createMessage({
          conversation_id: conversationId,
          body: ragResponse.answer,
          direction: 'outbound',
          processing_time_ms: Math.round(processingTime),
          confidence: ragResponse.confidence,
          reasoning: ragResponse.reasoning,
        });
      } catch (dbError) {
        console.warn('[PREMIUM-CHAT] Failed to save to database:', dbError);
        // Continue anyway - don't let DB errors break the chat
      }
    }

    // Format response
    const response = {
      success: true,
      data: {
        message: ragResponse.answer,
        confidence: ragResponse.confidence,
        reasoning: ragResponse.reasoning,
        sources: ragResponse.sources.map(doc => ({
          content: doc.pageContent?.substring(0, 200) + '...',
          metadata: doc.metadata,
        })),
        conversationId: ragResponse.conversationId,
        processingTime,
        premium: true,
      },
    };

    console.log(`[PREMIUM-CHAT] Response generated in ${processingTime}ms with confidence: ${ragResponse.confidence}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[PREMIUM-CHAT] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: 'Disculpa, hubo un problema técnico. Por favor intenta de nuevo.',
      premium: true,
    }, { status: 500 });
  }
}

/**
 * Streaming version for real-time responses
 * Uses Server-Sent Events for ChatGPT-like streaming
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const message = url.searchParams.get('message');
  const conversationId = url.searchParams.get('conversationId');
  const storeId = url.searchParams.get('storeId');

  if (!message || !conversationId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  console.log(`[PREMIUM-CHAT-STREAM] Starting real streaming for: "${message}"`);

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
  });

  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Authentication
        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          sendEvent('error', { error: 'Authentication required' });
          controller.close();
          return;
        }

        // Get store
        let targetStoreId = storeId;
        if (!targetStoreId) {
          const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
          
          targetStoreId = stores?.[0]?.id || 'no-store';
        }

        // Send initial event
        sendEvent('start', { 
          message: 'Iniciando análisis con RAG premium...',
          conversationId,
          storeId: targetStoreId 
        });

        const startTime = Date.now();

        // Use premium RAG streaming
        const ragResponse = await premiumRAG.chatStream(
          message,
          targetStoreId,
          conversationId,
          (token: string) => {
            // Send each token as it's generated
            sendEvent('token', { 
              token,
              timestamp: Date.now() 
            });
          },
          {
            config: {
              k: 8,
              scoreThreshold: 0.25,
              useHybridSearch: true,
              rerankResults: true,
            },
          }
        );

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Save to database if user has store
        if (targetStoreId !== 'no-store') {
          try {
            await MessageService.createMessage({
              conversation_id: conversationId,
              body: message,
              direction: 'inbound',
              processing_time_ms: Math.round(processingTime),
              confidence: ragResponse.confidence,
              reasoning: ragResponse.reasoning,
            });

            await MessageService.createMessage({
              conversation_id: conversationId,
              body: ragResponse.answer,
              direction: 'outbound',
              processing_time_ms: Math.round(processingTime),
              confidence: ragResponse.confidence,
              reasoning: ragResponse.reasoning,
            });
          } catch (dbError) {
            console.warn('[PREMIUM-CHAT-STREAM] Failed to save to database:', dbError);
          }
        }

        // Send completion event with metadata
        sendEvent('complete', {
          confidence: ragResponse.confidence,
          reasoning: ragResponse.reasoning,
          sources: ragResponse.sources.map(doc => ({
            content: doc.pageContent?.substring(0, 200) + '...',
            metadata: doc.metadata,
          })),
          processingTime,
          conversationId: ragResponse.conversationId,
          totalTokens: ragResponse.answer.length,
        });

        console.log(`[PREMIUM-CHAT-STREAM] Streaming completed in ${processingTime}ms`);
        controller.close();

      } catch (error) {
        console.error('[PREMIUM-CHAT-STREAM] Error:', error);
        sendEvent('error', { 
          error: 'Error interno del servidor',
          message: 'Disculpa, hubo un problema técnico. Por favor intenta de nuevo.' 
        });
        controller.close();
      }
    },

    cancel() {
      console.log('[PREMIUM-CHAT-STREAM] Stream cancelled by client');
    }
  });

  return new Response(stream, { headers });
} 