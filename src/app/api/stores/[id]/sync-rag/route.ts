import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

/**
 * Force RAG data sync for a specific store
 * POST /api/stores/[id]/sync-rag
 * 🔄 Fixed deployment import issue + Added internal auth support
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

    // Check if this is an internal call (service role key)
    const authHeader = request.headers.get('Authorization');
    const isInternalCall = authHeader && authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

    let userId: string | null = null;

    if (isInternalCall) {
      // Internal call - skip user auth but validate service role
      console.log(`[INFO] Internal RAG sync call for store: ${storeId}`);
      
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid service role key'
        }, { status: 401 });
      }
    } else {
      // Regular user call - validate user authentication
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required'
        }, { status: 401 });
      }

      userId = user.id;
    }

    // Get store info using service role (works for both internal and user calls)
    const supabase = createClient();
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found'
      }, { status: 404 });
    }

    // For user calls, verify ownership
    if (!isInternalCall && userId && store.user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Access denied to this store'
      }, { status: 403 });
    }

    // Check if store has access token
    if (!store.access_token) {
      return NextResponse.json({
        success: false,
        error: 'Store missing access token - cannot sync data'
      }, { status: 400 });
    }

    console.log(`[INFO] ${isInternalCall ? 'Internal' : 'User'} RAG sync triggered for store: ${storeId} (${store.name})`);

    // Trigger async sync (fire-and-forget)
    StoreService.syncStoreDataToRAGAsync(storeId);

    return NextResponse.json({
      success: true,
      message: 'RAG data sync started for store',
      data: {
        storeId,
        storeName: store.name,
        syncTriggeredAt: new Date().toISOString(),
        callType: isInternalCall ? 'internal' : 'user'
      }
    });

  } catch (error) {
    console.error('[ERROR] RAG sync failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 