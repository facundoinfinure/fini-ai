import { NextRequest, NextResponse } from 'next/server';
import { OrchestratorAgent } from '@/lib/agents/orchestrator-agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;
    
    const testMessage = message || "que productos tengo cargados en mi tienda?";
    
    const orchestrator = new OrchestratorAgent();
    
    console.log('[DEBUG] Testing intelligent routing for:', testMessage);
    
    try {
      // Test OpenAI routing directly
      const intelligentResult = await (orchestrator as any).analyzeIntentWithOpenAI(testMessage);
      
      return NextResponse.json({
        success: true,
        message: testMessage,
        intelligentRouting: {
          result: intelligentResult,
          type: 'openai_analysis'
        },
        openaiAvailable: !!process.env.OPENAI_API_KEY
      });
      
    } catch (openaiError) {
      console.error('[DEBUG] OpenAI routing failed:', openaiError);
      
      // Fallback to keyword routing
      const keywordResult = await (orchestrator as any).keywordBasedRouting(testMessage);
      
      return NextResponse.json({
        success: false,
        message: testMessage,
        intelligentRouting: {
          error: openaiError instanceof Error ? openaiError.message : 'Unknown error',
          fallback: keywordResult,
          type: 'keyword_fallback'
        },
        openaiAvailable: !!process.env.OPENAI_API_KEY
      });
    }
    
  } catch (error) {
    console.error('[DEBUG] Test intelligent routing error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      openaiAvailable: !!process.env.OPENAI_API_KEY
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: 'Test intelligent routing endpoint. Send POST with {"message": "your test message"}',
    openaiConfigured: !!process.env.OPENAI_API_KEY
  });
} 