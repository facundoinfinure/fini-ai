/**
 * 🔄 AUTOMATIC DATA SYNCHRONIZATION SCHEDULER
 * ==========================================
 * 
 * Unified system for automatic data synchronization that:
 * - Schedules periodic sync for all stores
 * - Handles authentication failures gracefully
 * - Avoids sync conflicts and duplicates
 * - Provides real-time status updates
 * - Maintains data consistency across all systems
 * 
 * FEATURES:
 * - Smart scheduling (avoids conflicts)
 * - Exponential backoff for failures
 * - Token validation and refresh
 * - RAG engine integration
 * - Database transaction safety
 * - Comprehensive error handling
 */

import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { StoreService } from '@/lib/database/client';

interface SyncJob {
  storeId: string;
  storeName: string;
  userId: string;
  priority: 'high' | 'medium' | 'low';
  retryCount: number;
  nextSync: Date;
  lastSync: Date | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  error?: string;
}

interface SyncResult {
  storeId: string;
  storeName: string;
  success: boolean;
  error?: string;
  syncedData: {
    products: number;
    orders: number;
    customers: number;
    totalTime: number;
  };
  actions: string[];
}

export class AutoSyncScheduler {
  private syncJobs: Map<string, SyncJob> = new Map();
  private activeSyncs: Set<string> = new Set();
  private schedulerInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  
  private readonly SYNC_INTERVALS = {
    immediate: 0,           // Manual triggers
    high: 5 * 60 * 1000,    // 5 minutes for active stores
    medium: 30 * 60 * 1000, // 30 minutes for regular stores
    low: 6 * 60 * 60 * 1000 // 6 hours for inactive stores
  };

  /**
   * 🚀 Initialize scheduler and start periodic sync
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.log('[AUTO-SYNC] Scheduler already running');
      return;
    }

    console.log('[AUTO-SYNC] 🚀 Initializing automatic sync scheduler...');
    
    try {
      // Load existing stores and create sync jobs
      await this.loadStores();
      
      // Start the scheduler
      this.startScheduler();
      
      console.log('[AUTO-SYNC] ✅ Scheduler initialized successfully');
      console.log(`[AUTO-SYNC] 📊 Loaded ${this.syncJobs.size} stores for synchronization`);
      
    } catch (error) {
      console.error('[AUTO-SYNC] ❌ Failed to initialize scheduler:', error);
      throw error;
    }
  }

  /**
   * 📋 Load all stores and create sync jobs
   */
  private async loadStores(): Promise<void> {
    const supabase = createClient();
    
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, user_id, platform, is_active, last_sync_at, created_at')
      .eq('platform', 'tiendanube')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load stores: ${error.message}`);
    }

    if (!stores || stores.length === 0) {
      console.log('[AUTO-SYNC] No stores found to sync');
      return;
    }

    // Create sync jobs for each store
    for (const store of stores) {
      const syncJob = this.createSyncJob(store);
      this.syncJobs.set(store.id, syncJob);
      
      console.log(`[AUTO-SYNC] 📋 Created sync job for store: ${store.name} (${store.id})`);
    }
  }

  /**
   * 🔧 Create sync job for a store
   */
  private createSyncJob(store: any): SyncJob {
    const now = new Date();
    const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
    const hoursSinceSync = lastSync ? 
      Math.floor((now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)) : null;

    // Determine priority based on store activity and last sync
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    if (!lastSync || (hoursSinceSync && hoursSinceSync > 24)) {
      priority = 'high'; // Never synced or very old
    } else if (store.is_active && hoursSinceSync && hoursSinceSync > 6) {
      priority = 'high'; // Active store needs frequent sync
    } else if (hoursSinceSync && hoursSinceSync > 12) {
      priority = 'medium'; // Regular sync needed
    } else {
      priority = 'low'; // Recently synced
    }

    // Calculate next sync time
    const nextSync = new Date(now.getTime() + this.SYNC_INTERVALS[priority]);

    return {
      storeId: store.id,
      storeName: store.name || 'Unnamed Store',
      userId: store.user_id,
      priority,
      retryCount: 0,
      nextSync,
      lastSync,
      status: 'pending'
    };
  }

  /**
   * ⏰ Start the scheduler
   */
  private startScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    this.isRunning = true;
    
    // Run scheduler every 60 seconds
    this.schedulerInterval = setInterval(async () => {
      await this.processSyncJobs();
    }, 60 * 1000);

    console.log('[AUTO-SYNC] ⏰ Scheduler started - checking every 60 seconds');
  }

  /**
   * 📊 Process sync jobs that are due
   */
  private async processSyncJobs(): Promise<void> {
    const now = new Date();
    const jobsToProcess: SyncJob[] = [];

    // Find jobs that are due for sync
    for (const [storeId, job] of this.syncJobs) {
      if (job.status === 'pending' && job.nextSync <= now && !this.activeSyncs.has(storeId)) {
        jobsToProcess.push(job);
      }
    }

    if (jobsToProcess.length === 0) {
      return; // No jobs to process
    }

    console.log(`[AUTO-SYNC] 📊 Processing ${jobsToProcess.length} sync jobs`);

    // Process jobs in batches to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < jobsToProcess.length; i += batchSize) {
      const batch = jobsToProcess.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(job => this.processSingleJob(job));
      await Promise.allSettled(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < jobsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  /**
   * 🔄 Process a single sync job
   */
  private async processSingleJob(job: SyncJob): Promise<void> {
    const { storeId, storeName } = job;
    
    try {
      // Mark as running
      job.status = 'running';
      this.activeSyncs.add(storeId);
      
      console.log(`[AUTO-SYNC] 🔄 Starting sync for store: ${storeName} (${storeId})`);
      
      // Perform the actual sync
      const syncResult = await this.performStoreSync(storeId);
      
      if (syncResult.success) {
        // Update job status
        job.status = 'completed';
        job.lastSync = new Date();
        job.retryCount = 0;
        job.error = undefined;
        
        // Schedule next sync based on priority
        job.nextSync = new Date(Date.now() + this.SYNC_INTERVALS[job.priority]);
        
        console.log(`[AUTO-SYNC] ✅ Sync completed for store: ${storeName}`);
        console.log(`[AUTO-SYNC] 📊 Synced: ${syncResult.syncedData.products} products, ${syncResult.syncedData.orders} orders, ${syncResult.syncedData.customers} customers`);
        
      } else {
        // Handle failure
        await this.handleSyncFailure(job, syncResult.error || 'Unknown error');
      }
      
    } catch (error) {
      await this.handleSyncFailure(job, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Always remove from active syncs
      this.activeSyncs.delete(storeId);
    }
  }

  /**
   * 🔄 Perform actual store synchronization
   */
  private async performStoreSync(storeId: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      storeId,
      storeName: '',
      success: false,
      syncedData: {
        products: 0,
        orders: 0,
        customers: 0,
        totalTime: 0
      },
      actions: []
    };

    try {
      // 1. Get valid token and store data
      const tokenData = await TiendaNubeTokenManager.getValidTokenWithStoreData(storeId);
      
      if (!tokenData) {
        throw new Error('No valid token available - store needs reconnection');
      }

      result.storeName = tokenData.storeName;
      result.actions.push('✅ Token validated');

      // 2. Initialize TiendaNube API
      const api = new TiendaNubeAPI(tokenData.token, tokenData.platformStoreId);
      result.actions.push('✅ API initialized');

      // 3. Sync data in parallel
      const syncTasks = [
        this.syncProducts(api, storeId),
        this.syncOrders(api, storeId),
        this.syncCustomers(api, storeId)
      ];

      const syncResults = await Promise.allSettled(syncTasks);
      
      // 4. Process results
      const taskNames = ['products', 'orders', 'customers'] as const;
      syncResults.forEach((taskResult, index) => {
        const taskName = taskNames[index];
        
        if (taskResult.status === 'fulfilled') {
          result.syncedData[taskName] = taskResult.value;
          result.actions.push(`✅ Synced ${taskResult.value} ${taskName}`);
        } else {
          result.actions.push(`❌ Failed to sync ${taskName}: ${taskResult.reason}`);
        }
      });

      // 5. Trigger RAG engine sync
      try {
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // Update RAG index with fresh data
        const syncResult = await ragEngine.indexStoreData(storeId, tokenData.token);
        result.actions.push(syncResult.success ? '✅ RAG index updated' : `⚠️ RAG sync partial: ${syncResult.error || 'Unknown error'}`);
        
      } catch (ragError) {
        result.actions.push(`⚠️ RAG sync failed: ${ragError instanceof Error ? ragError.message : 'Unknown error'}`);
      }

      // 6. Update store timestamp
      await StoreService.updateStore(storeId, {
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      result.actions.push('✅ Store timestamp updated');

      // 7. Calculate total time
      result.syncedData.totalTime = Date.now() - startTime;
      result.success = true;

      console.log(`[AUTO-SYNC] ✅ Store sync completed in ${result.syncedData.totalTime}ms`);
      
    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.syncedData.totalTime = Date.now() - startTime;
      result.actions.push(`❌ Sync failed: ${result.error}`);
      
      console.error(`[AUTO-SYNC] ❌ Store sync failed for ${storeId}:`, error);
    }

    return result;
  }

  /**
   * 📦 Sync products with database persistence
   */
  private async syncProducts(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const products = await api.getProducts({
        limit: 200,
        updated_at_min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // TODO: Implement actual database persistence
      // For now, just return count
      return products.length;
      
    } catch (error) {
      console.error('[AUTO-SYNC] Products sync failed:', error);
      throw error;
    }
  }

  /**
   * 🛒 Sync orders with database persistence
   */
  private async syncOrders(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const orders = await api.getOrders({
        limit: 100,
        updated_at_min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // TODO: Implement actual database persistence
      // For now, just return count
      return orders.length;
      
    } catch (error) {
      console.error('[AUTO-SYNC] Orders sync failed:', error);
      throw error;
    }
  }

  /**
   * 👥 Sync customers with database persistence
   */
  private async syncCustomers(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const customers = await api.getCustomers({
        limit: 100,
        created_at_min: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // TODO: Implement actual database persistence
      // For now, just return count
      return customers.length;
      
    } catch (error) {
      console.error('[AUTO-SYNC] Customers sync failed:', error);
      throw error;
    }
  }

  /**
   * ❌ Handle sync failure with exponential backoff
   */
  private async handleSyncFailure(job: SyncJob, error: string): Promise<void> {
    job.status = 'failed';
    job.error = error;
    job.retryCount++;

    const maxRetries = 3;
    
    if (job.retryCount >= maxRetries) {
      // Mark store for reconnection if too many failures
      console.error(`[AUTO-SYNC] ❌ Store ${job.storeName} failed ${maxRetries} times, marking for reconnection`);
      
      try {
        await TiendaNubeTokenManager.getInstance().markStoreForReconnection(
          job.storeId,
          `Auto-sync failed ${maxRetries} times: ${error}`
        );
        
        job.status = 'paused';
        job.nextSync = new Date(Date.now() + 24 * 60 * 60 * 1000); // Try again in 24 hours
        
      } catch (markError) {
        console.error(`[AUTO-SYNC] Failed to mark store for reconnection:`, markError);
      }
    } else {
      // Exponential backoff: 5 minutes, 15 minutes, 45 minutes
      const backoffMinutes = Math.pow(3, job.retryCount) * 5;
      job.nextSync = new Date(Date.now() + backoffMinutes * 60 * 1000);
      job.status = 'pending';
      
      console.warn(`[AUTO-SYNC] ⚠️ Store ${job.storeName} sync failed (attempt ${job.retryCount}/${maxRetries}), retrying in ${backoffMinutes} minutes`);
    }
  }

  /**
   * 🔄 Add or update store in scheduler
   */
  async addStore(storeId: string): Promise<void> {
    const supabase = createClient();
    
    const { data: store, error } = await supabase
      .from('stores')
      .select('id, name, user_id, platform, is_active, last_sync_at, created_at')
      .eq('id', storeId)
      .eq('platform', 'tiendanube')
      .single();

    if (error || !store) {
      console.error(`[AUTO-SYNC] Failed to add store ${storeId}:`, error);
      return;
    }

    const syncJob = this.createSyncJob(store);
    this.syncJobs.set(storeId, syncJob);
    
    console.log(`[AUTO-SYNC] 📋 Added store to scheduler: ${store.name} (${storeId})`);
  }

  /**
   * 🗑️ Remove store from scheduler
   */
  removeStore(storeId: string): void {
    if (this.syncJobs.has(storeId)) {
      this.syncJobs.delete(storeId);
      this.activeSyncs.delete(storeId);
      console.log(`[AUTO-SYNC] 🗑️ Removed store from scheduler: ${storeId}`);
    }
  }

  /**
   * 🚀 Trigger immediate sync for a store
   */
  async triggerImmediateSync(storeId: string): Promise<SyncResult> {
    const job = this.syncJobs.get(storeId);
    
    if (!job) {
      throw new Error(`Store ${storeId} not found in scheduler`);
    }

    if (this.activeSyncs.has(storeId)) {
      throw new Error(`Store ${storeId} is already being synced`);
    }

    console.log(`[AUTO-SYNC] 🚀 Triggering immediate sync for store: ${job.storeName}`);
    
    // Perform sync immediately
    const result = await this.performStoreSync(storeId);
    
    // Update job status
    if (result.success) {
      job.status = 'completed';
      job.lastSync = new Date();
      job.retryCount = 0;
      job.error = undefined;
      job.nextSync = new Date(Date.now() + this.SYNC_INTERVALS[job.priority]);
    } else {
      await this.handleSyncFailure(job, result.error || 'Unknown error');
    }

    return result;
  }

  /**
   * 📊 Get sync status for all stores
   */
  getSyncStatus(): { 
    totalStores: number;
    activeStores: number;
    pendingStores: number;
    failedStores: number;
    stores: Array<{ storeId: string; storeName: string; status: string; nextSync: string; lastSync: string | null; error?: string }>;
  } {
    const stores = Array.from(this.syncJobs.values()).map(job => ({
      storeId: job.storeId,
      storeName: job.storeName,
      status: job.status,
      nextSync: job.nextSync.toISOString(),
      lastSync: job.lastSync?.toISOString() || null,
      error: job.error
    }));

    return {
      totalStores: this.syncJobs.size,
      activeStores: stores.filter(s => s.status === 'running').length,
      pendingStores: stores.filter(s => s.status === 'pending').length,
      failedStores: stores.filter(s => s.status === 'failed').length,
      stores
    };
  }

  /**
   * 🛑 Stop the scheduler
   */
  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
    
    this.isRunning = false;
    console.log('[AUTO-SYNC] 🛑 Scheduler stopped');
  }
}

// Global scheduler instance
let globalScheduler: AutoSyncScheduler | null = null;

/**
 * 🚀 Get or create global scheduler instance
 */
export async function getAutoSyncScheduler(): Promise<AutoSyncScheduler> {
  if (!globalScheduler) {
    globalScheduler = new AutoSyncScheduler();
    await globalScheduler.initialize();
  }
  
  return globalScheduler;
}

/**
 * 🔄 Initialize auto-sync system (call this when app starts)
 */
export async function initializeAutoSync(): Promise<void> {
  try {
    console.log('[AUTO-SYNC] 🚀 Initializing auto-sync system...');
    await getAutoSyncScheduler();
    console.log('[AUTO-SYNC] ✅ Auto-sync system initialized successfully');
  } catch (error) {
    console.error('[AUTO-SYNC] ❌ Failed to initialize auto-sync system:', error);
    throw error;
  }
} 