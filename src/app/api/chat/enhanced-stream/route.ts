import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Enhanced Chat Streaming with LangChain RAG
 * Real-time streaming responses using the enhanced RAG system
 */
export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, storeId } = await request.json();

    if (!message || !conversationId || !storeId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: message, conversationId, storeId'
      }, { status: 400 });
    }

    // Validate user authentication
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    console.log(`[ENHANCED-STREAM] Starting for: "${message}"`);

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Import enhanced RAG engine
          const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
    const ragEngine = getUnifiedRAGEngine();

          // Prepare RAG query
          const ragQuery = {
            query: message,
            context: {
              storeId,
              userId: user.id,
              agentType: 'product_manager' as any,
              conversationId,
            },
          };

          let fullResponse = '';

          // Send initial status
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'status',
            message: 'Procesando con LangChain...'
          })}\n\n`));

          // Get response (for now non-streaming until we fix the async generator)
                      const result = await ragEngine.search(ragQuery);
          
          // Simulate streaming by sending chunks
          const words = result.answer.split(' ');
          for (let i = 0; i < words.length; i += 3) {
            const chunk = words.slice(i, i + 3).join(' ') + ' ';
            fullResponse += chunk;
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'chunk',
              content: chunk
            })}\n\n`));
            
            // Small delay to simulate streaming
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Send completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            metadata: {
              confidence: result.confidence,
              sourcesCount: result.sources.length,
              langchainUsed: true,
            }
          })}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('[ENHANCED-STREAM] Error:', error);
          
          const errorMessage = 'Error al procesar con LangChain';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'chunk',
            content: errorMessage
          })}\n\n`));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[ENHANCED-STREAM] Request failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 