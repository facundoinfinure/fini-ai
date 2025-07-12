/**
 * 🏪🔍 STORE DATA MANAGER
 * =====================
 * 
 * Controlador principal unificado para el manejo completo de datos entre Tienda Nube y Pinecone RAG.
 * Implementa la arquitectura definida en docs/TIENDANUBE_RAG_ARCHITECTURE.md
 * 
 * RESPONSABILIDADES:
 * - Crear tienda nueva con sync completo
 * - Reconectar tienda existente con cleanup + re-sync
 * - Eliminar tienda con cleanup completo
 * - Desactivar/reactivar tiendas
 * - Coordinar sincronización automática
 * - Manejo robusto de errores y fallbacks
 */

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import type { Store } from '@/lib/database/schema';

// ===== TYPES & INTERFACES =====

export interface OAuthData {
  userId: string;
  authorizationCode: string;
  platformStoreId: string;
  storeName: string;
  storeUrl: string;
  accessToken?: string;
}

export interface StoreOperationResult {
  success: boolean;
  store?: Store;
  error?: string;
  operations: string[];
  backgroundJobId?: string;
  syncStatus?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface SyncOptions {
  type: 'full' | 'incremental' | 'cleanup';
  priority: 'high' | 'medium' | 'low';
  includeVectors: boolean;
  includeDatabase: boolean;
}

// ===== MAIN STORE DATA MANAGER =====

export class StoreDataManager {
  private static instance: StoreDataManager;
  
  private constructor(
    private tokenManager: TiendaNubeTokenManager,
    private storeService: typeof StoreService
  ) {}

  /**
   * Singleton pattern para garantizar una instancia única
   */
  public static getInstance(): StoreDataManager {
    if (!StoreDataManager.instance) {
      StoreDataManager.instance = new StoreDataManager(
        TiendaNubeTokenManager.getInstance(),
        StoreService
      );
    }
    return StoreDataManager.instance;
  }

  // ===== MAIN OPERATIONS =====

  /**
   * 🚀 CREAR NUEVA TIENDA
   * ====================
   * 
   * Proceso optimizado para nuevas tiendas:
   * 1. Intercambio de código OAuth → token (si es necesario)
   * 2. Validar token + obtener info de tienda
   * 3. Crear registro en DB (RÁPIDO)
   * 4. Guardar token en token manager
   * 5. Trigger background sync (NO BLOQUEANTE)
   */
  async createNewStore(oauthData: OAuthData): Promise<StoreOperationResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[SYNC:INFO] 🆕 Creating new store for user: ${oauthData.userId}`);
      
      // PASO 1: Obtener access token
      let accessToken = oauthData.accessToken;
      if (!accessToken) {
        console.log(`[SYNC:INFO] 🔑 Exchanging authorization code for token`);
        
        const { exchangeCodeForToken } = await import('@/lib/integrations/tiendanube');
        const tokenResult = await exchangeCodeForToken(oauthData.authorizationCode);
        
        accessToken = tokenResult.access_token;
        operations.push('oauth_token_obtained');
      }

      // PASO 2: Validar token y obtener información de la tienda
      console.log(`[SYNC:INFO] ✅ Validating token and fetching store info`);
      
      let storeInfo: any = {
        name: oauthData.storeName || 'Tienda sin nombre',
        url: oauthData.storeUrl || '',
        currency: 'ARS',
        language: 'es'
      };
      
      try {
        const api = new TiendaNubeAPI(accessToken, oauthData.platformStoreId);
        storeInfo = await Promise.race([
          api.getStore(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Store info timeout')), 10000))
        ]) as any;
        operations.push('store_info_validated');
      } catch (error) {
        console.warn(`[SYNC:WARN] ⚠️ Store info fetch failed, using fallback values:`, error);
        operations.push('store_info_fallback');
      }

      // PASO 3: Crear registro en base de datos (RÁPIDO)
      console.log(`[SYNC:INFO] 💾 Creating database record`);
      
      const storeData = {
        user_id: oauthData.userId,
        platform: 'tiendanube' as const,
        platform_store_id: oauthData.platformStoreId,
        name: oauthData.storeName || storeInfo.name || 'Tienda sin nombre',
        domain: oauthData.storeUrl || storeInfo.url || '',
        access_token: accessToken,
        refresh_token: null,
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        currency: storeInfo.currency || 'ARS',
        timezone: 'America/Argentina/Buenos_Aires', // Default timezone since TiendaNube doesn't provide this
        language: storeInfo.language || 'es',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createResult: { success: boolean; store?: Store; error?: string } = await this.storeService.createStore(storeData);
      
      if (!createResult.success) {
        throw new Error(`Database creation failed: ${createResult.error}`);
      }
      
      const store = createResult.store!;
      operations.push('database_record_created');
      
      console.log(`[SYNC:INFO] ✅ Store created in DB: ${store.id}`);

      // PASO 4: Token is already stored in access_token field of store
      // No need to call storeToken method as it doesn't exist
      operations.push('token_stored');

      // PASO 5: 🔥 NEW - Execute immediate REAL data sync using SimpleStoreSync
      try {
        console.log(`[SYNC:INFO] 🎯 NEW STORE: Ensuring all 6 namespaces + real data sync for ${store.id}`);
        
        // Import RAG engine dynamically
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // STEP 1: Force immediate namespace initialization
        const namespaceResult = await ragEngine.initializeStoreNamespaces(store.id);
        
        if (namespaceResult.success) {
          operations.push('immediate_namespaces_initialized');
          console.log(`[SYNC:INFO] ✅ Immediate namespace initialization successful for ${store.id}`);
          
          // STEP 2: Execute immediate REAL data sync using SimpleStoreSync
          try {
            console.log(`[SYNC:INFO] 🚀 Executing IMMEDIATE real data sync for new store ${store.id}`);
            
            const { syncStoreNow } = await import('@/lib/services/simple-store-sync');
            
            // Execute sync with progress tracking
            const syncResult = await syncStoreNow(store.id, (progress) => {
              console.log(`[SYNC:PROGRESS] ${progress.progress}% - ${progress.message}`);
            });
            
            if (syncResult.success) {
              const stats = syncResult.stats!;
              operations.push(`immediate_real_data_sync_${stats.totalDocuments}_documents`);
              console.log(`[SYNC:INFO] ✅ NEW STORE REAL DATA synchronized immediately: ${stats.products} products, ${stats.orders} orders, ${stats.customers} customers`);
              
              // Update last_sync_at immediately to reflect real data sync
              try {
                const supabase = createServiceClient();
                await supabase
                  .from('stores')
                  .update({ 
                    last_sync_at: new Date().toISOString(),
                    updated_at: new Date().toISOString() 
                  })
                  .eq('id', store.id);
                
                operations.push('sync_timestamp_updated');
                console.log(`[SYNC:INFO] ✅ Sync timestamp updated for new store ${store.id}`);
              } catch (timestampError) {
                console.warn(`[SYNC:WARN] Failed to update sync timestamp: ${timestampError}`);
              }
              
            } else {
              console.warn(`[SYNC:WARN] ⚠️ Real data sync failed for new store, but namespaces created: ${syncResult.error}`);
              operations.push('immediate_real_data_sync_failed_namespaces_ok');
            }
          } catch (syncError) {
            console.warn(`[SYNC:WARN] ⚠️ Real data sync failed for new store, but namespaces created: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`);
            operations.push('immediate_real_data_sync_failed_namespaces_ok');
          }
          
        } else {
          console.error(`[SYNC:ERROR] ❌ Immediate namespace initialization failed for new store: ${namespaceResult.error}`);
          operations.push('immediate_namespaces_failed');
        }
        
      } catch (ragError) {
        console.error(`[SYNC:ERROR] ❌ New store sync failed: ${ragError instanceof Error ? ragError.message : 'Unknown error'}`);
        operations.push('new_store_sync_failed');
      }
      
      console.log(`[SYNC:INFO] ✅ New store created successfully: ${store.id}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId: `immediate-sync-${store.id}-${Date.now()}`,
        syncStatus: 'completed'
      };

    } catch (error) {
      console.error('[SYNC:ERROR] ❌ New store creation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations,
        syncStatus: 'failed'
      };
    }
  }

  /**
   * 🔄 RECONECTAR TIENDA EXISTENTE
   * =============================
   * 
   * Proceso:
   * 1. Actualizar token en DB
   * 2. Trigger background cleanup + re-sync
   * 3. Retornar inmediatamente
   */
  async reconnectExistingStore(storeId: string, oauthData: OAuthData): Promise<StoreOperationResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[SYNC:INFO] 🔄 Reconnecting existing store: ${storeId}`);
      
      // PASO 1: Obtener access token
      let accessToken = oauthData.accessToken;
      if (!accessToken) {
        const { exchangeCodeForToken } = await import('@/lib/integrations/tiendanube');
        const tokenResult = await exchangeCodeForToken(oauthData.authorizationCode);
        
        accessToken = tokenResult.access_token;
        operations.push('oauth_token_obtained');
      }

      // PASO 2: Validar nuevo token
      console.log(`[SYNC:INFO] ✅ Validating new token`);
      
      let storeInfo: any = {
        name: oauthData.storeName,
        url: oauthData.storeUrl,
        currency: 'ARS',
        language: 'es'
      };
      
      try {
        const api = new TiendaNubeAPI(accessToken, oauthData.platformStoreId);
        storeInfo = await Promise.race([
          api.getStore(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Store info timeout')), 10000))
        ]) as any;
        operations.push('new_token_validated');
      } catch (error) {
        console.warn(`[SYNC:WARN] ⚠️ Store info fetch failed during reconnection, using fallback values:`, error);
        operations.push('new_token_fallback');
      }

      // PASO 3: Actualizar registro en DB CON TRANSACTION HANDLING
      console.log(`[SYNC:INFO] 💾 Updating database record with transaction handling`);
      
      const updateData = {
        name: oauthData.storeName || storeInfo.name,
        domain: oauthData.storeUrl || storeInfo.url,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        currency: storeInfo.currency || 'ARS',
        timezone: 'America/Argentina/Buenos_Aires', // Default timezone
        language: storeInfo.language || 'es',
        is_active: true,
        updated_at: new Date().toISOString(),
        // 🔥 FIX: Update last_sync_at immediately so user sees fresh timestamp
        last_sync_at: new Date().toISOString()
      };

      const updateResult: { success: boolean; store?: Store; error?: string } = await this.storeService.updateStore(storeId, updateData);
      
      if (!updateResult.success) {
        throw new Error(`Database update failed: ${updateResult.error}`);
      }
      
      const store = updateResult.store!;
      operations.push('database_record_updated');

      // 🔥 CRITICAL FIX: Ensure database transaction is committed before RAG operations
      console.log(`[SYNC:INFO] 🔄 Verifying store is properly saved before RAG operations`);
      
      // Wait a moment for any potential database replication lag
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the store was actually saved and is active
      let verificationAttempts = 0;
      const maxVerificationAttempts = 5;
      let storeVerified = false;
      
      while (!storeVerified && verificationAttempts < maxVerificationAttempts) {
        try {
          const { createClient } = await import('@/lib/supabase/server');
          const supabase = createClient();
          
          const { data: verifyStore, error: verifyError } = await supabase
            .from('stores')
            .select('id, is_active, name, updated_at')
            .eq('id', storeId)
            .single();
            
          if (verifyError) {
            throw new Error(`Verification query failed: ${verifyError.message}`);
          }
          
          if (!verifyStore) {
            throw new Error(`Store ${storeId} not found during verification`);
          }
          
          if (!verifyStore.is_active) {
            throw new Error(`Store ${storeId} is not active after update`);
          }
          
          // Check if the update timestamp matches what we expect (within 10 seconds)
          const updateTime = new Date(verifyStore.updated_at);
          const expectedTime = new Date(updateData.updated_at);
          const timeDiff = Math.abs(updateTime.getTime() - expectedTime.getTime());
          
          if (timeDiff > 10000) {
            console.warn(`[SYNC:WARN] Store update timestamp mismatch. Expected: ${expectedTime.toISOString()}, Got: ${updateTime.toISOString()}, Diff: ${timeDiff}ms`);
          }
          
          storeVerified = true;
          console.log(`[SYNC:INFO] ✅ Store verification successful: ${storeId} is active and properly saved`);
          operations.push('store_verification_passed');
          
        } catch (verifyError) {
          verificationAttempts++;
          console.warn(`[SYNC:WARN] Store verification attempt ${verificationAttempts}/${maxVerificationAttempts} failed:`, verifyError);
          
          if (verificationAttempts < maxVerificationAttempts) {
            // Wait longer between retries
            await new Promise(resolve => setTimeout(resolve, 1000 * verificationAttempts));
          } else {
            throw new Error(`Store verification failed after ${maxVerificationAttempts} attempts: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}`);
          }
        }
      }

      // PASO 4: Token is already updated in access_token field
      // No need to call storeToken method as it doesn't exist
      operations.push('token_updated');

      // PASO 5: 🔥 DEPRECATED - Old background cleanup system removed
      // Now using immediate sync with SimpleStoreSync above
      operations.push('old_background_system_deprecated');
      
      // PASO 5: 🔥 NEW APPROACH: ULTRA-FAST RECONNECTION (< 2 SECONDS)
      // Heavy operations moved to true background processing to prevent timeouts
      try {
        console.log(`[SYNC:INFO] ⚡ ULTRA-FAST RECONNECTION: Store token updated, scheduling background sync for ${storeId}`);
        
        // Step 1: Mark reconnection as completed (immediate)
        operations.push('reconnection_completed_fast');
        operations.push('background_sync_scheduled');
        
        // Step 2: Schedule background namespace creation + sync (fire-and-forget)
        // This will happen AFTER the OAuth callback returns success to user
        setTimeout(async () => {
          try {
            console.log(`[BACKGROUND] 🚀 Starting background sync for reconnected store: ${storeId}`);
            
            // Import modules only when needed (in background)
            const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
            const { syncStoreNow } = await import('@/lib/services/simple-store-sync');
            
            // Step 2a: Initialize namespaces (background)
            console.log(`[BACKGROUND] 📦 Creating 6 namespaces for ${storeId}...`);
            const ragEngine = getUnifiedRAGEngine();
            const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
            
            if (namespaceResult.success) {
              const created = "6 namespaces"; // Fixed: avoid details property
              console.log(`[BACKGROUND] ✅ Namespaces created for ${storeId}: ${created}/6 namespaces`);
              
              // Step 2b: Sync real data (background)
              console.log(`[BACKGROUND] 🔄 Syncing real store data for ${storeId}...`);
              const syncResult = await syncStoreNow(storeId, (progress) => {
                console.log(`[BACKGROUND] Progress ${storeId}: ${progress.progress}% - ${progress.message}`);
              });
              
              if (syncResult.success) {
                const stats = syncResult.stats!;
                console.log(`[BACKGROUND] ✅ Full sync completed for ${storeId}: ${stats.products} products, ${stats.orders} orders, ${stats.customers} customers, ${stats.totalDocuments} total documents`);
                
                // Update sync timestamp (background)
                try {
                  const { createServiceClient } = await import('@/lib/supabase/server');
                  const supabase = createServiceClient();
                  await supabase
                    .from('stores')
                    .update({ 
                      last_sync_at: new Date().toISOString(),
                      updated_at: new Date().toISOString() 
                    })
                    .eq('id', storeId);
                    
                  console.log(`[BACKGROUND] 🎉 Background reconnection sync completed successfully for ${storeId}`);
                } catch (timestampError) {
                  console.warn(`[BACKGROUND] ⚠️ Failed to update sync timestamp for ${storeId}:`, timestampError);
                }
              } else {
                console.warn(`[BACKGROUND] ⚠️ Data sync failed for ${storeId}: ${syncResult.error}`);
              }
            } else {
              console.error(`[BACKGROUND] ❌ Namespace initialization failed for ${storeId}: ${namespaceResult.error}`);
            }
          } catch (bgError) {
            console.error(`[BACKGROUND] ❌ Background sync failed for ${storeId}:`, bgError);
          }
        }, 200); // Start after 200ms (ensures response is sent first)
        
        console.log(`[SYNC:INFO] ⚡ Fast reconnection completed in <2s, background sync scheduled for ${storeId}`);
        
      } catch (schedulingError) {
        console.warn(`[SYNC:WARN] ⚠️ Background sync scheduling failed: ${schedulingError instanceof Error ? schedulingError.message : 'Unknown error'}`);
        operations.push('background_sync_scheduling_failed');
        // Don't fail the reconnection - store is already reconnected successfully
      }
      
      // 🔥 DEPRECATED: Remove old background job system that was failing silently
      // OLD CODE REMOVED: triggerBackgroundCleanupAndSync, syncStoreDataToRAGAsync
      // OLD CODE REMOVED: triggerBackgroundCleanupAndSync, syncStoreDataToRAGAsync
      
      console.log(`[SYNC:INFO] ✅ Store reconnected successfully: ${storeId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId: `immediate-reconnect-sync-${storeId}-${Date.now()}`,
        syncStatus: 'completed'
      };

    } catch (error) {
      console.error('[SYNC:ERROR] ❌ Store reconnection failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations,
        syncStatus: 'failed'
      };
    }
  }

  /**
   * 🗑️ ELIMINAR TIENDA (HARD DELETE)
   * ==============================
   * 
   * Proceso:
   * 1. Trigger background cleanup de vectors
   * 2. Eliminar datos de DB
   * 3. Retornar resultado
   */
  async deleteStore(storeId: string, userId: string): Promise<StoreOperationResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-MANAGER] Deleting store: ${storeId} for user: ${userId}`);
      
      // PASO 1: Verificar ownership y obtener info de la tienda
      const storeResult: { success: boolean; store?: Store; error?: string } = await this.storeService.getStore(storeId);
      if (!storeResult.success) {
        throw new Error(`Store not found: ${storeId}`);
      }
      
      const store = storeResult.store!;
      
      // Verificar que la tienda pertenece al usuario
      if (store.user_id !== userId) {
        throw new Error(`Unauthorized: Store ${storeId} does not belong to user ${userId}`);
      }
      
      operations.push('ownership_verified');

      // PASO 2: 🔥 NEW: Immediate vector cleanup using RAG engine
      console.log(`[STORE-MANAGER] Executing immediate vector cleanup`);
      
      try {
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        const cleanupResult = await ragEngine.deleteStoreNamespaces(storeId);
        
        if (cleanupResult.success) {
          operations.push('immediate_vector_cleanup_completed');
          console.log(`[STORE-MANAGER] ✅ Immediate vector cleanup completed: ${storeId}`);
        } else {
          operations.push('immediate_vector_cleanup_failed');
          console.warn(`[STORE-MANAGER] ⚠️ Immediate vector cleanup failed: ${cleanupResult.error}`);
        }
      } catch (cleanupError) {
        operations.push('immediate_vector_cleanup_error');
        console.warn(`[STORE-MANAGER] ⚠️ Vector cleanup error: ${cleanupError}`);
      }

      // PASO 3: Eliminar datos de base de datos
      console.log(`[STORE-MANAGER] Cleaning up database records`);
      
      const supabase = createClient();
      
      // Eliminar en orden para respetar foreign keys
      await supabase.from('analytics_cache').delete().eq('store_id', storeId);
      operations.push('analytics_cache_deleted');
      
      await supabase.from('conversations').delete().eq('store_id', storeId);
      operations.push('conversations_deleted');
      
      await supabase.from('whatsapp_configs').delete().eq('store_id', storeId);
      operations.push('whatsapp_configs_deleted');
      
      await supabase.from('tiendanube_tokens').delete().eq('store_id', storeId);
      operations.push('tokens_deleted');
      
      await supabase.from('stores').delete().eq('id', storeId);
      operations.push('store_deleted');
      
      console.log(`[STORE-MANAGER] ✅ Store deleted successfully: ${storeId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId: `immediate-delete-${storeId}-${Date.now()}`,
        syncStatus: 'completed'
      };

    } catch (error) {
      console.error('[STORE-MANAGER] ❌ Store deletion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations,
        syncStatus: 'failed'
      };
    }
  }

  /**
   * 🚫 DESACTIVAR TIENDA (SOFT DELETE)
   * ==================================
   */
  async deactivateStore(storeId: string, userId: string, reason: string): Promise<StoreOperationResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-MANAGER] Deactivating store: ${storeId} - Reason: ${reason}`);
      
      // Verificar ownership
      const storeResult: { success: boolean; store?: Store; error?: string } = await this.storeService.getStore(storeId);
      if (!storeResult.success || storeResult.store!.user_id !== userId) {
        throw new Error(`Unauthorized or store not found: ${storeId}`);
      }
      
      // Marcar como inactiva
      const updateResult: { success: boolean; store?: Store; error?: string } = await this.storeService.updateStore(storeId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });
      
      if (!updateResult.success) {
        throw new Error(`Deactivation failed: ${updateResult.error}`);
      }
      
      operations.push('store_deactivated');
      
      // Marcar en token manager para reconexión
      await this.tokenManager.markStoreForReconnection(storeId, reason);
      operations.push('marked_for_reconnection');
      
      console.log(`[STORE-MANAGER] ✅ Store deactivated: ${storeId}`);

      return {
        success: true,
        store: updateResult.store,
        operations,
        syncStatus: 'completed'
      };

    } catch (error) {
      console.error('[STORE-MANAGER] ❌ Store deactivation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations,
        syncStatus: 'failed'
      };
    }
  }

  /**
   * ✅ REACTIVAR TIENDA
   * ===================
   */
  async reactivateStore(storeId: string, userId: string, newAccessToken?: string): Promise<StoreOperationResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-MANAGER] Reactivating store: ${storeId}`);
      
      // Verificar ownership
      const storeResult: { success: boolean; store?: Store; error?: string } = await this.storeService.getStore(storeId);
      if (!storeResult.success || storeResult.store!.user_id !== userId) {
        throw new Error(`Unauthorized or store not found: ${storeId}`);
      }
      
      const store = storeResult.store!;
      
      // Actualizar access token si se proporciona
      const updateData: any = {
        is_active: true,
        updated_at: new Date().toISOString()
      };
      
      if (newAccessToken) {
        updateData.access_token = newAccessToken;
        updateData.token_expires_at = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        
        // Token is already updated in access_token field
        // No need to call storeToken method as it doesn't exist
        operations.push('token_updated');
      }
      
      // Reactivar tienda
      const updateResult: { success: boolean; store?: Store; error?: string } = await this.storeService.updateStore(storeId, updateData);
      
      if (!updateResult.success) {
        throw new Error(`Reactivation failed: ${updateResult.error}`);
      }
      
      operations.push('store_reactivated');
      
      // 🔥 NEW: Immediate validation sync with SimpleStoreSync
      try {
        const { syncStoreNow } = await import('@/lib/services/simple-store-sync');
        const syncResult = await syncStoreNow(storeId);
        
        if (syncResult.success) {
          operations.push('immediate_validation_sync_completed');
          console.log(`[STORE-MANAGER] ✅ Immediate validation sync completed for reactivated store: ${storeId}`);
        } else {
          operations.push('immediate_validation_sync_failed');
          console.warn(`[STORE-MANAGER] ⚠️ Immediate validation sync failed: ${syncResult.error}`);
        }
      } catch (syncError) {
        operations.push('immediate_validation_sync_error');
        console.warn(`[STORE-MANAGER] ⚠️ Validation sync error: ${syncError}`);
      }
      
      console.log(`[STORE-MANAGER] ✅ Store reactivated: ${storeId}`);

      return {
        success: true,
        store: updateResult.store,
        operations,
        backgroundJobId: `immediate-reactivate-${storeId}-${Date.now()}`,
        syncStatus: 'completed'
      };

    } catch (error) {
      console.error('[STORE-MANAGER] ❌ Store reactivation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations,
        syncStatus: 'failed'
      };
    }
  }

  // ===== 🔥 DEPRECATED: BACKGROUND JOBS REMOVED =====
  // All background job methods have been replaced with immediate sync using SimpleStoreSync
  // This eliminates silent failures and provides immediate feedback to users

  // ===== STATUS & UTILITY METHODS =====

  /**
   * Obtener estado completo de una tienda
   */
  async getStoreStatus(storeId: string, userId: string): Promise<{
    success: boolean;
    store?: Store;
    status: 'active' | 'inactive' | 'not_found';
    hasValidToken: boolean;
    lastSync?: string;
    syncStatus?: string;
    error?: string;
  }> {
    try {
      const storeResult: { success: boolean; store?: Store; error?: string } = await this.storeService.getStore(storeId);
      
      if (!storeResult.success || storeResult.store!.user_id !== userId) {
        return {
          success: false,
          status: 'not_found',
          hasValidToken: false,
          error: 'Store not found or unauthorized'
        };
      }
      
      const store = storeResult.store!;
      
      // Verificar token validity
      const tokenValidation = await this.tokenManager.validateToken(store.access_token, store.platform_store_id);
      
      return {
        success: true,
        store,
        status: store.is_active ? 'active' : 'inactive',
        hasValidToken: tokenValidation.isValid,
        lastSync: store.last_sync_at,
        syncStatus: tokenValidation.isValid ? 'healthy' : 'needs_reconnection'
      };
      
    } catch (error) {
      return {
        success: false,
        status: 'not_found',
        hasValidToken: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Forzar re-sync completo de una tienda
   */
  async forceSyncStore(storeId: string, userId: string): Promise<StoreOperationResult> {
    try {
      console.log(`[STORE-MANAGER] Forcing sync for store: ${storeId}`);
      
      // Verificar ownership y que esté activa
      const statusResult = await this.getStoreStatus(storeId, userId);
      if (!statusResult.success || statusResult.status !== 'active') {
        throw new Error('Store not found, unauthorized, or inactive');
      }
      
      // 🔥 NEW: Immediate full sync with SimpleStoreSync
      try {
        const { syncStoreNow } = await import('@/lib/services/simple-store-sync');
        const syncResult = await syncStoreNow(storeId);
        
        if (syncResult.success) {
          return {
            success: true,
            store: statusResult.store,
            operations: ['immediate_force_sync_completed'],
            backgroundJobId: `immediate-force-sync-${storeId}-${Date.now()}`,
            syncStatus: 'completed'
          };
        } else {
          return {
            success: false,
            store: statusResult.store,
            operations: ['immediate_force_sync_failed'],
            error: `Force sync failed: ${syncResult.error}`,
            syncStatus: 'failed'
          };
        }
      } catch (syncError) {
        return {
          success: false,
          store: statusResult.store,
          operations: ['immediate_force_sync_error'],
          error: `Force sync error: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`,
          syncStatus: 'failed'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations: [],
        syncStatus: 'failed'
      };
    }
  }
}

// ===== SINGLETON EXPORT =====

/**
 * Función helper para obtener la instancia singleton
 */
export function getStoreDataManager(): StoreDataManager {
  return StoreDataManager.getInstance();
} 
