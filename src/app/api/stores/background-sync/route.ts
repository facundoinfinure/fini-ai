import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FiniRAGEngine } from '@/lib/rag';
import { StoreService } from '@/lib/database/client';
import { operationManager } from '@/lib/operations/operation-manager';
import { OperationType } from '@/types/operations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🚀 ULTRA-FAST BACKGROUND SYNC ENDPOINT
 * =====================================
 * 
 * This endpoint handles heavy operations asynchronously to prevent
 * OAuth callback timeouts. Optimized for maximum speed and reliability.
 * 
 * Purpose: Move ALL expensive operations outside the OAuth flow
 * Timeout: This endpoint has its own 60s limit but doesn't block OAuth
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { 
      storeId, 
      accessToken, 
      userId, 
      operation = 'full_initialization',
      jobId,
      // Legacy support
      isNewStore, 
      authToken 
    } = body;
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    // Determine operation type
    const isFullInit = operation === 'full_initialization' || isNewStore;
    const finalAccessToken = accessToken || authToken;

    console.log(`[BACKGROUND-SYNC] Starting ${operation} for store: ${storeId}, jobId: ${jobId}`);

    // Verify store exists
    const storeResult = await StoreService.getStore(storeId);
    if (!storeResult.success || !storeResult.store) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store not found' 
      }, { status: 404 });
    }

    const store = storeResult.store;
    const workingAccessToken = finalAccessToken || store.access_token;

    if (!workingAccessToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'No access token available' 
      }, { status: 400 });
    }

    // 🎯 Create operation for tracking
    let operationTracker = null;
    if (userId) {
      try {
        operationTracker = isFullInit ? 
          operationManager.createStoreInitialConnectionOperation(userId, storeId, store.name || 'Tienda') :
          operationManager.createRAGSyncOperation(userId, storeId, store.name || 'Tienda', false);
        
        console.log(`[BACKGROUND-SYNC] Created operation tracker: ${operationTracker.id}`);
      } catch (error) {
        console.warn('[BACKGROUND-SYNC] Could not create operation tracker:', error);
      }
    }

    // Track completed operations
    const completedOperations = [];
    
    try {
      // 1. 🚀 ULTRA-FAST: Initialize RAG Engine
      console.log(`[BACKGROUND-SYNC] Initializing RAG engine for store: ${storeId}`);
      const ragEngine = new FiniRAGEngine();
      
      if (operationTracker) {
        operationManager.updateProgress(operationTracker.id, 10, 1, 'Inicializando sistema RAG...');
      }

      // 2. 🚀 ULTRA-FAST: Initialize namespaces with timeout
      console.log(`[BACKGROUND-SYNC] Setting up data namespaces...`);
      if (operationTracker) {
        operationManager.updateProgress(operationTracker.id, 20, 2, 'Configurando espacios de datos...');
      }
      
      const namespaceResult = await Promise.race([
        ragEngine.initializeStoreNamespaces(storeId),
        new Promise<{ success: boolean; error?: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Namespace timeout after 40s')), 40000)
        )
      ]);
      
      if (!namespaceResult.success) {
        throw new Error(`Namespace setup failed: ${namespaceResult.error}`);
      }
      
      completedOperations.push('namespaces_initialized');
      console.log(`[BACKGROUND-SYNC] ✅ Namespaces ready for store: ${storeId}`);
      
      if (operationTracker) {
        operationManager.updateProgress(operationTracker.id, 40, 3, 'Espacios de datos configurados');
      }

      // 3. 🚀 CONDITIONAL: Full data sync for new stores
      if (isFullInit) {
        console.log(`[BACKGROUND-SYNC] Starting full initialization for store: ${storeId}`);
        
        if (operationTracker) {
          operationManager.updateProgress(operationTracker.id, 50, 4, 'Sincronizando catálogo completo...');
        }
        
        // Data sync with timeout
        await Promise.race([
          ragEngine.indexStoreData(storeId, workingAccessToken),
          new Promise<void>((_, reject) => 
            setTimeout(() => reject(new Error('Data sync timeout after 40s')), 40000)
          )
        ]);
        
        completedOperations.push('full_data_sync_completed');
        console.log(`[BACKGROUND-SYNC] ✅ Full data sync completed for store: ${storeId}`);
        
        if (operationTracker) {
          operationManager.updateProgress(operationTracker.id, 80, 5, 'Catálogo sincronizado exitosamente');
        }
      } else {
        console.log(`[BACKGROUND-SYNC] Skipping full sync for existing store: ${storeId}`);
        completedOperations.push('sync_skipped_existing_store');
        
        if (operationTracker) {
          operationManager.updateProgress(operationTracker.id, 70, 4, 'Actualizando datos existentes...');
        }
      }

      // 4. 🚀 ULTRA-FAST: Update store timestamp
      await StoreService.updateStore(storeId, {
        last_sync_at: new Date().toISOString()
      });
      
      completedOperations.push('timestamp_updated');
      
      if (operationTracker) {
        operationManager.updateProgress(operationTracker.id, 95, isFullInit ? 6 : 5, 'Finalizando configuración...');
      }

      const totalTime = Date.now() - startTime;
      console.log(`[BACKGROUND-SYNC] ✅ ${operation} completed for store: ${storeId} in ${totalTime}ms`);
      
      // 🎯 Complete operation tracker
      if (operationTracker) {
        operationManager.completeOperation(operationTracker.id);
      }

      return NextResponse.json({
        success: true,
        storeId,
        operation,
        jobId,
        completedOperations,
        totalTimeMs: totalTime,
        operationId: operationTracker?.id,
        message: `${operation} completed successfully`
      });

    } catch (syncError) {
      console.error(`[BACKGROUND-SYNC] ❌ ${operation} failed for store ${storeId}:`, syncError);
      
      // 🎯 Fail operation tracker
      if (operationTracker) {
        operationManager.failOperation(
          operationTracker.id, 
          syncError instanceof Error ? syncError.message : 'Unknown sync error'
        );
      }
      
      // Return partial success info
      const totalTime = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        storeId,
        operation,
        jobId,
        completedOperations,
        totalTimeMs: totalTime,
        operationId: operationTracker?.id,
        error: syncError instanceof Error ? syncError.message : 'Unknown sync error',
        message: `${operation} failed but store connection remains valid`
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[BACKGROUND-SYNC] ❌ Critical error:', error);
    
    const totalTime = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTimeMs: totalTime,
      message: 'Background sync system error'
    }, { status: 500 });
  }
} 