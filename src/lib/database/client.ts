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

      // First, detect which columns exist in the table
      const { data: sampleData, error: sampleError } = await _supabaseAdmin
        .from('stores')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('[ERROR] Cannot access stores table to detect schema:', sampleError);
        return { 
          success: false, 
          error: `Cannot access stores table: ${sampleError.message}` 
        };
      }

      const availableColumns = sampleData?.[0] ? Object.keys(sampleData[0]) : [];
      const hasOldColumns = availableColumns.includes('tiendanube_store_id');
      const hasNewColumns = availableColumns.includes('platform_store_id');

      console.log('[DEBUG] Table schema detection:', {
        availableColumns,
        hasOldColumns,
        hasNewColumns
      });

      // Prepare data based on available columns
      let insertData: any;
      let checkFields: any = {};

      if (hasOldColumns && hasNewColumns) {
        // Database has both old and new columns - populate both to avoid NOT NULL violations
        const storeName = typeof storeData.name === 'object' ? 
          (storeData.name as any).es || (storeData.name as any).en || 'Mi Tienda' : 
          storeData.name || 'Mi Tienda';

        insertData = {
          user_id: storeData.user_id,
          // Old columns
          tiendanube_store_id: storeData.platform_store_id,
          store_name: storeName,
          store_url: storeData.domain || '',
          // New columns  
          platform: storeData.platform || 'tiendanube',
          platform_store_id: storeData.platform_store_id,
          name: storeName,
          domain: storeData.domain || '',
          // Common columns
          access_token: storeData.access_token,
          refresh_token: storeData.refresh_token,
          token_expires_at: storeData.token_expires_at,
          is_active: storeData.is_active,
          created_at: storeData.created_at,
          updated_at: storeData.updated_at
        };

        // Check for existing stores using old columns first
        checkFields = {
          user_id: storeData.user_id,
          tiendanube_store_id: storeData.platform_store_id
        };
      } else if (hasOldColumns) {
        // Only old columns exist
        const storeName = typeof storeData.name === 'object' ? 
          (storeData.name as any).es || (storeData.name as any).en || 'Mi Tienda' : 
          storeData.name || 'Mi Tienda';

        insertData = {
          user_id: storeData.user_id,
          tiendanube_store_id: storeData.platform_store_id,
          store_name: storeName,
          store_url: storeData.domain || '',
          access_token: storeData.access_token,
          refresh_token: storeData.refresh_token,
          token_expires_at: storeData.token_expires_at,
          is_active: storeData.is_active,
          created_at: storeData.created_at,
          updated_at: storeData.updated_at
        };

        checkFields = {
          user_id: storeData.user_id,
          tiendanube_store_id: storeData.platform_store_id
        };
      } else {
        // Only new columns exist
        const storeName = typeof storeData.name === 'object' ? 
          (storeData.name as any).es || (storeData.name as any).en || 'Mi Tienda' : 
          storeData.name || 'Mi Tienda';

        insertData = {
          user_id: storeData.user_id,
          platform: storeData.platform || 'tiendanube',
          platform_store_id: storeData.platform_store_id,
          name: storeName,
          domain: storeData.domain || '',
          access_token: storeData.access_token,
          refresh_token: storeData.refresh_token,
          token_expires_at: storeData.token_expires_at,
          is_active: storeData.is_active,
          created_at: storeData.created_at,
          updated_at: storeData.updated_at
        };

        checkFields = {
          user_id: storeData.user_id,
          platform: storeData.platform || 'tiendanube',
          platform_store_id: storeData.platform_store_id
        };
      }

      console.log('[DEBUG] Prepared insert data:', {
        ...insertData,
        access_token: '[REDACTED]'
      });

      // Check if store already exists
      let existingStore = null;
      let checkError = null;

      try {
        const query = _supabaseAdmin.from('stores').select('*');
        Object.keys(checkFields).forEach(key => {
          query.eq(key, checkFields[key]);
        });
        
        const { data, error } = await query.single();
        existingStore = data;
        checkError = error;
      } catch (err) {
        checkError = err;
      }

      if (checkError && checkError.code !== 'PGRST116') {
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
            ...insertData,
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
        name: updatedStore?.name || updatedStore?.store_name,
        platform: updatedStore?.platform
      });

      // 🚀 ASYNC RAG DATA SYNC: Non-blocking, fail-safe, complete data indexing
      if (updatedStore?.id) {
        try {
          await this.syncStoreDataToRAGImmediate(updatedStore.id);
          console.log("[STORE-SERVICE] ✅ Immediate sync completed for updated store");
        } catch (syncError) {
          console.warn("[STORE-SERVICE] Immediate sync failed, using async fallback:", syncError);
          this.syncStoreDataToRAGAsync(updatedStore.id);
        }
      }

      return { success: true, store: updatedStore };
      }

      // Store doesn't exist, create new one
      const { data, error } = await _supabaseAdmin
        .from('stores')
        .insert([insertData])
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

        if (error.code === '23502') { // NOT NULL violation
          return { 
            success: false, 
            error: 'Error de configuración de base de datos. Por favor contacta soporte técnico.' 
          };
        }

        throw error;
      }

      console.log('[DEBUG] Store created successfully:', {
        id: data?.id,
        name: data?.name || data?.store_name,
        platform: data?.platform
      });

      // 🚀 ASYNC RAG DATA SYNC: Non-blocking, fail-safe, complete data indexing
      if (data?.id) {
        try {
          await this.syncStoreDataToRAGImmediate(data.id);
          console.log("[STORE-SERVICE] ✅ Immediate sync completed for new store");
        } catch (syncError) {
          console.warn("[STORE-SERVICE] Immediate sync failed, using async fallback:", syncError);
          this.syncStoreDataToRAGAsync(data.id);
        }
      }

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

  /**
   * Initialize RAG namespaces for a store asynchronously
   * 🛡️ FAIL-SAFE: Never breaks store creation/update process
   */
  static initializeStoreNamespacesAsync(storeId: string): void {
    // Fire-and-forget async operation
    (async () => {
      try {
        console.log(`[DEBUG] Starting async namespace initialization for store: ${storeId}`);
        
        // Dynamic import to avoid circular dependencies and reduce bundle size
        const { FiniRAGEngine } = await import('@/lib/rag');
        
        const ragEngine = new FiniRAGEngine();
        const result = await ragEngine.initializeStoreNamespaces(storeId);
        
        if (result.success) {
          console.log(`[SUCCESS] RAG namespaces initialized for store: ${storeId}`);
        } else {
          console.warn(`[WARNING] RAG namespace initialization failed for store ${storeId}:`, result.error);
          // Note: This is expected if RAG isn't configured yet - not a critical error
        }
      } catch (error) {
        console.warn(`[WARNING] Async namespace initialization failed for store ${storeId}:`, error);
        // 🛡️ CRITICAL: Never throw errors that could break store operations
        // RAG initialization is a nice-to-have optimization, not a requirement
      }
    })();
  }

  /**
   * Get a store by ID
   */
  static async getStore(storeId: string): Promise<{ success: boolean; store?: Store; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('stores')
        .select('*')
        .eq('id', storeId)
        .single();

      if (error) throw error;

      return { success: true, store: data };
    } catch (error) {
      console.warn('[ERROR] Get store failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Sync complete store data to RAG/Pinecone asynchronously  
   * 🚀 NEW: Full data synchronization for agent context
   * 🛡️ FAIL-SAFE: Never breaks store operations
   */
    /**
   * Immediate RAG sync for instant Product Manager access
   * 🚀 CRITICAL: This ensures agents have data immediately after store connection
   */
  static async syncStoreDataToRAGImmediate(storeId: string): Promise<void> {
    console.log(`[STORE-SERVICE] Starting immediate RAG sync for store: ${storeId}`);
    
    try {
      // Get store with access token
      const store = await this.getStore(storeId);
      if (!store.success || !store.store?.access_token) {
        throw new Error(`Store not found or missing access token: ${storeId}`);
      }

      // Dynamic import to avoid build issues
      const { FiniRAGEngine } = await import('@/lib/rag');
      const ragEngine = new FiniRAGEngine();
      
      // 1. Initialize namespaces with timeout
      console.log(`[STORE-SERVICE] Initializing namespaces for: ${storeId}`);
      const namespaceResult = await Promise.race([
        ragEngine.initializeStoreNamespaces(storeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Namespace timeout')), 30000))
      ]);
      
      if (!namespaceResult.success) {
        throw new Error(`Namespace initialization failed: ${namespaceResult.error}`);
      }

      // 2. Index store data with timeout
      console.log(`[STORE-SERVICE] Indexing store data for: ${storeId}`);
      await Promise.race([
        ragEngine.indexStoreData(storeId, store.store.access_token),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Indexing timeout')), 60000))
      ]);
      
      // 3. Update last sync timestamp
      await this.updateStore(storeId, { 
        last_sync_at: new Date().toISOString() 
      });
      
      console.log(`[STORE-SERVICE] ✅ Immediate RAG sync completed for store: ${storeId}`);
    } catch (error) {
      console.error(`[STORE-SERVICE] ❌ Immediate RAG sync failed for ${storeId}:`, error);
      throw error;
    }
  }

  static syncStoreDataToRAGAsync(storeId: string): void {
    // Fire-and-forget async operation
    (async () => {
      try {
        console.log(`[DEBUG] Starting async RAG data sync for store: ${storeId}`);
        
        // Get store with access token for API calls
        const store = await this.getStore(storeId);
        if (!store.success || !store.store) {
          console.warn(`[WARNING] Cannot sync RAG data - store not found: ${storeId}`);
          return;
        }

        const storeData = store.store;
        if (!storeData.access_token) {
          console.warn(`[WARNING] Cannot sync RAG data - no access token for store: ${storeId}`);
          return;
        }

        // Initialize namespaces first
        const { FiniRAGEngine } = await import('@/lib/rag');
        const ragEngine = new FiniRAGEngine();
        
        // 1. Initialize namespaces
        console.log(`[DEBUG] Initializing RAG namespaces for store: ${storeId}`);
        const namespaceResult = await ragEngine.initializeStoreNamespaces(storeId);
        
        if (!namespaceResult.success) {
          console.warn(`[WARNING] RAG namespaces failed for store ${storeId}:`, namespaceResult.error);
          return; // Skip data sync if namespaces failed
        }

        // 2. Sync complete store data
        console.log(`[DEBUG] Starting full data indexing for store: ${storeId}`);
        await ragEngine.indexStoreData(storeId, storeData.access_token);
        
        console.log(`[SUCCESS] Complete RAG data sync finished for store: ${storeId}`);
        
        // 3. Update last sync timestamp
        await this.updateStore(storeId, { 
          last_sync_at: new Date().toISOString() 
        });
        
      } catch (error) {
        console.warn(`[WARNING] Async RAG data sync failed for store ${storeId}:`, error);
        // 🛡️ CRITICAL: Never throw errors that could break store operations
        // RAG sync is enhancement, not a requirement for basic functionality
      }
    })();
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
        .eq('user_id', userId);

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

  static async updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<{ success: boolean; conversation?: Conversation; error?: string }> {
    try {
      const { data, error } = await _supabaseAdmin
        .from('conversations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .select()
        .single();

      if (error) throw error;

      return { success: true, conversation: data };
    } catch (error) {
      console.warn('[ERROR] Update conversation failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async deleteConversation(conversationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete messages first (FK constraint)
      const { error: messagesError } = await _supabaseAdmin
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (messagesError) throw messagesError;

      // Delete conversation
      const { error: conversationError } = await _supabaseAdmin
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId); // Security: ensure user owns the conversation

      if (conversationError) throw conversationError;

      return { success: true };
    } catch (error) {
      console.warn('[ERROR] Delete conversation failed:', error);
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
      // Sanitize and validate data types to prevent database errors
      const sanitizedData = {
        ...messageData,
        // Ensure processing_time_ms is always an integer
        ...(messageData.processing_time_ms !== undefined && {
          processing_time_ms: Math.round(Number(messageData.processing_time_ms) || 0)
        }),
        // Ensure confidence is a valid decimal between 0 and 1
        ...(messageData.confidence !== undefined && {
          confidence: Math.max(0, Math.min(1, Number(messageData.confidence) || 0))
        }),
        // Ensure reasoning is a string (for agent transparency)
        ...(messageData.reasoning !== undefined && {
          reasoning: String(messageData.reasoning).trim()
        })
      };

      const { data, error } = await _supabaseAdmin
        .from('messages')
        .insert([sanitizedData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, message: data };
    } catch (error) {
      console.warn('[ERROR] Create message failed:', error);
      console.warn('[ERROR] Message data that failed:', {
        ...messageData,
        body: messageData.body ? `${messageData.body.substring(0, 50)}...` : undefined
      });
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
        .eq('conversation_id', conversationId);

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