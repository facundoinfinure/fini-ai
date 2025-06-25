/**
 * Database Client
 * Supabase client with CRUD operations for Fini AI
 */

import { createClient } from '@supabase/supabase-js';

import type { 
  User, 
  Store, 
  WhatsAppConfig, 
  Conversation, 
  Message, 
  AnalyticsCache, 
  UserSettings 
} from './schema';

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const _supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Log environment variables status (without exposing sensitive data)
console.log('[DEBUG] Supabase client configuration:', {
  urlExists: !!_supabaseUrl,
  serviceKeyExists: !!_supabaseServiceKey,
  urlPrefix: _supabaseUrl ? _supabaseUrl.substring(0, 20) + '...' : 'missing',
  serviceKeyPrefix: _supabaseServiceKey ? _supabaseServiceKey.substring(0, 10) + '...' : 'missing'
});

// Client for server-side operations (with service role key)
export const _supabaseAdmin = createClient(_supabaseUrl, _supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Client for client-side operations (with anon key)
export const _supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/**
 * User Operations
 */
export class UserService {
  static async createUser(userData: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('users')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, user: data };
    } catch (error) {
      console.warn('[ERROR] Create user failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getUserById(userId: string): Promise<{ success: boolean; user?: User | null; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      return { success: true, user: data };
    } catch (error) {
      console.warn('[ERROR] Get user failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateUser(userId: string, updates: Partial<User>): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, user: data };
    } catch (error) {
      console.warn('[ERROR] Update user failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Store Operations
 */
export class StoreService {
  static async createStore(storeData: Partial<Store>): Promise<{ success: boolean; store?: Store; error?: string }> {
    try {
      console.log('[DEBUG] StoreService.createStore - Input data:', {
        ...storeData,
        access_token: storeData.access_token ? '[REDACTED]' : null
      });

      // First, check if store already exists for this user+platform+platform_store_id
      const { data: existingStore, error: checkError } = await _supabaseAdmin
        .from('stores')
        .select('*')
        .eq('user_id', storeData.user_id)
        .eq('platform', storeData.platform || 'tiendanube')
        .eq('platform_store_id', storeData.platform_store_id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is expected for new stores
        console.error('[ERROR] Error checking existing store:', checkError);
        return { 
          success: false, 
          error: `Database error while checking existing store: ${checkError.message}` 
        };
      }

      if (existingStore) {
        console.log('[INFO] Store already exists, updating existing store:', existingStore.id);
        
        // Update existing store instead of creating new one
        const { data: updatedStore, error: updateError } = await _supabaseAdmin
          .from('stores')
          .update({
            ...storeData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingStore.id)
          .select()
          .single();

        if (updateError) {
          console.error('[ERROR] Failed to update existing store:', updateError);
          return { 
            success: false, 
            error: `Failed to update existing store: ${updateError.message}` 
          };
        }

        console.log('[DEBUG] Store updated successfully:', {
          id: updatedStore?.id,
          name: updatedStore?.name,
          platform: updatedStore?.platform
        });

        return { success: true, store: updatedStore };
      }

      // Store doesn't exist, create new one
      const { data, error } = await _supabaseAdmin
        .from('stores')
        .insert([storeData])
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Supabase insert error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });

        // Handle specific error cases
        if (error.code === '23505') { // Unique violation
          return { 
            success: false, 
            error: 'Esta tienda ya está conectada a tu cuenta. Si necesitas reconectarla, primero desconéctala desde el dashboard.' 
          };
        }

        throw error;
      }

      console.log('[DEBUG] Store created successfully:', {
        id: data?.id,
        name: data?.name,
        platform: data?.platform
      });

      return { success: true, store: data };
    } catch (error) {
      console.error('[ERROR] Create store failed with full details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        supabaseError: error
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getStoresByUserId(userId: string): Promise<{ success: boolean; stores?: Store[]; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('stores')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      return { success: true, stores: data };
    } catch (error) {
      console.warn('[ERROR] Get stores failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateStore(storeId: string, updates: Partial<Store>): Promise<{ success: boolean; store?: Store; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('stores')
        .update(updates)
        .eq('id', storeId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, store: data };
    } catch (error) {
      console.warn('[ERROR] Update store failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * WhatsApp Configuration Operations
 */
export class WhatsAppConfigService {
  static async createConfig(configData: Partial<WhatsAppConfig>): Promise<{ success: boolean; config?: WhatsAppConfig; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('whatsapp_configs')
        .insert([configData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, config: data };
    } catch (error) {
      console.warn('[ERROR] Create WhatsApp config failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getConfigByUserId(userId: string): Promise<{ success: boolean; config?: WhatsAppConfig; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('whatsapp_configs')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { success: true, config: data };
    } catch (error) {
      console.warn('[ERROR] Get WhatsApp config failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateConfig(configId: string, updates: Partial<WhatsAppConfig>): Promise<{ success: boolean; config?: WhatsAppConfig; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('whatsapp_configs')
        .update(updates)
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, config: data };
    } catch (error) {
      console.warn('[ERROR] Update WhatsApp config failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Conversation Operations
 */
export class ConversationService {
  static async createConversation(conversationData: Partial<Conversation>): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('conversations')
        .insert([conversationData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, conversation: data };
    } catch (error) {
      console.warn('[ERROR] Create conversation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getConversationsByUserId(userId: string): Promise<{ success: boolean; conversations?: Conversation[]; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) throw error;

      return { success: true, conversations: data };
    } catch (error) {
      console.warn('[ERROR] Get conversations failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getConversationByCustomerNumber(userId: string, customerNumber: string): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('customer_number', customerNumber)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { success: true, conversation: data };
    } catch (error) {
      console.warn('[ERROR] Get conversation by customer number failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Message Operations
 */
export class MessageService {
  static async createMessage(messageData: Partial<Message>): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('messages')
        .insert([messageData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, message: data };
    } catch (error) {
      console.warn('[ERROR] Create message failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getMessagesByConversationId(conversationId: string): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_active', true);

      if (error) throw error;

      return { success: true, messages: data };
    } catch (error) {
      console.warn('[ERROR] Get messages failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * Analytics Cache Operations
 */
export class AnalyticsCacheService {
  static async getCachedAnalytics(storeId: string, dataType: string, period: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('analytics_cache')
        .select('*')
        .eq('store_id', storeId)
        .eq('data_type', dataType)
        .eq('period', period)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { success: true, data: data?.data };
    } catch (error) {
      console.warn('[ERROR] Get cached analytics failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async cacheAnalytics(cacheData: Partial<AnalyticsCache>): Promise<{ success: boolean; cache?: AnalyticsCache; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('analytics_cache')
        .insert([cacheData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, cache: data };
    } catch (error) {
      console.warn('[ERROR] Cache analytics failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

/**
 * User Settings Operations
 */
export class UserSettingsService {
  static async getSettingsByUserId(userId: string): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error) throw error;

      return { success: true, settings: data };
    } catch (error) {
      console.warn('[ERROR] Get user settings failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async updateSettings(userId: string, updates: Partial<UserSettings>): Promise<{ success: boolean; settings?: UserSettings; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, settings: data };
    } catch (error) {
      console.warn('[ERROR] Update user settings failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
} 