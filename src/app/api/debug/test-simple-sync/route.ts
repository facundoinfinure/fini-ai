import { NextRequest, NextResponse } from 'next/server';
import { syncStoreNow } from '@/lib/services/simple-store-sync';

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-SIMPLE-SYNC] 🧪 Testing new simple sync system');
    
    const body = await request.json().catch(() => ({}));
    const storeId = body.storeId || 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a'; // Default store for testing
    
    console.log(`[TEST-SIMPLE-SYNC] 🚀 Testing sync for store: ${storeId}`);
    
    // Test the new sync system
    const result = await syncStoreNow(storeId, (progress) => {
      console.log(`[TEST-SIMPLE-SYNC] 📊 ${progress.progress}% - ${progress.message}`);
    });
    
    if (result.success) {
      console.log(`[TEST-SIMPLE-SYNC] ✅ Test completed successfully:`, result.stats);
      
      return NextResponse.json({
        success: true,
        message: 'Nueva sincronización funcionando correctamente',
        testResults: {
          storeId,
          syncDuration: 'real-time',
          dataSync: result.stats,
          systemUsed: 'SimpleStoreSync',
          timestamp: new Date().toISOString()
        },
        recommendation: 'El nuevo sistema está listo para usar en producción'
      });
    } else {
      console.error(`[TEST-SIMPLE-SYNC] ❌ Test failed:`, result.error);
      
      return NextResponse.json({
        success: false,
        error: result.error,
        testResults: {
          storeId,
          systemUsed: 'SimpleStoreSync',
          timestamp: new Date().toISOString(),
          failureReason: result.error
        },
        recommendation: 'Revisar configuración de tokens y Pinecone'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[TEST-SIMPLE-SYNC] ❌ Test crashed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Test crashed',
      details: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Revisar logs para debugging'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test Simple Sync System',
    usage: 'POST /api/debug/test-simple-sync',
    body: { storeId: 'optional-store-id' },
    description: 'Prueba el nuevo sistema de sincronización simple y directo'
  });
} 