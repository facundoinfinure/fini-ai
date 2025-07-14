import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';
import { getUnifiedRAGEngine } from '@/lib/rag';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get force parameter
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === 'true';

    const storesResult = await StoreService.getStoresByUserId(user.id);

    if (!storesResult.success || !storesResult.stores || storesResult.stores.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          stores: [],
          summary: 'No stores found'
        }
      });
    }

    const stores = storesResult.stores;

    // Check sync status for each store
    const storeStatuses = await Promise.all(
      stores.map(async (store) => {
        try {
          // Check if store has required data
          const hasAccessToken = !!store.access_token;
          const hasBasicInfo = !!(store.name && store.platform);
          
          let syncStatus = 'pending';
          let lastSyncTime = null;
          let dataReady = false;
          
          if (hasAccessToken && hasBasicInfo) {
            // Simple check: if store was recently updated and has access token, assume it has data
            // This is a pragmatic approach since we're mainly checking if sync is needed
            const lastUpdate = store.updated_at ? new Date(store.updated_at) : null;
            const lastCreated = store.created_at ? new Date(store.created_at) : null;
            const recentTime = lastUpdate || lastCreated;
            
            if (recentTime) {
              const hoursOld = Math.floor((Date.now() - recentTime.getTime()) / (1000 * 60 * 60));
              
              if (hoursOld < 24) {
                syncStatus = 'completed';
                dataReady = true;
                lastSyncTime = recentTime.toISOString();
              } else {
                syncStatus = 'needs_sync';
              }
            } else {
              syncStatus = 'needs_sync';
            }
          } else {
            syncStatus = 'missing_requirements';
          }

          return {
            storeId: store.id,
            storeName: store.name,
            platform: store.platform,
            hasAccessToken,
            hasBasicInfo,
            syncStatus,
            dataReady,
            lastSyncTime,
            createdAt: store.created_at,
            updatedAt: store.updated_at
          };
        } catch (error) {
          console.error(`[ERROR] Error checking sync status for store ${store.id}:`, error);
          return {
            storeId: store.id,
            storeName: store.name || 'Unknown',
            platform: store.platform || 'unknown',
            hasAccessToken: false,
            hasBasicInfo: false,
            syncStatus: 'error',
            dataReady: false,
            lastSyncTime: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    // If force sync is requested, trigger sync for stores that need it
    const syncResults = [];
    if (force) {
      for (const store of stores) {
        const status = storeStatuses.find(s => s.storeId === store.id);
        
        if (status && (status.syncStatus === 'needs_sync' || status.syncStatus === 'pending') && store.access_token) {
          try {
            console.log(`[INFO] Force syncing store: ${store.id} (${store.name})`);
            
            // Trigger async sync using unified RAG engine
            const ragEngine = getUnifiedRAGEngine();
            setTimeout(async () => {
              try {
                await ragEngine.initializeStoreNamespaces(store.id);
                await ragEngine.indexStoreData(store.id, store.access_token);
                console.log(`[INFO] Force sync completed for store: ${store.id}`);
              } catch (error) {
                console.error(`[ERROR] Force sync failed for store ${store.id}:`, error);
              }
            }, 200);
            
            syncResults.push({
              storeId: store.id,
              storeName: store.name,
              action: 'sync_triggered',
              success: true
            });
          } catch (error) {
            console.error(`[ERROR] Error triggering sync for store ${store.id}:`, error);
            syncResults.push({
              storeId: store.id,
              storeName: store.name,
              action: 'sync_failed',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
    }

    // Generate summary
    const totalStores = storeStatuses.length;
    const readyStores = storeStatuses.filter(s => s.dataReady).length;
    const pendingStores = storeStatuses.filter(s => s.syncStatus === 'pending' || s.syncStatus === 'needs_sync').length;
    const errorStores = storeStatuses.filter(s => s.syncStatus === 'error').length;

    const summary = {
      total: totalStores,
      ready: readyStores,
      pending: pendingStores,
      errors: errorStores,
      percentage: totalStores > 0 ? Math.round((readyStores / totalStores) * 100) : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        stores: storeStatuses,
        summary,
        forceSync: force,
        syncResults: force ? syncResults : undefined
      }
    });

  } catch (error) {
    console.error('[ERROR] Sync status check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 