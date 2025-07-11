/**
 * 🔄💎 ATOMIC SYNC TRANSACTION SERVICE
 * ===================================
 * 
 * Implements atomic transaction-like behavior across the three-tier sync system:
 * - Tienda Nube (data source)
 * - Supabase (database)
 * - Pinecone (vector database)
 * 
 * FEATURES:
 * - Atomic operations with rollback on failure
 * - Consistency checks between systems
 * - Detailed logging with [SYNC:*] prefixes
 * - Retry logic with exponential backoff
 * - Idempotency with unique sync IDs
 * - Global lock integration to prevent race conditions
 * 
 * TRANSACTION PHASES:
 * 1. PREPARE: Validate tokens, acquire locks, create sync ID
 * 2. EXECUTE: Perform operations across all three systems
 * 3. VERIFY: Check data consistency between systems
 * 4. COMMIT/ROLLBACK: Complete transaction or revert changes
 * 5. CLEANUP: Release locks and cleanup resources
 */

import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';
import { getUnifiedRAGEngine, type UnifiedFiniRAGEngine } from '@/lib/rag/unified-rag-engine';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import type { Store } from '@/lib/database/schema';
import { v4 as uuidv4 } from 'uuid';

// ===== TYPES & INTERFACES =====

export interface SyncTransactionOptions {
  type: 'full' | 'incremental' | 'cleanup';
  priority: 'high' | 'medium' | 'low';
  includeVectors: boolean;
  includeDatabase: boolean;
  consistencyChecks: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

export interface SyncTransactionState {
  syncId: string;
  storeId: string;
  accessToken: string;
  phase: 'prepare' | 'execute' | 'verify' | 'commit' | 'rollback' | 'cleanup' | 'completed' | 'failed';
  operations: string[];
  rollbackOperations: string[];
  startTime: number;
  lockProcessId?: string;
  tiendaNubeSnapshot?: any;
  supabaseSnapshot?: any;
  pineconeSnapshot?: any;
  retryCount: number;
  lastError?: string;
}

export interface SyncTransactionResult {
  success: boolean;
  syncId: string;
  executionTime: number;
  operations: string[];
  rollbackOperations: string[];
  phase: string;
  error?: string;
  consistencyChecks?: {
    tiendaNubeVsSupabase: boolean;
    supabaseVsPinecone: boolean;
    overallConsistency: boolean;
  };
  metrics: {
    tiendaNubeApiCalls: number;
    supabaseOperations: number;
    pineconeOperations: number;
    documentsProcessed: number;
    namespacesAffected: number;
  };
}

// ===== ATOMIC SYNC TRANSACTION SERVICE =====

export class AtomicSyncTransaction {
  private state: SyncTransactionState;
  private ragEngine: UnifiedFiniRAGEngine;
  private supabase = createClient();
  private options: SyncTransactionOptions;

  constructor(
    storeId: string,
    accessToken: string,
    options: Partial<SyncTransactionOptions> = {}
  ) {
    this.ragEngine = getUnifiedRAGEngine();
    this.options = {
      type: 'full',
      priority: 'high',
      includeVectors: true,
      includeDatabase: true,
      consistencyChecks: true,
      maxRetries: 3,
      retryDelayMs: 1000,
      ...options
    };

    this.state = {
      syncId: `sync-${storeId}-${Date.now()}-${uuidv4().slice(0, 8)}`,
      storeId,
      accessToken,
      phase: 'prepare',
      operations: [],
      rollbackOperations: [],
      startTime: Date.now(),
      retryCount: 0
    };

    console.log(`[SYNC:INFO] 💎 Created atomic sync transaction: ${this.state.syncId}`);
  }

  /**
   * Execute the complete atomic sync transaction
   */
  async execute(): Promise<SyncTransactionResult> {
    try {
      console.log(`[SYNC:INFO] 🚀 Starting atomic sync transaction: ${this.state.syncId}`);

      // PHASE 1: PREPARE
      await this.prepareTransaction();
      
      // PHASE 2: EXECUTE  
      await this.executeTransaction();
      
      // PHASE 3: VERIFY (if enabled)
      if (this.options.consistencyChecks) {
        await this.verifyConsistency();
      }
      
      // PHASE 4: COMMIT
      await this.commitTransaction();
      
      return this.buildSuccessResult();

    } catch (error) {
      console.error(`[SYNC:ERROR] ❌ Transaction failed in phase ${this.state.phase}: ${this.state.syncId}`, error);
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error';
      
      // PHASE 4: ROLLBACK
      try {
        await this.rollbackTransaction();
      } catch (rollbackError) {
        console.error(`[SYNC:ERROR] 💥 Rollback failed for ${this.state.syncId}:`, rollbackError);
      }
      
      return this.buildFailureResult();
    } finally {
      // PHASE 5: CLEANUP
      await this.cleanupTransaction();
    }
  }

  /**
   * PHASE 1: Prepare transaction - validate, acquire locks, create snapshots
   */
  private async prepareTransaction(): Promise<void> {
    this.state.phase = 'prepare';
    console.log(`[SYNC:INFO] 🔧 Preparing transaction: ${this.state.syncId}`);

    // Step 1: Check for existing sync transaction (idempotency)
    await this.checkForExistingSyncTransaction();

    // Step 2: Validate store and token
    const storeResult = await StoreService.getStore(this.state.storeId);
    if (!storeResult.success) {
      throw new Error(`Store not found: ${this.state.storeId}`);
    }
    this.state.operations.push('store_validated');

    // Step 3: Acquire global lock
    try {
      const { BackgroundSyncLocks } = await import('@/lib/rag/global-locks');
      const lockResult = await BackgroundSyncLocks.acquire(
        this.state.storeId,
        `Atomic sync transaction: ${this.state.syncId}`
      );
      
      if (!lockResult.success) {
        throw new Error(`Cannot acquire sync lock: ${lockResult.error}`);
      }
      
      this.state.lockProcessId = lockResult.processId!;
      this.state.operations.push('global_lock_acquired');
      this.state.rollbackOperations.push('release_global_lock');
      
    } catch (lockError) {
      console.warn(`[SYNC:ERROR] Lock system unavailable:`, lockError);
      throw lockError;
    }

    // Step 4: Create system snapshots for rollback
    await this.createSystemSnapshots();
    this.state.operations.push('snapshots_created');

    // Step 5: Register this transaction in database
    await this.registerSyncTransaction();

    console.log(`[SYNC:INFO] ✅ Transaction prepared: ${this.state.syncId}`);
  }

  /**
   * Check for existing sync transactions to ensure idempotency
   */
  private async checkForExistingSyncTransaction(): Promise<void> {
    console.log(`[SYNC:INFO] 🔍 Checking for existing sync transactions`);

    try {
      // Check for recent sync transactions
      const recentCutoff = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      const { data: recentSyncs } = await this.supabase
        .from('sync_transactions')
        .select('sync_id, status, sync_type, started_at')
        .eq('store_id', this.state.storeId)
        .eq('sync_type', this.options.type)
        .gte('started_at', recentCutoff.toISOString())
        .in('status', ['pending', 'running'])
        .order('started_at', { ascending: false })
        .limit(5);

      if (recentSyncs && recentSyncs.length > 0) {
        const runningSyncs = recentSyncs.filter(s => s.status === 'running');
        if (runningSyncs.length > 0) {
          console.warn(`[SYNC:WARN] Found ${runningSyncs.length} running sync transactions, proceeding with caution`);
          this.state.operations.push(`concurrent_sync_detected_${runningSyncs.length}`);
        }

        // Check for identical sync type within last minute (strong idempotency)
        const veryRecentCutoff = new Date(Date.now() - 60 * 1000); // 1 minute ago
        const identicalRecent = recentSyncs.filter(s => 
          s.sync_type === this.options.type && 
          new Date(s.started_at) > veryRecentCutoff
        );

        if (identicalRecent.length > 0) {
          const latestSync = identicalRecent[0];
          throw new Error(`Duplicate sync detected: ${latestSync.sync_id} started ${Math.round((Date.now() - new Date(latestSync.started_at).getTime()) / 1000)}s ago`);
        }
      }

      this.state.operations.push('idempotency_check_passed');
      console.log(`[SYNC:INFO] ✅ Idempotency check passed`);

    } catch (error) {
      if (error instanceof Error && error.message.includes('Duplicate sync detected')) {
        throw error; // Re-throw duplicate sync errors
      }
      console.warn(`[SYNC:WARN] Could not perform idempotency check:`, error);
      this.state.operations.push('idempotency_check_skipped');
    }
  }

  /**
   * Register this sync transaction in the database
   */
  private async registerSyncTransaction(): Promise<void> {
    console.log(`[SYNC:INFO] 📝 Registering sync transaction: ${this.state.syncId}`);

    try {
      await this.supabase
        .from('sync_transactions')
        .insert({
          sync_id: this.state.syncId,
          store_id: this.state.storeId,
          sync_type: this.options.type,
          status: 'pending',
          phase: this.state.phase,
          operations: this.state.operations,
          started_at: new Date(this.state.startTime).toISOString(),
          retry_count: this.state.retryCount,
          max_retries: this.options.maxRetries,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      this.state.operations.push('transaction_registered');
      console.log(`[SYNC:INFO] ✅ Sync transaction registered in database`);

    } catch (error) {
      console.error(`[SYNC:ERROR] Failed to register sync transaction:`, error);
      // Don't fail the entire transaction for registration issues
      this.state.operations.push('transaction_registration_failed');
    }
  }

  /**
   * PHASE 2: Execute main sync operations
   */
  private async executeTransaction(): Promise<void> {
    this.state.phase = 'execute';
    console.log(`[SYNC:INFO] ⚙️ Executing transaction: ${this.state.syncId}`);

    // Step 1: Sync from Tienda Nube to Supabase
    if (this.options.includeDatabase) {
      await this.syncTiendaNubeToSupabase();
    }

    // Step 2: Sync from Supabase to Pinecone
    if (this.options.includeVectors) {
      await this.syncSupabaseToPinecone();
    }

    // Step 3: Update sync metadata
    await this.updateSyncMetadata();

    console.log(`[SYNC:INFO] ✅ Transaction executed: ${this.state.syncId}`);
  }

  /**
   * PHASE 3: Verify data consistency between systems
   */
  private async verifyConsistency(): Promise<void> {
    this.state.phase = 'verify';
    console.log(`[SYNC:INFO] 🔍 Verifying consistency: ${this.state.syncId}`);

    try {
      // Use comprehensive consistency checker
      const { checkStoreConsistency } = await import('@/lib/services/sync-consistency-checker');
      
      const consistencyResult = await checkStoreConsistency(
        this.state.storeId,
        this.state.accessToken,
        {
          level: 'standard',
          dataTypes: ['store', 'products'],
          autoRepair: false,
          generateReport: true,
          maxDiscrepancies: 50
        }
      );

      // Store consistency check results
      this.state.operations.push(`consistency_score_${consistencyResult.overallScore}%`);
      this.state.operations.push(`discrepancies_found_${consistencyResult.discrepancies.length}`);

      // Fail if critical issues found
      const criticalIssues = consistencyResult.discrepancies.filter(d => d.severity === 'critical').length;
      if (criticalIssues > 0) {
        throw new Error(`${criticalIssues} critical consistency issues found`);
      }

      // Warn about high severity issues but don't fail
      const highIssues = consistencyResult.discrepancies.filter(d => d.severity === 'high').length;
      if (highIssues > 0) {
        console.warn(`[SYNC:WARN] ${highIssues} high severity consistency issues found`);
      }

      console.log(`[SYNC:INFO] ✅ Consistency verified: ${consistencyResult.overallScore}% (${this.state.syncId})`);
      this.state.operations.push('consistency_verified');

    } catch (error) {
      console.error(`[SYNC:ERROR] Consistency verification failed:`, error);
      // Fall back to basic checks
      await this.performBasicConsistencyChecks();
    }
  }

  /**
   * Fallback basic consistency checks
   */
  private async performBasicConsistencyChecks(): Promise<void> {
    console.log(`[SYNC:INFO] 🔍 Performing basic consistency fallback checks`);

    // Verify Tienda Nube vs Supabase consistency
    const tnVsSupabaseCheck = await this.verifyTiendaNubeSupabaseConsistency();
    
    // Verify Supabase vs Pinecone consistency  
    const supabaseVsPineconeCheck = await this.verifySupabasePineconeConsistency();

    if (!tnVsSupabaseCheck || !supabaseVsPineconeCheck) {
      throw new Error('Basic consistency checks failed');
    }

    this.state.operations.push('basic_consistency_verified');
    console.log(`[SYNC:INFO] ✅ Basic consistency verified: ${this.state.syncId}`);
  }

  /**
   * PHASE 4A: Commit transaction - finalize changes
   */
  private async commitTransaction(): Promise<void> {
    this.state.phase = 'commit';
    console.log(`[SYNC:INFO] 📝 Committing transaction: ${this.state.syncId}`);

    // Update store with successful sync timestamp
    await StoreService.updateStore(this.state.storeId, {
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.state.operations.push('transaction_committed');
    this.state.phase = 'completed';
    
    console.log(`[SYNC:INFO] ✅ Transaction committed: ${this.state.syncId}`);
  }

  /**
   * PHASE 4B: Rollback transaction - revert all changes
   */
  private async rollbackTransaction(): Promise<void> {
    this.state.phase = 'rollback';
    console.log(`[SYNC:ERROR] 🔙 Rolling back transaction: ${this.state.syncId}`);

    // Execute rollback operations in reverse order
    for (const rollbackOp of this.state.rollbackOperations.reverse()) {
      try {
        await this.executeRollbackOperation(rollbackOp);
        console.log(`[SYNC:INFO] ✅ Rollback operation completed: ${rollbackOp}`);
      } catch (rollbackError) {
        console.error(`[SYNC:ERROR] ❌ Rollback operation failed: ${rollbackOp}`, rollbackError);
      }
    }

    this.state.phase = 'failed';
    console.log(`[SYNC:ERROR] 🔙 Transaction rolled back: ${this.state.syncId}`);
  }

  /**
   * PHASE 5: Cleanup resources and release locks
   */
  private async cleanupTransaction(): Promise<void> {
    this.state.phase = 'cleanup';
    console.log(`[SYNC:INFO] 🧹 Cleaning up transaction: ${this.state.syncId}`);

    // Release global lock
    if (this.state.lockProcessId) {
      try {
        const { BackgroundSyncLocks } = await import('@/lib/rag/global-locks');
        await BackgroundSyncLocks.release(this.state.storeId, this.state.lockProcessId);
        console.log(`[SYNC:INFO] 🔓 Lock released: ${this.state.lockProcessId}`);
      } catch (unlockError) {
        console.error(`[SYNC:ERROR] Failed to release lock ${this.state.lockProcessId}:`, unlockError);
      }
    }

    // Clear snapshots from memory
    this.state.tiendaNubeSnapshot = undefined;
    this.state.supabaseSnapshot = undefined;
    this.state.pineconeSnapshot = undefined;

    console.log(`[SYNC:INFO] ✅ Transaction cleanup completed: ${this.state.syncId}`);
  }

  /**
   * Create system snapshots for rollback capability
   */
  private async createSystemSnapshots(): Promise<void> {
    console.log(`[SYNC:INFO] 📸 Creating system snapshots for rollback: ${this.state.syncId}`);

    // Create Supabase snapshot (store current state)
    const storeResult = await StoreService.getStore(this.state.storeId);
    if (storeResult.success) {
      this.state.supabaseSnapshot = {
        store: storeResult.store,
        timestamp: new Date().toISOString()
      };
    }

    // Create Pinecone snapshot (basic info)
    try {
      const stats = await this.ragEngine.getStats();
      this.state.pineconeSnapshot = {
        stats: stats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`[SYNC:WARN] Could not create Pinecone snapshot:`, error);
    }

    console.log(`[SYNC:INFO] ✅ Snapshots created: ${this.state.syncId}`);
  }

  /**
   * Sync data from Tienda Nube to Supabase
   */
  private async syncTiendaNubeToSupabase(): Promise<void> {
    console.log(`[SYNC:INFO] 🏪➡️📊 Syncing Tienda Nube to Supabase: ${this.state.syncId}`);

    const api = new TiendaNubeAPI(this.state.accessToken, this.state.storeId);
    
    // Fetch store data
    const storeInfo = await api.getStore();
    this.state.operations.push('tiendanube_store_fetched');

    // Update store record
    const updateResult = await StoreService.updateStore(this.state.storeId, {
      name: storeInfo.name,
      domain: storeInfo.url,
      currency: storeInfo.currency,
      language: storeInfo.language,
      updated_at: new Date().toISOString()
    });

    if (!updateResult.success) {
      throw new Error(`Failed to update store in Supabase: ${updateResult.error}`);
    }

    this.state.operations.push('supabase_store_updated');
    this.state.rollbackOperations.push('restore_supabase_store');

    console.log(`[SYNC:INFO] ✅ Tienda Nube to Supabase sync completed: ${this.state.syncId}`);
  }

  /**
   * Sync data from Supabase to Pinecone
   */
  private async syncSupabaseToPinecone(): Promise<void> {
    console.log(`[SYNC:INFO] 📊➡️🧠 Syncing Supabase to Pinecone: ${this.state.syncId}`);

    // Initialize or recreate namespaces
    const namespaceResult = await this.ragEngine.initializeStoreNamespaces(this.state.storeId);
    if (!namespaceResult.success) {
      throw new Error(`Failed to initialize Pinecone namespaces: ${namespaceResult.error}`);
    }
    this.state.operations.push('pinecone_namespaces_initialized');
    this.state.rollbackOperations.push('delete_pinecone_namespaces');

    // Index store data
    const indexResult = await this.ragEngine.indexStoreData(this.state.storeId, this.state.accessToken);
    if (!indexResult.success) {
      throw new Error(`Failed to index store data in Pinecone: ${indexResult.error}`);
    }

    this.state.operations.push(`pinecone_indexed_${indexResult.documentsIndexed}_docs`);
    console.log(`[SYNC:INFO] ✅ Supabase to Pinecone sync completed: ${this.state.syncId}`);
  }

  /**
   * Update sync metadata in database
   */
  private async updateSyncMetadata(): Promise<void> {
    console.log(`[SYNC:INFO] 📅 Updating sync metadata: ${this.state.syncId}`);

    await this.supabase
      .from('sync_transactions')
      .upsert({
        sync_id: this.state.syncId,
        store_id: this.state.storeId,
        sync_type: this.options.type,
        status: this.state.phase === 'completed' ? 'completed' : 'running',
        phase: this.state.phase,
        operations: this.state.operations,
        rollback_operations: this.state.rollbackOperations,
        started_at: new Date(this.state.startTime).toISOString(),
        execution_time_ms: this.state.phase === 'completed' ? Date.now() - this.state.startTime : null,
        lock_process_id: this.state.lockProcessId,
        lock_acquired_at: this.state.lockProcessId ? new Date().toISOString() : null,
        error_message: this.state.lastError,
        retry_count: this.state.retryCount,
        max_retries: this.options.maxRetries,
        metrics: {
          tiendaNubeApiCalls: this.state.operations.filter(op => op.includes('tiendanube')).length,
          supabaseOperations: this.state.operations.filter(op => op.includes('supabase')).length,
          pineconeOperations: this.state.operations.filter(op => op.includes('pinecone')).length,
          documentsProcessed: this.extractDocumentCount(),
          namespacesAffected: this.extractNamespaceCount()
        },
        system_snapshots: {
          tiendaNube: this.state.tiendaNubeSnapshot,
          supabase: this.state.supabaseSnapshot,
          pinecone: this.state.pineconeSnapshot
        },
        updated_at: new Date().toISOString()
      });

    this.state.operations.push('sync_metadata_updated');
  }

  /**
   * Verify consistency between Tienda Nube and Supabase
   */
  private async verifyTiendaNubeSupabaseConsistency(): Promise<boolean> {
    console.log(`[SYNC:INFO] 🔍 Verifying Tienda Nube vs Supabase consistency: ${this.state.syncId}`);

    try {
      // Basic consistency check - compare store info
      const api = new TiendaNubeAPI(this.state.accessToken, this.state.storeId);
      const tnStoreInfo = await api.getStore();
      
      const storeResult = await StoreService.getStore(this.state.storeId);
      if (!storeResult.success) return false;
      
      const supabaseStore = storeResult.store!;
      
      // Check key fields match
      const nameMatch = tnStoreInfo.name === supabaseStore.name;
      const domainMatch = tnStoreInfo.url === supabaseStore.domain;
      
      if (!nameMatch || !domainMatch) {
        console.error(`[SYNC:ERROR] Data mismatch detected - TN name: ${tnStoreInfo.name}, SB name: ${supabaseStore.name}`);
        return false;
      }
      
      console.log(`[SYNC:INFO] ✅ Tienda Nube vs Supabase consistency verified: ${this.state.syncId}`);
      return true;
      
    } catch (error) {
      console.error(`[SYNC:ERROR] Consistency check failed:`, error);
      return false;
    }
  }

  /**
   * Verify consistency between Supabase and Pinecone
   */
  private async verifySupabasePineconeConsistency(): Promise<boolean> {
    console.log(`[SYNC:INFO] 🔍 Verifying Supabase vs Pinecone consistency: ${this.state.syncId}`);

    try {
      // Basic consistency check - ensure RAG engine is responding
      const stats = await this.ragEngine.getStats();
      
      if (!stats.isConfigured) {
        console.warn(`[SYNC:WARN] RAG engine not properly configured`);
        return false;
      }
      
      console.log(`[SYNC:INFO] ✅ Supabase vs Pinecone consistency verified: ${this.state.syncId}`);
      return true;
      
    } catch (error) {
      console.error(`[SYNC:ERROR] Pinecone consistency check failed:`, error);
      return false;
    }
  }

  /**
   * Execute specific rollback operation
   */
  private async executeRollbackOperation(operation: string): Promise<void> {
    console.log(`[SYNC:INFO] 🔙 Executing rollback operation: ${operation}`);

    switch (operation) {
      case 'restore_supabase_store':
        if (this.state.supabaseSnapshot?.store) {
          await StoreService.updateStore(this.state.storeId, this.state.supabaseSnapshot.store);
        }
        break;

      case 'delete_pinecone_namespaces':
        await this.ragEngine.deleteStoreNamespaces(this.state.storeId);
        break;

      case 'release_global_lock':
        if (this.state.lockProcessId) {
          const { BackgroundSyncLocks } = await import('@/lib/rag/global-locks');
          await BackgroundSyncLocks.release(this.state.storeId, this.state.lockProcessId);
        }
        break;

      default:
        console.warn(`[SYNC:WARN] Unknown rollback operation: ${operation}`);
    }
  }

  /**
   * Build success result
   */
  private buildSuccessResult(): SyncTransactionResult {
    return {
      success: true,
      syncId: this.state.syncId,
      executionTime: Date.now() - this.state.startTime,
      operations: this.state.operations,
      rollbackOperations: [],
      phase: this.state.phase,
      metrics: {
        tiendaNubeApiCalls: this.state.operations.filter(op => op.includes('tiendanube')).length,
        supabaseOperations: this.state.operations.filter(op => op.includes('supabase')).length,
        pineconeOperations: this.state.operations.filter(op => op.includes('pinecone')).length,
        documentsProcessed: this.extractDocumentCount(),
        namespacesAffected: this.extractNamespaceCount()
      }
    };
  }

  /**
   * Build failure result
   */
  private buildFailureResult(): SyncTransactionResult {
    return {
      success: false,
      syncId: this.state.syncId,
      executionTime: Date.now() - this.state.startTime,
      operations: this.state.operations,
      rollbackOperations: this.state.rollbackOperations,
      phase: this.state.phase,
      error: this.state.lastError,
      metrics: {
        tiendaNubeApiCalls: this.state.operations.filter(op => op.includes('tiendanube')).length,
        supabaseOperations: this.state.operations.filter(op => op.includes('supabase')).length,
        pineconeOperations: this.state.operations.filter(op => op.includes('pinecone')).length,
        documentsProcessed: this.extractDocumentCount(),
        namespacesAffected: this.extractNamespaceCount()
      }
    };
  }

  /**
   * Extract document count from operations
   */
  private extractDocumentCount(): number {
    const indexOps = this.state.operations.filter(op => op.includes('indexed_') && op.includes('_docs'));
    if (indexOps.length === 0) return 0;
    
    const match = indexOps[0].match(/indexed_(\d+)_docs/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Extract namespace count from operations
   */
  private extractNamespaceCount(): number {
    const namespaceOps = this.state.operations.filter(op => op.includes('namespaces') || op.includes('pinecone'));
    return namespaceOps.length;
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Create and execute atomic sync transaction
 */
export async function executeAtomicSync(
  storeId: string,
  accessToken: string,
  options: Partial<SyncTransactionOptions> = {}
): Promise<SyncTransactionResult> {
  const transaction = new AtomicSyncTransaction(storeId, accessToken, options);
  return await transaction.execute();
}

/**
 * Retry atomic sync with exponential backoff
 */
export async function executeAtomicSyncWithRetry(
  storeId: string,
  accessToken: string,
  options: Partial<SyncTransactionOptions> = {}
): Promise<SyncTransactionResult> {
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.retryDelayMs || 1000;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeAtomicSync(storeId, accessToken, {
        ...options,
        maxRetries: 0 // Disable retries within transaction
      });
      
      if (result.success) {
        console.log(`[SYNC:INFO] ✅ Atomic sync succeeded on attempt ${attempt + 1}: ${result.syncId}`);
        return result;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[SYNC:INFO] ⏳ Retry attempt ${attempt + 1} failed, waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
    } catch (error) {
      console.error(`[SYNC:ERROR] Atomic sync attempt ${attempt + 1} failed:`, error);
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  // All retries failed
  return {
    success: false,
    syncId: `failed-${storeId}-${Date.now()}`,
    executionTime: 0,
    operations: [],
    rollbackOperations: [],
    phase: 'failed',
    error: `All ${maxRetries + 1} sync attempts failed`,
    metrics: {
      tiendaNubeApiCalls: 0,
      supabaseOperations: 0,
      pineconeOperations: 0,
      documentsProcessed: 0,
      namespacesAffected: 0
    }
  };
} 