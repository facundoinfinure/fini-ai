/**
 * 🚀 Real-time Streaming Chat API
 * Endpoint for streaming responses using enhanced RAG system
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a TransformStream for streaming
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Function to send streaming data
  const sendStreamData = async (data: any) => {
    const chunk = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
    await writer.write(chunk);
  };

  // Start processing in the background
  (async () => {
    try {
      const body = await request.json();
      const { query, conversationId, storeId, agentType = 'general' } = body;

      // Validate authentication
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        await sendStreamData({ 
          type: 'error', 
          content: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
        await writer.close();
        return;
      }

      // Validate store access
      const { data: store } = await supabase
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .eq('user_id', user.id)
        .single();

      if (!store) {
        await sendStreamData({ 
          type: 'error', 
          content: 'Store not found or access denied',
          code: 'STORE_ACCESS_DENIED'
        });
        await writer.close();
        return;
      }

      // Initialize streaming RAG
      const { streamingRAGEngine } = await import('@/lib/rag/streaming-rag');
      
      // Create streaming query
      const streamingQuery = {
        query,
        context: {
          storeId,
          userId: user.id,
          agentType: agentType as any,
          conversationId,
        },
        options: {
          temperature: 0.3,
          maxTokens: 1000,
          topK: 6,
        },
      };

      // Stream the response
      for await (const chunk of streamingRAGEngine.streamSearch(streamingQuery)) {
        await sendStreamData({
          type: chunk.type,
          content: chunk.content,
          metadata: chunk.metadata,
          timestamp: new Date().toISOString(),
        });

        // Small delay for better streaming experience
        if (chunk.type === 'token') {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Send completion signal
      await sendStreamData({ 
        type: 'stream_complete',
        content: 'Stream completed successfully',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('[STREAMING-API] Error:', error);
      
      await sendStreamData({ 
        type: 'error', 
        content: 'Internal server error during streaming',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      await writer.close();
    }
  })();

  // Return streaming response
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Streaming chat endpoint is ready',
    features: [
      'Real-time streaming',
      'Enhanced RAG integration', 
      'Agent-specific responses',
      'Conversation memory',
      'Performance monitoring'
    ],
    usage: {
      method: 'POST',
      contentType: 'application/json',
      requiredFields: ['query', 'conversationId', 'storeId'],
      optionalFields: ['agentType'],
    }
  });
} 