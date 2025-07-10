/**
 * RAG Namespace Manager
 * 
 * Implements user requirements:
 * - Create namespace when store connects
 * - Delete namespace when store disconnects  
 * - Update policy: login, every 5min, manual trigger
 * - NO updates on every message exchange
 */

import { createClient } from '@/lib/supabase/server';

export interface NamespaceManager {
  createStoreNamespace(storeId: string): Promise<{ success: boolean; error?: string }>;
  deleteStoreNamespace(storeId: string): Promise<{ success: boolean; error?: string }>;
  schedulePeriodicSync(storeId: string): Promise<void>;
  triggerManualSync(storeId: string): Promise<{ success: boolean; error?: string }>;
}

export class FiniNamespaceManager implements NamespaceManager {
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Create namespace when store connects
   */
  async createStoreNamespace(storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[NAMESPACE] Creating namespace for store: ${storeId}`);
      
      // Dynamic import to avoid build issues
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // Create all namespaces for the store
      const result = await ragEngine.initializeStoreNamespaces(storeId);
      
      if (result.success) {
        // Schedule periodic sync (every 5 minutes as requested)
        await this.schedulePeriodicSync(storeId);
        
        // Trigger initial data sync
        await this.triggerManualSync(storeId);
        
        console.log(`[NAMESPACE] ✅ Successfully created namespace for store: ${storeId}`);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NAMESPACE] ❌ Failed to create namespace for store ${storeId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Delete namespace when store disconnects
   */
  async deleteStoreNamespace(storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[NAMESPACE] Deleting namespace for store: ${storeId}`);
      
      // Stop periodic sync
      if (this.syncIntervals.has(storeId)) {
        clearInterval(this.syncIntervals.get(storeId));
        this.syncIntervals.delete(storeId);
      }
      
      // Dynamic import to avoid build issues
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // Delete all data for the store (this handles all namespaces)
      await ragEngine.deleteStoreNamespaces(storeId);
      
      console.log(`[NAMESPACE] ✅ Successfully deleted namespace for store: ${storeId}`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NAMESPACE] ❌ Failed to delete namespace for store ${storeId}:`, errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Schedule periodic sync every 5 minutes (as requested)
   */
  async schedulePeriodicSync(storeId: string): Promise<void> {
    // Clear existing interval if any
    if (this.syncIntervals.has(storeId)) {
      clearInterval(this.syncIntervals.get(storeId));
    }

    // Schedule sync every 5 minutes
    const interval = setInterval(async () => {
      try {
        console.log(`[NAMESPACE] Periodic sync triggered for store: ${storeId}`);
        await this.triggerManualSync(storeId);
      } catch (error) {
        console.error(`[NAMESPACE] Periodic sync failed for store ${storeId}:`, error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    this.syncIntervals.set(storeId, interval);
    console.log(`[NAMESPACE] Scheduled periodic sync for store: ${storeId}`);
  }

  /**
   * 🔒 ENHANCED: Lock-aware manual sync (login, manual trigger)
   * Respects global lock system to prevent race conditions during sync
   */
  async triggerManualSync(storeId: string): Promise<{ success: boolean; error?: string }> {
    let lockProcessId: string | null = null;
    
    try {
      console.log(`[NAMESPACE] 🔒 Lock-aware manual sync triggered for store: ${storeId}`);
      
      // 🔒 STEP 1: Check for lock conflicts before starting
      const { checkRAGLockConflicts, RAGLockType, ManualSyncLocks } = await import('@/lib/rag/global-locks');
      
      const conflictCheck = await checkRAGLockConflicts(storeId, RAGLockType.MANUAL_SYNC);
      
      if (!conflictCheck.canProceed) {
        console.warn(`[NAMESPACE] ⏳ Skipping manual sync for store ${storeId} - ${conflictCheck.reason}`);
        return { success: false, error: conflictCheck.reason };
      }

      // 🔒 STEP 2: Acquire manual sync lock
      const lockResult = await ManualSyncLocks.acquire(storeId, 'Namespace manager manual sync');
      
      if (!lockResult.success) {
        console.warn(`[NAMESPACE] ⏳ Cannot acquire lock for manual sync ${storeId}: ${lockResult.error}`);
        return { success: false, error: `Lock unavailable: ${lockResult.error}` };
      }
      
      lockProcessId = lockResult.processId!;
      console.log(`[NAMESPACE] 🔒 Lock acquired for manual sync: ${lockProcessId}`);
      
      // STEP 3: Get store with access token
      const supabase = createClient();
      const { data: store, error } = await supabase
        .from('stores')
        .select('id, access_token')
        .eq('id', storeId)
        .single();

      if (error || !store?.access_token) {
        throw new Error(`Store not found or missing access token: ${storeId}`);
      }

      // STEP 4: Dynamic import to avoid build issues
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // STEP 5: Sync store data with lock protection
      console.log(`[NAMESPACE] 📊 Starting lock-protected data sync for store: ${storeId}`);
      const syncResult = await ragEngine.indexStoreData(storeId, store.access_token);
      
      if (!syncResult.success) {
        console.warn(`[NAMESPACE] ⚠️ Lock-protected sync failed for store ${storeId}:`, syncResult.error);
        return { success: false, error: syncResult.error };
      }
      
      console.log(`[NAMESPACE] ✅ Lock-aware manual sync completed for store: ${storeId}`);
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[NAMESPACE] ❌ Lock-aware manual sync failed for store ${storeId}:`, errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      // 🔒 ALWAYS release the lock, even if sync failed
      if (lockProcessId) {
        try {
          const { ManualSyncLocks } = await import('@/lib/rag/global-locks');
          await ManualSyncLocks.release(storeId, lockProcessId);
          console.log(`[NAMESPACE] 🔓 Lock released for manual sync: ${lockProcessId}`);
        } catch (unlockError) {
          console.warn(`[NAMESPACE] ⚠️ Failed to release manual sync lock ${lockProcessId}:`, unlockError);
        }
      }
    }
  }

  /**
   * Cleanup all intervals (call on app shutdown)
   */
  cleanup(): void {
    for (const [storeId, interval] of this.syncIntervals) {
      clearInterval(interval);
      console.log(`[NAMESPACE] Cleaned up sync interval for store: ${storeId}`);
    }
    this.syncIntervals.clear();
  }
}

// Singleton instance
export const namespaceManager = new FiniNamespaceManager();

/**
 * Utility functions for integration
 */

/**
 * Call when user logs in - sync all their stores
 */
export async function syncUserStoresOnLogin(userId: string): Promise<void> {
  try {
    const supabase = createClient();
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !stores) {
      console.warn(`[NAMESPACE] Failed to get stores for user login sync: ${error?.message}`);
      return;
    }

    console.log(`[NAMESPACE] Login sync for user ${userId}: ${stores.length} stores`);
    
    // Trigger sync for all user stores
    for (const store of stores) {
      await namespaceManager.triggerManualSync(store.id);
    }
  } catch (error) {
    console.error(`[NAMESPACE] Login sync failed for user ${userId}:`, error);
  }
}

/**
 * Call when store is connected
 */
export async function onStoreConnected(storeId: string): Promise<void> {
  await namespaceManager.createStoreNamespace(storeId);
}

/**
 * Call when store is disconnected
 */
export async function onStoreDisconnected(storeId: string): Promise<void> {
  await namespaceManager.deleteStoreNamespace(storeId);
} 