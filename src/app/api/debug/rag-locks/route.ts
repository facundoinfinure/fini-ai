import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 🔒 RAG LOCKS DEBUG ENDPOINT
 * ===========================
 * 
 * Debug endpoint para gestionar locks globales de RAG:
 * - GET: Ver estado actual de todos los locks
 * - POST: Crear/modificar locks para testing
 * - DELETE: Limpiar locks específicos o todos
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG-RAG-LOCKS] 📊 Getting current lock status');

    const { getLockStatus } = await import('@/lib/rag/global-locks');
    const status = await getLockStatus();

    return NextResponse.json({
      success: true,
      locks: status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[DEBUG-RAG-LOCKS] Error getting lock status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG-RAG-LOCKS] 🔒 Managing locks');
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { action, storeId, reason } = body;

    if (!action || !storeId) {
      return NextResponse.json({
        success: false,
        error: 'action and storeId are required'
      }, { status: 400 });
    }

    const { lockStoreForDeletion, unlockStoreAfterDeletion, checkStoreDeletionLock } = await import('@/lib/rag/global-locks');

    let result: any = {};

    switch (action) {
      case 'lock':
        await lockStoreForDeletion(storeId, reason || 'Debug lock');
        result = { message: `Store ${storeId} locked successfully` };
        break;

      case 'unlock':
        await unlockStoreAfterDeletion(storeId);
        result = { message: `Store ${storeId} unlocked successfully` };
        break;

      case 'check':
        const lockInfo = await checkStoreDeletionLock(storeId);
        result = { lockInfo };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: lock, unlock, check'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      action,
      storeId,
      result
    });

  } catch (error) {
    console.error('[DEBUG-RAG-LOCKS] Error managing locks:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('[DEBUG-RAG-LOCKS] 🧹 Cleaning up locks');
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');
    const clearAll = searchParams.get('clearAll') === 'true';

    const { unlockStoreAfterDeletion, RAGLockTestUtils } = await import('@/lib/rag/global-locks');

    if (clearAll) {
      // Clear all locks (dangerous!)
      await RAGLockTestUtils.clearAllLocks();
      return NextResponse.json({
        success: true,
        message: 'All locks cleared'
      });
    } else if (storeId) {
      // Clear specific store lock
      await unlockStoreAfterDeletion(storeId);
      return NextResponse.json({
        success: true,
        message: `Lock cleared for store: ${storeId}`
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Specify storeId or clearAll=true'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[DEBUG-RAG-LOCKS] Error clearing locks:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 