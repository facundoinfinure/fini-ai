/**
 * 🔒 ENHANCED GLOBAL RAG OPERATION LOCKS SYSTEM
 * =============================================
 * 
 * Sistema robusto de locks para prevenir race conditions entre:
 * - Store deletion operations
 * - Store reconnection operations  
 * - Background sync operations
 * - Manual sync operations
 * - Auto-sync scheduler operations
 * 
 * FEATURES:
 * - Multiple lock types per store
 * - Priority-based lock management
 * - Automatic timeout and cleanup
 * - Comprehensive logging
 * - Debug utilities
 */

// Lock types in order of priority (higher number = higher priority)
export enum RAGLockType {
  BACKGROUND_SYNC = 1,    // Background auto-sync (lowest priority)
  MANUAL_SYNC = 2,        // Manual user-triggered sync
  RECONNECTION = 3,       // Store reconnection process
  DELETION = 4            // Store deletion (highest priority)
}

interface RAGLock {
  storeId: string;
  type: RAGLockType;
  operation: string;      // Description of the operation
  timestamp: number;      // When the lock was acquired
  processId: string;      // Unique process identifier
  reason: string;         // Why this lock was acquired
}

// In-memory locks storage
const activeLocks = new Map<string, RAGLock[]>(); // storeId -> array of locks

// Lock configuration
const LOCK_TIMEOUT_MS = {
  [RAGLockType.BACKGROUND_SYNC]: 120000,  // 2 minutes
  [RAGLockType.MANUAL_SYNC]: 180000,      // 3 minutes
  [RAGLockType.RECONNECTION]: 300000,     // 5 minutes
  [RAGLockType.DELETION]: 120000          // 2 minutes
};

// Generate unique process ID
function generateProcessId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 🔒 Acquire a lock for a store operation
 */
export async function acquireRAGLock(
  storeId: string,
  lockType: RAGLockType,
  operation: string,
  reason: string = ''
): Promise<{ success: boolean; processId?: string; error?: string; blockedBy?: RAGLock[] }> {
  
  // Clean up expired locks first
  await cleanupExpiredLocks();
  
  const processId = generateProcessId();
  const now = Date.now();
  
  // Get existing locks for this store
  const existingLocks = activeLocks.get(storeId) || [];
  
  // Check for conflicts with higher priority locks
  const conflictingLocks = existingLocks.filter(lock => 
    lock.type >= lockType && lock.type !== lockType
  );
  
  // Check for same-type locks (generally not allowed)
  const sameTypeLocks = existingLocks.filter(lock => lock.type === lockType);
  
  if (conflictingLocks.length > 0) {
    console.warn(`[RAG:LOCK] ❌ Cannot acquire ${RAGLockType[lockType]} lock for store ${storeId} - blocked by higher priority operations`);
    return {
      success: false,
      error: 'Blocked by higher priority operations',
      blockedBy: conflictingLocks
    };
  }
  
  if (sameTypeLocks.length > 0) {
    console.warn(`[RAG:LOCK] ❌ Cannot acquire ${RAGLockType[lockType]} lock for store ${storeId} - same operation already in progress`);
    return {
      success: false,
      error: 'Same operation already in progress',
      blockedBy: sameTypeLocks
    };
  }
  
  // Create new lock
  const newLock: RAGLock = {
    storeId,
    type: lockType,
    operation,
    timestamp: now,
    processId,
    reason: reason || operation
  };
  
  // Add to locks storage
  if (!activeLocks.has(storeId)) {
    activeLocks.set(storeId, []);
  }
  activeLocks.get(storeId)!.push(newLock);
  
  console.warn(`[RAG:LOCK] 🔒 Acquired ${RAGLockType[lockType]} lock for store ${storeId}: ${operation} (process: ${processId})`);
  
  return {
    success: true,
    processId
  };
}

/**
 * 🔓 Release a specific lock
 */
export async function releaseRAGLock(
  storeId: string,
  processId: string
): Promise<{ success: boolean; error?: string }> {
  
  const storeLocks = activeLocks.get(storeId);
  if (!storeLocks) {
    return {
      success: false,
      error: 'No locks found for store'
    };
  }
  
  const lockIndex = storeLocks.findIndex(lock => lock.processId === processId);
  if (lockIndex === -1) {
    return {
      success: false,
      error: 'Lock not found or already released'
    };
  }
  
  const lock = storeLocks[lockIndex];
  storeLocks.splice(lockIndex, 1);
  
  // Remove store from map if no more locks
  if (storeLocks.length === 0) {
    activeLocks.delete(storeId);
  }
  
  console.warn(`[RAG:LOCK] 🔓 Released ${RAGLockType[lock.type]} lock for store ${storeId}: ${lock.operation} (process: ${processId})`);
  
  return { success: true };
}

/**
 * 🧹 Clean up expired locks
 */
export async function cleanupExpiredLocks(): Promise<number> {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [storeId, locks] of activeLocks.entries()) {
    const validLocks = locks.filter(lock => {
      const age = now - lock.timestamp;
      const timeout = LOCK_TIMEOUT_MS[lock.type];
      
      if (age > timeout) {
        console.warn(`[RAG:LOCK] ⏰ Cleaning expired ${RAGLockType[lock.type]} lock for store ${storeId} (${Math.round(age/1000)}s old, limit: ${Math.round(timeout/1000)}s)`);
        cleanedCount++;
        return false;
      }
      
      return true;
    });
    
    if (validLocks.length === 0) {
      activeLocks.delete(storeId);
    } else if (validLocks.length !== locks.length) {
      activeLocks.set(storeId, validLocks);
    }
  }
  
  if (cleanedCount > 0) {
    console.warn(`[RAG:LOCK] 🧹 Cleaned up ${cleanedCount} expired locks`);
  }
  
  return cleanedCount;
}

/**
 * 🛡️ Check if store has conflicting locks for a specific operation
 */
export async function checkRAGLockConflicts(
  storeId: string,
  requestedType: RAGLockType
): Promise<{ 
  hasConflicts: boolean; 
  conflictingLocks: RAGLock[]; 
  canProceed: boolean;
  reason?: string;
}> {
  
  await cleanupExpiredLocks();
  
  const existingLocks = activeLocks.get(storeId) || [];
  
  // Check for higher priority locks
  const conflictingLocks = existingLocks.filter(lock => lock.type >= requestedType);
  
  const hasConflicts = conflictingLocks.length > 0;
  const canProceed = !hasConflicts;
  
  let reason: string | undefined;
  if (hasConflicts) {
    const highestPriorityLock = conflictingLocks.reduce((highest, current) => 
      current.type > highest.type ? current : highest
    );
    reason = `Blocked by ${RAGLockType[highestPriorityLock.type]}: ${highestPriorityLock.operation}`;
  }
  
  return {
    hasConflicts,
    conflictingLocks,
    canProceed,
    reason
  };
}

/**
 * ⏳ Wait for store to be available for a specific operation type
 */
export async function waitForRAGLockAvailability(
  storeId: string,
  requestedType: RAGLockType,
  timeoutMs: number = 30000
): Promise<{ success: boolean; error?: string }> {
  
  const startTime = Date.now();
  const checkInterval = 500; // Check every 500ms
  
  while (Date.now() - startTime < timeoutMs) {
    const conflictCheck = await checkRAGLockConflicts(storeId, requestedType);
    
    if (conflictCheck.canProceed) {
      return { success: true };
    }
    
    console.warn(`[RAG:LOCK] ⏳ Waiting for store ${storeId} availability for ${RAGLockType[requestedType]} - ${conflictCheck.reason}`);
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  // Timeout reached
  const finalCheck = await checkRAGLockConflicts(storeId, requestedType);
  return {
    success: false,
    error: `Timeout waiting for lock availability: ${finalCheck.reason}`
  };
}

/**
 * 📊 Get comprehensive lock status
 */
export async function getRAGLockStatus(): Promise<{
  totalStores: number;
  totalLocks: number;
  locksByType: Record<string, number>;
  storeDetails: Array<{
    storeId: string;
    locks: Array<{
      type: string;
      operation: string;
      ageMs: number;
      processId: string;
      reason: string;
    }>;
  }>;
}> {
  
  await cleanupExpiredLocks();
  
  const now = Date.now();
  const locksByType: Record<string, number> = {};
  const storeDetails: any[] = [];
  let totalLocks = 0;
  
  for (const [storeId, locks] of activeLocks.entries()) {
    const storeLockDetails = locks.map(lock => {
      const typeName = RAGLockType[lock.type];
      locksByType[typeName] = (locksByType[typeName] || 0) + 1;
      totalLocks++;
      
      return {
        type: typeName,
        operation: lock.operation,
        ageMs: now - lock.timestamp,
        processId: lock.processId,
        reason: lock.reason
      };
    });
    
    storeDetails.push({
      storeId,
      locks: storeLockDetails
    });
  }
  
  return {
    totalStores: activeLocks.size,
    totalLocks,
    locksByType,
    storeDetails
  };
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR SPECIFIC OPERATIONS
// =============================================================================

/**
 * 🗑️ Store deletion lock helpers
 */
export const StoreDeletionLocks = {
  async acquire(storeId: string, reason: string = 'Store deletion in progress') {
    return acquireRAGLock(storeId, RAGLockType.DELETION, 'store_deletion', reason);
  },
  
  async release(storeId: string, processId: string) {
    return releaseRAGLock(storeId, processId);
  }
};

/**
 * 🔄 Store reconnection lock helpers
 */
export const StoreReconnectionLocks = {
  async acquire(storeId: string, reason: string = 'Store reconnection in progress') {
    return acquireRAGLock(storeId, RAGLockType.RECONNECTION, 'store_reconnection', reason);
  },
  
  async release(storeId: string, processId: string) {
    return releaseRAGLock(storeId, processId);
  }
};

/**
 * 🔄 Background sync lock helpers
 */
export const BackgroundSyncLocks = {
  async acquire(storeId: string, reason: string = 'Background data sync') {
    return acquireRAGLock(storeId, RAGLockType.BACKGROUND_SYNC, 'background_sync', reason);
  },
  
  async release(storeId: string, processId: string) {
    return releaseRAGLock(storeId, processId);
  }
};

/**
 * 🖱️ Manual sync lock helpers
 */
export const ManualSyncLocks = {
  async acquire(storeId: string, reason: string = 'Manual data sync') {
    return acquireRAGLock(storeId, RAGLockType.MANUAL_SYNC, 'manual_sync', reason);
  },
  
  async release(storeId: string, processId: string) {
    return releaseRAGLock(storeId, processId);
  }
};

/**
 * 🧪 Test utilities for debugging
 */
export const RAGLockTestUtils = {
  async acquireTestLock(storeId: string, type: RAGLockType, operation: string = 'test') {
    return acquireRAGLock(storeId, type, operation, 'Test lock');
  },
  
  async releaseTestLock(storeId: string, processId: string) {
    return releaseRAGLock(storeId, processId);
  },
  
  async checkConflicts(storeId: string, type: RAGLockType) {
    return checkRAGLockConflicts(storeId, type);
  },
  
  async clearAllLocks() {
    activeLocks.clear();
    console.warn('[RAG:LOCK] 🧹 Cleared all locks (test mode)');
  },
  
  async simulateTimeout(storeId: string, type: RAGLockType) {
    const locks = activeLocks.get(storeId);
    if (locks) {
      locks.forEach(lock => {
        if (lock.type === type) {
          lock.timestamp = Date.now() - LOCK_TIMEOUT_MS[type] - 1000; // Force expiry
        }
      });
    }
  }
};

// =============================================================================
// BACKWARD COMPATIBILITY (for existing code)
// =============================================================================

export async function lockStoreForDeletion(storeId: string, reason: string = 'Store deletion in progress') {
  const result = await StoreDeletionLocks.acquire(storeId, reason);
  if (!result.success) {
    throw new Error(`Failed to acquire deletion lock: ${result.error}`);
  }
  return result.processId!;
}

export async function unlockStoreAfterDeletion(storeId: string) {
  // For backward compatibility, release ALL deletion locks for this store
  const locks = activeLocks.get(storeId) || [];
  const deletionLocks = locks.filter(lock => lock.type === RAGLockType.DELETION);
  
  for (const lock of deletionLocks) {
    await releaseRAGLock(storeId, lock.processId);
  }
}

export async function checkStoreDeletionLock(storeId: string) {
  const conflicts = await checkRAGLockConflicts(storeId, RAGLockType.DELETION);
  const deletionLocks = conflicts.conflictingLocks.filter(lock => lock.type === RAGLockType.DELETION);
  
  if (deletionLocks.length === 0) {
    return null;
  }
  
  const lock = deletionLocks[0];
  return {
    locked: true,
    reason: lock.reason,
    ageMs: Date.now() - lock.timestamp
  };
}

export async function waitForStoreUnlock(storeId: string, timeoutMs: number = 5000) {
  const result = await waitForRAGLockAvailability(storeId, RAGLockType.BACKGROUND_SYNC, timeoutMs);
  if (!result.success) {
    console.error(`[RAG:LOCK] ⚠️ Timeout waiting for store ${storeId} unlock: ${result.error}`);
    // Force unlock all locks for backward compatibility
    activeLocks.delete(storeId);
  }
}

export async function getLockStatus() {
  const status = await getRAGLockStatus();
  return {
    totalLocks: status.totalLocks,
    activeLocks: status.storeDetails.flatMap(store => 
      store.locks.map(lock => ({
        storeId: store.storeId,
        reason: lock.reason,
        ageMs: lock.ageMs
      }))
    )
  };
} 