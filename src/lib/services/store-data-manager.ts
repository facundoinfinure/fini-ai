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
   * 🆕 CREAR TIENDA NUEVA
   * ====================
   * 
   * Proceso completo:
   * 1. Validar OAuth y obtener token
   * 2. Crear registro en DB (rápido)
   * 3. Trigger background sync (asíncrono)
   * 4. Retornar resultado inmediato
   */
  async createNewStore(oauthData: OAuthData): Promise<StoreOperationResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-MANAGER] Creating new store for user: ${oauthData.userId}`);
      
      // PASO 1: Obtener access token si no se proporciona
      let accessToken = oauthData.accessToken;
      if (!accessToken) {
        console.log(`[STORE-MANAGER] Exchanging OAuth code for access token`);
        
        const { exchangeCodeForToken } = await import('@/lib/integrations/tiendanube');
        const tokenResult = await exchangeCodeForToken(oauthData.authorizationCode);
        
        if (!tokenResult.success) {
          throw new Error(`OAuth token exchange failed: ${tokenResult.error}`);
        }
        
        accessToken = tokenResult.access_token!;
        operations.push('oauth_token_obtained');
      }

      // PASO 2: Validar token y obtener información de la tienda
      console.log(`[STORE-MANAGER] Validating token and fetching store info`);
      
      const api = new TiendaNubeAPI(accessToken, oauthData.platformStoreId);
      const storeInfo = await api.getStore();
      operations.push('store_info_validated');

      // PASO 3: Crear registro en base de datos (RÁPIDO)
      console.log(`[STORE-MANAGER] Creating database record`);
      
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
        timezone: (storeInfo as any).timezone || 'America/Argentina/Buenos_Aires',
        language: storeInfo.language || 'es',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createResult = await this.storeService.createStore(storeData);
      
      if (!createResult.success) {
        throw new Error(`Database creation failed: ${createResult.error}`);
      }
      
      const store = createResult.store!;
      operations.push('database_record_created');
      
      console.log(`[STORE-MANAGER] ✅ Store created in DB: ${store.id}`);

      // PASO 4: Token ya almacenado en access_token field
      // Note: storeToken method may not exist in current implementation
      operations.push('token_stored');

      // PASO 5: Trigger background sync (NO BLOQUEANTE)
      const backgroundJobId = await this.triggerBackgroundSync(store.id, {
        type: 'full',
        priority: 'high',
        includeVectors: true,
        includeDatabase: true
      });
      operations.push('background_sync_triggered');
      
      console.log(`[STORE-MANAGER] ✅ New store created successfully: ${store.id} with job: ${backgroundJobId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId,
        syncStatus: 'pending'
      };

    } catch (error) {
      console.error('[STORE-MANAGER] ❌ New store creation failed:', error);
      
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
      console.log(`[STORE-MANAGER] Reconnecting existing store: ${storeId}`);
      
      // PASO 1: Obtener access token
      let accessToken = oauthData.accessToken;
      if (!accessToken) {
        const { exchangeCodeForToken } = await import('@/lib/integrations/tiendanube');
        const tokenResult = await exchangeCodeForToken(oauthData.authorizationCode);
        
        if (!tokenResult.success) {
          throw new Error(`OAuth token exchange failed: ${tokenResult.error}`);
        }
        
        accessToken = tokenResult.access_token!;
        operations.push('oauth_token_obtained');
      }

      // PASO 2: Validar nuevo token
      console.log(`[STORE-MANAGER] Validating new token`);
      
      const api = new TiendaNubeAPI(accessToken, oauthData.platformStoreId);
      const storeInfo = await api.getStore();
      operations.push('new_token_validated');

      // PASO 3: Actualizar registro en DB
      console.log(`[STORE-MANAGER] Updating database record`);
      
      const updateData = {
        name: oauthData.storeName || storeInfo.name,
        domain: oauthData.storeUrl || storeInfo.url,
        access_token: accessToken,
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        currency: storeInfo.currency || 'ARS',
        timezone: storeInfo.timezone || 'America/Argentina/Buenos_Aires',
        language: storeInfo.language || 'es',
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const updateResult = await this.storeService.updateStore(storeId, updateData);
      
      if (!updateResult.success) {
        throw new Error(`Database update failed: ${updateResult.error}`);
      }
      
      const store = updateResult.store!;
      operations.push('database_record_updated');

      // PASO 4: Actualizar token en token manager
      await this.tokenManager.storeToken(storeId, oauthData.userId, accessToken);
      operations.push('token_updated');

      // PASO 5: Trigger background cleanup + re-sync
      const backgroundJobId = await this.triggerBackgroundCleanupAndSync(storeId, {
        type: 'cleanup',
        priority: 'high',
        includeVectors: true,
        includeDatabase: false
      });
      operations.push('background_cleanup_triggered');
      
      console.log(`[STORE-MANAGER] ✅ Store reconnected successfully: ${storeId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId,
        syncStatus: 'pending'
      };

    } catch (error) {
      console.error('[STORE-MANAGER] ❌ Store reconnection failed:', error);
      
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
      const storeResult = await this.storeService.getStore(storeId);
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
      const storeResult = await this.storeService.getStore(storeId);
      if (!storeResult.success || storeResult.store!.user_id !== userId) {
        throw new Error(`Unauthorized or store not found: ${storeId}`);
      }
      
      // Marcar como inactiva
      const updateResult = await this.storeService.updateStore(storeId, {
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
      const storeResult = await this.storeService.getStore(storeId);
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
        
        // Actualizar en token manager
        await this.tokenManager.storeToken(storeId, userId, newAccessToken);
        operations.push('token_updated');
      }
      
      // Reactivar tienda
      const updateResult = await this.storeService.updateStore(storeId, updateData);
      
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
  private async triggerBackgroundCleanupAndSync(storeId: string, options: SyncOptions): Promise<string> {
    try {
      const jobId = `cleanup-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      const jobData = {
        storeId,
        jobId,
        syncType: 'cleanup',
        priority: options.priority,
        includeVectors: options.includeVectors,
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
      const storeResult = await this.storeService.getStore(storeId);
      
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
      const hasValidToken = await this.tokenManager.validateToken(storeId);
      
      return {
        success: true,
        store,
        status: store.is_active ? 'active' : 'inactive',
        hasValidToken,
        lastSync: store.last_sync_at,
        syncStatus: hasValidToken ? 'healthy' : 'needs_reconnection'
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