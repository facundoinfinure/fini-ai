import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a' } = body;

    console.log('[DEBUG-SYNC] Triggering RAG sync for store:', storeId);

    // Trigger the existing RAG sync endpoint
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';

    const syncResponse = await fetch(`${baseUrl}/api/stores/${storeId}/sync-rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` // Use service role for internal calls
      },
      body: JSON.stringify({})
    });

    const syncResult = await syncResponse.json();

    console.log('[DEBUG-SYNC] Sync response:', {
      status: syncResponse.status,
      success: syncResult.success,
      error: syncResult.error
    });

    // Test RAG context after sync
    const testResponse = await fetch(`${baseUrl}/api/debug/rag-context-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'que producto es el mas caro',
        storeId
      })
    });

    const testResult = await testResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Store sync triggered',
      data: {
        storeId,
        syncResult: {
          status: syncResponse.status,
          success: syncResult.success,
          error: syncResult.error,
          details: syncResult.details || syncResult.message
        },
        ragTest: {
          hasContext: testResult.ragContext?.hasContext || false,
          contextLength: testResult.ragContext?.contextLength || 0,
          containsProductData: testResult.ragContext?.containsProductData || false,
          content: testResult.ragContext?.content || null
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[DEBUG-SYNC] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug sync store data endpoint is ready',
    usage: {
      endpoint: '/api/debug/sync-store-data',
      method: 'POST',
      body: {
        storeId: 'Optional store ID (defaults to test store)'
      }
    }
  });
} 