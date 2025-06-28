import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

/**
 * Force RAG data sync for a specific store
 * POST /api/stores/[id]/sync-rag
 * 🔄 Fixed deployment import issue
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const storeId = params.id;

    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    // Get user from session
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify store ownership
    const storeResult = await StoreService.getStore(storeId);
    if (!storeResult.success || !storeResult.store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    if (storeResult.store.user_id !== user.id) {
      return NextResponse.json({
        success: false,
        error: 'Access denied to this store'
      }, { status: 403 });
    }

    // Check if store has access token
    if (!storeResult.store.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Store missing access token - cannot sync data'
      }, { status: 400 });
    }

    console.log(`[INFO] Manual RAG sync triggered for store: ${storeId} by user: ${user.id}`);

    // Trigger async sync (fire-and-forget)
    StoreService.syncStoreDataToRAGAsync(storeId);

    return NextResponse.json({
      success: true,
      message: 'RAG data sync started for store',
      data: {
        storeId,
        storeName: storeResult.store.name,
        syncTriggeredAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Manual RAG sync failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 