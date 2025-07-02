/**
 * 🔄 TIENDANUBE TOKEN MANAGER - AUTO REFRESH SYSTEM
 * ================================================
 * 
 * Sistema automático para detectar tokens inválidos de TiendaNube
 * y gestionar el proceso de re-conexión cuando se invalidan.
 * 
 * IMPORTANTE: TiendaNube tokens NO expiran automáticamente.
 * Se invalidan solo cuando:
 * 1. Usuario desinstala la app
 * 2. Usuario genera un nuevo token 
 * 3. Cambios en configuración de la app
 */

import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from './tiendanube';
import { StoreService } from '@/lib/database/client';

interface TokenRefreshResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  shouldRetry?: boolean;
}

export interface TokenValidationResult {
  isValid: boolean;
  needsReconnection: boolean;
  error?: string;
  errorType?: 'auth' | 'network' | 'api' | 'unknown';
}

export interface StoreReconnectionData {
  storeId: string;
  storeName: string;
  platformStoreId: string;
  userId: string;
  lastValidation: string;
  reconnectionRequired: boolean;
}

/**
 * TiendaNube Token Manager
 * 🔥 FIXED: Improved token refresh and error handling to prevent API cascading failures
 */
export class TiendaNubeTokenManager {
  private static instance: TiendaNubeTokenManager;
  private validationCache = new Map<string, { isValid: boolean; lastChecked: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  private static tokenCache = new Map<string, { token: string; expiresAt: number }>();

  static getInstance(): TiendaNubeTokenManager {
    if (!TiendaNubeTokenManager.instance) {
      TiendaNubeTokenManager.instance = new TiendaNubeTokenManager();
    }
    return TiendaNubeTokenManager.instance;
  }

  /**
   * Get valid access token for a store (with automatic refresh)
   * 🔥 CRITICAL: Non-blocking - doesn't throw if refresh fails
   */
  static async getValidToken(storeId: string): Promise<string | null> {
    try {
      console.log(`[TOKEN] Getting valid token for store: ${storeId}`);
      
      const supabase = createClient();
      
      // 🔥 FIX: Determine if storeId is a UUID (our internal ID) or platform store ID (Tienda Nube ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      
      // 🔥 FIX: Search by the appropriate field based on ID format
      const searchField = isUUID ? 'store_id' : 'platform_store_id';
      console.log(`[TOKEN] Searching by ${searchField} for store: ${storeId}`);
      
      // 🔥 FIX: Handle missing table gracefully
      const { data: store, error } = await supabase
        .from('stores')
        .select('id, access_token, refresh_token, token_expires_at, platform_store_id')
        .eq(searchField, storeId)
        .eq('platform', 'tiendanube')
        .single();

      if (error) {
        // 🔥 FIX: Handle table not exists gracefully
        if (error.message?.includes('does not exist')) {
          console.warn(`[TOKEN] Stores table not found - this is expected for stores table setup: ${error.message}`);
          return null;
        }
        
        console.warn(`[TOKEN] Store not found: ${storeId} (searched by ${searchField})`, error.message);
        return null;
      }

      if (!store) {
        console.warn(`[TOKEN] Store ${storeId} not found in database (searched by ${searchField})`);
        return null;
      }

      console.log(`[TOKEN] Found store: ${store.id} (platform_store_id: ${store.platform_store_id})`);

      // Check if token is still valid (with 5-minute buffer)
      const expiresAt = new Date(store.token_expires_at || 0);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 minutes
      
      if (expiresAt.getTime() > now.getTime() + bufferTime) {
        console.log(`[TOKEN] Token still valid for store: ${storeId}`);
        return store.access_token;
      }

      // Token is expired or about to expire, try to refresh
      console.log(`[TOKEN] Token expired for store ${storeId}, attempting refresh`);
      
      const refreshResult = await this.refreshToken(store.id, store.refresh_token);
      
      if (refreshResult.success && refreshResult.accessToken) {
        console.log(`[TOKEN] ✅ Token refreshed successfully for store: ${storeId}`);
        return refreshResult.accessToken;
      } else {
        console.warn(`[TOKEN] ❌ Token refresh failed for store ${storeId}: ${refreshResult.error}`);
        // Return expired token anyway - API will handle the 401 gracefully
        return store.access_token;
      }
      
    } catch (error) {
      console.error(`[TOKEN] Unexpected error getting token for store ${storeId}:`, error);
      return null;
    }
  }

  /**
   * Refresh access token using refresh token
   * 🔥 IMPROVED: Better error handling and non-blocking behavior
   */
  private static async refreshToken(storeId: string, refreshToken: string): Promise<TokenRefreshResult> {
    try {
      console.log(`[TOKEN] Refreshing token for store: ${storeId}`);
      
      if (!refreshToken) {
        return { 
          success: false, 
          error: 'No refresh token available',
          shouldRetry: false
        };
      }

      const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Fini-AI/1.0'
        },
        body: new URLSearchParams({
          client_id: process.env.TIENDANUBE_CLIENT_ID!,
          client_secret: process.env.TIENDANUBE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[TOKEN] TiendaNube refresh failed: ${response.status} - ${errorText}`);
        
        // Check if this is a permanent failure (invalid refresh token)
        const isPermanentFailure = response.status === 400 || response.status === 401;
        
        return {
          success: false,
          error: `Token refresh failed: ${response.status}`,
          shouldRetry: !isPermanentFailure
        };
      }

      const tokenData = await response.json();
      
      if (!tokenData.access_token) {
        return {
          success: false,
          error: 'No access token in refresh response',
          shouldRetry: false
        };
      }

      // Calculate expiration time (default to 1 hour if not provided)
      const expiresIn = tokenData.expires_in || 3600; // seconds
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      // 🔥 FIX: Update stores table with new tokens using our internal store ID
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('stores')
        .update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || refreshToken, // Keep old refresh token if not provided
          token_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', storeId); // Use internal store ID

      if (updateError) {
        console.error(`[TOKEN] Failed to update tokens in database:`, updateError);
        // Still return success since we got the token from TiendaNube
      }

      console.log(`[TOKEN] ✅ Token refresh successful for store: ${storeId}`);
      
      return {
        success: true,
        accessToken: tokenData.access_token
      };

    } catch (error) {
      console.error(`[TOKEN] Unexpected error during token refresh:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry: true
      };
    }
  }

  /**
   * 🔥 NEW: Check if a store's tokens are healthy
   */
  static async validateStoreTokens(storeId: string): Promise<{ isValid: boolean; needsRefresh: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      // 🔥 FIX: Determine if storeId is a UUID (our internal ID) or platform store ID (Tienda Nube ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      const searchField = isUUID ? 'id' : 'platform_store_id';
      
      const { data: store, error } = await supabase
        .from('stores')
        .select('access_token, refresh_token, token_expires_at')
        .eq(searchField, storeId)
        .eq('platform', 'tiendanube')
        .single();

      if (error || !store) {
        return { isValid: false, needsRefresh: false, error: 'Store not found' };
      }

      if (!store.access_token) {
        return { isValid: false, needsRefresh: false, error: 'No access token' };
      }

      const expiresAt = new Date(store.token_expires_at || 0);
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const isExpired = expiresAt.getTime() <= now.getTime();
      const needsRefresh = expiresAt.getTime() <= oneHourFromNow.getTime();

      return {
        isValid: !isExpired,
        needsRefresh: needsRefresh,
        error: isExpired ? 'Token expired' : undefined
      };

    } catch (error) {
      return {
        isValid: false,
        needsRefresh: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🔥 NEW: Proactively refresh tokens that are about to expire
   */
  static async refreshExpiringTokens(): Promise<{ refreshed: number; failed: number }> {
    try {
      const supabase = createClient();
      
      // Find stores with tokens expiring in the next hour
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id, refresh_token')
        .eq('platform', 'tiendanube')
        .lt('token_expires_at', oneHourFromNow.toISOString())
        .not('refresh_token', 'is', null);

      if (error || !stores) {
        console.warn('[TOKEN] Failed to fetch expiring tokens:', error?.message);
        return { refreshed: 0, failed: 0 };
      }

      let refreshed = 0;
      let failed = 0;

      for (const store of stores) {
        const result = await this.refreshToken(store.id, store.refresh_token);
        if (result.success) {
          refreshed++;
        } else {
          failed++;
        }
      }

      console.log(`[TOKEN] Proactive refresh completed: ${refreshed} refreshed, ${failed} failed`);
      
      return { refreshed, failed };

    } catch (error) {
      console.error('[TOKEN] Error in proactive token refresh:', error);
      return { refreshed: 0, failed: 0 };
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