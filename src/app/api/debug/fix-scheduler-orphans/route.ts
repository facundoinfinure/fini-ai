import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 🧹 FIX AUTO-SYNC SCHEDULER ORPHANS
 * ==================================
 * 
 * Debug endpoint para limpiar tiendas huérfanas del auto-sync scheduler
 * que pueden estar causando recreación de namespaces para tiendas eliminadas.
 * 
 * Este endpoint:
 * 1. Identifica tiendas inactivas en el scheduler
 * 2. Las remueve del scheduler 
 * 3. Reinicia el scheduler con solo tiendas activas
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG-SCHEDULER] 🧹 Starting scheduler orphan cleanup');

    const supabase = createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const operations: string[] = [];

    // 1. Get the current scheduler
    const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
    const scheduler = await getAutoSyncScheduler();
    
    // 2. Get current scheduler status
    const schedulerStatus = scheduler.getSyncStatus();
    const currentStoreIds = schedulerStatus.stores.map(s => s.storeId);
    operations.push(`found_${currentStoreIds.length}_stores_in_scheduler`);

    // 3. Get all active stores from database
    const { data: activeStores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, is_active')
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (storesError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch active stores' },
        { status: 500 }
      );
    }

    const activeStoreIds = new Set(activeStores?.map(s => s.id) || []);
    operations.push(`found_${activeStoreIds.size}_active_stores_in_db`);

    // 4. Identify orphaned stores (in scheduler but not active in DB)
    const orphanedStoreIds = currentStoreIds.filter(storeId => !activeStoreIds.has(storeId));
    operations.push(`identified_${orphanedStoreIds.length}_orphaned_stores`);

    console.log(`[DEBUG-SCHEDULER] Found ${orphanedStoreIds.length} orphaned stores in scheduler:`, orphanedStoreIds);

    // 5. Remove orphaned stores from scheduler
    for (const orphanedStoreId of orphanedStoreIds) {
      try {
        scheduler.removeStore(orphanedStoreId);
        console.log(`[DEBUG-SCHEDULER] ✅ Removed orphaned store: ${orphanedStoreId}`);
      } catch (error) {
        console.warn(`[DEBUG-SCHEDULER] ⚠️ Failed to remove store ${orphanedStoreId}:`, error);
      }
    }
    operations.push(`removed_${orphanedStoreIds.length}_orphaned_stores`);

    // 6. Ensure all active stores are in the scheduler
    const missingStoreIds = Array.from(activeStoreIds).filter(storeId => !currentStoreIds.includes(storeId));
    operations.push(`identified_${missingStoreIds.length}_missing_stores`);

    for (const missingStoreId of missingStoreIds) {
      try {
        await scheduler.addStore(missingStoreId);
        console.log(`[DEBUG-SCHEDULER] ✅ Added missing store: ${missingStoreId}`);
      } catch (error) {
        console.warn(`[DEBUG-SCHEDULER] ⚠️ Failed to add store ${missingStoreId}:`, error);
      }
    }
    operations.push(`added_${missingStoreIds.length}_missing_stores`);

    console.log(`[DEBUG-SCHEDULER] ✅ Scheduler cleanup completed`);

    return NextResponse.json({
      success: true,
      message: 'Scheduler orphan cleanup completed successfully',
      summary: {
        originalStores: currentStoreIds.length,
        activeStores: activeStoreIds.size,
        orphanedRemoved: orphanedStoreIds.length,
        missingAdded: missingStoreIds.length,
        orphanedStoreIds,
        missingStoreIds
      },
      operations
    });

  } catch (error) {
    console.error('[DEBUG-SCHEDULER] ❌ Scheduler cleanup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Scheduler cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para verificar el estado del scheduler
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Authenticate user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get scheduler status
    const { getAutoSyncScheduler } = await import('@/lib/services/auto-sync-scheduler');
    const scheduler = await getAutoSyncScheduler();
    const schedulerStatus = scheduler.getSyncStatus();

    // Get active stores from database
    const { data: activeStores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, is_active')
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (storesError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stores' },
        { status: 500 }
      );
    }

    const currentStoreIds = schedulerStatus.stores.map(s => s.storeId);
    const activeStoreIds = activeStores?.map(s => s.id) || [];
    
    const orphaned = currentStoreIds.filter(id => !activeStoreIds.includes(id));
    const missing = activeStoreIds.filter(id => !currentStoreIds.includes(id));

         return NextResponse.json({
       success: true,
       scheduler: {
         totalStores: schedulerStatus.totalStores,
         activeStores: schedulerStatus.activeStores,
         pendingStores: schedulerStatus.pendingStores,
         failedStores: schedulerStatus.failedStores
       },
      analysis: {
        storesInScheduler: currentStoreIds.length,
        activeStoresInDB: activeStoreIds.length,
        orphanedStores: orphaned.length,
        missingStores: missing.length,
        isConsistent: orphaned.length === 0 && missing.length === 0
      },
      details: {
        orphanedStoreIds: orphaned,
        missingStoreIds: missing,
        currentStores: schedulerStatus.stores.map(s => ({
          storeId: s.storeId,
          storeName: s.storeName,
          status: s.status,
          lastSync: s.lastSync,
          nextSync: s.nextSync
        }))
      }
    });

  } catch (error) {
    console.error('[DEBUG-SCHEDULER] ❌ Status check failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 