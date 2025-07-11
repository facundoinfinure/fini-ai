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

import { createClient } from '@/lib/supabase/server';
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

      // PASO 5: Trigger background sync (NO BLOQUEANTE)
      const backgroundJobId = await this.triggerBackgroundSync(store.id, {
        type: 'full',
        priority: 'high',
        includeVectors: true,
        includeDatabase: true
      });
      operations.push('background_sync_triggered');
      
      console.log(`[SYNC:INFO] ✅ New store created successfully: ${store.id} with job: ${backgroundJobId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId,
        syncStatus: 'pending'
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

      // PASO 3: Actualizar registro en DB
      console.log(`[SYNC:INFO] 💾 Updating database record`);
      
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

      // PASO 4: Token is already updated in access_token field
      // No need to call storeToken method as it doesn't exist
      operations.push('token_updated');

      // PASO 5: Trigger background cleanup + re-sync
      const backgroundJobId = await this.triggerBackgroundCleanupAndSync(storeId, {
        type: 'cleanup',
        priority: 'high',
        includeVectors: true,
        includeDatabase: false
      }, accessToken);
      operations.push('background_cleanup_triggered');
      
      // 🔥 PRODUCTION FIX: Immediate namespace initialization + validation
      try {
        console.log(`[SYNC:INFO] 🎯 PRODUCTION FIX: Ensuring all 6 namespaces are created for ${storeId}`);
        
        // Import RAG engine dynamically
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        const ragEngine = getUnifiedRAGEngine();
        
        // STEP 1: Force immediate namespace initialization (don't wait for background job)
        const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
        
        if (namespaceResult.success) {
          operations.push('immediate_namespaces_initialized');
          console.log(`[SYNC:INFO] ✅ Immediate namespace initialization successful for ${storeId}`);
          
          // STEP 2: Trigger immediate data sync to populate namespaces
          try {
            console.log(`[SYNC:INFO] 🚀 Triggering immediate data sync for ${storeId}`);
            const syncResult = await ragEngine.indexStoreData(storeId, accessToken);
            
            if (syncResult.success) {
              operations.push(`immediate_sync_indexed_${syncResult.documentsIndexed}_docs`);
              console.log(`[SYNC:INFO] ✅ Immediate sync indexed ${syncResult.documentsIndexed} documents in ${syncResult.namespacesProcessed.length} namespaces`);
            } else {
                              console.warn(`[SYNC:WARN] ⚠️ Immediate sync had issues: ${syncResult.error}, but namespaces should be created`);
              operations.push('immediate_sync_partial');
            }
          } catch (syncError) {
            console.warn(`[SYNC:WARN] ⚠️ Immediate sync failed, but namespaces created: ${syncError instanceof Error ? syncError.message : 'Unknown error'}`);
            operations.push('immediate_sync_failed_namespaces_ok');
          }
          
        } else {
          console.error(`[SYNC:ERROR] ❌ Immediate namespace initialization failed: ${namespaceResult.error}`);
          operations.push('immediate_namespaces_failed');
          // Don't fail the whole operation - background job might still work
        }
        
      } catch (ragError) {
        console.error(`[SYNC:ERROR] ❌ Production fix failed: ${ragError instanceof Error ? ragError.message : 'Unknown error'}`);
        operations.push('production_fix_failed');
        // Don't fail the whole operation - background job might still work
      }
      
      // 🔥 ALSO keep the original immediate sync for backward compatibility
      try {
        console.log(`[SYNC:INFO] 🔄 Triggering additional async sync for safety: ${storeId}`);
        const { StoreService } = await import('@/lib/database/client');
        await StoreService.syncStoreDataToRAGAsync(storeId);
        operations.push('additional_sync_triggered');
      } catch (syncError) {
        console.warn(`[SYNC:WARN] ⚠️ Additional sync failed for ${storeId}:`, syncError);
        // Don't fail the whole operation if additional sync fails
      }
      
      console.log(`[SYNC:INFO] ✅ Store reconnected successfully: ${storeId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId,
        syncStatus: 'pending'
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

      // PASO 2: Trigger background cleanup de vectors (NO BLOQUEANTE)
      console.log(`[STORE-MANAGER] Triggering vector cleanup`);
      
      const cleanupJobId = await this.triggerBackgroundVectorCleanup(storeId);
      operations.push('vector_cleanup_triggered');

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
        backgroundJobId: cleanupJobId,
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
      
      // Trigger validation sync
      const backgroundJobId = await this.triggerBackgroundSync(storeId, {
        type: 'incremental',
        priority: 'medium',
        includeVectors: true,
        includeDatabase: false
      });
      operations.push('validation_sync_triggered');
      
      console.log(`[STORE-MANAGER] ✅ Store reactivated: ${storeId}`);

      return {
        success: true,
        store: updateResult.store,
        operations,
        backgroundJobId,
        syncStatus: 'pending'
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

  // ===== BACKGROUND JOB TRIGGERING =====

  /**
   * Trigger background sync para tienda nueva o incremental
   */
  private async triggerBackgroundSync(storeId: string, options: SyncOptions): Promise<string> {
    try {
      const jobId = `sync-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const jobData = {
        storeId,
        jobId,
        syncType: options.type,
        priority: options.priority,
        includeVectors: options.includeVectors,
        includeDatabase: options.includeDatabase,
        timestamp: new Date().toISOString()
      };

      // Fire-and-forget HTTP request
      fetch(`${baseUrl}/api/stores/background-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      }).catch(error => {
        console.warn(`[STORE-MANAGER] Background sync HTTP call failed for store ${storeId}:`, error);
      });
      
      console.log(`[STORE-MANAGER] Background sync triggered: ${jobId}`);
      return jobId;
      
    } catch (error) {
      console.error(`[STORE-MANAGER] Failed to trigger background sync for store ${storeId}:`, error);
      return `error-${Date.now()}`;
    }
  }

  /**
   * Trigger background cleanup + re-sync para reconexión
   */
  private async triggerBackgroundCleanupAndSync(storeId: string, options: SyncOptions, accessToken: string): Promise<string> {
    try {
      const jobId = `cleanup-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const jobData = {
        storeId,
        jobId,
        syncType: 'cleanup',
        priority: options.priority,
        includeVectors: options.includeVectors,
        accessToken, // Pass accessToken to the background job
        timestamp: new Date().toISOString()
      };

      // Fire-and-forget HTTP request
      fetch(`${baseUrl}/api/stores/background-cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      }).catch(error => {
        console.warn(`[STORE-MANAGER] Background cleanup HTTP call failed for store ${storeId}:`, error);
      });
      
      console.log(`[STORE-MANAGER] Background cleanup triggered: ${jobId}`);
      return jobId;
      
    } catch (error) {
      console.error(`[STORE-MANAGER] Failed to trigger background cleanup for store ${storeId}:`, error);
      return `error-${Date.now()}`;
    }
  }

  /**
   * Trigger background vector cleanup para eliminación
   */
  private async triggerBackgroundVectorCleanup(storeId: string): Promise<string> {
    try {
      const jobId = `delete-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const jobData = {
        storeId,
        jobId,
        operation: 'delete',
        timestamp: new Date().toISOString()
      };

      // Fire-and-forget HTTP request
      fetch(`${baseUrl}/api/stores/background-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData)
      }).catch(error => {
        console.warn(`[STORE-MANAGER] Background delete HTTP call failed for store ${storeId}:`, error);
      });
      
      console.log(`[STORE-MANAGER] Background vector cleanup triggered: ${jobId}`);
      return jobId;
      
    } catch (error) {
      console.error(`[STORE-MANAGER] Failed to trigger background vector cleanup for store ${storeId}:`, error);
      return `error-${Date.now()}`;
    }
  }

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
      
      // Trigger full sync
      const backgroundJobId = await this.triggerBackgroundSync(storeId, {
        type: 'full',
        priority: 'high',
        includeVectors: true,
        includeDatabase: true
      });
      
      return {
        success: true,
        store: statusResult.store,
        operations: ['force_sync_triggered'],
        backgroundJobId,
        syncStatus: 'pending'
      };
      
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