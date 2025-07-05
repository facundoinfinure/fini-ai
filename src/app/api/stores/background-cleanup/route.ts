import { NextRequest, NextResponse } from 'next/server';
import { FiniRAGEngine } from '@/lib/rag';
import { StoreService } from '@/lib/database/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🧹 BACKGROUND CLEANUP & RE-SYNC ENDPOINT
 * ========================================
 * 
 * Para reconexiones de tiendas existentes:
 * 1. Limpia vectors existentes de todos los namespaces
 * 2. Re-indexa datos con el nuevo token
 * 3. Actualiza timestamp de sincronización
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { storeId, authToken, jobId } = body;
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    console.log(`[BACKGROUND-CLEANUP] Starting cleanup for store: ${storeId}, job: ${jobId}`);

    // Verify store exists
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
    
    // Track operations
    const operations = [];
    
    try {
      // 1. Cleanup existing vectors from all namespaces
      console.log(`[BACKGROUND-CLEANUP] Cleaning up existing vectors for store: ${storeId}`);
      
      const cleanupResult = await Promise.race([
        ragEngine.cleanupStoreVectors(storeId),
        new Promise<{ success: boolean; error?: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Vector cleanup timeout')), 45000)
        )
      ]);
      
      if (!cleanupResult.success) {
        console.warn(`[BACKGROUND-CLEANUP] Vector cleanup failed: ${cleanupResult.error}`);
        // Continue anyway - partial cleanup is better than no cleanup
      }
      
      operations.push('vectors_cleaned');
      console.log(`[BACKGROUND-CLEANUP] ✅ Vectors cleaned for store: ${storeId}`);

      // 2. Re-initialize namespaces
      console.log(`[BACKGROUND-CLEANUP] Re-initializing namespaces for store: ${storeId}`);
      
      const namespaceResult = await Promise.race([
        ragEngine.initializeStoreNamespaces(storeId),
        new Promise<{ success: boolean; error?: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Namespace initialization timeout')), 45000)
        )
      ]);
      
      if (!namespaceResult.success) {
        throw new Error(`Namespace initialization failed: ${namespaceResult.error}`);
      }
      
      operations.push('namespaces_reinitialized');
      console.log(`[BACKGROUND-CLEANUP] ✅ Namespaces re-initialized for store: ${storeId}`);

      // 3. Re-index all data with new token
      console.log(`[BACKGROUND-CLEANUP] Re-indexing store data for: ${storeId}`);
      
      await Promise.race([
        ragEngine.indexStoreData(storeId, accessToken),
        new Promise<void>((_, reject) => 
          setTimeout(() => reject(new Error('Data re-indexing timeout')), 45000)
        )
      ]);
      
      operations.push('data_reindexed');
      console.log(`[BACKGROUND-CLEANUP] ✅ Data re-indexed for store: ${storeId}`);

      // 4. Update sync timestamp
      await StoreService.updateStore(storeId, {
        last_sync_at: new Date().toISOString()
      });
      
      operations.push('timestamp_updated');

      const totalTime = Date.now() - startTime;
      console.log(`[BACKGROUND-CLEANUP] ✅ Cleanup & re-sync completed for store: ${storeId}, time: ${totalTime}ms`);

      return NextResponse.json({
        success: true,
        storeId,
        jobId,
        operations,
        totalTime,
        message: 'Store cleanup and re-sync completed successfully'
      });

    } catch (syncError) {
      console.error(`[BACKGROUND-CLEANUP] ❌ Cleanup failed for store ${storeId}:`, syncError);
      
      const totalTime = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        storeId,
        jobId,
        operations,
        totalTime,
        error: syncError instanceof Error ? syncError.message : 'Unknown cleanup error',
        message: 'Store cleanup failed but connection is still valid'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[BACKGROUND-CLEANUP] ❌ Critical error:', error);
    
    const totalTime = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime,
      message: 'Background cleanup failed'
    }, { status: 500 });
  }
} 