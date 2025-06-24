import { createClient } from '@supabase/supabase-js';

// import type { TiendaNubeStore, TiendaNubeAuthResponse } from '@/types/tiendanube';

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const _supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client with service role for server-side operations
const _supabaseAdmin = createClient(_supabaseUrl, _supabaseServiceKey);

export interface StoredStore {
  id: string;
  user_id: string;
  platform: 'tiendanube' | 'shopify' | 'woocommerce'; // Soporte multi-plataforma
  platform_store_id: string; // ID en la plataforma externa
  name: string;
  domain?: string;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  webhook_url?: string;
  is_active: boolean;
  store_data?: unknown;
  created_at: string;
  updated_at: string;
}

interface StoreConnection {
  user_id: string;
  platform_store_id: string; // Cambio de tiendanube_store_id a platform_store_id
  platform: string; // Nueva columna para identificar la plataforma
  name: string;
  domain?: string;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at: string; // Required field in schema
  is_active?: boolean;
  last_sync_at?: string;
}

class SupabaseService {
  private supabase;

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async connectStore(params: {
    userId: string;
    platformStoreId: string; // Cambio de tiendaNubeStoreId
    platform: 'tiendanube' | 'shopify' | 'woocommerce';
    storeName: string;
    storeUrl?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  }): Promise<{ success: true; store: StoreConnection } | { success: false; error: string }> {
    try {
      console.log('[INFO] Connecting store to database:', {
        userId: params.userId,
        platform: params.platform,
        storeId: params.platformStoreId,
        storeName: params.storeName
      });

      const storeData = {
        user_id: params.userId,
        platform: params.platform,
        platform_store_id: params.platformStoreId, // Usar nombre genérico
        name: params.storeName,
        domain: params.storeUrl || '',
        access_token: params.accessToken,
        refresh_token: params.refreshToken || null,
        token_expires_at: params.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // Default 1 year
        is_active: true,
        last_sync_at: new Date().toISOString()
      };

      // Check if store already exists for this user
      const { data: existingStore, error: checkError } = await _supabaseAdmin
        .from('stores') // Usar tabla genérica
        .select('*')
        .eq('user_id', params.userId)
        .eq('platform_store_id', params.platformStoreId)
        .eq('platform', params.platform)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is fine
        console.warn('[SUPABASE] Error checking existing store:', checkError);
        return { success: false, error: checkError.message };
      }

      let result;
      if (existingStore) {
        // Update existing store
        console.warn('[SUPABASE] Updating existing store');
        const { data, error } = await _supabaseAdmin
          .from('stores')
          .update(storeData)
          .eq('id', existingStore.id)
          .select()
          .single();

        if (error) {
          console.warn('[SUPABASE] Error updating store:', error);
          return { success: false, error: error.message };
        }
        result = data;
      } else {
        // Create new store
        console.warn('[SUPABASE] Creating new store');
        const { data, error } = await _supabaseAdmin
          .from('stores')
          .insert(storeData)
          .select()
          .single();

        if (error) {
          console.warn('[SUPABASE] Error creating store:', error);
          return { success: false, error: error.message };
        }
        result = data;
      }

      console.warn('[SUPABASE] Store saved successfully:', result.id);
      return { success: true, store: result };

    } catch (error) {
      console.warn('[SUPABASE] Unexpected error saving store:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get stores for a user (multi-platform support)
   */
  async getUserStores(userId: string, platform?: string): Promise<{ success: true; stores: StoredStore[] } | { success: false; error: string }> {
    try {
      console.warn('[SUPABASE] Getting stores for user:', userId);

      let query = _supabaseAdmin
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      // Filter by platform if specified
      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.warn('[SUPABASE] Error getting stores:', error);
        return { success: false, error: error.message };
      }

      console.warn('[SUPABASE] Found stores:', data.length);
      return { success: true, stores: data };

    } catch (error) {
      console.warn('[SUPABASE] Unexpected error getting stores:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get a specific store by store ID and user ID
   */
  async getStore(userId: string, storeId: string): Promise<{ success: true; store: StoredStore } | { success: false; error: string }> {
    try {
      console.warn('[SUPABASE] Getting store:', { userId, storeId });

      const { data, error } = await _supabaseAdmin
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .eq('id', storeId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.warn('[SUPABASE] Error getting store:', error);
        return { success: false, error: error.message };
      }

      return { success: true, store: data };

    } catch (error) {
      console.warn('[SUPABASE] Unexpected error getting store:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Deactivate a store (soft delete)
   */
  async deactivateStore(userId: string, storeId: string): Promise<{ success: true } | { success: false; error: string }> {
    try {
      console.warn('[SUPABASE] Deactivating store:', { userId, storeId });

      const { error } = await _supabaseAdmin
        .from('stores')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('id', storeId);

      if (error) {
        console.warn('[SUPABASE] Error deactivating store:', error);
        return { success: false, error: error.message };
      }

      return { success: true };

    } catch (error) {
      console.warn('[SUPABASE] Unexpected error deactivating store:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export default SupabaseService; 