import { NextRequest, NextResponse } from 'next/server';
import { FiniRAGEngine } from '@/lib/rag';
import type { AgentContext } from '@/lib/agents/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a', userId = 'debug-user' } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('[DEBUG-RAG-CONTEXT] Testing RAG context retrieval...');
    console.log('[DEBUG-RAG-CONTEXT] Message:', message);
    console.log('[DEBUG-RAG-CONTEXT] Store ID:', storeId);

    // Create test context
    const context: AgentContext = {
      userId,
      storeId,
      conversationId: 'debug-conversation',
      userMessage: message,
      metadata: {
        platform: 'debug',
        timestamp: new Date().toISOString(),
        namespace: `store-${storeId}`,
        sessionType: 'debug'
      }
    };

    // Test RAG context retrieval
    const ragEngine = new FiniRAGEngine();
    const startTime = Date.now();
    
    try {
      console.log('[DEBUG-RAG-CONTEXT] Getting relevant context...');
      const ragContext = await ragEngine.getRelevantContext(message, context);
      const processingTime = Date.now() - startTime;
      
      console.log('[DEBUG-RAG-CONTEXT] Context retrieved:', {
        hasContext: !!ragContext,
        contextLength: ragContext?.length || 0,
        processingTime
      });

      return NextResponse.json({
        success: true,
        debug: {
          originalMessage: message,
          processingTime,
          context: {
            storeId,
            userId,
            namespace: context.metadata.namespace
          }
        },
        ragContext: {
          hasContext: !!ragContext,
          contextLength: ragContext?.length || 0,
          content: ragContext || null,
          isEmpty: !ragContext || ragContext.length === 0,
          containsProductData: ragContext ? ragContext.includes('price') || ragContext.includes('producto') : false
        }
      });
    } catch (ragError) {
      console.error('[DEBUG-RAG-CONTEXT] RAG error:', ragError);
      return NextResponse.json({
        success: false,
        error: 'RAG system error',
        debug: {
          originalMessage: message,
          processingTime: Date.now() - startTime,
          ragError: ragError instanceof Error ? ragError.message : String(ragError)
        }
      });
    }

  } catch (error) {
    console.error('[DEBUG-RAG-CONTEXT] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Unexpected error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug RAG context endpoint is ready',
    usage: {
      endpoint: '/api/debug/rag-context-test',
      method: 'POST',
      body: {
        message: 'Your test message',
        storeId: 'Optional store ID',
        userId: 'Optional user ID'
      }
    }
  });
} 