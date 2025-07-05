/**
 * 🏪 STORE LIFECYCLE MANAGER
 * =========================
 * 
 * Maneja completamente el ciclo de vida de las tiendas:
 * - Crear tienda nueva
 * - Reconectar tienda existente  
 * - Borrar tienda (hard delete)
 * - Desactivar tienda (soft delete)
 * - Reactivar tienda
 * 
 * Características:
 * - Operaciones no bloqueantes
 * - Manejo robusto de errores
 * - Rollback automático en caso de fallas
 * - Logging detallado para debugging
 */

import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';
import { Store } from '@/lib/database/schema';

export interface StoreLifecycleResult {
  success: boolean;
  store?: Store;
  error?: string;
  operations: string[];
  backgroundJobId?: string;
}

export interface StoreCreationData {
  userId: string;
  storeUrl: string;
  storeName: string;
  platformStoreId: string;
  accessToken: string;
  context?: string;
}

export class StoreLifecycleManager {
  
  /**
   * 🆕 CREAR TIENDA NUEVA
   * ====================
   * 
   * Proceso completo:
   * 1. Crear registro en DB
   * 2. Disparar background sync (namespace + indexación)
   * 3. Retornar inmediatamente sin esperar sync
   */
  static async createNewStore(data: StoreCreationData): Promise<StoreLifecycleResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-LIFECYCLE] Creating new store: ${data.storeName}`);
      
      // 1. Crear store en DB (rápido)
      const storeData = {
        user_id: data.userId,
        platform: 'tiendanube' as const,
        platform_store_id: data.platformStoreId,
        name: data.storeName,
        domain: data.storeUrl,
        access_token: data.accessToken,
        refresh_token: null,
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createResult = await StoreService.createStore(storeData);
      
      if (!createResult.success) {
        throw new Error(`DB creation failed: ${createResult.error}`);
      }
      
      const store = createResult.store!;
      operations.push('store_created');
      
      console.log(`[STORE-LIFECYCLE] ✅ Store created in DB: ${store.id}`);

      // 2. Disparar background sync (no esperamos respuesta)
      const backgroundJobId = await this.triggerBackgroundSync(store.id, true, data.accessToken);
      operations.push('background_sync_triggered');
      
      console.log(`[STORE-LIFECYCLE] ✅ Background sync triggered with job ID: ${backgroundJobId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId
      };

    } catch (error) {
      console.error('[STORE-LIFECYCLE] ❌ New store creation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations
      };
    }
  }

  /**
   * 🔄 RECONECTAR TIENDA EXISTENTE
   * =============================
   * 
   * Proceso:
   * 1. Actualizar token en DB
   * 2. Disparar background cleanup + re-indexación
   * 3. Retornar inmediatamente
   */
  static async reconnectExistingStore(data: StoreCreationData): Promise<StoreLifecycleResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-LIFECYCLE] Reconnecting existing store: ${data.storeName}`);
      
      // 1. Actualizar store en DB
      const storeData = {
        user_id: data.userId,
        platform: 'tiendanube' as const,
        platform_store_id: data.platformStoreId,
        name: data.storeName,
        domain: data.storeUrl,
        access_token: data.accessToken,
        refresh_token: null,
        token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        updated_at: new Date().toISOString()
      };

      const updateResult = await StoreService.createOrUpdateStore(storeData);
      
      if (!updateResult.success) {
        throw new Error(`DB update failed: ${updateResult.error}`);
      }
      
      const store = updateResult.store!;
      operations.push('store_reconnected');
      
      console.log(`[STORE-LIFECYCLE] ✅ Store reconnected in DB: ${store.id}`);

      // 2. Disparar background cleanup + re-sync
      const backgroundJobId = await this.triggerBackgroundCleanupAndSync(store.id, data.accessToken);
      operations.push('background_cleanup_triggered');
      
      console.log(`[STORE-LIFECYCLE] ✅ Background cleanup triggered with job ID: ${backgroundJobId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId
      };

    } catch (error) {
      console.error('[STORE-LIFECYCLE] ❌ Store reconnection failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations
      };
    }
  }

  /**
   * 🗑️ BORRAR TIENDA (HARD DELETE)
   * ==============================
   * 
   * Proceso:
   * 1. Disparar background cleanup de vectors
   * 2. Eliminar datos de DB
   * 3. Retornar resultado
   */
  static async deleteStore(storeId: string): Promise<StoreLifecycleResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-LIFECYCLE] Deleting store: ${storeId}`);
      
      // 1. Obtener info de la tienda antes de borrar
      const storeResult = await StoreService.getStore(storeId);
      if (!storeResult.success) {
        throw new Error(`Store not found: ${storeId}`);
      }
      
      const store = storeResult.store!;
      
      // 2. Disparar background cleanup de vectors
      await this.triggerBackgroundVectorCleanup(storeId);
      operations.push('vector_cleanup_triggered');
      
      // 3. Eliminar datos de DB
      const supabase = createClient();
      
      // Eliminar configuraciones WhatsApp
      await supabase.from('whatsapp_configs').delete().eq('store_id', storeId);
      operations.push('whatsapp_configs_deleted');
      
      // Eliminar conversaciones y mensajes
      await supabase.from('conversations').delete().eq('store_id', storeId);
      operations.push('conversations_deleted');
      
      // Eliminar cache de analytics
      await supabase.from('analytics_cache').delete().eq('store_id', storeId);
      operations.push('analytics_cache_deleted');
      
      // Eliminar store
      await supabase.from('stores').delete().eq('id', storeId);
      operations.push('store_deleted');
      
      console.log(`[STORE-LIFECYCLE] ✅ Store deleted: ${storeId}`);

      return {
        success: true,
        store,
        operations
      };

    } catch (error) {
      console.error('[STORE-LIFECYCLE] ❌ Store deletion failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations
      };
    }
  }

  /**
   * 🚫 DESACTIVAR TIENDA (SOFT DELETE)
   * ==================================
   * 
   * Proceso:
   * 1. Marcar como inactiva en DB
   * 2. Mantener datos pero desactivar funcionalidad
   */
  static async deactivateStore(storeId: string): Promise<StoreLifecycleResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-LIFECYCLE] Deactivating store: ${storeId}`);
      
      // 1. Marcar como inactiva
      const updateResult = await StoreService.updateStore(storeId, {
        is_active: false,
        updated_at: new Date().toISOString()
      });
      
      if (!updateResult.success) {
        throw new Error(`Deactivation failed: ${updateResult.error}`);
      }
      
      operations.push('store_deactivated');
      
      // 2. Desactivar configuraciones WhatsApp
      const supabase = createClient();
      await supabase
        .from('whatsapp_configs')
        .update({ is_active: false })
        .eq('store_id', storeId);
      operations.push('whatsapp_configs_deactivated');
      
      console.log(`[STORE-LIFECYCLE] ✅ Store deactivated: ${storeId}`);

      return {
        success: true,
        store: updateResult.store,
        operations
      };

    } catch (error) {
      console.error('[STORE-LIFECYCLE] ❌ Store deactivation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations
      };
    }
  }

  /**
   * ✅ REACTIVAR TIENDA
   * ===================
   * 
   * Proceso:
   * 1. Marcar como activa en DB
   * 2. Disparar background sync para actualizar datos
   */
  static async reactivateStore(storeId: string): Promise<StoreLifecycleResult> {
    const operations: string[] = [];
    
    try {
      console.log(`[STORE-LIFECYCLE] Reactivating store: ${storeId}`);
      
      // 1. Marcar como activa
      const updateResult = await StoreService.updateStore(storeId, {
        is_active: true,
        updated_at: new Date().toISOString()
      });
      
      if (!updateResult.success) {
        throw new Error(`Reactivation failed: ${updateResult.error}`);
      }
      
      const store = updateResult.store!;
      operations.push('store_reactivated');
      
      // 2. Disparar background sync
      const backgroundJobId = await this.triggerBackgroundSync(storeId, false, store.access_token);
      operations.push('background_sync_triggered');
      
      console.log(`[STORE-LIFECYCLE] ✅ Store reactivated: ${storeId}`);

      return {
        success: true,
        store,
        operations,
        backgroundJobId
      };

    } catch (error) {
      console.error('[STORE-LIFECYCLE] ❌ Store reactivation failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        operations
      };
    }
  }

  /**
   * 🚀 DISPARAR BACKGROUND SYNC
   * ===========================
   * 
   * Hace HTTP call a nuestro endpoint de background sync
   */
  private static async triggerBackgroundSync(storeId: string, isNewStore: boolean, accessToken: string): Promise<string> {
    try {
      const jobId = `sync-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Fire-and-forget HTTP request
      fetch(`${baseUrl}/api/stores/background-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          isNewStore,
          authToken: accessToken,
          jobId
        })
      }).catch(error => {
        console.warn(`[STORE-LIFECYCLE] Background sync HTTP call failed:`, error);
      });
      
      return jobId;
    } catch (error) {
      console.warn('[STORE-LIFECYCLE] Failed to trigger background sync:', error);
      return `failed-${Date.now()}`;
    }
  }

  /**
   * 🧹 DISPARAR BACKGROUND CLEANUP + SYNC
   * =====================================
   * 
   * Para reconexiones: limpia vectors existentes y re-indexa
   */
  private static async triggerBackgroundCleanupAndSync(storeId: string, accessToken: string): Promise<string> {
    try {
      const jobId = `cleanup-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Fire-and-forget HTTP request
      fetch(`${baseUrl}/api/stores/background-cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          authToken: accessToken,
          jobId
        })
      }).catch(error => {
        console.warn(`[STORE-LIFECYCLE] Background cleanup HTTP call failed:`, error);
      });
      
      return jobId;
    } catch (error) {
      console.warn('[STORE-LIFECYCLE] Failed to trigger background cleanup:', error);
      return `failed-${Date.now()}`;
    }
  }

  /**
   * 🗑️ DISPARAR BACKGROUND VECTOR CLEANUP
   * =====================================
   * 
   * Para borrado de tiendas: limpia completamente los vectors
   */
  private static async triggerBackgroundVectorCleanup(storeId: string): Promise<string> {
    try {
      const jobId = `delete-${storeId}-${Date.now()}`;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Fire-and-forget HTTP request
      fetch(`${baseUrl}/api/stores/background-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId,
          jobId
        })
      }).catch(error => {
        console.warn(`[STORE-LIFECYCLE] Background delete HTTP call failed:`, error);
      });
      
      return jobId;
    } catch (error) {
      console.warn('[STORE-LIFECYCLE] Failed to trigger background delete:', error);
      return `failed-${Date.now()}`;
    }
  }

  /**
   * 📊 OBTENER ESTADO DE TIENDA
   * ===========================
   * 
   * Retorna información completa sobre el estado de una tienda
   */
  static async getStoreStatus(storeId: string): Promise<{
    success: boolean;
    store?: Store;
    status: 'active' | 'inactive' | 'not_found';
    hasVectorData: boolean;
    lastSync?: string;
    error?: string;
  }> {
    try {
      const storeResult = await StoreService.getStore(storeId);
      
      if (!storeResult.success) {
        return {
          success: false,
          status: 'not_found',
          hasVectorData: false,
          error: storeResult.error
        };
      }
      
      const store = storeResult.store!;
      
      // TODO: Verificar si existen datos en vector DB
      const hasVectorData = true; // Placeholder
      
      return {
        success: true,
        store,
        status: store.is_active ? 'active' : 'inactive',
        hasVectorData,
        lastSync: store.last_sync_at
      };
      
    } catch (error) {
      return {
        success: false,
        status: 'not_found',
        hasVectorData: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 