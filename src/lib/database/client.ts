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

  static async getUserById(userId: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

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
      const { data, error } = await _supabaseAdmin
        .from('stores')
        .insert([storeData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, store: data };
    } catch (error) {
      console.warn('[ERROR] Create store failed:', error);
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