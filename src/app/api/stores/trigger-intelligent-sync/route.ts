import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAutoSyncScheduler } from '@/lib/services/auto-sync-scheduler';
import { checkRAGLockConflicts, RAGLockType } from '@/lib/rag/global-locks';

/**
 * 🔒 INTELLIGENT SYNC FOR CHAT
 * ============================
 * 
 * Server-side endpoint to handle intelligent sync with lock awareness
 * Moved from client-side to prevent build issues with Pinecone imports
 */

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { storeIds } = body;

    if (!storeIds || !Array.isArray(storeIds)) {
      return NextResponse.json({ 
        success: false, 
        error: 'storeIds array required' 
      }, { status: 400 });
    }

    const results = [];
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - (4 * 60 * 60 * 1000));

    // Get stores data
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, access_token, last_sync_at')
      .eq('user_id', user.id)
      .in('id', storeIds)
      .eq('is_active', true);

    if (error || !stores) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to load stores' 
      }, { status: 500 });
    }

    const scheduler = await getAutoSyncScheduler();

    for (const store of stores) {
      if (!store.access_token) {
        results.push({
          storeId: store.id,
          storeName: store.name,
          skipped: true,
          reason: 'No access token'
        });
        continue;
      }

      const lastSync = store.last_sync_at ? new Date(store.last_sync_at) : null;
      const needsSync = !lastSync || lastSync < fourHoursAgo;

      if (!needsSync) {
        results.push({
          storeId: store.id,
          storeName: store.name,
          skipped: true,
          reason: 'Recently synced'
        });
        continue;
      }

      try {
        // Check for lock conflicts
        const conflictCheck = await checkRAGLockConflicts(store.id, RAGLockType.MANUAL_SYNC);

        if (!conflictCheck.canProceed) {
          results.push({
            storeId: store.id,
            storeName: store.name,
            skipped: true,
            reason: 'Lock conflict',
            details: conflictCheck.reason
          });
          continue;
        }

        // Trigger sync
        const syncResult = await scheduler.triggerImmediateSync(store.id);

        results.push({
          storeId: store.id,
          storeName: store.name,
          synced: true,
          success: syncResult.success,
          error: syncResult.error,
          syncTime: syncResult.syncedData?.totalTime
        });

      } catch (error) {
        console.error(`Sync error for store ${store.id}:`, error);
        
        results.push({
          storeId: store.id,
          storeName: store.name,
          synced: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalStores: stores.length,
        syncedStores: results.filter(r => r.synced).length,
        skippedStores: results.filter(r => r.skipped).length,
        results
      }
    });

  } catch (error) {
    console.error('Intelligent sync API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 