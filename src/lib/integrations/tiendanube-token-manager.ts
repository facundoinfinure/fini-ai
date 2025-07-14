/**
 * 🔄 UNIVERSAL TOKEN MANAGER - MULTI-PLATFORM SYSTEM
 * =================================================
 * 
 * Sistema unificado para validar tokens de TODAS las plataformas siguiendo mejores prácticas.
 * 
 * PLATFORMS SUPPORTED:
 * - TiendaNube (tokens long-lived, no refresh tokens)
 * - Shopify (coming soon)
 * - WooCommerce (coming soon)
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
 * - Universal support para futuras plataformas
 */

import { createServiceClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from './tiendanube';
import { StoreService } from '@/lib/database/client';

export type Platform = 'tiendanube' | 'shopify' | 'woocommerce' | 'other';

interface TokenValidationResult {
  isValid: boolean;
  needsReconnection: boolean;
  error?: string;
  errorType?: 'auth' | 'network' | 'api' | 'platform_specific' | 'unknown';
  platformSpecific?: any;
}

interface StoreReconnectionData {
  storeId: string;
  storeName: string;
  platform: Platform;
  platformStoreId: string;
  userId: string;
  lastValidation: string;
  reconnectionRequired: boolean;
}

export interface StoreWithToken {
  id: string;
  user_id: string;
  platform: Platform;
  platform_store_id: string;
  name: string;
  domain?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  is_active: boolean;
  platform_specific_data?: any;
  created_at: string;
  updated_at: string;
}

/**
 * 🔥 NEW: Network-aware error classification for better token validation
 */
interface NetworkErrorInfo {
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isConnectionError: boolean;
  isAuthError: boolean;
  shouldRetry: boolean;
  shouldMarkForReconnection: boolean;
}

/**
 * 🔥 NEW: Classifies errors to distinguish between network and authentication issues
 */
function classifyError(error: Error): NetworkErrorInfo {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  // Check for timeout-related errors
  const isTimeoutError = 
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnreset') ||
    message.includes('aborted') ||
    stack.includes('timeout');
  
  // Check for connection-related errors
  const isConnectionError = 
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('network') ||
    message.includes('socket') ||
    message.includes('und_err_socket') ||
    message.includes('fetch failed');
  
  // Check for actual authentication errors (token-related)
  const isAuthError = 
    (message.includes('401') || message.includes('unauthorized')) &&
    !isTimeoutError && 
    !isConnectionError;
  
  // This is a network error if it's timeout or connection-related
  const isNetworkError = isTimeoutError || isConnectionError;
  
  // Should retry network errors, but not auth errors
  const shouldRetry = isNetworkError && !isAuthError;
  
  // Should mark for reconnection only for actual auth errors, not network errors
  const shouldMarkForReconnection = isAuthError && !isNetworkError;
  
  return {
    isNetworkError,
    isTimeoutError,
    isConnectionError,
    isAuthError,
    shouldRetry,
    shouldMarkForReconnection
  };
}

/**
 * 🌐 Universal Token Manager para todas las plataformas
 */
export class UniversalTokenManager {
  private static instance: UniversalTokenManager;
  private validationCache = new Map<string, { isValid: boolean; lastChecked: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  static getInstance(): UniversalTokenManager {
    if (!UniversalTokenManager.instance) {
      UniversalTokenManager.instance = new UniversalTokenManager();
    }
    return UniversalTokenManager.instance;
  }

  /**
   * 🎯 Obtener token válido para cualquier plataforma
   */
  static async getValidToken(storeId: string): Promise<string | null> {
    try {
      console.log(`[UNIVERSAL-TOKEN] Getting valid token for store: ${storeId}`);
      
      const supabase = createServiceClient(); // Use service client to bypass RLS
      
      // Buscar store por ID (UUID interno) o platform_store_id
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      const searchField = isUUID ? 'id' : 'platform_store_id';
      
      console.log(`[UNIVERSAL-TOKEN] Searching by ${searchField} for: ${storeId}`);
      
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq(searchField, storeId)
        .eq('is_active', true) // Solo stores activas
        .single();

      if (error) {
        console.warn(`[UNIVERSAL-TOKEN] Store not found: ${storeId}`, error.message);
        return null;
      }

      if (!store?.access_token) {
        console.warn(`[UNIVERSAL-TOKEN] Store ${storeId} missing access_token`);
        return null;
      }

      console.log(`[UNIVERSAL-TOKEN] Found ${store.platform} store: ${store.name}`);

      // Validar token según la plataforma
      const manager = UniversalTokenManager.getInstance();
      const validation = await manager.validateTokenByPlatform(store);

      if (!validation.isValid) {
        console.error(`[UNIVERSAL-TOKEN] Token invalid for ${store.platform} store: ${storeId}`);
        
        if (validation.needsReconnection) {
          await manager.markStoreForReconnection(
            store.id, 
            `Token validation failed: ${validation.error}`
          );
        }
        
        return null;
      }

      console.log(`[UNIVERSAL-TOKEN] ✅ Token validated for ${store.platform} store: ${storeId}`);
      return store.access_token;

    } catch (error) {
      console.error(`[UNIVERSAL-TOKEN] Error getting token for ${storeId}:`, error);
      return null;
    }
  }

  /**
   * 🎯 Obtener datos completos de store con token validado
   */
  static async getValidStoreData(storeId: string): Promise<StoreWithToken | null> {
    try {
      console.log(`[UNIVERSAL-TOKEN] Getting complete store data for: ${storeId}`);
      
      const supabase = createServiceClient(); // Use service client to bypass RLS
      
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      const searchField = isUUID ? 'id' : 'platform_store_id';
      
      const { data: store, error } = await supabase
        .from('stores')
        .select('*')
        .eq(searchField, storeId)
        .single();

      if (error || !store) {
        console.warn(`[UNIVERSAL-TOKEN] Store not found: ${storeId}`);
        return null;
      }

      // Validar token según la plataforma
      const manager = UniversalTokenManager.getInstance();
      const validation = await manager.validateTokenByPlatform(store);

      if (!validation.isValid) {
        console.error(`[UNIVERSAL-TOKEN] Store ${storeId} has invalid token`);
        return null;
      }

      return store as StoreWithToken;

    } catch (error) {
      console.error(`[UNIVERSAL-TOKEN] Error getting store data for ${storeId}:`, error);
      return null;
    }
  }

  /**
   * 🔥 ENHANCED: Check if a store's tokens are healthy with network awareness
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
   * 🎯 Validar token según la plataforma
   */
  async validateTokenByPlatform(store: StoreWithToken): Promise<TokenValidationResult> {
    try {
      switch (store.platform) {
        case 'tiendanube':
          return await this.validateTiendaNubeToken(store);
        case 'shopify':
          // TODO: Implement Shopify validation
          throw new Error('Shopify validation not implemented yet');
        case 'woocommerce':
          // TODO: Implement WooCommerce validation  
          throw new Error('WooCommerce validation not implemented yet');
        default:
          return {
            isValid: false,
            needsReconnection: true,
            error: `Unsupported platform: ${store.platform}`,
            errorType: 'platform_specific'
          };
      }
    } catch (error) {
      console.error(`[UNIVERSAL-TOKEN] Platform validation error for ${store.platform}:`, error);
      return {
        isValid: false,
        needsReconnection: true,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        errorType: 'unknown'
      };
    }
  }

  /**
   * 🔥 PRIVATE: Validate TiendaNube token with network-aware error handling
   */
  private async validateTiendaNubeToken(store: StoreWithToken): Promise<TokenValidationResult> {
    try {
      const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
      await api.getStore();
      
      return {
        isValid: true,
        needsReconnection: false
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const errorInfo = classifyError(err);
      
      return {
        isValid: false,
        needsReconnection: errorInfo.shouldMarkForReconnection,
        error: err.message,
        errorType: errorInfo.isAuthError ? 'auth' : errorInfo.isNetworkError ? 'network' : 'api'
      };
    }
  }

  /**
   * Valida si un token de TiendaNube sigue siendo válido
   * 🔥 ENHANCED: Network-aware validation with better error classification
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
        const errorInfo = classifyError(error);
        
        if (errorInfo.isAuthError) {
          errorType = 'auth';
          needsReconnection = true;
        } else if (errorInfo.isNetworkError) {
          errorType = 'network';
          needsReconnection = false; // Don't mark for reconnection on network errors
        } else {
          errorType = 'api';
          needsReconnection = false;
        }

        console.warn(`[TOKEN] Error classification for store ${platformStoreId}:`, {
          type: errorType,
          isNetwork: errorInfo.isNetworkError,
          isAuth: errorInfo.isAuthError,
          needsReconnection
        });
      }
      
      // Cache negative results only for auth errors, not network errors
      if (errorType !== 'network') {
        this.validationCache.set(cacheKey, { isValid: false, lastChecked: Date.now() });
      }
      
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
    
    const supabase = createServiceClient(); // Use service client to bypass RLS
    
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
          platform: store.platform,
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
    
    const supabase = createServiceClient(); // Use service client to bypass RLS
    
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
              platform: store.platform,
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
export const tiendaNubeTokenManager = UniversalTokenManager.getInstance();

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