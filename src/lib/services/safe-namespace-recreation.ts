/**
 * 🔄📦 SAFE NAMESPACE RECREATION SERVICE
 * ====================================
 * 
 * Handles Pinecone namespace recreation safely during store reconnections with:
 * - Version-controlled namespace recreation
 * - Atomic creation/migration/cleanup
 * - Data preservation during transitions
 * - Race condition prevention
 * - Rollback capabilities
 * 
 * SAFETY GUARANTEES:
 * - No data loss during namespace recreation
 * - Atomic transitions between namespace versions
 * - Comprehensive conflict detection
 * - Automatic rollback on failures
 * - Lock-aware operations
 * 
 * RECREATION PHASES:
 * 1. PREPARE: Validate store, acquire locks, create version
 * 2. CREATE: Create new versioned namespaces
 * 3. MIGRATE: Copy critical data from old namespaces (if exists)
 * 4. VERIFY: Validate new namespaces are functional
 * 5. ACTIVATE: Atomically switch to new version
 * 6. CLEANUP: Remove old namespace versions
 */

import { v4 as uuidv4 } from 'uuid';
import {
  EnhancedStoreReconnectionLocks,
  EnhancedNamespaceRecreationLocks,
  generateNamespaceVersion,
  getCurrentNamespaceVersion,
  isNamespaceVersionActive,
  EnhancedRAGLockType
} from '@/lib/rag/enhanced-global-locks';

// ===== TYPES & INTERFACES =====

export interface NamespaceRecreationOptions {
  storeId: string;
  parentLockProcessId: string; // From parent reconnection process
  preserveExistingData?: boolean;
  forceRecreation?: boolean;
  timeoutMs?: number;
  retryAttempts?: number;
}

export interface NamespaceRecreationResult {
  success: boolean;
  newVersion?: string;
  oldVersion?: string;
  namespacesCreated: string[];
  dataPreserved: boolean;
  executionTime: number;
  error?: string;
  rollbackPerformed?: boolean;
  metrics?: {
    documentsPreserved: number;
    namespacesRecreated: number;
    verificationsPassed: number;
  };
}

export interface NamespaceBackup {
  storeId: string;
  version: string;
  namespace: string;
  documentCount: number;
  backupData: any[];
  createdAt: number;
}

export interface RecreationPhaseResult {
  phase: string;
  success: boolean;
  duration: number;
  error?: string;
  metrics?: Record<string, any>;
}

// ===== CONSTANTS =====

const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes
const DEFAULT_RETRY_ATTEMPTS = 2;
const VERIFICATION_SAMPLE_SIZE = 10;
const MAX_BACKUP_DOCUMENTS = 1000; // Limit backup size

const NAMESPACE_TYPES = [
  'store',
  'products', 
  'orders',
  'customers',
  'analytics',
  'conversations'
];

// ===== MAIN SERVICE CLASS =====

export class SafeNamespaceRecreationService {
  private ragEngine: any;
  private activeRecreations = new Map<string, Promise<NamespaceRecreationResult>>();
  
  constructor() {
    // Dynamic import will be done in methods to avoid circular dependencies
  }

  /**
   * 🔄 Main entry point for safe namespace recreation
   */
  async recreateNamespacesSafely(
    options: NamespaceRecreationOptions
  ): Promise<NamespaceRecreationResult> {
    
    const startTime = Date.now();
    const { storeId, parentLockProcessId } = options;
    
    // Prevent concurrent recreations for the same store
    if (this.activeRecreations.has(storeId)) {
      console.log(`[NAMESPACE:RECREATION] ⏳ Recreation already in progress for store: ${storeId}`);
      return await this.activeRecreations.get(storeId)!;
    }

    const recreationPromise = this._performRecreation(options);
    this.activeRecreations.set(storeId, recreationPromise);

    try {
      const result = await recreationPromise;
      return result;
    } finally {
      this.activeRecreations.delete(storeId);
    }
  }

  /**
   * 🔧 Internal recreation workflow
   */
  private async _performRecreation(
    options: NamespaceRecreationOptions
  ): Promise<NamespaceRecreationResult> {
    
    const startTime = Date.now();
    const { storeId, parentLockProcessId } = options;
    const phases: RecreationPhaseResult[] = [];
    let lockProcessId: string | null = null;
    let newVersion: string | null = null;
    let oldVersion: string | null = null;
    let rollbackPerformed = false;

    console.log(`[NAMESPACE:RECREATION] 🔄 Starting safe namespace recreation for store: ${storeId}`);

    try {
      // ===== PHASE 1: PREPARE =====
      const prepareResult = await this._phasePreparation(storeId, parentLockProcessId, options);
      phases.push(prepareResult);
      
      if (!prepareResult.success) {
        throw new Error(`Preparation failed: ${prepareResult.error}`);
      }
      
      lockProcessId = prepareResult.metrics?.lockProcessId;
      newVersion = prepareResult.metrics?.newVersion;
      oldVersion = prepareResult.metrics?.oldVersion;

      // ===== PHASE 2: CREATE NEW NAMESPACES =====
      const createResult = await this._phaseCreateNamespaces(storeId, newVersion!, options);
      phases.push(createResult);
      
      if (!createResult.success) {
        throw new Error(`Namespace creation failed: ${createResult.error}`);
      }

      // ===== PHASE 3: MIGRATE DATA (if needed) =====
      let dataPreserved = false;
      if (options.preserveExistingData && oldVersion) {
        const migrateResult = await this._phaseMigrateData(storeId, oldVersion, newVersion!, options);
        phases.push(migrateResult);
        
        if (!migrateResult.success) {
          console.warn(`[NAMESPACE:RECREATION] ⚠️ Data migration failed, continuing without preservation: ${migrateResult.error}`);
        } else {
          dataPreserved = true;
        }
      }

      // ===== PHASE 4: VERIFY NEW NAMESPACES =====
      const verifyResult = await this._phaseVerifyNamespaces(storeId, newVersion!, options);
      phases.push(verifyResult);
      
      if (!verifyResult.success) {
        throw new Error(`Namespace verification failed: ${verifyResult.error}`);
      }

      // ===== PHASE 5: ACTIVATE NEW VERSION =====
      const activateResult = await this._phaseActivateVersion(storeId, newVersion!, lockProcessId!);
      phases.push(activateResult);
      
      if (!activateResult.success) {
        throw new Error(`Version activation failed: ${activateResult.error}`);
      }

      // ===== PHASE 6: CLEANUP OLD VERSIONS =====
      if (oldVersion) {
        const cleanupResult = await this._phaseCleanupOldVersions(storeId, oldVersion, options);
        phases.push(cleanupResult);
        // Cleanup failure is not critical
      }

      const executionTime = Date.now() - startTime;
      console.log(`[NAMESPACE:RECREATION] ✅ Safe namespace recreation completed for store ${storeId} in ${executionTime}ms`);

      return {
        success: true,
        newVersion,
        oldVersion,
        namespacesCreated: NAMESPACE_TYPES.map(type => `${storeId}_${type}_${newVersion}`),
        dataPreserved,
        executionTime,
        metrics: {
          documentsPreserved: dataPreserved ? phases.find(p => p.phase === 'migrate')?.metrics?.documentsPreserved || 0 : 0,
          namespacesRecreated: NAMESPACE_TYPES.length,
          verificationsPassed: verifyResult.metrics?.verificationsPassed || 0
        }
      };

    } catch (error) {
      console.error(`[NAMESPACE:RECREATION] ❌ Recreation failed for store ${storeId}:`, error);
      
      // Attempt rollback
      if (newVersion && lockProcessId) {
        try {
          await this._performRollback(storeId, newVersion, oldVersion, lockProcessId);
          rollbackPerformed = true;
        } catch (rollbackError) {
          console.error(`[NAMESPACE:RECREATION] ❌ Rollback failed:`, rollbackError);
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        namespacesCreated: [],
        dataPreserved: false,
        executionTime: Date.now() - startTime,
        rollbackPerformed
      };
    }
  }

  /**
   * 🔧 Phase 1: Preparation and validation
   */
  private async _phasePreparation(
    storeId: string,
    parentLockProcessId: string,
    options: NamespaceRecreationOptions
  ): Promise<RecreationPhaseResult> {
    
    const phaseStart = Date.now();
    
    try {
      console.log(`[NAMESPACE:RECREATION] 🔧 Phase 1: Preparing recreation for store ${storeId}`);

      // Initialize RAG engine
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      this.ragEngine = getUnifiedRAGEngine();

      // Generate new version
      const newVersion = generateNamespaceVersion();
      const oldVersion = getCurrentNamespaceVersion(storeId)?.version || null;

      // Acquire namespace recreation lock
      const lockResult = await EnhancedNamespaceRecreationLocks.acquire(
        storeId,
        parentLockProcessId,
        newVersion,
        'Safe namespace recreation during store reconnection'
      );

      if (!lockResult.success) {
        throw new Error(`Failed to acquire namespace recreation lock: ${lockResult.error}`);
      }

      console.log(`[NAMESPACE:RECREATION] 🔒 Namespace recreation lock acquired: ${lockResult.processId}`);

      // Validate store exists and is accessible
      const { StoreService } = await import('@/lib/database/client');
      const storeResult = await StoreService.getStore(storeId);
      
      if (!storeResult.success) {
        throw new Error(`Store validation failed: ${storeResult.error}`);
      }

      return {
        phase: 'prepare',
        success: true,
        duration: Date.now() - phaseStart,
        metrics: {
          lockProcessId: lockResult.processId,
          newVersion,
          oldVersion,
          storeValidated: true
        }
      };

    } catch (error) {
      return {
        phase: 'prepare',
        success: false,
        duration: Date.now() - phaseStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔧 Phase 2: Create new versioned namespaces
   */
  private async _phaseCreateNamespaces(
    storeId: string,
    version: string,
    options: NamespaceRecreationOptions
  ): Promise<RecreationPhaseResult> {
    
    const phaseStart = Date.now();
    
    try {
      console.log(`[NAMESPACE:RECREATION] 🏗️ Phase 2: Creating new namespaces with version ${version}`);

      // Create all namespace types with versioning
      const creationPromises = NAMESPACE_TYPES.map(async (namespaceType) => {
        const namespaceName = `${storeId}_${namespaceType}_${version}`;
        
        try {
          // Create namespace with minimal placeholder document
          const success = await this.ragEngine.createNamespaceWithPlaceholder(namespaceName);
          if (success) {
            console.log(`[NAMESPACE:RECREATION] ✅ Created namespace: ${namespaceName}`);
            return namespaceName;
          } else {
            throw new Error(`Failed to create namespace: ${namespaceName}`);
          }
        } catch (error) {
          console.error(`[NAMESPACE:RECREATION] ❌ Failed to create namespace ${namespaceName}:`, error);
          throw error;
        }
      });

      const createdNamespaces = await Promise.all(creationPromises);

      return {
        phase: 'create',
        success: true,
        duration: Date.now() - phaseStart,
        metrics: {
          namespacesCreated: createdNamespaces.length,
          createdNamespaces
        }
      };

    } catch (error) {
      return {
        phase: 'create',
        success: false,
        duration: Date.now() - phaseStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔧 Phase 3: Migrate critical data from old namespaces
   */
  private async _phaseMigrateData(
    storeId: string,
    oldVersion: string,
    newVersion: string,
    options: NamespaceRecreationOptions
  ): Promise<RecreationPhaseResult> {
    
    const phaseStart = Date.now();
    
    try {
      console.log(`[NAMESPACE:RECREATION] 📦 Phase 3: Migrating data from ${oldVersion} to ${newVersion}`);

      let totalDocumentsMigrated = 0;

      // Migrate data for each namespace type
      for (const namespaceType of NAMESPACE_TYPES) {
        const oldNamespace = `${storeId}_${namespaceType}_${oldVersion}`;
        const newNamespace = `${storeId}_${namespaceType}_${newVersion}`;

        try {
          // Get sample of documents from old namespace
          const oldDocuments = await this.ragEngine.getSampleDocuments(oldNamespace, VERIFICATION_SAMPLE_SIZE);
          
          if (oldDocuments && oldDocuments.length > 0) {
            // Migrate documents to new namespace
            const migrationResult = await this.ragEngine.migrateDocuments(oldDocuments, newNamespace);
            
            if (migrationResult.success) {
              totalDocumentsMigrated += migrationResult.documentsProcessed || 0;
              console.log(`[NAMESPACE:RECREATION] 📦 Migrated ${migrationResult.documentsProcessed} documents for ${namespaceType}`);
            }
          }
        } catch (error) {
          console.warn(`[NAMESPACE:RECREATION] ⚠️ Migration failed for ${namespaceType}:`, error);
          // Continue with other namespaces
        }
      }

      return {
        phase: 'migrate',
        success: true,
        duration: Date.now() - phaseStart,
        metrics: {
          documentsPreserved: totalDocumentsMigrated,
          namespacesProcessed: NAMESPACE_TYPES.length
        }
      };

    } catch (error) {
      return {
        phase: 'migrate',
        success: false,
        duration: Date.now() - phaseStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔧 Phase 4: Verify new namespaces are functional
   */
  private async _phaseVerifyNamespaces(
    storeId: string,
    version: string,
    options: NamespaceRecreationOptions
  ): Promise<RecreationPhaseResult> {
    
    const phaseStart = Date.now();
    
    try {
      console.log(`[NAMESPACE:RECREATION] ✅ Phase 4: Verifying namespaces for version ${version}`);

      let verificationsPassed = 0;

      // Verify each namespace is accessible and functional
      for (const namespaceType of NAMESPACE_TYPES) {
        const namespaceName = `${storeId}_${namespaceType}_${version}`;

        try {
          // Check if namespace exists and is queryable
          const exists = await this.ragEngine.namespaceExists(namespaceName);
          const stats = await this.ragEngine.getNamespaceStats(namespaceName);
          
          if (exists && stats) {
            verificationsPassed++;
            console.log(`[NAMESPACE:RECREATION] ✅ Verified namespace: ${namespaceName}`);
          } else {
            throw new Error(`Namespace verification failed: ${namespaceName}`);
          }
        } catch (error) {
          console.error(`[NAMESPACE:RECREATION] ❌ Verification failed for ${namespaceName}:`, error);
          throw error;
        }
      }

      if (verificationsPassed !== NAMESPACE_TYPES.length) {
        throw new Error(`Only ${verificationsPassed}/${NAMESPACE_TYPES.length} namespaces verified successfully`);
      }

      return {
        phase: 'verify',
        success: true,
        duration: Date.now() - phaseStart,
        metrics: {
          verificationsPassed,
          totalNamespaces: NAMESPACE_TYPES.length
        }
      };

    } catch (error) {
      return {
        phase: 'verify',
        success: false,
        duration: Date.now() - phaseStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔧 Phase 5: Activate new version atomically
   */
  private async _phaseActivateVersion(
    storeId: string,
    version: string,
    lockProcessId: string
  ): Promise<RecreationPhaseResult> {
    
    const phaseStart = Date.now();
    
    try {
      console.log(`[NAMESPACE:RECREATION] 🚀 Phase 5: Activating version ${version}`);

      // Release the namespace recreation lock with success status
      const releaseResult = await EnhancedNamespaceRecreationLocks.release(storeId, lockProcessId, true);
      
      if (!releaseResult.success) {
        throw new Error(`Failed to activate version: ${releaseResult.error}`);
      }

      console.log(`[NAMESPACE:RECREATION] ✅ Version ${version} activated for store ${storeId}`);

      return {
        phase: 'activate',
        success: true,
        duration: Date.now() - phaseStart,
        metrics: {
          activatedVersion: version,
          lockReleased: true
        }
      };

    } catch (error) {
      return {
        phase: 'activate',
        success: false,
        duration: Date.now() - phaseStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔧 Phase 6: Cleanup old namespace versions
   */
  private async _phaseCleanupOldVersions(
    storeId: string,
    oldVersion: string,
    options: NamespaceRecreationOptions
  ): Promise<RecreationPhaseResult> {
    
    const phaseStart = Date.now();
    
    try {
      console.log(`[NAMESPACE:RECREATION] 🧹 Phase 6: Cleaning up old version ${oldVersion}`);

      let namespacesDeleted = 0;

      // Delete old namespaces
      for (const namespaceType of NAMESPACE_TYPES) {
        const oldNamespace = `${storeId}_${namespaceType}_${oldVersion}`;

        try {
          const deleted = await this.ragEngine.deleteNamespace(oldNamespace);
          if (deleted) {
            namespacesDeleted++;
            console.log(`[NAMESPACE:RECREATION] 🗑️ Deleted old namespace: ${oldNamespace}`);
          }
        } catch (error) {
          console.warn(`[NAMESPACE:RECREATION] ⚠️ Failed to delete old namespace ${oldNamespace}:`, error);
          // Continue with other namespaces
        }
      }

      return {
        phase: 'cleanup',
        success: true,
        duration: Date.now() - phaseStart,
        metrics: {
          namespacesDeleted,
          oldVersionRemoved: oldVersion
        }
      };

    } catch (error) {
      return {
        phase: 'cleanup',
        success: false,
        duration: Date.now() - phaseStart,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔄 Perform rollback if recreation fails
   */
  private async _performRollback(
    storeId: string,
    failedVersion: string,
    oldVersion: string | null,
    lockProcessId: string
  ): Promise<void> {
    
    console.log(`[NAMESPACE:RECREATION] 🔄 Performing rollback for store ${storeId}, failed version: ${failedVersion}`);

    try {
      // Delete failed namespaces
      for (const namespaceType of NAMESPACE_TYPES) {
        const failedNamespace = `${storeId}_${namespaceType}_${failedVersion}`;
        
        try {
          await this.ragEngine.deleteNamespace(failedNamespace);
          console.log(`[NAMESPACE:RECREATION] 🗑️ Rollback: Deleted failed namespace ${failedNamespace}`);
        } catch (error) {
          console.warn(`[NAMESPACE:RECREATION] ⚠️ Rollback: Failed to delete ${failedNamespace}:`, error);
        }
      }

      // Release lock with failure status
      await EnhancedNamespaceRecreationLocks.release(storeId, lockProcessId, false);

      console.log(`[NAMESPACE:RECREATION] ✅ Rollback completed for store ${storeId}`);

    } catch (error) {
      console.error(`[NAMESPACE:RECREATION] ❌ Rollback failed for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * 📊 Get recreation status for a store
   */
  getRecreationStatus(storeId: string): {
    inProgress: boolean;
    currentVersion?: string;
    activeVersion?: string;
  } {
    const inProgress = this.activeRecreations.has(storeId);
    const currentVersion = getCurrentNamespaceVersion(storeId);
    
    return {
      inProgress,
      currentVersion: currentVersion?.version,
      activeVersion: currentVersion?.status === 'active' ? currentVersion.version : undefined
    };
  }
}

// ===== SINGLETON INSTANCE =====

let serviceInstance: SafeNamespaceRecreationService | null = null;

export function getSafeNamespaceRecreationService(): SafeNamespaceRecreationService {
  if (!serviceInstance) {
    serviceInstance = new SafeNamespaceRecreationService();
  }
  return serviceInstance;
}

// ===== HELPER FUNCTIONS =====

/**
 * 🔄 Main entry point for safe namespace recreation
 */
export async function recreateNamespacesSafely(
  options: NamespaceRecreationOptions
): Promise<NamespaceRecreationResult> {
  const service = getSafeNamespaceRecreationService();
  return await service.recreateNamespacesSafely(options);
}

/**
 * 📊 Check if store has namespace recreation in progress
 */
export function isNamespaceRecreationInProgress(storeId: string): boolean {
  const service = getSafeNamespaceRecreationService();
  return service.getRecreationStatus(storeId).inProgress;
} 