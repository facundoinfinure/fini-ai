import { NextRequest, NextResponse } from 'next/server';
import { getAutoSyncScheduler, initializeAutoSync } from '@/lib/services/auto-sync-scheduler';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 🔄 AUTO-SYNC SCHEDULER MANAGEMENT ENDPOINT
 * ==========================================
 * 
 * Endpoints to manage the automatic data synchronization scheduler:
 * - GET: Get scheduler status and store sync information
 * - POST: Start scheduler, trigger immediate sync, or manage stores
 * - PUT: Update scheduler settings
 * - DELETE: Stop scheduler
 */

/**
 * GET /api/stores/auto-sync-scheduler
 * Get scheduler status and store sync information
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AUTO-SYNC-API] Getting scheduler status...');
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get scheduler instance
    const scheduler = await getAutoSyncScheduler();
    const status = scheduler.getSyncStatus();
    
    // Filter stores for current user
    const userStores = await getUserStores(user.id);
    const userStoreIds = new Set(userStores.map(s => s.id));
    
    const filteredStores = status.stores.filter(store => 
      userStoreIds.has(store.storeId)
    );

    const response = {
      success: true,
      data: {
        scheduler: {
          isRunning: true, // Scheduler is always running in background
          totalStores: status.totalStores,
          activeStores: status.activeStores,
          pendingStores: status.pendingStores,
          failedStores: status.failedStores
        },
        userStores: {
          total: filteredStores.length,
          active: filteredStores.filter(s => s.status === 'running').length,
          pending: filteredStores.filter(s => s.status === 'pending').length,
          failed: filteredStores.filter(s => s.status === 'failed').length,
          stores: filteredStores.map(store => ({
            storeId: store.storeId,
            storeName: store.storeName,
            status: store.status,
            nextSync: store.nextSync,
            lastSync: store.lastSync,
            error: store.error
          }))
        }
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[AUTO-SYNC-API] Failed to get scheduler status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get scheduler status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/stores/auto-sync-scheduler
 * Start scheduler, trigger immediate sync, or manage stores
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[AUTO-SYNC-API] Processing scheduler action...');
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { action, storeId, storeIds } = body;

    const scheduler = await getAutoSyncScheduler();

    switch (action) {
      case 'initialize':
        console.log('[AUTO-SYNC-API] Initializing scheduler...');
        await initializeAutoSync();
        return NextResponse.json({
          success: true,
          message: 'Scheduler initialized successfully'
        });

      case 'sync_immediate':
        if (!storeId) {
          return NextResponse.json({
            success: false,
            error: 'Store ID is required for immediate sync'
          }, { status: 400 });
        }

        console.log(`[AUTO-SYNC-API] Triggering immediate sync for store: ${storeId}`);
        
        // Verify user owns this store
        const userStores = await getUserStores(user.id);
        if (!userStores.find(s => s.id === storeId)) {
          return NextResponse.json({
            success: false,
            error: 'Store not found or access denied'
          }, { status: 403 });
        }

        const syncResult = await scheduler.triggerImmediateSync(storeId);
        
        return NextResponse.json({
          success: true,
          data: {
            sync: syncResult,
            message: syncResult.success ? 'Sync completed successfully' : 'Sync failed'
          }
        });

      case 'sync_all_user_stores':
        console.log(`[AUTO-SYNC-API] Triggering sync for all user stores: ${user.id}`);
        
        const allUserStores = await getUserStores(user.id);
        const syncResults = [];

        for (const store of allUserStores) {
          try {
            const result = await scheduler.triggerImmediateSync(store.id);
            syncResults.push({
              storeId: store.id,
              storeName: store.name,
              success: result.success,
              error: result.error,
              syncedData: result.syncedData
            });
          } catch (error) {
            syncResults.push({
              storeId: store.id,
              storeName: store.name,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        const successCount = syncResults.filter(r => r.success).length;
        const failureCount = syncResults.filter(r => !r.success).length;

        return NextResponse.json({
          success: true,
          data: {
            summary: {
              totalStores: allUserStores.length,
              successful: successCount,
              failed: failureCount
            },
            results: syncResults
          }
        });

      case 'add_store':
        if (!storeId) {
          return NextResponse.json({
            success: false,
            error: 'Store ID is required'
          }, { status: 400 });
        }

        console.log(`[AUTO-SYNC-API] Adding store to scheduler: ${storeId}`);
        await scheduler.addStore(storeId);
        
        return NextResponse.json({
          success: true,
          message: 'Store added to scheduler successfully'
        });

      case 'remove_store':
        if (!storeId) {
          return NextResponse.json({
            success: false,
            error: 'Store ID is required'
          }, { status: 400 });
        }

        console.log(`[AUTO-SYNC-API] Removing store from scheduler: ${storeId}`);
        scheduler.removeStore(storeId);
        
        return NextResponse.json({
          success: true,
          message: 'Store removed from scheduler successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: initialize, sync_immediate, sync_all_user_stores, add_store, remove_store'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[AUTO-SYNC-API] Scheduler action failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Scheduler action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/stores/auto-sync-scheduler
 * Update scheduler settings (future implementation)
 */
export async function PUT(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: 'Scheduler configuration updates not yet implemented'
  }, { status: 501 });
}

/**
 * DELETE /api/stores/auto-sync-scheduler
 * Stop scheduler (for development/debugging)
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[AUTO-SYNC-API] Stopping scheduler...');
    
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Only allow admin users to stop the scheduler
    // TODO: Implement proper admin check
    
    const scheduler = await getAutoSyncScheduler();
    scheduler.stop();
    
    return NextResponse.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });

  } catch (error) {
    console.error('[AUTO-SYNC-API] Failed to stop scheduler:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to stop scheduler',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * 🔧 Helper function to get user stores
 */
async function getUserStores(userId: string) {
  const supabase = createClient();
  
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name, platform, is_active, last_sync_at')
    .eq('user_id', userId)
    .eq('platform', 'tiendanube')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[AUTO-SYNC-API] Failed to get user stores:', error);
    return [];
  }

  return stores || [];
} 