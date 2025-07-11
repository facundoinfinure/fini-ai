/**
 * 🔒🔄 ENHANCED GLOBAL RAG OPERATION LOCKS SYSTEM V2
 * =================================================
 * 
 * Strengthened system for preventing race conditions during:
 * - Store deletion operations
 * - Store reconnection operations (ENHANCED)
 * - Background sync operations
 * - Manual sync operations
 * - Auto-sync scheduler operations
 * - Namespace recreation (NEW)
 * 
 * ENHANCED FEATURES:
 * - Versioned namespace recreation protection
 * - Lock escalation during reconnections
 * - Cascading lock dependencies
 * - Enhanced timeout management
 * - Operation priority queuing
 * - Reconnection-specific safeguards
 * 
 * LOCK PRIORITY HIERARCHY (higher number = higher priority):
 * 1. BACKGROUND_SYNC - Background auto-sync (lowest priority)
 * 2. MANUAL_SYNC - Manual user-triggered sync
 * 3. NAMESPACE_RECREATION - Namespace recreation during reconnection
 * 4. RECONNECTION - Store reconnection process (STRENGTHENED)
 * 5. DELETION - Store deletion (highest priority)
 */

import { v4 as uuidv4 } from 'uuid';

// ===== ENHANCED TYPES & INTERFACES =====

// Enhanced lock types with namespace recreation
export enum EnhancedRAGLockType {
  BACKGROUND_SYNC = 1,
  MANUAL_SYNC = 2,
  NAMESPACE_RECREATION = 3,  // NEW: Specific for namespace operations
  RECONNECTION = 4,          // ENHANCED: Strengthened priority
  DELETION = 5
}

export interface EnhancedRAGLock {
  storeId: string;
  type: EnhancedRAGLockType;
  operation: string;
  timestamp: number;
  processId: string;
  reason: string;
  parentProcessId?: string;    // NEW: For cascading locks
  expirationTime: number;      // NEW: Explicit expiration
  version?: string;            // NEW: For namespace versioning
  metadata?: Record<string, any>; // NEW: Additional operation data
}

export interface LockAcquisitionResult {
  success: boolean;
  processId?: string;
  error?: string;
  blockedBy?: EnhancedRAGLock[];
  waitTime?: number;
  escalated?: boolean;         // NEW: Was lock escalated
}

export interface NamespaceVersion {
  storeId: string;
  version: string;
  createdAt: number;
  lockProcessId: string;
  status: 'creating' | 'active' | 'deprecated';
}

// ===== ENHANCED GLOBAL STATE =====

// In-memory locks storage with enhanced structure
const activeLocks = new Map<string, EnhancedRAGLock[]>(); // storeId -> array of locks
const operationQueues = new Map<string, QueuedOperation[]>(); // storeId -> queued operations
const namespaceVersions = new Map<string, NamespaceVersion>(); // storeId -> current version

// Enhanced lock timeouts with reconnection considerations
const ENHANCED_LOCK_TIMEOUT_MS = {
  [EnhancedRAGLockType.BACKGROUND_SYNC]: 120000,      // 2 minutes
  [EnhancedRAGLockType.MANUAL_SYNC]: 180000,          // 3 minutes
  [EnhancedRAGLockType.NAMESPACE_RECREATION]: 300000, // 5 minutes (NEW)
  [EnhancedRAGLockType.RECONNECTION]: 600000,         // 10 minutes (ENHANCED)
  [EnhancedRAGLockType.DELETION]: 180000              // 3 minutes
};

// Operation queue configuration
const MAX_QUEUE_SIZE = 10;
const QUEUE_PROCESSING_INTERVAL = 1000; // 1 second

interface QueuedOperation {
  operationId: string;
  lockType: EnhancedRAGLockType;
  operation: string;
  reason: string;
  timestamp: number;
  resolve: (result: LockAcquisitionResult) => void;
  reject: (error: Error) => void;
}

// ===== ENHANCED LOCK MANAGEMENT =====

/**
 * 🔒 Enhanced lock acquisition with reconnection strengthening
 */
export async function acquireEnhancedRAGLock(
  storeId: string,
  lockType: EnhancedRAGLockType,
  operation: string,
  options: {
    reason?: string;
    parentProcessId?: string;
    version?: string;
    metadata?: Record<string, any>;
    allowEscalation?: boolean;
    queueIfBlocked?: boolean;
  } = {}
): Promise<LockAcquisitionResult> {
  
  // Clean up expired locks first
  await cleanupExpiredLocks();
  
  const processId = generateProcessId();
  const now = Date.now();
  const expirationTime = now + ENHANCED_LOCK_TIMEOUT_MS[lockType];
  
  console.log(`[ENHANCED:LOCK] 🔒 Attempting to acquire ${EnhancedRAGLockType[lockType]} lock for store ${storeId}: ${operation}`);
  
  // Get existing locks for this store
  const existingLocks = activeLocks.get(storeId) || [];
  
  // Enhanced conflict detection with reconnection prioritization
  const conflictAnalysis = analyzeConflicts(existingLocks, lockType, options.parentProcessId);
  
  if (conflictAnalysis.hasConflicts) {
    console.warn(`[ENHANCED:LOCK] ❌ Cannot acquire ${EnhancedRAGLockType[lockType]} lock for store ${storeId} - ${conflictAnalysis.reason}`);
    
    // If reconnection is blocked, try lock escalation
    if (lockType === EnhancedRAGLockType.RECONNECTION && options.allowEscalation) {
      const escalationResult = await attemptLockEscalation(storeId, existingLocks, processId, operation, options);
      if (escalationResult.success) {
        return escalationResult;
      }
    }
    
    // Queue operation if requested and possible
    if (options.queueIfBlocked && conflictAnalysis.queueable) {
      return await queueOperation(storeId, lockType, operation, options.reason || operation);
    }
    
    return {
      success: false,
      error: conflictAnalysis.reason,
      blockedBy: conflictAnalysis.conflictingLocks
    };
  }
  
  // Create enhanced lock
  const newLock: EnhancedRAGLock = {
    storeId,
    type: lockType,
    operation,
    timestamp: now,
    processId,
    reason: options.reason || operation,
    parentProcessId: options.parentProcessId,
    expirationTime,
    version: options.version,
    metadata: options.metadata
  };
  
  // Add to locks storage
  if (!activeLocks.has(storeId)) {
    activeLocks.set(storeId, []);
  }
  activeLocks.get(storeId)!.push(newLock);
  
  // Update namespace version if this is a namespace operation
  if (lockType === EnhancedRAGLockType.NAMESPACE_RECREATION && options.version) {
    namespaceVersions.set(storeId, {
      storeId,
      version: options.version,
      createdAt: now,
      lockProcessId: processId,
      status: 'creating'
    });
  }
  
  console.log(`[ENHANCED:LOCK] 🔒 Acquired ${EnhancedRAGLockType[lockType]} lock for store ${storeId}: ${operation} (process: ${processId})`);
  
  return {
    success: true,
    processId
  };
}

/**
 * 🔓 Enhanced lock release with cascading cleanup
 */
export async function releaseEnhancedRAGLock(
  storeId: string,
  processId: string,
  options: {
    cascadeRelease?: boolean;
    updateNamespaceStatus?: 'active' | 'deprecated';
  } = {}
): Promise<{ success: boolean; error?: string; releasedLocks?: string[] }> {
  
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
  const releasedLocks = [processId];
  
  // Handle cascading release of child locks
  if (options.cascadeRelease) {
    const childLocks = storeLocks.filter(l => l.parentProcessId === processId);
    for (const childLock of childLocks) {
      const childIndex = storeLocks.findIndex(l => l.processId === childLock.processId);
      if (childIndex >= 0) {
        storeLocks.splice(childIndex, 1);
        releasedLocks.push(childLock.processId);
        console.log(`[ENHANCED:LOCK] 🔓 Cascaded release of child lock: ${childLock.processId}`);
      }
    }
  }
  
  // Remove the main lock
  storeLocks.splice(lockIndex, 1);
  
  // Remove store from map if no more locks
  if (storeLocks.length === 0) {
    activeLocks.delete(storeId);
  }
  
  // Update namespace version status
  if (lock.type === EnhancedRAGLockType.NAMESPACE_RECREATION && options.updateNamespaceStatus) {
    const version = namespaceVersions.get(storeId);
    if (version && version.lockProcessId === processId) {
      version.status = options.updateNamespaceStatus;
      console.log(`[ENHANCED:LOCK] 📦 Updated namespace version status to ${options.updateNamespaceStatus}: ${storeId}`);
    }
  }
  
  console.log(`[ENHANCED:LOCK] 🔓 Released ${EnhancedRAGLockType[lock.type]} lock for store ${storeId}: ${lock.operation} (process: ${processId})`);
  
  // Process queued operations
  await processQueuedOperations(storeId);
  
  return { 
    success: true, 
    releasedLocks 
  };
}

/**
 * 🔍 Enhanced conflict analysis with reconnection awareness
 */
function analyzeConflicts(
  existingLocks: EnhancedRAGLock[],
  requestedType: EnhancedRAGLockType,
  parentProcessId?: string
): {
  hasConflicts: boolean;
  reason?: string;
  conflictingLocks: EnhancedRAGLock[];
  queueable: boolean;
} {
  
  // Filter out expired locks
  const validLocks = existingLocks.filter(lock => lock.expirationTime > Date.now());
  
  // Check for parent-child relationship (allow child locks)
  if (parentProcessId) {
    const parentLock = validLocks.find(lock => lock.processId === parentProcessId);
    if (parentLock && parentLock.type >= requestedType) {
      return {
        hasConflicts: false,
        conflictingLocks: [],
        queueable: false
      };
    }
  }
  
  // Check for higher priority locks (blocking)
  const blockingLocks = validLocks.filter(lock => lock.type > requestedType);
  
  if (blockingLocks.length > 0) {
    return {
      hasConflicts: true,
      reason: `Blocked by higher priority operations: ${blockingLocks.map(l => EnhancedRAGLockType[l.type]).join(', ')}`,
      conflictingLocks: blockingLocks,
      queueable: true
    };
  }
  
  // Check for same priority locks (generally blocking, except for specific cases)
  const samePriorityLocks = validLocks.filter(lock => lock.type === requestedType);
  
  if (samePriorityLocks.length > 0) {
    // Special case: multiple namespace recreation locks are not allowed
    if (requestedType === EnhancedRAGLockType.NAMESPACE_RECREATION) {
      return {
        hasConflicts: true,
        reason: 'Namespace recreation already in progress',
        conflictingLocks: samePriorityLocks,
        queueable: false
      };
    }
    
    // Special case: multiple reconnection locks are not allowed
    if (requestedType === EnhancedRAGLockType.RECONNECTION) {
      return {
        hasConflicts: true,
        reason: 'Store reconnection already in progress',
        conflictingLocks: samePriorityLocks,
        queueable: false
      };
    }
    
    return {
      hasConflicts: true,
      reason: `Same operation already in progress: ${EnhancedRAGLockType[requestedType]}`,
      conflictingLocks: samePriorityLocks,
      queueable: true
    };
  }
  
  return {
    hasConflicts: false,
    conflictingLocks: [],
    queueable: false
  };
}

/**
 * ⚡ Attempt lock escalation for critical reconnection operations
 */
async function attemptLockEscalation(
  storeId: string,
  existingLocks: EnhancedRAGLock[],
  processId: string,
  operation: string,
  options: any
): Promise<LockAcquisitionResult> {
  
  console.log(`[ENHANCED:LOCK] ⚡ Attempting lock escalation for reconnection: ${storeId}`);
  
  // Only escalate if blocked by lower priority operations
  const blockingLocks = existingLocks.filter(lock => 
    lock.type < EnhancedRAGLockType.RECONNECTION && lock.expirationTime > Date.now()
  );
  
  if (blockingLocks.length === 0) {
    return { success: false, error: 'No escalatable locks found' };
  }
  
  // Attempt graceful termination of lower priority operations
  let escalatedCount = 0;
  for (const blockingLock of blockingLocks) {
    try {
      // Send termination signal (this would integrate with actual operation managers)
      console.log(`[ENHANCED:LOCK] ⚡ Escalating over ${EnhancedRAGLockType[blockingLock.type]} lock: ${blockingLock.processId}`);
      
      // For now, we'll force release the blocking lock
      await releaseEnhancedRAGLock(storeId, blockingLock.processId, { cascadeRelease: true });
      escalatedCount++;
      
    } catch (error) {
      console.warn(`[ENHANCED:LOCK] ⚠️ Failed to escalate over lock ${blockingLock.processId}:`, error);
    }
  }
  
  if (escalatedCount > 0) {
    // Try to acquire the lock again after escalation
    const acquisitionResult = await acquireEnhancedRAGLock(
      storeId,
      EnhancedRAGLockType.RECONNECTION,
      operation,
      { ...options, allowEscalation: false } // Prevent infinite escalation
    );
    
    if (acquisitionResult.success) {
      return {
        ...acquisitionResult,
        escalated: true
      };
    }
  }
  
  return { success: false, error: 'Lock escalation failed' };
}

/**
 * 📋 Queue operation for later processing
 */
async function queueOperation(
  storeId: string,
  lockType: EnhancedRAGLockType,
  operation: string,
  reason: string
): Promise<LockAcquisitionResult> {
  
  if (!operationQueues.has(storeId)) {
    operationQueues.set(storeId, []);
  }
  
  const queue = operationQueues.get(storeId)!;
  
  if (queue.length >= MAX_QUEUE_SIZE) {
    return {
      success: false,
      error: 'Operation queue is full'
    };
  }
  
  return new Promise((resolve, reject) => {
    const queuedOperation: QueuedOperation = {
      operationId: generateProcessId(),
      lockType,
      operation,
      reason,
      timestamp: Date.now(),
      resolve,
      reject
    };
    
    queue.push(queuedOperation);
    console.log(`[ENHANCED:LOCK] 📋 Queued ${EnhancedRAGLockType[lockType]} operation for store ${storeId}: ${operation}`);
  });
}

/**
 * 🔄 Process queued operations when locks become available
 */
async function processQueuedOperations(storeId: string): Promise<void> {
  const queue = operationQueues.get(storeId);
  if (!queue || queue.length === 0) {
    return;
  }
  
  // Sort queue by priority (higher priority first)
  queue.sort((a, b) => b.lockType - a.lockType);
  
  const processableOperations = [];
  
  for (const queuedOp of queue) {
    // Check if this operation can now be processed
    const existingLocks = activeLocks.get(storeId) || [];
    const conflicts = analyzeConflicts(existingLocks, queuedOp.lockType);
    
    if (!conflicts.hasConflicts) {
      processableOperations.push(queuedOp);
    }
  }
  
  // Process operations that can now proceed
  for (const op of processableOperations) {
    const index = queue.indexOf(op);
    if (index >= 0) {
      queue.splice(index, 1);
      
      try {
        const result = await acquireEnhancedRAGLock(
          storeId,
          op.lockType,
          op.operation,
          { reason: op.reason, queueIfBlocked: false }
        );
        op.resolve(result);
      } catch (error) {
        op.reject(error as Error);
      }
    }
  }
  
  // Clean up empty queue
  if (queue.length === 0) {
    operationQueues.delete(storeId);
  }
}

/**
 * 🧹 Enhanced cleanup of expired locks
 */
async function cleanupExpiredLocks(): Promise<void> {
  const now = Date.now();
  const expiredStores: string[] = [];
  
  for (const [storeId, locks] of activeLocks.entries()) {
    const validLocks = locks.filter(lock => lock.expirationTime > now);
    const expiredLocks = locks.filter(lock => lock.expirationTime <= now);
    
    if (expiredLocks.length > 0) {
      console.warn(`[ENHANCED:LOCK] 🧹 Cleaning up ${expiredLocks.length} expired locks for store ${storeId}`);
      
      for (const expiredLock of expiredLocks) {
        console.warn(`[ENHANCED:LOCK] 🧹 Expired: ${EnhancedRAGLockType[expiredLock.type]} - ${expiredLock.operation} (${expiredLock.processId})`);
      }
    }
    
    if (validLocks.length === 0) {
      expiredStores.push(storeId);
    } else {
      activeLocks.set(storeId, validLocks);
    }
  }
  
  // Remove stores with no valid locks
  for (const storeId of expiredStores) {
    activeLocks.delete(storeId);
  }
}

/**
 * 🔧 Generate unique process ID
 */
function generateProcessId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ===== NAMESPACE VERSIONING UTILITIES =====

/**
 * 📦 Generate new namespace version
 */
export function generateNamespaceVersion(): string {
  return `v${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * 📦 Get current namespace version for store
 */
export function getCurrentNamespaceVersion(storeId: string): NamespaceVersion | null {
  return namespaceVersions.get(storeId) || null;
}

/**
 * 📦 Check if namespace version is active
 */
export function isNamespaceVersionActive(storeId: string, version: string): boolean {
  const current = namespaceVersions.get(storeId);
  return current?.version === version && current?.status === 'active';
}

// ===== ENHANCED HELPER FUNCTIONS =====

/**
 * 🔒 Enhanced store reconnection lock helpers
 */
export const EnhancedStoreReconnectionLocks = {
  async acquire(
    storeId: string, 
    reason: string = 'Store reconnection in progress',
    options: {
      allowEscalation?: boolean;
      namespaceVersion?: string;
      metadata?: Record<string, any>;
    } = {}
  ) {
    return acquireEnhancedRAGLock(storeId, EnhancedRAGLockType.RECONNECTION, 'store_reconnection', {
      reason,
      allowEscalation: options.allowEscalation || true,
      version: options.namespaceVersion,
      metadata: options.metadata
    });
  },
  
  async release(storeId: string, processId: string, finalizeNamespace: boolean = true) {
    return releaseEnhancedRAGLock(storeId, processId, {
      cascadeRelease: true,
      updateNamespaceStatus: finalizeNamespace ? 'active' : 'deprecated'
    });
  }
};

/**
 * 🔒 Enhanced namespace recreation lock helpers
 */
export const EnhancedNamespaceRecreationLocks = {
  async acquire(
    storeId: string,
    parentProcessId: string,
    namespaceVersion: string,
    reason: string = 'Namespace recreation during reconnection'
  ) {
    return acquireEnhancedRAGLock(storeId, EnhancedRAGLockType.NAMESPACE_RECREATION, 'namespace_recreation', {
      reason,
      parentProcessId,
      version: namespaceVersion,
      metadata: { createdBy: 'reconnection_process' }
    });
  },
  
  async release(storeId: string, processId: string, success: boolean = true) {
    return releaseEnhancedRAGLock(storeId, processId, {
      updateNamespaceStatus: success ? 'active' : 'deprecated'
    });
  }
};

// ===== MONITORING AND DEBUGGING =====

/**
 * 📊 Get enhanced lock status for store
 */
export function getEnhancedLockStatus(storeId: string): {
  activeLocks: EnhancedRAGLock[];
  queuedOperations: QueuedOperation[];
  namespaceVersion?: NamespaceVersion;
} {
  return {
    activeLocks: activeLocks.get(storeId) || [],
    queuedOperations: operationQueues.get(storeId) || [],
    namespaceVersion: namespaceVersions.get(storeId)
  };
}

/**
 * 📊 Get system-wide lock statistics
 */
export function getEnhancedLockStatistics(): {
  totalStores: number;
  totalActiveLocks: number;
  totalQueuedOperations: number;
  locksByType: Record<string, number>;
  averageQueueDepth: number;
} {
  const totalStores = activeLocks.size;
  let totalActiveLocks = 0;
  let totalQueuedOperations = 0;
  const locksByType: Record<string, number> = {};
  
  for (const locks of activeLocks.values()) {
    totalActiveLocks += locks.length;
    for (const lock of locks) {
      const typeName = EnhancedRAGLockType[lock.type];
      locksByType[typeName] = (locksByType[typeName] || 0) + 1;
    }
  }
  
  for (const queue of operationQueues.values()) {
    totalQueuedOperations += queue.length;
  }
  
  return {
    totalStores,
    totalActiveLocks,
    totalQueuedOperations,
    locksByType,
    averageQueueDepth: totalStores > 0 ? totalQueuedOperations / totalStores : 0
  };
}

// Start queue processing interval
setInterval(() => {
  for (const storeId of operationQueues.keys()) {
    processQueuedOperations(storeId).catch(error => {
      console.error(`[ENHANCED:LOCK] Error processing queue for store ${storeId}:`, error);
    });
  }
}, QUEUE_PROCESSING_INTERVAL); 