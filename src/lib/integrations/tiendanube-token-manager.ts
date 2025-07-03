/**
 * 🔄 TIENDANUBE TOKEN MANAGER - VALIDATION-ONLY SYSTEM
 * ==================================================
 * 
 * Sistema para validar tokens de TiendaNube siguiendo sus mejores prácticas oficiales.
 * 
 * IMPORTANTE: TiendaNube tokens NO usan refresh tokens y son long-lived.
 * Se invalidan solo cuando:
 * 1. Usuario desinstala la app
 * 2. Usuario revoca permisos manualmente
 * 3. Cambios en configuración de la app en TiendaNube
 * 
 * BEST PRACTICES SEGUIDAS:
 * - Tokens de larga duración (hasta 1 año)
 * - NO refresh tokens (no están soportados por TiendaNube)
 * - Validación mediante API calls ligeros
 * - Re-autorización OAuth cuando token es inválido
 */

import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from './tiendanube';
import { StoreService } from '@/lib/database/client';

interface TokenValidationResult {
  isValid: boolean;
  needsReconnection: boolean;
  error?: string;
  errorType?: 'auth' | 'network' | 'api' | 'unknown';
}

interface StoreReconnectionData {
  storeId: string;
  storeName: string;
  platformStoreId: string;
  userId: string;
  lastValidation: string;
  reconnectionRequired: boolean;
}

/**
 * TiendaNube Token Manager
 * 🔥 FIXED: Simplified validation-only approach following TiendaNube best practices
 */
export class TiendaNubeTokenManager {
  private static instance: TiendaNubeTokenManager;
  private validationCache = new Map<string, { isValid: boolean; lastChecked: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  static getInstance(): TiendaNubeTokenManager {
    if (!TiendaNubeTokenManager.instance) {
      TiendaNubeTokenManager.instance = new TiendaNubeTokenManager();
    }
    return TiendaNubeTokenManager.instance;
  }

  /**
   * Get valid access token for a store (VALIDATION-ONLY approach)
   * 🔥 CRITICAL: No refresh logic - TiendaNube doesn't support refresh tokens
   */
  static async getValidToken(storeId: string): Promise<string | null> {
    try {
      console.log(`[TOKEN] Getting valid token for store: ${storeId}`);
      
      const supabase = createClient();
      
      // 🔥 FIX: Determine if storeId is a UUID (our internal ID) or platform store ID (Tienda Nube ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      
      // 🔥 FIX: Search by the appropriate field based on ID format
      const searchField = isUUID ? 'id' : 'platform_store_id';
      console.log(`[TOKEN] Searching by ${searchField} for store: ${storeId}`);
      
      const { data: store, error } = await supabase
        .from('stores')
        .select('id, access_token, platform_store_id, name')
        .eq(searchField, storeId)
        .eq('platform', 'tiendanube')
        .single();

      if (error) {
        console.warn(`[TOKEN] Store not found: ${storeId} (searched by ${searchField})`, error.message);
        return null;
      }

      if (!store?.access_token) {
        console.warn(`[TOKEN] Store ${storeId} has no access token`);
        return null;
      }

      console.log(`[TOKEN] Found store: ${store.id} (platform_store_id: ${store.platform_store_id})`);

      // 🔥 CRITICAL: For TiendaNube, we validate token by making API call, not checking expiration
      // TiendaNube tokens are long-lived and don't expire based on time
      try {
        const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
        
        // Test the token with a lightweight API call
        await api.getStore();
        
        console.log(`[TOKEN] ✅ Token validated successfully for store: ${storeId}`);
        return store.access_token;
        
      } catch (validationError) {
        console.error(`[TOKEN] ❌ Token validation failed for store ${storeId}:`, validationError);
        
        // Check if this is an authentication error (401/403)
        const isAuthError = validationError instanceof Error && 
          (validationError.message.toLowerCase().includes('401') || 
           validationError.message.toLowerCase().includes('403') ||
           validationError.message.toLowerCase().includes('unauthorized'));
        
        if (isAuthError) {
          console.error(`[TOKEN] 🚫 Authentication failed - token invalid or revoked for store: ${storeId}`);
          
          // Mark store as needing reconnection
          await TiendaNubeTokenManager.getInstance().markStoreForReconnection(
            store.id, 
            'Token validation failed - authentication error'
          );
          
          return null;
        }
        
        // For non-auth errors (network, etc.), still return the token
        // The caller can handle the API error appropriately
        console.warn(`[TOKEN] ⚠️ Non-auth error during validation, returning token anyway: ${validationError.message}`);
        return store.access_token;
      }
      
    } catch (error) {
      console.error(`[TOKEN] Unexpected error getting token for store ${storeId}:`, error);
      return null;
    }
  }

  /**
   * 🔥 NEW: Check if a store's tokens are healthy (no expiration check for TiendaNube)
   */
  static async validateStoreTokens(storeId: string): Promise<{ isValid: boolean; needsRefresh: boolean; error?: string }> {
    try {
      const token = await this.getValidToken(storeId);
      
      return {
        isValid: !!token,
        needsRefresh: false, // TiendaNube doesn't use refresh tokens
        error: !token ? 'Token validation failed' : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        needsRefresh: false, // TiendaNube doesn't use refresh tokens
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Valida si un token de TiendaNube sigue siendo válido
   */
  async validateToken(
    accessToken: string, 
    platformStoreId: string,
    useCache = true
  ): Promise<TokenValidationResult> {
    const cacheKey = `${platformStoreId}:${accessToken.substring(0, 10)}`;
    
    // Check cache first
    if (useCache && this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      if (Date.now() - cached.lastChecked < this.CACHE_DURATION) {
        return { 
          isValid: cached.isValid, 
          needsReconnection: !cached.isValid 
        };
      }
    }

    try {
      console.log('[INFO] Validating TiendaNube token for store:', platformStoreId);
      
      const api = new TiendaNubeAPI(accessToken, platformStoreId);
      
      // Test with a lightweight API call
      await api.getStore();
      
      // Token is valid
      this.validationCache.set(cacheKey, { isValid: true, lastChecked: Date.now() });
      console.log('[INFO] Token validation successful for store:', platformStoreId);
      
      return { isValid: true, needsReconnection: false };
      
    } catch (error) {
      console.warn('[WARNING] Token validation failed for store:', platformStoreId, error);
      
      let errorType: TokenValidationResult['errorType'] = 'unknown';
      let needsReconnection = false;
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('401') || 
            errorMessage.includes('unauthorized') || 
            errorMessage.includes('invalid access token')) {
          errorType = 'auth';
          needsReconnection = true;
        } else if (errorMessage.includes('network') || 
                   errorMessage.includes('fetch')) {
          errorType = 'network';
          needsReconnection = false; // Don't require reconnection for network issues
        } else if (errorMessage.includes('api') || 
                   errorMessage.includes('500') ||
                   errorMessage.includes('503')) {
          errorType = 'api';
          needsReconnection = false; // Don't require reconnection for API issues
        }
      }
      
      // Cache invalid result for shorter period
      this.validationCache.set(cacheKey, { isValid: false, lastChecked: Date.now() });
      
      return {
        isValid: false,
        needsReconnection,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType
      };
    }
  }

  /**
   * Valida todos los tokens de un usuario y devuelve los que necesitan reconexión
   */
  async validateUserStores(userId: string): Promise<StoreReconnectionData[]> {
    console.log('[INFO] Validating all TiendaNube stores for user:', userId);
    
    const supabase = createClient();
    
    // Get all active TiendaNube stores for user
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (error) {
      console.error('[ERROR] Failed to fetch user stores:', error);
      return [];
    }

    if (!stores || stores.length === 0) {
      console.log('[INFO] No TiendaNube stores found for user:', userId);
      return [];
    }

    const reconnectionData: StoreReconnectionData[] = [];

    // Validate each store in parallel
    const validationPromises = stores.map(async (store) => {
      if (!store.access_token || !store.platform_store_id) {
        console.warn('[WARNING] Store missing credentials:', store.id);
        return null;
      }

      const validation = await this.validateToken(
        store.access_token, 
        store.platform_store_id
      );

      if (validation.needsReconnection) {
        return {
          storeId: store.id,
          storeName: store.name || 'Tienda sin nombre',
          platformStoreId: store.platform_store_id,
          userId: store.user_id,
          lastValidation: new Date().toISOString(),
          reconnectionRequired: true
        };
      }

      return null;
    });

    const results = await Promise.all(validationPromises);
    reconnectionData.push(...results.filter(Boolean) as StoreReconnectionData[]);

    if (reconnectionData.length > 0) {
      console.log(`[WARNING] Found ${reconnectionData.length} stores needing reconnection for user:`, userId);
    } else {
      console.log('[INFO] All TiendaNube stores are valid for user:', userId);
    }

    return reconnectionData;
  }

  /**
   * Marca una tienda como que necesita reconexión en la base de datos
   */
  async markStoreForReconnection(storeId: string, reason: string): Promise<boolean> {
    try {
      console.log('[INFO] Marking store for reconnection:', storeId, 'Reason:', reason);
      
      const updateData = {
        is_active: false, // Deactivate until reconnected
        updated_at: new Date().toISOString(),
        // Store reconnection reason in store_data for debugging
        store_data: {
          reconnection_required: true,
          reason,
          marked_at: new Date().toISOString()
        }
      };

      const result = await StoreService.updateStore(storeId, updateData);
      
      if (result.success) {
        console.log('[INFO] Store marked for reconnection successfully:', storeId);
        return true;
      } else {
        console.error('[ERROR] Failed to mark store for reconnection:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[ERROR] Error marking store for reconnection:', error);
      return false;
    }
  }

  /**
   * Genera URL de reconexión para una tienda específica
   */
  generateReconnectionUrl(storeData: StoreReconnectionData): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';
    
    // Generate reconnection URL with pre-filled data
    const params = new URLSearchParams({
      action: 'reconnect',
      store_id: storeData.storeId,
      store_name: storeData.storeName,
      platform_store_id: storeData.platformStoreId,
      redirect_to: 'dashboard'
    });

    return `${baseUrl}/onboarding?step=1&${params.toString()}`;
  }

  /**
   * Sistema de monitoreo automático que verifica stores periódicamente
   */
  async runHealthCheck(): Promise<{
    totalStores: number;
    validStores: number;
    invalidStores: number;
    reconnectionRequired: StoreReconnectionData[];
  }> {
    console.log('[INFO] Running TiendaNube health check...');
    
    const supabase = createClient();
    
    // Get all active TiendaNube stores
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (error) {
      console.error('[ERROR] Health check failed to fetch stores:', error);
      return {
        totalStores: 0,
        validStores: 0,
        invalidStores: 0,
        reconnectionRequired: []
      };
    }

    if (!stores || stores.length === 0) {
      console.log('[INFO] No active TiendaNube stores found for health check');
      return {
        totalStores: 0,
        validStores: 0,
        invalidStores: 0,
        reconnectionRequired: []
      };
    }

    let validStores = 0;
    let invalidStores = 0;
    const reconnectionRequired: StoreReconnectionData[] = [];

    // Check stores in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (store) => {
        if (!store.access_token || !store.platform_store_id) {
          invalidStores++;
          return;
        }

        const validation = await this.validateToken(
          store.access_token,
          store.platform_store_id,
          false // Don't use cache for health checks
        );

        if (validation.isValid) {
          validStores++;
        } else {
          invalidStores++;
          
          if (validation.needsReconnection) {
            reconnectionRequired.push({
              storeId: store.id,
              storeName: store.name || 'Tienda sin nombre',
              platformStoreId: store.platform_store_id,
              userId: store.user_id,
              lastValidation: new Date().toISOString(),
              reconnectionRequired: true
            });

            // Mark store for reconnection
            await this.markStoreForReconnection(
              store.id, 
              validation.error || 'Token validation failed'
            );
          }
        }
      });

      await Promise.all(batchPromises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < stores.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const result = {
      totalStores: stores.length,
      validStores,
      invalidStores,
      reconnectionRequired
    };

    console.log('[INFO] Health check completed:', result);
    return result;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    console.log('[INFO] Token validation cache cleared');
  }
}

// Export singleton instance
export const tiendaNubeTokenManager = TiendaNubeTokenManager.getInstance();

// Export helper functions
export async function validateTiendaNubeToken(
  accessToken: string, 
  platformStoreId: string
): Promise<TokenValidationResult> {
  return tiendaNubeTokenManager.validateToken(accessToken, platformStoreId);
}

export async function validateUserTiendaNubeStores(
  userId: string
): Promise<StoreReconnectionData[]> {
  return tiendaNubeTokenManager.validateUserStores(userId);
}

export async function runTiendaNubeHealthCheck() {
  return tiendaNubeTokenManager.runHealthCheck();
} 