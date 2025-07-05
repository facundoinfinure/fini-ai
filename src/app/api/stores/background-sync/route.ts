import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FiniRAGEngine } from '@/lib/rag';
import { StoreService } from '@/lib/database/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🚀 BACKGROUND RAG SYNC ENDPOINT
 * ===============================
 * 
 * This endpoint handles heavy vector operations asynchronously
 * to prevent OAuth callback timeouts.
 * 
 * Purpose: Move expensive RAG operations outside the OAuth flow
 * Timeout: This endpoint has its own 60s limit but doesn't block OAuth
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { storeId, isNewStore, authToken } = body;
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    console.log(`[BACKGROUND-SYNC] Starting background sync for store: ${storeId}, isNewStore: ${isNewStore}`);

    // Verify store exists and get access token
    const storeResult = await StoreService.getStore(storeId);
    if (!storeResult.success || !storeResult.store) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store not found' 
      }, { status: 404 });
    }

    const store = storeResult.store;
    const accessToken = authToken || store.access_token;

    if (!accessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'No access token available' 
      }, { status: 400 });
    }

    // Initialize RAG engine
    const ragEngine = new FiniRAGEngine();
    
    // Track operation progress
    const operations = [];
    
    try {
      // 1. Initialize namespaces (required for all operations)
      console.log(`[BACKGROUND-SYNC] Initializing namespaces for store: ${storeId}`);
      const namespaceResult = await Promise.race([
        ragEngine.initializeStoreNamespaces(storeId),
        new Promise<{ success: boolean; error?: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Namespace initialization timeout')), 45000)
        )
      ]);
      
      if (!namespaceResult.success) {
        throw new Error(`Namespace initialization failed: ${namespaceResult.error}`);
      }
      
      operations.push('namespaces_initialized');
      console.log(`[BACKGROUND-SYNC] ✅ Namespaces initialized for store: ${storeId}`);

      // 2. Full data sync (only for new stores or if requested)
      if (isNewStore) {
        console.log(`[BACKGROUND-SYNC] Starting full data sync for new store: ${storeId}`);
        
        await Promise.race([
          ragEngine.indexStoreData(storeId, accessToken),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Data sync timeout')), 45000)
          )
        ]);
        
        operations.push('data_sync_completed');
        console.log(`[BACKGROUND-SYNC] ✅ Full data sync completed for store: ${storeId}`);
      } else {
        console.log(`[BACKGROUND-SYNC] Skipping full data sync for existing store: ${storeId}`);
        operations.push('data_sync_skipped');
      }

      // 3. Update store sync timestamp
      await StoreService.updateStore(storeId, {
        last_sync_at: new Date().toISOString()
      });
      
      operations.push('timestamp_updated');

      const totalTime = Date.now() - startTime;
      console.log(`[BACKGROUND-SYNC] ✅ Background sync completed for store: ${storeId}, time: ${totalTime}ms`);

      return NextResponse.json({
        success: true,
        storeId,
        operations,
        totalTime,
        message: 'Background sync completed successfully'
      });

    } catch (syncError) {
      console.error(`[BACKGROUND-SYNC] ❌ Sync failed for store ${storeId}:`, syncError);
      
      // Return partial success if some operations completed
      const totalTime = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        storeId,
        operations,
        totalTime,
        error: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        message: 'Background sync failed but store connection is still valid'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[BACKGROUND-SYNC] ❌ Critical error:', error);
    
    const totalTime = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime,
      message: 'Background sync failed'
    }, { status: 500 });
  }
} 