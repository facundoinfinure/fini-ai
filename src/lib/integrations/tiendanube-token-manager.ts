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
 * TiendaNube Token Manager
 * 🔥 ENHANCED: Network-aware validation with proper error classification
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
   * 🔥 ENHANCED: Network-aware error handling with proper retry logic
   */
  static async getValidToken(storeId: string): Promise<string | null> {
    const result = await this.getValidTokenWithStoreData(storeId);
    return result?.token || null;
  }

  /**
   * 🔥 NEW: Get valid token AND platform store ID to fix ID mismatch bugs
   * Returns both token and platform_store_id for proper TiendaNube API calls
   */
  static async getValidTokenWithStoreData(storeId: string): Promise<{
    token: string;
    platformStoreId: string;
    storeId: string;
    storeName: string;
  } | null> {
    try {
      console.log(`[TOKEN] Getting valid token and store data for store: ${storeId}`);
      
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

      if (!store?.access_token || !store?.platform_store_id) {
        console.warn(`[TOKEN] Store ${storeId} missing credentials:`, {
          hasToken: !!store?.access_token,
          hasPlatformId: !!store?.platform_store_id
        });
        return null;
      }

      console.log(`[TOKEN] Found store: ${store.id} (platform_store_id: ${store.platform_store_id})`);

      // 🔥 ENHANCED: Network-aware token validation with retry logic
      const maxAttempts = 2; // Reduced attempts for token validation
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
          
          // Test the token with a lightweight API call
          await api.getStore();
          
          console.log(`[TOKEN] ✅ Token validated successfully for store: ${storeId} (attempt ${attempt})`);
          
          return {
            token: store.access_token,
            platformStoreId: store.platform_store_id,
            storeId: store.id,
            storeName: store.name || 'Tienda sin nombre'
          };
          
        } catch (validationError) {
          lastError = validationError instanceof Error ? validationError : new Error(String(validationError));
          
          const errorInfo = classifyError(lastError);
          
          console.error(`[TOKEN] Validation attempt ${attempt}/${maxAttempts} failed for store ${storeId}:`, {
            message: lastError.message,
            isNetwork: errorInfo.isNetworkError,
            isTimeout: errorInfo.isTimeoutError,
            isAuth: errorInfo.isAuthError,
            willRetry: errorInfo.shouldRetry && attempt < maxAttempts
          });
          
          // If it's a network error and we have more attempts, retry
          if (errorInfo.shouldRetry && attempt < maxAttempts) {
            const delay = 1000 * attempt; // Progressive delay
            console.warn(`[TOKEN] 🔄 Retrying token validation in ${delay}ms due to network error`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          // If it's an authentication error, mark for reconnection
          if (errorInfo.shouldMarkForReconnection) {
            console.error(`[TOKEN] 🚫 Authentication failed - token invalid or revoked for store: ${storeId}`);
            
            await TiendaNubeTokenManager.getInstance().markStoreForReconnection(
              store.id, 
              'Token validation failed - authentication error'
            );
            
            return null;
          }
          
          // For network errors that couldn't be retried, return token anyway
          // The calling system can handle the network error appropriately
          if (errorInfo.isNetworkError) {
            console.warn(`[TOKEN] ⚠️ Network error persists, but returning store data for ${storeId}. Error: ${lastError.message}`);
            
            return {
              token: store.access_token,
              platformStoreId: store.platform_store_id,
              storeId: store.id,
              storeName: store.name || 'Tienda sin nombre'
            };
          }
          
          // For other errors, break out of retry loop
          break;
        }
      }
      
      // If we get here, validation failed
      if (lastError) {
        const errorInfo = classifyError(lastError);
        
        if (errorInfo.isNetworkError) {
          console.warn(`[TOKEN] ⚠️ Non-auth error during validation, returning store data anyway: ${lastError.message}`);
          
          return {
            token: store.access_token,
            platformStoreId: store.platform_store_id,
            storeId: store.id,
            storeName: store.name || 'Tienda sin nombre'
          };
        } else {
          console.error(`[TOKEN] ❌ Token validation failed definitively for store ${storeId}: ${lastError.message}`);
          return null;
        }
      }
      
      console.error(`[TOKEN] ❌ Unexpected validation failure for store ${storeId}`);
      return null;
      
    } catch (error) {
      console.error(`[TOKEN] Unexpected error getting store data for ${storeId}:`, error);
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