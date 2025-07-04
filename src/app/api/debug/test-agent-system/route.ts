import { NextRequest, NextResponse } from 'next/server';
import { FiniMultiAgentSystem } from '@/lib/agents/multi-agent-system';
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

    console.log('[DEBUG-AGENT] Testing multi-agent system...');
    console.log('[DEBUG-AGENT] Message:', message);
    console.log('[DEBUG-AGENT] Store ID:', storeId);

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

    // Test the multi-agent system
    const agentSystem = new FiniMultiAgentSystem();
    const startTime = Date.now();
    
    try {
      const response = await agentSystem.processMessage(context);
      const processingTime = Date.now() - startTime;
      
      console.log('[DEBUG-AGENT] Response received:', {
        success: response.success,
        agentType: response.agentType,
        confidence: response.confidence,
        hasResponse: !!response.response,
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
        response: {
          success: response.success,
          message: response.response,
          agentType: response.agentType,
          confidence: response.confidence,
          reasoning: response.reasoning,
          metadata: response.metadata
        }
      });
    } catch (agentError) {
      console.error('[DEBUG-AGENT] Agent system error:', agentError);
      return NextResponse.json({
        success: false,
        error: 'Agent system error',
        debug: {
          originalMessage: message,
          processingTime: Date.now() - startTime,
          agentError: agentError instanceof Error ? agentError.message : String(agentError)
        }
      });
    }

  } catch (error) {
    console.error('[DEBUG-AGENT] Unexpected error:', error);
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
    message: 'Debug agent system endpoint is ready',
    usage: {
      endpoint: '/api/debug/test-agent-system',
      method: 'POST',
      body: {
        message: 'Your test message',
        storeId: 'Optional store ID',
        userId: 'Optional user ID'
      }
    }
  });
} 