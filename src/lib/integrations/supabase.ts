import { createClient } from '@supabase/supabase-js';

// import type { TiendaNubeStore, TiendaNubeAuthResponse } from '@/types/tiendanube';

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const _supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Client with service role for server-side operations
const _supabaseAdmin = createClient(_supabaseUrl, _supabaseServiceKey);

export interface StoredTiendaNubeStore {
  id: string;
  user_id: string;
  store_id: string;
  store_name: string;
  store_url?: string;
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
  tiendanube_store_id: string;
  name: string;
  domain?: string;
  access_token: string;
  refresh_token?: string | null;
  token_expires_at?: string;
  is_active?: boolean;
  last_sync_at?: string;
}

class SupabaseService {
  private supabase;

  constructor() {
    this.supabase = createClient();
  }

  async connectStore(params: {
    userId: string;
    tiendaNubeStoreId: string;
    storeName: string;
    storeUrl?: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  }): Promise<StoreConnection> {
    try {
      console.log('[INFO] Connecting store to database:', {
        userId: params.userId,
        storeId: params.tiendaNubeStoreId,
        storeName: params.storeName
      });

      const storeData = {
        user_id: params.userId,
        tiendanube_store_id: params.tiendaNubeStoreId,
        name: params.storeName,
        domain: params.storeUrl || '',
        access_token: params.accessToken,
        refresh_token: params.refreshToken || null,
        token_expires_at: params.expiresAt || null,
        is_active: true,
        last_sync_at: new Date().toISOString()
      };

      // Check if store already exists for this user
      const { data: existingStore, error: checkError } = await _supabaseAdmin
        .from('tienda_nube_stores')
        .select('*')
        .eq('user_id', params.userId)
        .eq('store_id', params.tiendaNubeStoreId)
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
          .from('tienda_nube_stores')
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
          .from('tienda_nube_stores')
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
   * Get Tienda Nube stores for a user
   */
  async getUserTiendaNubeStores(userId: string): Promise<{ success: true; stores: StoredTiendaNubeStore[] } | { success: false; error: string }> {
    try {
      console.warn('[SUPABASE] Getting stores for user:', userId);

      const { data, error } = await _supabaseAdmin
        .from('tienda_nube_stores')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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
   * Get a specific Tienda Nube store by store ID and user ID
   */
  async getTiendaNubeStore(userId: string, storeId: string): Promise<{ success: true; store: StoredTiendaNubeStore } | { success: false; error: string }> {
    try {
      console.warn('[SUPABASE] Getting store:', { userId, storeId });

      const { data, error } = await _supabaseAdmin
        .from('tienda_nube_stores')
        .select('*')
        .eq('user_id', userId)
        .eq('store_id', storeId)
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
   * Deactivate a Tienda Nube store (soft delete)
   */
  async deactivateTiendaNubeStore(userId: string, storeId: string): Promise<{ success: true } | { success: false; error: string }> {
    try {
      console.warn('[SUPABASE] Deactivating store:', { userId, storeId });

      const { error } = await _supabaseAdmin
        .from('tienda_nube_stores')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('store_id', storeId);

      if (error) {
        console.warn('[SUPABASE] Error deactivating store:', error);
        return { success: false, error: error.message };
      }

      console.warn('[SUPABASE] Store deactivated successfully');
      return { success: true };

    } catch (error) {
      console.warn('[SUPABASE] Unexpected error deactivating store:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
} 