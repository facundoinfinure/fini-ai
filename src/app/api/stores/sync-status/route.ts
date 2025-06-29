import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

/**
 * GET /api/stores/sync-status
 * Verifica el estado de sincronización de las tiendas del usuario
 * 🎯 PROPÓSITO: Proporcionar información en tiempo real sobre el estado de sync
 */
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

    // Get user's stores
    const storesResult = await StoreService.getStoresByUserId(user.id);
    if (!storesResult.success || !storesResult.stores) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores'
      }, { status: 500 });
    }

    const stores = storesResult.stores;
    const now = new Date();
    
    // Analyze sync status for each store
    const syncStatus = stores.map(store => {
      const hasAccessToken = !!store.access_token;
      const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
      
      // Calculate sync status
      let status: 'never' | 'fresh' | 'stale' | 'old' | 'no-token' = 'never';
      let nextSyncRecommended: Date | null = null;
      let hoursOld: number | null = null;
      
      if (!hasAccessToken) {
        status = 'no-token';
      } else if (!lastSync) {
        status = 'never';
        nextSyncRecommended = now; // Sync immediately
      } else {
        hoursOld = Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60));
        
        if (hoursOld < 1) {
          status = 'fresh';
          nextSyncRecommended = new Date(lastSync.getTime() + (4 * 60 * 60 * 1000)); // 4 hours
        } else if (hoursOld < 4) {
          status = 'fresh';
          nextSyncRecommended = new Date(lastSync.getTime() + (4 * 60 * 60 * 1000));
        } else if (hoursOld < 24) {
          status = 'stale';
          nextSyncRecommended = now; // Sync now
        } else {
          status = 'old';
          nextSyncRecommended = now; // Sync immediately
        }
      }
      
      return {
        storeId: store.id,
        storeName: store.name,
        hasAccessToken,
        lastSyncAt: lastSync?.toISOString() || null,
        status,
        hoursOld,
        nextSyncRecommended: nextSyncRecommended?.toISOString() || null,
        needsSync: status === 'never' || status === 'stale' || status === 'old',
        isActive: store.is_active
      };
    });

    // Calculate overall summary
    const summary = {
      totalStores: stores.length,
      storesWithTokens: syncStatus.filter(s => s.hasAccessToken).length,
      storesNeedingSync: syncStatus.filter(s => s.needsSync && s.hasAccessToken).length,
      freshStores: syncStatus.filter(s => s.status === 'fresh').length,
      neverSynced: syncStatus.filter(s => s.status === 'never' && s.hasAccessToken).length,
      recommendedAction: syncStatus.some(s => s.needsSync && s.hasAccessToken) 
        ? 'sync_recommended' 
        : 'up_to_date'
    };

    return NextResponse.json({
      success: true,
      data: {
        summary,
        stores: syncStatus,
        timestamp: now.toISOString()
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

/**
 * POST /api/stores/sync-status
 * Trigger intelligent sync for stores that need it
 * 🚀 ACCIÓN: Ejecuta sync automático inteligente
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { forceSync = false, storeIds = [] } = body;

    // Get user's stores
    const storesResult = await StoreService.getStoresByUserId(user.id);
    if (!storesResult.success || !storesResult.stores) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores'
      }, { status: 500 });
    }

    const stores = storesResult.stores;
    const now = new Date();
    const syncResults: any[] = [];

    for (const store of stores) {
      // Skip if specific store IDs provided and this store isn't included
      if (storeIds.length > 0 && !storeIds.includes(store.id)) {
        continue;
      }

      if (!store.access_token) {
        syncResults.push({
          storeId: store.id,
          storeName: store.name,
          status: 'skipped',
          reason: 'No access token'
        });
        continue;
      }

      const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
      const hoursOld = lastSync ? Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)) : null;
      
      // Determine if sync is needed
      const needsSync = forceSync || !lastSync || (hoursOld && hoursOld >= 4);

      if (needsSync) {
        try {
          console.log(`[INFO] Triggering intelligent sync for store: ${store.id}`);
          
          // Trigger async sync
          StoreService.syncStoreDataToRAGAsync(store.id);
          
          syncResults.push({
            storeId: store.id,
            storeName: store.name,
            status: 'triggered',
            lastSyncAge: hoursOld ? `${hoursOld} hours` : 'never',
            triggeredAt: now.toISOString()
          });
        } catch (error) {
          syncResults.push({
            storeId: store.id,
            storeName: store.name,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      } else {
        syncResults.push({
          storeId: store.id,
          storeName: store.name,
          status: 'skipped',
          reason: `Recently synced (${hoursOld} hours ago)`
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        triggered: syncResults.filter(r => r.status === 'triggered').length,
        skipped: syncResults.filter(r => r.status === 'skipped').length,
        failed: syncResults.filter(r => r.status === 'failed').length,
        results: syncResults,
        timestamp: now.toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Intelligent sync trigger failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 