/**
 * Database Client
 * Supabase client with CRUD operations for Fini AI
 */

import { createClient } from '@supabase/supabase-js';

import { 
  User, 
  Store, 
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
  urlPrefix: _supabaseUrl ? `${_supabaseUrl.substring(0, 20)}...` : 'missing',
  serviceKeyPrefix: _supabaseServiceKey ? `${_supabaseServiceKey.substring(0, 10)}...` : 'missing'
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
      // Validate required fields
      if (!storeData.user_id || !storeData.platform_store_id || !storeData.access_token) {
        return {
          success: false,
          error: 'Missing required store data: user_id, platform_store_id, or access_token'
        };
      }

      // 🔥 STEP 1: Detect database schema and map fields accordingly
      console.log('[DEBUG] Detecting database schema for stores table...');
      
      let insertData: any;
      try {
        // Check if the old schema exists (tiendanube_store_id column)
        const { error: schemaError } = await _supabaseAdmin
          .from('stores')
          .select('tiendanube_store_id')
          .limit(1);
        
        if (schemaError && schemaError.message.includes('does not exist')) {
          // New schema: use platform_store_id
          console.log('[DEBUG] Using NEW schema (platform_store_id)');
          insertData = {
            ...storeData,
            store_name: storeData.name, // ✅ MAP name -> store_name for compatibility
            store_url: storeData.domain, // ✅ MAP domain -> store_url for compatibility
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          // Old schema: map platform_store_id -> tiendanube_store_id AND name -> store_name
          console.log('[DEBUG] Using OLD schema (tiendanube_store_id) - applying mapping');
          insertData = {
            ...storeData,
            tiendanube_store_id: storeData.platform_store_id, // ✅ KEY MAPPING
            store_name: storeData.name, // ✅ MAP name -> store_name for compatibility
            store_url: storeData.domain, // ✅ MAP domain -> store_url for compatibility
            platform_store_id: undefined, // Remove new field name
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          // Clean up undefined values
          delete insertData.platform_store_id;
        }
      } catch (detectionError) {
        console.warn('[WARNING] Schema detection failed, using old schema as fallback (most likely production):', detectionError);
        // Fallback: Use old schema mapping since it's most likely production
        insertData = {
          ...storeData,
          tiendanube_store_id: storeData.platform_store_id, // ✅ KEY MAPPING
          store_name: storeData.name, // ✅ MAP name -> store_name for compatibility
          store_url: storeData.domain, // ✅ MAP domain -> store_url for compatibility
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        delete insertData.platform_store_id;
      }

      console.log('[DEBUG] Attempting to insert store with mapped data:', {
        userId: insertData.user_id,
        platform: insertData.platform,
        hasOldField: !!insertData.tiendanube_store_id,
        hasNewField: !!insertData.platform_store_id,
        name: insertData.name
      });

      // 🔥 STEP 2: Create store record with mapped data
      const { data: store, error } = await _supabaseAdmin
        .from('stores')
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error('[ERROR] Failed to create store:', error);
        console.error('[ERROR] Insert data used:', {
          ...insertData,
          access_token: insertData.access_token ? '[REDACTED]' : null
        });
        return { success: false, error: error.message };
      }

      console.log(`[SUCCESS] Store created successfully: ${store.id}`);

      // 🔥 REMOVED: Background sync - handled by StoreDataManager to avoid duplicates
      // This was causing timeouts and duplicate operations
      
      return { success: true, store };
    } catch (error) {
      console.error('[ERROR] Failed to create store:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create or update store (UPSERT) to handle OAuth reconnections
   * 🔥 NEW: Handles duplicate store connections gracefully
   */
  static async createOrUpdateStore(storeData: Partial<Store>): Promise<{ success: boolean; store?: Store; error?: string }> {
    try {
      // Validate required fields
      if (!storeData.user_id || !storeData.platform_store_id || !storeData.access_token) {
        return {
          success: false,
          error: 'Missing required store data: user_id, platform_store_id, or access_token'
        };
      }

      console.log('[DEBUG] Attempting to create or update store:', {
        userId: storeData.user_id,
        platform: storeData.platform,
        platformStoreId: storeData.platform_store_id,
        name: storeData.name
      });

      // 🔥 STEP 1: Check if store already exists
      let existingStore: Store | null = null;
      
      try {
        // Check if the old schema exists (tiendanube_store_id column)
        const { data: existingStores, error: schemaError } = await _supabaseAdmin
          .from('stores')
          .select('*')
          .eq('tiendanube_store_id', storeData.platform_store_id)
          .eq('user_id', storeData.user_id)
          .limit(1);
        
        if (schemaError && schemaError.message.includes('does not exist')) {
          // New schema: use platform_store_id
          console.log('[DEBUG] Using NEW schema (platform_store_id) for duplicate check');
          const { data: newSchemaStores } = await _supabaseAdmin
            .from('stores')
            .select('*')
            .eq('platform_store_id', storeData.platform_store_id)
            .eq('user_id', storeData.user_id)
            .limit(1);
          
          existingStore = newSchemaStores?.[0] || null;
        } else {
          // Old schema: use tiendanube_store_id
          console.log('[DEBUG] Using OLD schema (tiendanube_store_id) for duplicate check');
          existingStore = existingStores?.[0] || null;
        }
      } catch (error) {
        console.warn('[WARNING] Error checking for existing store, proceeding with creation:', error);
      }

      // 🔥 STEP 2: Prepare data based on schema
      let storeOperation: any;
      try {
        // Check if the old schema exists (tiendanube_store_id column)
        const { error: schemaError } = await _supabaseAdmin
          .from('stores')
          .select('tiendanube_store_id')
          .limit(1);
        
        if (schemaError && schemaError.message.includes('does not exist')) {
          // New schema: use platform_store_id
          console.log('[DEBUG] Using NEW schema (platform_store_id)');
          storeOperation = {
            ...storeData,
            store_name: storeData.name,
            store_url: storeData.domain,
            currency: storeData.currency || 'ARS',
            timezone: storeData.timezone || 'America/Argentina/Buenos_Aires',
            language: storeData.language || 'es',
            is_active: true,
            updated_at: new Date().toISOString()
          };
          
          if (!existingStore) {
            storeOperation.created_at = new Date().toISOString();
          }
        } else {
          // Old schema: map platform_store_id -> tiendanube_store_id
          console.log('[DEBUG] Using OLD schema (tiendanube_store_id)');
          storeOperation = {
            ...storeData,
            tiendanube_store_id: storeData.platform_store_id,
            store_name: storeData.name,
            store_url: storeData.domain,
            currency: storeData.currency || 'ARS',
            timezone: storeData.timezone || 'America/Argentina/Buenos_Aires',
            language: storeData.language || 'es',
            is_active: true,
            updated_at: new Date().toISOString()
          };
          
          if (!existingStore) {
            storeOperation.created_at = new Date().toISOString();
          }
          
          // Clean up new field name
          delete storeOperation.platform_store_id;
        }
      } catch (detectionError) {
        console.warn('[WARNING] Schema detection failed, using old schema as fallback:', detectionError);
        // Fallback: Use old schema mapping
        storeOperation = {
          ...storeData,
          tiendanube_store_id: storeData.platform_store_id,
          store_name: storeData.name,
          store_url: storeData.domain,
          is_active: true,
          updated_at: new Date().toISOString()
        };
        
        if (!existingStore) {
          storeOperation.created_at = new Date().toISOString();
        }
        
        delete storeOperation.platform_store_id;
      }

      // 🔥 STEP 3: Create or update store
      let store: Store;
      
      if (existingStore) {
        console.log('[INFO] Store exists, updating with new OAuth data:', existingStore.id);
        
        const { data: updatedStore, error: updateError } = await _supabaseAdmin
          .from('stores')
          .update(storeOperation)
          .eq('id', existingStore.id)
          .select()
          .single();

        if (updateError) {
          console.error('[ERROR] Failed to update existing store:', updateError);
          return { success: false, error: updateError.message };
        }

        store = updatedStore;
        console.log('[SUCCESS] Store updated successfully:', store.id);
      } else {
        console.log('[INFO] Store does not exist, creating new store');
        
        const { data: newStore, error: createError } = await _supabaseAdmin
          .from('stores')
          .insert([storeOperation])
          .select()
          .single();

        if (createError) {
          console.error('[ERROR] Failed to create new store:', createError);
          return { success: false, error: createError.message };
        }

        store = newStore;
        console.log('[SUCCESS] Store created successfully:', store.id);
      }

      // 🔥 STEP 4: Trigger background sync based on store state
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        if (!existingStore) {
          // New store: trigger full sync
          fetch(`${baseUrl}/api/stores/background-sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storeId: store.id,
              isNewStore: true,
              authToken: store.access_token,
              userId: store.user_id,
              jobId: `sync-${store.id}-${Date.now()}`
            })
          }).catch(error => {
            console.warn(`[RAG:AUTO-SYNC] Background sync HTTP call failed for new store ${store.id}:`, error);
          });
          
          console.log(`[RAG:AUTO-SYNC] Background sync triggered for new store: ${store.id}`);
        } else {
          // Existing store: trigger cleanup + re-sync
          fetch(`${baseUrl}/api/stores/background-cleanup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              storeId: store.id,
              authToken: store.access_token,
              userId: store.user_id,
              jobId: `cleanup-${store.id}-${Date.now()}`
            })
          }).catch(error => {
            console.warn(`[RAG:AUTO-SYNC] Background cleanup HTTP call failed for store ${store.id}:`, error);
          });
          
          console.log(`[RAG:AUTO-SYNC] Background cleanup triggered for existing store: ${store.id}`);
        }
      } catch (error) {
        console.warn(`[RAG:AUTO-SYNC] Failed to trigger background operations for store ${store.id}:`, error);
      }

      return { success: true, store };
    } catch (error) {
      console.error('[ERROR] Failed to create or update store:', error);
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
   * 🔒 ENHANCED: Lock-aware async namespace initialization
   * 🛡️ FAIL-SAFE: Never breaks store creation/update process
   */
  static initializeStoreNamespacesAsync(storeId: string): void {
    // Fire-and-forget async operation with lock awareness
    (async () => {
      let lockProcessId: string | null = null;
      
      try {
        console.log(`[STORE-SERVICE] 🔒 Starting lock-aware namespace initialization for store: ${storeId}`);
        
        // 🔒 STEP 1: Check for lock conflicts before starting
        const { checkRAGLockConflicts, RAGLockType, BackgroundSyncLocks } = await import('@/lib/rag/global-locks');
        
        const conflictCheck = await checkRAGLockConflicts(storeId, RAGLockType.BACKGROUND_SYNC);
        
        if (!conflictCheck.canProceed) {
          console.warn(`[STORE-SERVICE] ⏳ Skipping namespace init for store ${storeId} - ${conflictCheck.reason}`);
          return; // Exit early - another operation is handling this store
        }

        // 🔒 STEP 2: Acquire background sync lock
        const lockResult = await BackgroundSyncLocks.acquire(storeId, 'StoreService namespace initialization');
        
        if (!lockResult.success) {
          console.warn(`[STORE-SERVICE] ⏳ Cannot acquire lock for namespace init ${storeId}: ${lockResult.error}`);
          return; // Exit early - lock not available
        }
        
        lockProcessId = lockResult.processId!;
        console.log(`[STORE-SERVICE] 🔒 Lock acquired for namespace init: ${lockProcessId}`);
        
        // STEP 3: Dynamic import to avoid circular dependencies and reduce bundle size
        const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
        
        const ragEngine = getUnifiedRAGEngine();
        const result = await ragEngine.initializeStoreNamespaces(storeId);
        
        if (result.success) {
          console.log(`[STORE-SERVICE] ✅ Namespace initialization completed for store: ${storeId}`);
          
          // STEP 4: Update last sync timestamp after successful namespace creation
          await this.updateStore(storeId, { 
            last_sync_at: new Date().toISOString() 
          });
        } else {
          console.warn(`[STORE-SERVICE] ⚠️ Namespace initialization failed for store: ${storeId} - ${result.error}`);
        }
        
      } catch (error) {
        console.warn(`[STORE-SERVICE] ⚠️ Lock-aware namespace initialization failed for store ${storeId}:`, error);
        // 🛡️ CRITICAL: Never throw errors that could break store operations
        // Namespace initialization is enhancement, not a requirement for basic functionality
      } finally {
        // 🔒 STEP 5: Release lock if we acquired it
        if (lockProcessId) {
          try {
            const { BackgroundSyncLocks } = await import('@/lib/rag/global-locks');
            await BackgroundSyncLocks.release(storeId, lockProcessId);
            console.log(`[STORE-SERVICE] 🔓 Lock released for namespace init: ${lockProcessId}`);
          } catch (lockError) {
            console.warn(`[STORE-SERVICE] ⚠️ Failed to release lock ${lockProcessId}:`, lockError);
          }
        }
      }
    })().catch(error => {
      // Final catch for any unhandled errors in the async IIFE
      console.warn(`[STORE-SERVICE] ⚠️ Unhandled error in namespace initialization for store ${storeId}:`, error);
    });
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