/**
 * 🌐 UNIVERSAL TOKEN MANAGER - MULTI-PLATFORM SYSTEM
 * ==================================================
 * 
 * Sistema unificado de gestión de tokens que funciona para TODAS las plataformas:
 * - TiendaNube
 * - Shopify  
 * - WooCommerce
 * - Futuras plataformas
 * 
 * ARQUITECTURA ESCALABLE:
 * - Una sola tabla 'stores' para todas las plataformas
 * - Token management genérico por plataforma
 * - Validación específica por cada API
 * - Reconexión OAuth unificada
 */

import { createClient } from '@/lib/supabase/server';

export type Platform = 'tiendanube' | 'shopify' | 'woocommerce' | 'other';

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

export interface TokenValidationResult {
  isValid: boolean;
  needsReconnection: boolean;
  error?: string;
  errorType?: 'auth' | 'network' | 'api' | 'platform_specific';
  platformSpecific?: any;
}

export interface ReconnectionData {
  storeId: string;
  storeName: string;
  platform: Platform;
  platformStoreId: string;
  userId: string;
  lastValidation: string;
  reconnectionRequired: boolean;
}

/**
 * 🌐 Universal Token Manager para todas las plataformas
 */
export class UniversalTokenManager {
  private static instance: UniversalTokenManager;
  private validationCache = new Map<string, { isValid: boolean; lastChecked: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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
      
      const supabase = createClient();
      
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
      
      const supabase = createClient();
      
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

      if (!store.access_token) {
        console.warn(`[UNIVERSAL-TOKEN] Store ${storeId} missing credentials`);
        return null;
      }

      // Validar token
      const manager = UniversalTokenManager.getInstance();
      const validation = await manager.validateTokenByPlatform(store);

      if (!validation.isValid && validation.needsReconnection) {
        console.error(`[UNIVERSAL-TOKEN] Store ${storeId} needs reconnection`);
        await manager.markStoreForReconnection(store.id, validation.error || 'Token validation failed');
        return null;
      }

      console.log(`[UNIVERSAL-TOKEN] ✅ Store data validated: ${store.platform} - ${store.name}`);
      return store as StoreWithToken;

    } catch (error) {
      console.error(`[UNIVERSAL-TOKEN] Error getting store data for ${storeId}:`, error);
      return null;
    }
  }

  /**
   * 🔍 Validar token según la plataforma específica
   */
  async validateTokenByPlatform(store: StoreWithToken): Promise<TokenValidationResult> {
    const cacheKey = `${store.platform}:${store.id}:${store.access_token.substring(0, 10)}`;
    
    // Check cache
    if (this.validationCache.has(cacheKey)) {
      const cached = this.validationCache.get(cacheKey)!;
      if (Date.now() - cached.lastChecked < this.CACHE_DURATION) {
        return { 
          isValid: cached.isValid, 
          needsReconnection: !cached.isValid 
        };
      }
    }

    try {
      console.log(`[UNIVERSAL-TOKEN] Validating ${store.platform} token for store: ${store.name}`);
      
      let validationResult: TokenValidationResult;

      switch (store.platform) {
        case 'tiendanube':
          validationResult = await this.validateTiendaNubeToken(store);
          break;
          
        case 'shopify':
          validationResult = await this.validateShopifyToken(store);
          break;
          
        case 'woocommerce':
          validationResult = await this.validateWooCommerceToken(store);
          break;
          
        default:
          console.warn(`[UNIVERSAL-TOKEN] Unknown platform: ${store.platform}`);
          validationResult = {
            isValid: false,
            needsReconnection: true,
            error: `Unsupported platform: ${store.platform}`,
            errorType: 'platform_specific'
          };
      }

      // Cache result
      this.validationCache.set(cacheKey, { 
        isValid: validationResult.isValid, 
        lastChecked: Date.now() 
      });

      return validationResult;

    } catch (error) {
      console.error(`[UNIVERSAL-TOKEN] Validation error for ${store.platform}:`, error);
      return {
        isValid: false,
        needsReconnection: true,
        error: error instanceof Error ? error.message : 'Unknown validation error',
        errorType: 'api'
      };
    }
  }

  /**
   * 🏪 Validación específica para TiendaNube
   */
  private async validateTiendaNubeToken(store: StoreWithToken): Promise<TokenValidationResult> {
    try {
      // Usar lazy import para evitar dependencias circulares
      const { TiendaNubeAPI } = await import('./tiendanube');
      
      if (!store.platform_store_id) {
        return {
          isValid: false,
          needsReconnection: true,
          error: 'Missing platform_store_id for TiendaNube',
          errorType: 'platform_specific'
        };
      }

      const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
      await api.getStore(); // Test API call
      
      return { isValid: true, needsReconnection: false };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Clasificar tipo de error
      const isAuthError = errorMessage.includes('401') || 
                         errorMessage.includes('403') || 
                         errorMessage.includes('Authentication failed');
      
      return {
        isValid: false,
        needsReconnection: isAuthError,
        error: errorMessage,
        errorType: isAuthError ? 'auth' : 'api'
      };
    }
  }

  /**
   * 🛍️ Validación específica para Shopify (placeholder para futuro)
   */
  private async validateShopifyToken(store: StoreWithToken): Promise<TokenValidationResult> {
    console.log(`[UNIVERSAL-TOKEN] Shopify validation not yet implemented for store: ${store.name}`);
    
    // TODO: Implementar validación de Shopify
    // const shopifyAPI = new ShopifyAPI(store.access_token, store.domain);
    // await shopifyAPI.getShop();
    
    return {
      isValid: true, // Placeholder - asumir válido por ahora
      needsReconnection: false,
      platformSpecific: {
        note: 'Shopify validation placeholder - implement when needed'
      }
    };
  }

  /**
   * 🛒 Validación específica para WooCommerce (placeholder para futuro)
   */
  private async validateWooCommerceToken(store: StoreWithToken): Promise<TokenValidationResult> {
    console.log(`[UNIVERSAL-TOKEN] WooCommerce validation not yet implemented for store: ${store.name}`);
    
    // TODO: Implementar validación de WooCommerce
    // const wooAPI = new WooCommerceAPI(store.access_token, store.domain);
    // await wooAPI.getSystemStatus();
    
    return {
      isValid: true, // Placeholder - asumir válido por ahora
      needsReconnection: false,
      platformSpecific: {
        note: 'WooCommerce validation placeholder - implement when needed'
      }
    };
  }

  /**
   * 🔄 Marcar store para reconexión (universal para todas las plataformas)
   */
  async markStoreForReconnection(storeId: string, reason: string): Promise<boolean> {
    try {
      console.log(`[UNIVERSAL-TOKEN] Marking store for reconnection: ${storeId}, Reason: ${reason}`);
      
      const supabase = createClient();
      
      const { error } = await supabase
        .from('stores')
        .update({
          is_active: false, // Desactivar hasta reconexión
          updated_at: new Date().toISOString(),
          platform_specific_data: {
            reconnection_required: true,
            reason,
            marked_at: new Date().toISOString()
          }
        })
        .eq('id', storeId);

      if (error) {
        console.error(`[UNIVERSAL-TOKEN] Failed to mark store for reconnection:`, error);
        return false;
      }

      console.log(`[UNIVERSAL-TOKEN] ✅ Store marked for reconnection: ${storeId}`);
      return true;

    } catch (error) {
      console.error(`[UNIVERSAL-TOKEN] Error marking store for reconnection:`, error);
      return false;
    }
  }

  /**
   * 🔗 Generar URL de reconexión universal
   */
  generateReconnectionUrl(reconnectionData: ReconnectionData): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';
    
    const params = new URLSearchParams({
      action: 'reconnect',
      platform: reconnectionData.platform,
      store_id: reconnectionData.storeId,
      store_name: reconnectionData.storeName,
      platform_store_id: reconnectionData.platformStoreId,
      redirect_to: 'dashboard'
    });

    return `${baseUrl}/onboarding?step=1&${params.toString()}`;
  }

  /**
   * 🔍 Health check para todas las stores de un usuario
   */
  async validateUserStores(userId: string): Promise<ReconnectionData[]> {
    console.log(`[UNIVERSAL-TOKEN] Validating all stores for user: ${userId}`);
    
    const supabase = createClient();
    
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !stores || stores.length === 0) {
      console.log(`[UNIVERSAL-TOKEN] No active stores found for user: ${userId}`);
      return [];
    }

    const reconnectionData: ReconnectionData[] = [];

    // Validar en paralelo
    const validationPromises = stores.map(async (store) => {
      const validation = await this.validateTokenByPlatform(store as StoreWithToken);

      if (validation.needsReconnection) {
        return {
          storeId: store.id,
          storeName: store.name || 'Tienda sin nombre',
          platform: store.platform,
          platformStoreId: store.platform_store_id || '',
          userId: store.user_id,
          lastValidation: new Date().toISOString(),
          reconnectionRequired: true
        };
      }

      return null;
    });

    const results = await Promise.all(validationPromises);
    reconnectionData.push(...results.filter(Boolean) as ReconnectionData[]);

    if (reconnectionData.length > 0) {
      console.log(`[UNIVERSAL-TOKEN] Found ${reconnectionData.length} stores needing reconnection`);
    } else {
      console.log(`[UNIVERSAL-TOKEN] All stores are valid for user: ${userId}`);
    }

    return reconnectionData;
  }

  /**
   * 📊 Health check completo del sistema
   */
  async runSystemHealthCheck(): Promise<{
    totalStores: number;
    storesByPlatform: Record<Platform, number>;
    validStores: number;
    invalidStores: number;
    reconnectionRequired: ReconnectionData[];
  }> {
    console.log(`[UNIVERSAL-TOKEN] Running system-wide health check...`);
    
    const supabase = createClient();
    
    const { data: stores, error } = await supabase
      .from('stores')
      .select('*')
      .eq('is_active', true);

    if (error || !stores || stores.length === 0) {
      return {
        totalStores: 0,
        storesByPlatform: {},
        validStores: 0,
        invalidStores: 0,
        reconnectionRequired: []
      };
    }

    const storesByPlatform: Record<Platform, number> = {
      tiendanube: 0,
      shopify: 0,
      woocommerce: 0,
      other: 0
    };

    let validStores = 0;
    let invalidStores = 0;
    const reconnectionRequired: ReconnectionData[] = [];

    // Contar por plataforma
    stores.forEach(store => {
      const platform = store.platform as Platform;
      storesByPlatform[platform] = (storesByPlatform[platform] || 0) + 1;
    });

    // Validar en lotes
    const batchSize = 5;
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (store) => {
        const validation = await this.validateTokenByPlatform(store as StoreWithToken);

        if (validation.isValid) {
          validStores++;
        } else {
          invalidStores++;
          
          if (validation.needsReconnection) {
            reconnectionRequired.push({
              storeId: store.id,
              storeName: store.name || 'Tienda sin nombre',
              platform: store.platform,
              platformStoreId: store.platform_store_id || '',
              userId: store.user_id,
              lastValidation: new Date().toISOString(),
              reconnectionRequired: true
            });

            await this.markStoreForReconnection(store.id, validation.error || 'Health check failed');
          }
        }
      });

      await Promise.all(batchPromises);
      
      // Delay entre lotes
      if (i + batchSize < stores.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const result = {
      totalStores: stores.length,
      storesByPlatform,
      validStores,
      invalidStores,
      reconnectionRequired
    };

    console.log(`[UNIVERSAL-TOKEN] Health check completed:`, result);
    return result;
  }
}

// Export del singleton
export const universalTokenManager = UniversalTokenManager.getInstance();

/**
 * 🎯 Funciones de conveniencia para retrocompatibilidad
 */
export async function getValidTokenForAnyPlatform(storeId: string): Promise<string | null> {
  return UniversalTokenManager.getValidToken(storeId);
}

export async function getValidStoreDataForAnyPlatform(storeId: string): Promise<StoreWithToken | null> {
  return UniversalTokenManager.getValidStoreData(storeId);
} 