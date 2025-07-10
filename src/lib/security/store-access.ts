/**
 * Store Access Security Module
 * Validates store ownership and access permissions using Supabase
 */

import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type StoreRow = Database['public']['Tables']['stores']['Row'];

/**
 * Security audit log interface
 */
interface SecurityAuditLog {
  event: string;
  userId: string;
  storeId: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  timestamp: string;
  details?: Record<string, any>;
}

/**
 * Validate that a user owns or has access to a specific store
 */
export async function validateStoreAccess(userId: string, storeId: string): Promise<{
  hasAccess: boolean;
  store?: StoreRow;
  reason?: string;
}> {
  try {
    console.warn(`[SECURITY:DB] Validating store access: user ${userId} → store ${storeId}`);
    
    const supabase = createClient();
    
    // Query store with ownership check
    const { data: store, error } = await supabase
      .from('stores')
      .select('*')
      .eq('id', storeId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (error) {
      const reason = `Database query failed: ${error.message}`;
      console.warn(`[SECURITY:DB] Store access denied - ${reason}`);
      
      await logSecurityEvent({
        event: 'store_access_denied',
        userId,
        storeId,
        success: false,
        timestamp: new Date().toISOString(),
        details: { reason, error: error.message }
      });
      
      return { hasAccess: false, reason };
    }
    
    if (!store) {
      const reason = `Store not found or user ${userId} does not own store ${storeId}`;
      console.warn(`[SECURITY:DB] Store access denied - ${reason}`);
      
      await logSecurityEvent({
        event: 'store_access_denied',
        userId,
        storeId,
        success: false,
        timestamp: new Date().toISOString(),
        details: { reason }
      });
      
      return { hasAccess: false, reason };
    }
    
    console.warn(`[SECURITY:DB] Store access GRANTED: user ${userId} ✓ store ${storeId} (${store.name})`);
    
    await logSecurityEvent({
      event: 'store_access_granted',
      userId,
      storeId,
      success: true,
      timestamp: new Date().toISOString(),
      details: { 
        storeName: store.name,
        domain: store.domain,
        tiendanubeStoreId: store.tiendanube_store_id
      }
    });
    
    return { hasAccess: true, store };
  } catch (error) {
    const reason = `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error('[SECURITY:DB] Store access validation failed:', error);
    
    await logSecurityEvent({
      event: 'store_access_error',
      userId,
      storeId,
      success: false,
      timestamp: new Date().toISOString(),
      details: { reason, error: String(error) }
    });
    
    return { hasAccess: false, reason };
  }
}

/**
 * Validate store access and throw if denied (for use in critical paths)
 */
export async function requireStoreAccess(userId: string, storeId: string): Promise<StoreRow> {
  const result = await validateStoreAccess(userId, storeId);
  
  if (!result.hasAccess || !result.store) {
    throw new Error(`[SECURITY] Access denied: ${result.reason || 'Unknown reason'}`);
  }
  
  return result.store;
}

/**
 * Get all stores that a user has access to
 */
export async function getUserAccessibleStores(userId: string): Promise<StoreRow[]> {
  try {
    console.warn(`[SECURITY:DB] Getting accessible stores for user ${userId}`);
    
    const supabase = createClient();
    
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[SECURITY:DB] Failed to get user accessible stores:', error);
      return [];
    }
    
    const storeCount = stores?.length || 0;
    console.warn(`[SECURITY:DB] User ${userId} has access to ${storeCount} stores`);
    
    await logSecurityEvent({
      event: 'list_user_stores',
      userId,
      storeId: 'multiple',
      success: true,
      timestamp: new Date().toISOString(),
      details: { storeCount, storeIds: stores?.map(s => s.id) }
    });
    
    return stores || [];
  } catch (error) {
    console.error('[SECURITY:DB] Get user accessible stores error:', error);
    return [];
  }
}

/**
 * Check if user has access to multiple stores (batch validation)
 */
export async function validateMultipleStoreAccess(userId: string, storeIds: string[]): Promise<{
  hasAccessToAll: boolean;
  accessibleStores: string[];
  deniedStores: string[];
}> {
  try {
    const accessibleStores = await getUserAccessibleStores(userId);
    const accessibleStoreIds = accessibleStores.map(store => store.id);
    
    const deniedStores = storeIds.filter(storeId => !accessibleStoreIds.includes(storeId));
    const hasAccessToAll = deniedStores.length === 0;
    
    if (!hasAccessToAll) {
      console.warn(`[SECURITY:DB] Multi-store access partially denied for user ${userId}:`, {
        requested: storeIds,
        denied: deniedStores
      });
      
      await logSecurityEvent({
        event: 'multi_store_access_denied',
        userId,
        storeId: 'multiple',
        success: false,
        timestamp: new Date().toISOString(),
        details: { requestedStores: storeIds, deniedStores }
      });
    }
    
    return {
      hasAccessToAll,
      accessibleStores: storeIds.filter(storeId => accessibleStoreIds.includes(storeId)),
      deniedStores
    };
  } catch (error) {
    console.error('[SECURITY:DB] Multiple store access validation error:', error);
    return {
      hasAccessToAll: false,
      accessibleStores: [],
      deniedStores: storeIds
    };
  }
}

/**
 * Log security events to database for auditing
 */
async function logSecurityEvent(auditLog: SecurityAuditLog): Promise<void> {
  try {
    // TODO: Create security_audit_logs table for proper logging
    // For now, using console logs with structured format
    console.warn(`[SECURITY:AUDIT] ${JSON.stringify(auditLog)}`);
    
    // In production, store in dedicated audit table:
    // const supabase = createClient();
    // await supabase.from('security_audit_logs').insert(auditLog);
  } catch (error) {
    console.error('[SECURITY:AUDIT] Failed to log security event:', error);
  }
}

/**
 * Get store access statistics for monitoring
 */
export async function getStoreAccessStats(userId: string): Promise<{
  totalStores: number;
  activeStores: number;
  lastAccessed?: string;
  recentActivity: number; // access events in last 24h
}> {
  try {
    const stores = await getUserAccessibleStores(userId);
    const totalStores = stores.length;
    const activeStores = stores.filter(store => store.is_active).length;
    
    // Get most recent access time
    const sortedStores = stores.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    const lastAccessed = sortedStores[0]?.updated_at;
    
    return {
      totalStores,
      activeStores,
      lastAccessed,
      recentActivity: 0 // TODO: Query actual audit logs when table exists
    };
  } catch (error) {
    console.error('[SECURITY:DB] Failed to get store access stats:', error);
    return {
      totalStores: 0,
      activeStores: 0,
      recentActivity: 0
    };
  }
} 