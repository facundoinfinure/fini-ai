import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorAgent } from '@/lib/agents/orchestrator-agent';
import type { AgentContext } from '@/lib/agents/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;
    
    const testMessage = message || "que productos tengo cargados en mi tienda?";
    
    const orchestrator = new OrchestratorAgent();
    
    const context: AgentContext = {
      userId: 'test-user',
      storeId: 'test-store',
      conversationId: 'test-conv',
      userMessage: testMessage,
      metadata: {}
    };
    
    const decision = await orchestrator.routeMessage(context);
    
    return NextResponse.json({
      success: true,
      message: testMessage,
      decision,
      analysis: {
        scores: decision.routingRules,
        selectedAgent: decision.selectedAgent,
        confidence: decision.confidence,
        reasoning: decision.reasoning,
        willRoute: decision.confidence >= 0.4,
        willFallback: decision.confidence < 0.3
      }
    });
    
  } catch (error) {
    console.error('[DEBUG] Routing test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Test routing endpoint. Send POST with {"message": "your test message"}'
  });
} 