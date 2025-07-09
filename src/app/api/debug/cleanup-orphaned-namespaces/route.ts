import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 🧹 CLEANUP ORPHANED PINECONE NAMESPACES
 * ======================================= 
 * 
 * Manual cleanup script to remove orphaned namespaces when stores are disconnected
 * but Pinecone vectors weren't cleaned up properly.
 * 
 * USE CASE: After disconnecting store ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a,
 * Pinecone still shows 2 namespaces that should be deleted.
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CLEANUP] 🧹 Starting orphaned namespace cleanup');

    const supabase = createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { storeId, action = 'cleanup' } = body;

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId is required' },
        { status: 400 }
      );
    }

    console.log(`[CLEANUP] Processing ${action} for store: ${storeId}`);

    // Verify the store actually doesn't exist or is inactive
    const { data: store } = await supabase
      .from('stores')
      .select('id, user_id, name, is_active')
      .eq('id', storeId)
      .single();

    if (store && store.is_active) {
      return NextResponse.json(
        { success: false, error: 'Cannot cleanup active store. Deactivate first.' },
        { status: 400 }
      );
    }

    // Dynamic import RAG engine
    const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
    const ragEngine = getUnifiedRAGEngine();

    let result;
    const operations: string[] = [];

    if (action === 'cleanup' || action === 'delete') {
      // Delete all namespaces for the store
      console.log(`[CLEANUP] 🗑️ Deleting all namespaces for store: ${storeId}`);
      
      result = await ragEngine.deleteStoreNamespaces(storeId);
      operations.push('namespaces_deleted');

      if (!result.success) {
        console.error(`[CLEANUP] ❌ Namespace deletion failed: ${result.error}`);
        return NextResponse.json({
          success: false,
          error: 'Namespace deletion failed',
          details: result.error,
          storeId,
          operations
        }, { status: 500 });
      }

      operations.push('vectors_cleared');
    }

    // Also check for and cleanup any remaining database references
    if (action === 'cleanup' || action === 'deep_cleanup') {
      console.log(`[CLEANUP] 🧹 Cleaning up database references`);

      // Clean up related data that might still exist
      await supabase.from('analytics_cache').delete().eq('store_id', storeId);
      operations.push('analytics_cache_cleaned');

      await supabase.from('conversations').delete().eq('store_id', storeId);
      operations.push('conversations_cleaned');

      await supabase.from('whatsapp_store_connections').delete().eq('store_id', storeId);
      operations.push('whatsapp_connections_cleaned');

      await supabase.from('tiendanube_tokens').delete().eq('store_id', storeId);
      operations.push('tokens_cleaned');

      // If store was soft-deleted, hard delete it
      if (store && !store.is_active) {
        await supabase.from('stores').delete().eq('id', storeId);
        operations.push('store_hard_deleted');
      }
    }

    console.log(`[CLEANUP] ✅ Cleanup completed for store: ${storeId}`);

    return NextResponse.json({
      success: true,
      message: `Cleanup completed for store: ${storeId}`,
      storeId,
      storeInfo: store ? { name: store.name, was_active: store.is_active } : { status: 'not_found' },
      operations,
      ragResult: result || { success: true }
    });

  } catch (error) {
    console.error('[CLEANUP] ❌ Cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check orphaned namespaces status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get('storeId');

    if (!storeId) {
      return NextResponse.json(
        { success: false, error: 'storeId parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    
    // Get store status
    const { data: store } = await supabase
      .from('stores')
      .select('id, user_id, name, is_active, created_at, last_sync_at')
      .eq('id', storeId)
      .single();

    // Get related data counts
    const [conversationsResult, cacheResult, tokensResult] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact' }).eq('store_id', storeId),
      supabase.from('analytics_cache').select('id', { count: 'exact' }).eq('store_id', storeId),
      supabase.from('tiendanube_tokens').select('id', { count: 'exact' }).eq('store_id', storeId)
    ]);

    const diagnostics = {
      store: store || null,
      relatedData: {
        conversations: conversationsResult.count || 0,
        analyticsCache: cacheResult.count || 0,
        tokens: tokensResult.count || 0
      },
      expectedNamespaces: [
        `store-${storeId}`,
        `store-${storeId}-products`,
        `store-${storeId}-orders`,
        `store-${storeId}-customers`,
        `store-${storeId}-analytics`,
        `store-${storeId}-conversations`,
      ],
      recommendations: []
    };

    // Generate recommendations
    if (!store) {
      diagnostics.recommendations.push('Store not found in database - safe to cleanup all namespaces');
    } else if (!store.is_active) {
      diagnostics.recommendations.push('Store is inactive - can cleanup namespaces safely');
    } else {
      diagnostics.recommendations.push('Store is active - do NOT cleanup namespaces');
    }

    if (diagnostics.relatedData.conversations > 0 || 
        diagnostics.relatedData.analyticsCache > 0 || 
        diagnostics.relatedData.tokens > 0) {
      diagnostics.recommendations.push('Related data found - use deep_cleanup to clean database too');
    }

    return NextResponse.json({
      success: true,
      storeId,
      diagnostics
    });

  } catch (error) {
    console.error('[CLEANUP] ❌ Diagnostic failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Diagnostic failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 