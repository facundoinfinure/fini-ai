/**
 * 🚀 AUTO-SYNC INITIALIZER
 * ========================
 * 
 * Service that ensures the auto-sync scheduler starts automatically
 * when the application loads. This provides the "connect once, sync forever"
 * experience that users expect.
 * 
 * FEATURES:
 * - Automatic initialization on app start
 * - Health checks and recovery
 * - Graceful error handling
 * - Background operation
 * - No user intervention required
 */

import { initializeAutoSync } from '@/lib/services/auto-sync-scheduler';

let initializationAttempted = false;
let initializationInProgress = false;

/**
 * 🔄 Initialize auto-sync system
 * Called automatically when the application starts
 */
export async function initializeAutoSyncSystem(): Promise<void> {
  // Prevent multiple initialization attempts
  if (initializationAttempted || initializationInProgress) {
    console.log('[AUTO-SYNC-INIT] Initialization already attempted or in progress');
    return;
  }

  initializationInProgress = true;
  
  try {
    console.log('[AUTO-SYNC-INIT] 🚀 Starting auto-sync system initialization...');
    
    // Initialize the scheduler
    await initializeAutoSync();
    
    initializationAttempted = true;
    console.log('[AUTO-SYNC-INIT] ✅ Auto-sync system initialized successfully');
    
    // Schedule health check
    scheduleHealthCheck();
    
  } catch (error) {
    console.error('[AUTO-SYNC-INIT] ❌ Failed to initialize auto-sync system:', error);
    
    // Schedule retry after 5 minutes
    setTimeout(() => {
      initializationInProgress = false;
      initializationAttempted = false;
      initializeAutoSyncSystem();
    }, 5 * 60 * 1000);
    
  } finally {
    initializationInProgress = false;
  }
}

/**
 * 🔍 Schedule periodic health checks
 */
function scheduleHealthCheck(): void {
  // Run health check every 30 minutes
  setInterval(async () => {
    try {
      console.log('[AUTO-SYNC-INIT] 🔍 Running health check...');
      
      // Import dynamically to avoid circular dependencies
      const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
      const scheduler = await getAutoSyncScheduler();
      
      const status = scheduler.getSyncStatus();
      console.log(`[AUTO-SYNC-INIT] 📊 Health check: ${status.totalStores} stores, ${status.activeStores} active, ${status.failedStores} failed`);
      
      // Log if there are failed stores
      if (status.failedStores > 0) {
        console.warn(`[AUTO-SYNC-INIT] ⚠️ ${status.failedStores} stores have failed sync - may need attention`);
      }
      
    } catch (error) {
      console.error('[AUTO-SYNC-INIT] ❌ Health check failed:', error);
    }
  }, 30 * 60 * 1000); // 30 minutes
}

/**
 * 🔄 Ensure auto-sync is running
 * Can be called from any part of the application
 */
export async function ensureAutoSyncRunning(): Promise<void> {
  if (!initializationAttempted) {
    await initializeAutoSyncSystem();
  }
}

/**
 * 🎯 Initialize on new store connection
 * Call this when a new store is connected via OAuth
 */
export async function initializeForNewStore(storeId: string): Promise<void> {
  try {
    console.log(`[AUTO-SYNC-INIT] 🎯 Initializing auto-sync for new store: ${storeId}`);
    
    // Ensure scheduler is running
    await ensureAutoSyncRunning();
    
    // Add store to scheduler
    const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
    const scheduler = await getAutoSyncScheduler();
    await scheduler.addStore(storeId);
    
    // Trigger immediate sync for new store
    setTimeout(async () => {
      try {
        console.log(`[AUTO-SYNC-INIT] 🚀 Triggering immediate sync for new store: ${storeId}`);
        await scheduler.triggerImmediateSync(storeId);
      } catch (error) {
        console.warn(`[AUTO-SYNC-INIT] ⚠️ Initial sync failed for new store ${storeId}:`, error);
      }
    }, 5000); // Wait 5 seconds for store to be fully created
    
  } catch (error) {
    console.error(`[AUTO-SYNC-INIT] ❌ Failed to initialize auto-sync for new store ${storeId}:`, error);
  }
}

/**
 * 🎯 Initialize on user login
 * Call this when a user logs in to sync their stores
 */
export async function initializeForUserLogin(userId: string): Promise<void> {
  try {
    console.log(`[AUTO-SYNC-INIT] 🎯 Initializing auto-sync for user login: ${userId}`);
    
    // Ensure scheduler is running
    await ensureAutoSyncRunning();
    
    // Get user stores and add them to scheduler
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (error) {
      console.error(`[AUTO-SYNC-INIT] ❌ Failed to get user stores for ${userId}:`, error);
      return;
    }

    if (!stores || stores.length === 0) {
      console.log(`[AUTO-SYNC-INIT] ℹ️ No stores found for user ${userId}`);
      return;
    }

    // Add all user stores to scheduler
    const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
    const scheduler = await getAutoSyncScheduler();
    
    for (const store of stores) {
      await scheduler.addStore(store.id);
    }
    
    console.log(`[AUTO-SYNC-INIT] ✅ Added ${stores.length} stores to scheduler for user ${userId}`);
    
  } catch (error) {
    console.error(`[AUTO-SYNC-INIT] ❌ Failed to initialize auto-sync for user login ${userId}:`, error);
  }
}

/**
 * 🔄 Auto-initialize when this module is imported
 * This ensures the scheduler starts as soon as the app loads
 */
if (typeof window === 'undefined') {
  // Only run on server-side
  setTimeout(() => {
    initializeAutoSyncSystem().catch(error => {
      console.error('[AUTO-SYNC-INIT] ❌ Auto-initialization failed:', error);
    });
  }, 10000); // Wait 10 seconds for app to fully load
}

export default {
  initializeAutoSyncSystem,
  ensureAutoSyncRunning,
  initializeForNewStore,
  initializeForUserLogin
}; 