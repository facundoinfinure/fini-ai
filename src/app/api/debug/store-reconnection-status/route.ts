import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DEBUG ENDPOINT: Store Reconnection Status
 * =========================================
 * 
 * Helps diagnose and fix store reconnection issues by:
 * 1. Checking store timestamp updates
 * 2. Verifying RAG namespace status
 * 3. Providing manual sync options
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG-RECONNECTION] 🔍 Checking store reconnection status');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get all user's stores with detailed info
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        domain,
        platform_store_id,
        is_active,
        created_at,
        updated_at,
        last_sync_at,
        access_token
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (storesError) {
      return NextResponse.json({
        success: false,
        error: `Failed to fetch stores: ${storesError.message}`
      }, { status: 500 });
    }

    const storeStatus = [];

    for (const store of stores || []) {
      const now = new Date();
      const updatedAt = store.updated_at ? new Date(store.updated_at) : null;
      const lastSyncAt = store.last_sync_at ? new Date(store.last_sync_at) : null;
      
      // Calculate time differences
      const minutesSinceUpdate = updatedAt ? Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60)) : null;
      const minutesSinceSync = lastSyncAt ? Math.floor((now.getTime() - lastSyncAt.getTime()) / (1000 * 60)) : null;

      // Check RAG namespace status
      let ragStatus = 'unknown';
      let namespaceCount = 0;
      
      try {
        // Dynamic import to avoid build issues
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // Check namespace existence
        const namespaceResult = await ragEngine.listStoreNamespaces(store.id);
        
        if (namespaceResult.success) {
          namespaceCount = namespaceResult.namespaces?.length || 0;
          
          if (namespaceCount === 6) {
            ragStatus = 'complete';
          } else if (namespaceCount > 0) {
            ragStatus = 'partial';
          } else {
            ragStatus = 'missing';
          }
        } else {
          ragStatus = 'error';
        }
      } catch (ragError) {
        console.warn(`[DEBUG-RECONNECTION] Failed to check RAG status for ${store.id}:`, ragError);
        ragStatus = 'error';
      }

      // Determine overall status
      let overallStatus = 'healthy';
      let issues = [];
      
      if (!lastSyncAt) {
        overallStatus = 'needs-sync';
        issues.push('Never synced');
      } else if (minutesSinceSync && minutesSinceSync > 60) {
        overallStatus = 'stale';
        issues.push(`Last sync ${Math.floor(minutesSinceSync / 60)} hours ago`);
      }
      
      if (namespaceCount < 6) {
        overallStatus = 'incomplete-rag';
        issues.push(`Only ${namespaceCount}/6 namespaces exist`);
      }
      
      if (!store.access_token) {
        overallStatus = 'no-token';
        issues.push('Missing access token');
      }

      storeStatus.push({
        storeId: store.id,
        storeName: store.name,
        domain: store.domain,
        platformStoreId: store.platform_store_id,
        overallStatus,
        issues,
        timestamps: {
          createdAt: store.created_at,
          updatedAt: store.updated_at,
          lastSyncAt: store.last_sync_at,
          minutesSinceUpdate,
          minutesSinceSync
        },
        rag: {
          status: ragStatus,
          namespaceCount,
          expectedNamespaces: 6
        },
        hasAccessToken: !!store.access_token
      });
    }

    // Summary
    const summary = {
      totalStores: stores?.length || 0,
      healthyStores: storeStatus.filter(s => s.overallStatus === 'healthy').length,
      storesNeedingSync: storeStatus.filter(s => s.overallStatus === 'needs-sync' || s.overallStatus === 'stale').length,
      storesWithIncompleteRAG: storeStatus.filter(s => s.overallStatus === 'incomplete-rag').length,
      storesWithoutToken: storeStatus.filter(s => s.overallStatus === 'no-token').length
    };

    console.log(`[DEBUG-RECONNECTION] ✅ Status check completed:`, summary);

    return NextResponse.json({
      success: true,
      data: {
        summary,
        stores: storeStatus,
        timestamp: new Date().toISOString(),
        recommendations: generateRecommendations(storeStatus)
      }
    });

  } catch (error) {
    console.error('[DEBUG-RECONNECTION] ❌ Status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check store reconnection status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST: Force reconnection/sync for specific store
 */
export async function POST(request: NextRequest) {
  try {
    const { storeId, action } = await request.json();
    
    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    const supabase = createClient();
    
    // Get current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Verify store ownership
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({
        success: false,
        error: 'Store not found or access denied'
      }, { status: 404 });
    }

    let result;

    switch (action) {
      case 'force-sync':
        console.log(`[DEBUG-RECONNECTION] 🔄 Forcing sync for store: ${storeId}`);
        
        // Update last_sync_at immediately
        await supabase
          .from('stores')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', storeId);

        // Trigger RAG sync
        const { StoreService } = await import('@/lib/database/client');
        await StoreService.syncStoreDataToRAGAsync(storeId);
        
        result = {
          action: 'force-sync',
          message: 'Force sync triggered successfully',
          storeId,
          triggeredAt: new Date().toISOString()
        };
        break;

      case 'reinitialize-namespaces':
        console.log(`[DEBUG-RECONNECTION] 🏗️ Reinitializing namespaces for store: ${storeId}`);
        
        // Get RAG engine and reinitialize namespaces
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // Delete existing namespaces first
        await ragEngine.deleteStoreNamespaces(storeId);
        
        // Reinitialize all namespaces
        const initResult = await ragEngine.initializeStoreNamespaces(storeId);
        
        if (!initResult.success) {
          throw new Error(`Namespace initialization failed: ${initResult.error}`);
        }
        
        result = {
          action: 'reinitialize-namespaces',
          message: 'Namespaces reinitialized successfully',
          storeId,
          namespacesCreated: initResult.namespacesCreated || 6,
          triggeredAt: new Date().toISOString()
        };
        break;

      case 'full-reconnection':
        console.log(`[DEBUG-RECONNECTION] 🔄 Full reconnection for store: ${storeId}`);
        
        // Update timestamps
        await supabase
          .from('stores')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', storeId);

        // Reinitialize RAG
        const { getUnifiedRAGEngine: getRagEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine2 = getRagEngine();
        
        await ragEngine2.deleteStoreNamespaces(storeId);
        const initResult2 = await ragEngine2.initializeStoreNamespaces(storeId);
        
        // Trigger full sync
        const { StoreService: StoreService2 } = await import('@/lib/database/client');
        await StoreService2.syncStoreDataToRAGAsync(storeId);
        
        result = {
          action: 'full-reconnection',
          message: 'Full reconnection completed successfully',
          storeId,
          namespacesCreated: initResult2.namespacesCreated || 6,
          triggeredAt: new Date().toISOString()
        };
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}. Available actions: force-sync, reinitialize-namespaces, full-reconnection`
        }, { status: 400 });
    }

    console.log(`[DEBUG-RECONNECTION] ✅ Action completed:`, result);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('[DEBUG-RECONNECTION] ❌ Action failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to execute reconnection action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate recommendations based on store status
 */
function generateRecommendations(storeStatus: any[]): string[] {
  const recommendations = [];
  
  const storesNeedingSync = storeStatus.filter(s => s.overallStatus === 'needs-sync' || s.overallStatus === 'stale');
  const storesWithIncompleteRAG = storeStatus.filter(s => s.overallStatus === 'incomplete-rag');
  const storesWithoutToken = storeStatus.filter(s => s.overallStatus === 'no-token');
  
  if (storesNeedingSync.length > 0) {
    recommendations.push(`${storesNeedingSync.length} store(s) need data sync. Use POST with action 'force-sync'.`);
  }
  
  if (storesWithIncompleteRAG.length > 0) {
    recommendations.push(`${storesWithIncompleteRAG.length} store(s) have incomplete RAG namespaces. Use POST with action 'reinitialize-namespaces'.`);
  }
  
  if (storesWithoutToken.length > 0) {
    recommendations.push(`${storesWithoutToken.length} store(s) need OAuth reconnection. Disconnect and reconnect these stores.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All stores appear to be healthy! ✅');
  }
  
  return recommendations;
} 