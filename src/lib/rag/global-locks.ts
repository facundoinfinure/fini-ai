/**
 * 🔒 GLOBAL RAG OPERATION LOCKS
 * =============================
 * 
 * Sistema de locks para prevenir race conditions durante eliminación de tiendas.
 * Cuando una tienda se está eliminando, todas las operaciones RAG para esa tienda
 * se pausan hasta que termine el proceso de cleanup.
 */

// In-memory locks for quick access (per deployment)
const storeDeletionLocks = new Map<string, { locked: boolean; timestamp: number; reason: string }>();

// Lock timeout (10 seconds)
const LOCK_TIMEOUT_MS = 10000;

/**
 * 🔒 Lock a store to prevent RAG operations during deletion
 */
export async function lockStoreForDeletion(storeId: string, reason: string = 'Store deletion in progress'): Promise<void> {
  console.warn(`[RAG:LOCK] 🔒 Locking store ${storeId} for deletion: ${reason}`);
  
  storeDeletionLocks.set(storeId, {
    locked: true,
    timestamp: Date.now(),
    reason
  });
}

/**
 * 🔓 Unlock a store after deletion is complete
 */
export async function unlockStoreAfterDeletion(storeId: string): Promise<void> {
  console.warn(`[RAG:LOCK] 🔓 Unlocking store ${storeId} after deletion`);
  storeDeletionLocks.delete(storeId);
}

/**
 * ⏰ Auto-unlock expired locks (cleanup mechanism)
 */
export async function cleanupExpiredLocks(): Promise<void> {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [storeId, lock] of storeDeletionLocks.entries()) {
    if (now - lock.timestamp > LOCK_TIMEOUT_MS) {
      console.warn(`[RAG:LOCK] ⏰ Auto-unlocking expired lock for store ${storeId} (${now - lock.timestamp}ms old)`);
      storeDeletionLocks.delete(storeId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.warn(`[RAG:LOCK] Cleaned up ${cleanedCount} expired locks`);
  }
}

/**
 * 🚨 Check if a store is locked for deletion
 * Returns lock info if locked, null if available
 */
export async function checkStoreDeletionLock(storeId: string): Promise<{ locked: boolean; reason?: string; ageMs?: number } | null> {
  // First cleanup expired locks
  await cleanupExpiredLocks();
  
  const lock = storeDeletionLocks.get(storeId);
  if (!lock) {
    return null; // Store is not locked
  }
  
  const ageMs = Date.now() - lock.timestamp;
  
  return {
    locked: true,
    reason: lock.reason,
    ageMs
  };
}

/**
 * 🛡️ Wait for store to be unlocked (with timeout)
 * Use this before any RAG operation to respect deletion locks
 */
export async function waitForStoreUnlock(storeId: string, timeoutMs: number = 5000): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    const lockInfo = await checkStoreDeletionLock(storeId);
    
    if (!lockInfo) {
      return; // Store is unlocked, proceed
    }
    
    console.warn(`[RAG:LOCK] ⏳ Store ${storeId} is locked (${lockInfo.reason}), waiting... (${lockInfo.ageMs}ms old)`);
    
    // Wait 100ms before checking again
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Timeout reached, force unlock and proceed with warning
  console.error(`[RAG:LOCK] ⚠️ Timeout waiting for store ${storeId} unlock, forcing proceed (potential race condition)`);
  await unlockStoreAfterDeletion(storeId);
}

/**
 * 📊 Get current lock status for debugging
 */
export async function getLockStatus(): Promise<{
  totalLocks: number;
  activeLocks: Array<{ storeId: string; reason: string; ageMs: number }>;
}> {
  await cleanupExpiredLocks();
  
  const now = Date.now();
  const activeLocks = Array.from(storeDeletionLocks.entries()).map(([storeId, lock]) => ({
    storeId,
    reason: lock.reason,
    ageMs: now - lock.timestamp
  }));
  
  return {
    totalLocks: activeLocks.length,
    activeLocks
  };
}

/**
 * 🧪 Test utilities for debugging
 */
export const RAGLockTestUtils = {
  async lockStore(storeId: string, reason: string = 'Test lock') {
    return lockStoreForDeletion(storeId, reason);
  },
  
  async unlockStore(storeId: string) {
    return unlockStoreAfterDeletion(storeId);
  },
  
  async checkLock(storeId: string) {
    return checkStoreDeletionLock(storeId);
  },
  
  async clearAllLocks() {
    storeDeletionLocks.clear();
    console.warn('[RAG:LOCK] 🧹 Cleared all locks (test mode)');
  }
}; 