import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[FORCE-UNLOCK] 🔓 Emergency store unlock initiated...');
    
    const body = await request.json().catch(() => ({}));
    const storeId = body.storeId || 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    console.log(`[FORCE-UNLOCK] 🏪 Force unlocking store: ${storeId}`);
    
    // Import lock management functions directly
    const { 
      releaseEnhancedRAGLock, 
      getEnhancedLockStatus 
    } = await import('@/lib/rag/enhanced-global-locks');
    
    const unlockResults = [];
    
    // Check current lock status
    const currentStatus = getEnhancedLockStatus(storeId);
    console.log(`[FORCE-UNLOCK] 📊 Current locks: ${currentStatus.activeLocks.length}`);
    
    // Try to release each active lock
    for (const activeLock of currentStatus.activeLocks) {
      try {
        const releaseResult = await releaseEnhancedRAGLock(storeId, activeLock.processId, {
          cascadeRelease: true
        });
        
        unlockResults.push({
          lockType: activeLock.operation,
          lockKey: `${storeId}:${activeLock.processId}`,
          released: releaseResult.success,
          status: releaseResult.success ? 'SUCCESS' : 'FAILED'
        });
        
        console.log(`[FORCE-UNLOCK] 🔓 ${activeLock.operation}: ${releaseResult.success ? 'RELEASED' : 'FAILED'}`);
      } catch (error) {
        unlockResults.push({
          lockType: activeLock.operation,
          lockKey: `${storeId}:${activeLock.processId}`,
          released: false,
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.error(`[FORCE-UNLOCK] ❌ Failed to release ${activeLock.operation}:`, error);
      }
    }
    
    // Clear any operation locks from database
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = createServiceClient();
      
      const { error: clearError } = await supabase
        .from('operations')
        .delete()
        .eq('store_id', storeId)
        .in('status', ['running', 'pending']);
        
      if (clearError) {
        console.warn('[FORCE-UNLOCK] ⚠️ Failed to clear operation locks:', clearError);
      } else {
        console.log('[FORCE-UNLOCK] ✅ Cleared operation locks from database');
      }
      
    } catch (error) {
      console.warn('[FORCE-UNLOCK] ⚠️ Failed to clear database locks:', error);
    }
    
    console.log(`[FORCE-UNLOCK] 🎉 Emergency unlock completed for store: ${storeId}`);
    
    return NextResponse.json({
      success: true,
      message: `Store ${storeId} has been force unlocked`,
      storeId,
      unlockResults,
      clearedLocks: currentStatus.activeLocks.length,
      timestamp: new Date().toISOString(),
      nextSteps: [
        'Wait 30 seconds for locks to fully clear',
        'Retry store reconnection in the app',
        'All 6 namespaces should now be created successfully'
      ]
    });
    
  } catch (error) {
    console.error('[FORCE-UNLOCK] ❌ Emergency unlock failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Emergency store unlock endpoint',
    usage: 'POST /api/debug/force-unlock-store',
    body: { storeId: 'optional-store-id' },
    description: 'Force releases all locks for a store to resolve timeout issues during reconnection'
  });
} 