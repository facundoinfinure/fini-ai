/**
 * Vector Store Service
 * 🔥 ENHANCED: Handles vector storage and retrieval using Pinecone with robust network error handling
 */

import { RAG_CONFIG, RAG_CONSTANTS } from './config';
import type { DocumentChunk, VectorSearchResult, VectorStore, RAGQuery } from './types';
import { CircuitBreakerManager } from '@/lib/resilience/circuit-breaker';
import { RetryManager, RetryConfigs } from '@/lib/resilience/retry-manager';

/**
 * 🔥 NEW: Network configuration for Pinecone operations
 */
const PINECONE_NETWORK_CONFIG = {
  REQUEST_TIMEOUT: 30000,      // 30 seconds for Pinecone operations
  RETRY_ATTEMPTS: 3,           // Number of retry attempts
  RETRY_DELAY_BASE: 2000,      // Base retry delay (2 seconds)
  CONNECTION_TIMEOUT: 15000,   // 15 seconds for connection establishment
};

/**
 * 🔥 NEW: Network-aware error classification for Pinecone operations
 */
interface PineconeNetworkError extends Error {
  isPineconeError: boolean;
  isNetworkError: boolean;
  isTimeoutError: boolean;
  isConnectionError: boolean;
  shouldRetry: boolean;
  statusCode?: number;
}

/**
 * 🔥 NEW: Classifies Pinecone errors for better handling
 */
function classifyPineconeError(error: Error, context: string): PineconeNetworkError {
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
    message.includes('fetch failed') ||
    message.includes('pineconeconnectionerror') ||
    message.includes('request failed to reach pinecone');
  
  // This is a network error if it's timeout or connection-related
  const isNetworkError = isTimeoutError || isConnectionError;
  
  // Check if it's a Pinecone-specific error
  const isPineconeError = 
    message.includes('pinecone') ||
    message.includes('index') ||
    message.includes('namespace') ||
    error.constructor.name.toLowerCase().includes('pinecone');
  
  // Should retry network errors but not authentication or configuration errors
  const shouldRetry = isNetworkError && !message.includes('api key') && !message.includes('auth');
  
  const networkError = new Error(`${context}: ${error.message}`) as PineconeNetworkError;
  networkError.isPineconeError = isPineconeError;
  networkError.isNetworkError = isNetworkError;
  networkError.isTimeoutError = isTimeoutError;
  networkError.isConnectionError = isConnectionError;
  networkError.shouldRetry = shouldRetry;
  
  return networkError;
}

/**
 * 🔥 ENHANCED: Retry operation with network awareness and graceful 404 handling
 */
async function retryPineconeOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = PINECONE_NETWORK_CONFIG.RETRY_ATTEMPTS,
  baseDelay: number = PINECONE_NETWORK_CONFIG.RETRY_DELAY_BASE,
  context: string = 'pinecone_operation'
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const networkError = classifyPineconeError(lastError, context);
      
      // 🔥 NEW: Handle 404 errors gracefully and silently for cleanup operations
      if (lastError.message.includes('404') && (context.includes('delete') || context.includes('cleanup'))) {
        console.warn(`[RAG:vector-store] ${context} - Namespace/vectors not found (404) - operation completed (already clean)`);
        return undefined as unknown as T; // Return gracefully for delete operations
      }
      
      // 🔥 ENHANCED: More nuanced retry logic
      if (!networkError.shouldRetry || attempt === maxAttempts) {
        // Only log error details if it's not a graceful 404
        if (!lastError.message.includes('404')) {
          console.warn(`[RAG:vector-store] ${networkError.shouldRetry ? 'Max retries exceeded' : 'Non-retryable error'} for ${context}:`, {
            message: lastError.message,
            isNetwork: networkError.isNetworkError,
            isTimeout: networkError.isTimeoutError,
            isPinecone: networkError.isPineconeError,
            willRetry: false
          });
        }
        throw lastError;
      }
      
      // Calculate exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        30000 // Max 30 seconds
      );
      
      // Only log retry attempts for non-404 errors
      if (!lastError.message.includes('404')) {
        console.warn(`[RAG:vector-store] Attempt ${attempt}/${maxAttempts} failed for ${context}:`, {
          message: lastError.message,
          isNetwork: networkError.isNetworkError,
          isTimeout: networkError.isTimeoutError,
          isPinecone: networkError.isPineconeError,
          willRetry: attempt < maxAttempts
        });
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * 🔥 ENHANCED: Vector Store with Circuit Breaker Protection
 */
export class PineconeVectorStore implements VectorStore {
  private pinecone: any = null;
  private indexName: string;
  private circuitBreaker: any;
  private retryManager: RetryManager;

  constructor() {
    this.indexName = RAG_CONFIG.pinecone.indexName;
    // Initialize circuit breaker for Pinecone operations
    this.circuitBreaker = CircuitBreakerManager.getInstance().getBreaker('pinecone-vector-store', {
      failureThreshold: 5,        // Open after 5 failures
      resetTimeout: 60000,       // Try again after 1 minute
      monitoringPeriod: 30000,   // Monitor failures over 30 seconds
      expectedErrors: ['timeout', 'network', 'connection', 'etimedout', 'econnreset']
    });
    
    this.retryManager = RetryManager.getInstance();
  }

  /**
   * Get or create Pinecone client instance
   * 🔥 ENHANCED: Better error handling and connection validation with dynamic import
   */
  private async getPineconeClient(): Promise<any> {
    if (!this.pinecone) {
      if (!RAG_CONFIG.pinecone.apiKey) {
        throw new Error('Pinecone API key not configured. Set PINECONE_API_KEY environment variable.');
      }
      
      // Dynamic import to prevent build errors
      const { Pinecone } = await import('@pinecone-database/pinecone');
      
      this.pinecone = new Pinecone({
        apiKey: RAG_CONFIG.pinecone.apiKey,
      });
    }
    
    return this.pinecone;
  }

  /**
   * Initialize and get Pinecone index with circuit breaker and retry
   */
  private async getIndex() {
    try {
      const result = await this.circuitBreaker.execute(async () => {
        return await this.retryManager.executeWithRetry(
          async () => {
            const pinecone = await this.getPineconeClient();
            const index = pinecone.index(this.indexName);
            
            // Test connection
            await index.describeIndexStats();
            
            return index;
          },
          RetryConfigs.EXTERNAL_API,
          'pinecone-get-index'
        );
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(`Failed to get Pinecone index: ${result.error?.message}`);
      }

    } catch (error) {
      console.warn(`[ERROR] Failed to get Pinecone index: ${this.indexName}`, error);
      throw new Error(`Failed to connect to Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🔥 ENHANCED: Protected upsert with circuit breaker and retries
   */
  async upsert(documents: DocumentChunk[], namespace?: string): Promise<void> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryManager.executeWithRetry(
        async () => {
          const index = await this.getIndex();
          
          if (!index) {
            throw new Error('Pinecone index not available');
          }
          
          console.log(`[VECTOR-STORE] 🔄 Upserting ${documents.length} documents to namespace: ${namespace || 'default'}`);
          
          // Convert documents to Pinecone format
          const vectors = documents.map(doc => ({
            id: doc.id,
            values: doc.embedding,
            metadata: {
              ...doc.metadata,
              content: doc.content
            }
          }));
          
          // Batch upsert with size limits
          const batchSize = 100; // Pinecone recommendation
          for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            
            const upsertRequest: any = {
              vectors: batch
            };
            
            if (namespace) {
              upsertRequest.namespace = namespace;
            }
            
            await index.upsert(upsertRequest);
            console.log(`[VECTOR-STORE] ✅ Batch ${Math.floor(i / batchSize) + 1} upserted: ${batch.length} vectors`);
            
            // Add delay between batches to prevent rate limiting
            if (i + batchSize < vectors.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
          
          console.log(`[VECTOR-STORE] ✅ Successfully upserted ${documents.length} documents`);
        },
        RetryConfigs.EXTERNAL_API,
        'pinecone_upsert'
      );
    });
  }

  /**
   * 🔥 ENHANCED: Protected query with circuit breaker and retries
   */
  async query(query: RAGQuery): Promise<VectorSearchResult[]> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryManager.executeWithRetry(
        async () => {
          const index = await this.getIndex();
          
          if (!index) {
            throw new Error('Pinecone index not available');
          }
          
          const namespace = `${query.context?.storeId || 'default'}-products`;
          console.log(`[VECTOR-STORE] 🔍 Querying with text query (namespace: ${namespace})`);
          
          // This method would need the query to be converted to embedding first
          // For now, return empty results as this needs embedding conversion
          console.warn('[VECTOR-STORE] ⚠️ Query method needs embedding conversion - use search() instead');
          return [];
        },
        RetryConfigs.EXTERNAL_API,
        'pinecone_query'
      );
    });
  }

  /**
   * 🔥 ENHANCED: Search method required by VectorStore interface
   */
  async search(
    queryEmbedding: number[], 
    options?: RAGQuery['options'], 
    filters?: RAGQuery['filters'], 
    context?: RAGQuery['context']
  ): Promise<VectorSearchResult[]> {
    return await this.circuitBreaker.execute(async () => {
      return await this.retryManager.executeWithRetry(
        async () => {
          const index = await this.getIndex();
          
          if (!index) {
            throw new Error('Pinecone index not available');
          }
          
          const namespace = context?.storeId ? `${context.storeId}-products` : 'default';
          console.log(`[VECTOR-STORE] 🔍 Search with embedding vector (namespace: ${namespace})`);
          
          const queryRequest: any = {
            vector: queryEmbedding,
            topK: options?.topK || 10,
            includeMetadata: true,
            includeValues: false,
            namespace: namespace
          };
          
          if (filters) {
            queryRequest.filter = this.buildPineconeFilter(filters);
          }
          
          const response = await index.query(queryRequest);
          
          if (!response?.matches) {
            console.warn('[VECTOR-STORE] ⚠️ No matches returned from Pinecone');
            return [];
          }
          
          const results: VectorSearchResult[] = response.matches.map((match: any) => ({
            id: match.id,
            score: match.score,
            content: match.metadata?.content || '',
            metadata: match.metadata || {}
          }));
          
          console.log(`[VECTOR-STORE] ✅ Search returned ${results.length} results`);
          return results;
        },
        RetryConfigs.EXTERNAL_API,
        'pinecone_search'
      );
    });
  }

  /**
   * Delete vectors by IDs
   * 🔥 ENHANCED: Improved namespace awareness and error handling
   */
  async delete(vectorIds: string[], namespace?: string, context?: RAGQuery['context']): Promise<void> {
    try {
      // 🔥 FIX: Solo validar store access si se proporciona contexto
      // Para operaciones internas (cleanup de placeholders), permitir sin validación
      if (context) {
        await this.validateStoreAccess(context);
        await this.logSecurityEvent('rag_delete', context, true);
      } else {
        console.warn('[RAG:vector-store] Internal deletion operation - skipping security validation');
      }
      
      if (vectorIds.length === 0) {
        console.warn('[RAG:vector-store] No vector IDs provided for deletion');
        return;
      }

      console.warn(`[RAG:vector-store] Deleting ${vectorIds.length} vectors from Pinecone`);

      const index = await this.getIndex();
      
      // 🔥 ENHANCED: Use proper namespace or skip deletion if none specified
      const targetNamespace = namespace || 
        (context?.storeId ? RAG_CONSTANTS.NAMESPACES.store(context.storeId) : null);
      
      if (!targetNamespace) {
        console.warn('[RAG:vector-store] ⚠️ No namespace specified for deletion - skipping to prevent default namespace errors');
        return;
      }

      // 🔥 FIX: Group vectors by namespace to avoid cross-contamination
      const namespacedDeletions = new Map<string, string[]>();
      
      // If we have a target namespace, use it for all vectors
      namespacedDeletions.set(targetNamespace, vectorIds);

      console.warn(`[RAG:vector-store] Deleting ${vectorIds.length} vectors from namespace: ${targetNamespace}`);

      // Process deletions by namespace
      for (const [nsName, nsVectorIds] of namespacedDeletions) {
        if (nsVectorIds.length === 0) continue;
        
        try {
          // 🔥 NEW: Use retry logic for delete operations
          await retryPineconeOperation(async () => {
            await index.namespace(nsName).deleteMany(nsVectorIds);
          }, PINECONE_NETWORK_CONFIG.RETRY_ATTEMPTS, PINECONE_NETWORK_CONFIG.RETRY_DELAY_BASE, `delete:${nsName}`);
          
          console.warn(`[RAG:vector-store] ✅ Successfully deleted ${nsVectorIds.length} vectors from namespace: ${nsName}`);
        } catch (deleteError) {
          const networkError = classifyPineconeError(
            deleteError instanceof Error ? deleteError : new Error(String(deleteError)), 
            `delete:${nsName}`
          );
          
          // 🔥 IMPROVED: Handle 404 errors gracefully
          if (deleteError instanceof Error && deleteError.message.includes('404')) {
            console.warn(`[RAG:vector-store] Namespace ${nsName} not found (404) - vectors may not exist`);
            // This is OK - just means the vectors were already deleted or never existed
          } else if (networkError.isNetworkError) {
            console.warn(`[RAG:vector-store] 🌐 Network error deleting from namespace ${nsName}:`, deleteError);
            // Don't throw for network errors - the vectors might be deleted eventually
          } else {
            console.warn(`[RAG:vector-store] ❌ Failed to delete from namespace ${nsName}:`, deleteError);
            // For non-network errors, we should probably throw to indicate the failure
            throw deleteError;
          }
        }
      }
      
      console.warn(`[RAG:vector-store] Completed deletion process for ${vectorIds.length} vectors`);
    } catch (error) {
      const networkError = classifyPineconeError(error instanceof Error ? error : new Error(String(error)), 'delete');
      
      if (networkError.isNetworkError) {
        console.warn('[RAG:vector-store] 🌐 Network error during vector deletion:', error);
        // For network errors, don't throw - the operation might succeed later
        return;
      }
      
      console.warn('[ERROR] Failed to delete vectors from Pinecone:', error);
      throw new Error(`Vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all vectors from a namespace
   * 🔥 NEW: For complete namespace cleanup
   */
  async deleteAll(namespace: string): Promise<void> {
    try {
      console.warn(`[RAG:vector-store] Deleting all vectors from namespace: ${namespace}`);

      const index = await this.getIndex();
      
      // Use Pinecone's deleteAll to remove all vectors in the namespace
      await retryPineconeOperation(async () => {
        await index.namespace(namespace).deleteAll();
      }, PINECONE_NETWORK_CONFIG.RETRY_ATTEMPTS, PINECONE_NETWORK_CONFIG.RETRY_DELAY_BASE, `deleteAll:${namespace}`);
      
      console.warn(`[RAG:vector-store] ✅ Successfully deleted all vectors from namespace: ${namespace}`);
    } catch (error) {
      // 🔥 ENHANCED: More specific error handling for cleanup operations
      if (error instanceof Error && error.message.includes('404')) {
        console.warn(`[RAG:vector-store] Namespace ${namespace} not found (404) - already clean`);
        // This is OK - just means the namespace was already empty or doesn't exist
        return; // Exit gracefully
      }
      
      const networkError = classifyPineconeError(error instanceof Error ? error : new Error(String(error)), 'deleteAll');
      
      if (networkError.isNetworkError) {
        console.warn(`[RAG:vector-store] 🌐 Network error deleting all from namespace ${namespace}:`, error);
        // Don't throw for network errors - the vectors might be deleted eventually
      } else {
        console.warn(`[RAG:vector-store] ❌ Failed to delete all from namespace ${namespace}:`, error);
        throw error;
      }
    }
  }

  /**
   * Get vector store statistics
   */
  async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    try {
      const index = await this.getIndex();
      const stats = await index.describeIndexStats();
      
      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || RAG_CONSTANTS.EMBEDDING_DIMENSION,
      };
    } catch (error) {
      console.warn('[ERROR] Failed to get Pinecone stats:', error);
      throw new Error(`Failed to get vector store stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get namespace for a chunk based on its metadata
   * 🔥 FIX: Added store validation to prevent namespace creation for inactive stores
   * 🚀 ENHANCED: Allow namespace creation for recently reconnected stores
   */
  private async getNamespace(chunk: DocumentChunk): Promise<string> {
    const { storeId, type } = chunk.metadata;
    
    // SECURITY: Validate store ID format
    if (!storeId || typeof storeId !== 'string' || !storeId.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error(`Invalid store ID for namespace generation: ${storeId}`);
    }
    
    // 🔥 FIX: GLOBAL LOCK PROTECTION - Wait for any deletion locks to clear
    const { waitForStoreUnlock } = await import('@/lib/rag/global-locks');
    await waitForStoreUnlock(storeId, 3000); // Wait up to 3 seconds for deletion to complete
    
    // 🚀 ENHANCED: Special handling for namespace initialization (placeholder documents)
    const isInitializationPlaceholder = chunk.metadata.isPlaceholder === true || 
                                       chunk.metadata.source === 'initialization' ||
                                       chunk.content?.includes('Namespace initialized for');
    
    // 🔥 SIMPLIFIED: More robust store validation with better error handling
    try {
      const { createServiceClient } = await import('@/lib/supabase/server');
      const supabase = createServiceClient(); // Use service client to bypass RLS
      
      // Simple, robust query with timeout
      const storeQueryPromise = supabase
        .from('stores')
        .select('is_active, updated_at, created_at, id')
        .eq('id', storeId)
        .maybeSingle();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      
      const { data: store, error } = await Promise.race([storeQueryPromise, timeoutPromise]) as any;
      
      // Handle database errors
      if (error) {
        console.error(`[RAG:SECURITY] Database error for store ${storeId}:`, error);
        
        // For initialization placeholders, be more lenient with database errors
        if (isInitializationPlaceholder) {
          console.warn(`[RAG:SECURITY] 🟡 ALLOWING namespace initialization despite DB error for placeholder: ${error.message}`);
        } else {
          throw new Error(`Database error: ${error.message}`);
        }
      }
      
      // Handle missing store
      if (!store) {
        console.error(`[RAG:SECURITY] Store ${storeId} not found`);
        
        // For initialization placeholders, try a retry after a brief delay
        if (isInitializationPlaceholder) {
          console.warn(`[RAG:SECURITY] Store ${storeId} not found, retrying for initialization placeholder...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const { data: retryStore, error: retryError } = await supabase
            .from('stores')
            .select('is_active')
            .eq('id', storeId)
            .maybeSingle();
            
          if (retryError || !retryStore) {
            console.error(`[RAG:SECURITY] Store ${storeId} still not found after retry`);
            throw new Error(`[RAG:SECURITY] Cannot create namespace for non-existent store: ${storeId}`);
          } else if (!retryStore.is_active) {
            console.error(`[RAG:SECURITY] Store ${storeId} found but inactive`);
            throw new Error(`[RAG:SECURITY] Cannot create namespace for inactive store: ${storeId}`);
          } else {
            console.log(`[RAG:SECURITY] ✅ Store ${storeId} found and active on retry`);
          }
        } else {
          throw new Error(`[RAG:SECURITY] Cannot create namespace for non-existent store: ${storeId}`);
        }
      }
      
      // Handle inactive store  
      else if (!store.is_active) {
        console.error(`[RAG:SECURITY] Store ${storeId} is inactive`);
        
        // For initialization placeholders with recent activity, allow it
        if (isInitializationPlaceholder) {
          const updatedAt = new Date(store.updated_at);
          const now = new Date();
          const timeDiff = now.getTime() - updatedAt.getTime();
          
          if (timeDiff < 60000) { // Less than 1 minute
            console.warn(`[RAG:SECURITY] 🟡 ALLOWING namespace initialization for recently updated inactive store ${storeId} (${timeDiff}ms ago)`);
          } else {
            throw new Error(`[RAG:SECURITY] Cannot create namespace for inactive store: ${storeId}`);
          }
        } else {
          throw new Error(`[RAG:SECURITY] Cannot create namespace for inactive store: ${storeId}`);
        }
      }
      
      // Store exists and is active
      else {
        console.log(`[RAG:SECURITY] ✅ Store ${storeId} validated successfully - is_active: ${store.is_active}`);
      }
      
    } catch (validationError) {
      // 🚀 ENHANCED: Better error handling for network/timeout issues
      if (isInitializationPlaceholder && validationError instanceof Error && 
          (validationError.message.includes('timeout') ||
           validationError.message.includes('network') ||
           validationError.message.includes('connection'))) {
        console.warn(`[RAG:SECURITY] 🟡 ALLOWING namespace initialization despite validation error for placeholder: ${validationError.message}`);
      } else {
        console.error(`[RAG:SECURITY] Store validation failed for ${storeId}:`, validationError);
        throw validationError; // Re-throw the original error with full details
      }
    }
    
    // Generate namespace name
    const operationType = isInitializationPlaceholder ? 'INITIALIZATION' : 'DATA_INDEXING';
    console.log(`[RAG:SECURITY] ✅ Creating namespace for store ${storeId}, type: ${type}, operation: ${operationType}`);
    
    switch (type) {
      case 'product':
        return RAG_CONSTANTS.NAMESPACES.products(storeId);
      case 'order':
        return RAG_CONSTANTS.NAMESPACES.orders(storeId);
      case 'customer':
        return RAG_CONSTANTS.NAMESPACES.customers(storeId);
      case 'analytics':
        return RAG_CONSTANTS.NAMESPACES.analytics(storeId);
      case 'conversation':
        return RAG_CONSTANTS.NAMESPACES.conversations(storeId);
      case 'store':
      default:
        return RAG_CONSTANTS.NAMESPACES.store(storeId);
    }
  }

  /**
   * Get namespaces to search based on context and filters
   * 🔥 FIX: Added async store validation to prevent searches on inactive stores
   */
  private async getSearchNamespaces(context?: RAGQuery['context'], filters?: RAGQuery['filters']): Promise<string[]> {
    if (!context?.storeId) {
      throw new Error('[SECURITY] Store ID is required for search - data segregation enforced');
    }

    const storeId = context.storeId;
    
    // SECURITY: Validate store ID format
    if (!storeId.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error(`[SECURITY] Invalid store ID format: ${storeId}`);
    }
    
    // 🔥 FIX: GLOBAL LOCK PROTECTION - Wait for any deletion locks to clear
    const { waitForStoreUnlock } = await import('@/lib/rag/global-locks');
    await waitForStoreUnlock(storeId, 2000); // Wait up to 2 seconds for deletion to complete
    
    // 🔥 FIX: RACE CONDITION PROTECTION - Apply same logic for searches
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      
      const { data: store, error } = await supabase
        .from('stores')
        .select('is_active, updated_at')
        .eq('id', storeId)
        .single();
        
      if (error || !store || !store.is_active) {
        console.error(`[RAG:SECURITY] BLOCKED search - Store ${storeId} is inactive. DB check: is_active=${store?.is_active}, error=${error?.message}`);
        throw new Error(`[RAG:SECURITY] Cannot search namespaces for inactive/deleted store: ${storeId}`);
      }
      
      // Race condition protection for searches too
      const updatedAt = new Date(store.updated_at);
      const timeDiff = new Date().getTime() - updatedAt.getTime();
      
      if (timeDiff < 10000) { // Less than 10 seconds
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const { data: doubleCheck, error: doubleError } = await supabase
          .from('stores')
          .select('is_active')
          .eq('id', storeId)
          .single();
          
        if (doubleError || !doubleCheck || !doubleCheck.is_active) {
          console.error(`[RAG:SECURITY] SEARCH DOUBLE-CHECK FAILED - Store ${storeId} became inactive`);
          throw new Error(`[RAG:SECURITY] Cannot search namespaces for inactive/deleted store: ${storeId}`);
        }
      }
      
    } catch (validationError) {
      console.error(`[RAG:SECURITY] Store validation failed for search ${storeId}:`, validationError);
      throw new Error(`Store validation failed: ${storeId}`);
    }
    
    // SECURITY: Log access attempt
    console.warn(`[RAG:SECURITY] Store ${storeId} accessing data via ${context.agentType || 'unknown'} agent`);
    
    const namespaces: string[] = [];
    
    // If specific types are filtered, only search those namespaces
    if (filters?.type && filters.type.length > 0) {
      for (const type of filters.type) {
        switch (type) {
          case 'product':
            namespaces.push(RAG_CONSTANTS.NAMESPACES.products(storeId));
            break;
          case 'order':
            namespaces.push(RAG_CONSTANTS.NAMESPACES.orders(storeId));
            break;
          case 'customer':
            namespaces.push(RAG_CONSTANTS.NAMESPACES.customers(storeId));
            break;
          case 'analytics':
            namespaces.push(RAG_CONSTANTS.NAMESPACES.analytics(storeId));
            break;
          case 'conversation':
            namespaces.push(RAG_CONSTANTS.NAMESPACES.conversations(storeId));
            break;
          case 'store':
            namespaces.push(RAG_CONSTANTS.NAMESPACES.store(storeId));
            break;
        }
      }
    } else {
      // Search all namespaces for the store
      namespaces.push(
        RAG_CONSTANTS.NAMESPACES.store(storeId),
        RAG_CONSTANTS.NAMESPACES.products(storeId),
        RAG_CONSTANTS.NAMESPACES.orders(storeId),
        RAG_CONSTANTS.NAMESPACES.customers(storeId),
        RAG_CONSTANTS.NAMESPACES.analytics(storeId),
        RAG_CONSTANTS.NAMESPACES.conversations(storeId)
      );
    }
    
    console.warn(`[RAG:SECURITY] Store ${storeId} authorized for namespaces: ${namespaces.join(', ')}`);
    return namespaces;
  }

  /**
   * Build Pinecone filter from RAG filters
   */
  private buildPineconeFilter(filters?: RAGQuery['filters']): Record<string, unknown> | undefined {
    if (!filters) return undefined;

    const pineconeFilter: Record<string, unknown> = {};

    // Date range filter
    if (filters.dateRange) {
      pineconeFilter.timestamp = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end,
      };
    }

    // Source filter
    if (filters.source && filters.source.length > 0) {
      pineconeFilter.source = { $in: filters.source };
    }

    // Product IDs filter
    if (filters.productIds && filters.productIds.length > 0) {
      pineconeFilter.productId = { $in: filters.productIds };
    }

    // Order IDs filter
    if (filters.orderIds && filters.orderIds.length > 0) {
      pineconeFilter.orderId = { $in: filters.orderIds };
    }

    // Customer IDs filter
    if (filters.customerIds && filters.customerIds.length > 0) {
      pineconeFilter.customerId = { $in: filters.customerIds };
    }

    return Object.keys(pineconeFilter).length > 0 ? pineconeFilter : undefined;
  }

  /**
   * Validate vector store configuration
   */
  validateConfig(): { isValid: boolean; error?: string } {
    if (!RAG_CONFIG.pinecone.apiKey) {
      return { isValid: false, error: 'PINECONE_API_KEY is required' };
    }

    if (!RAG_CONFIG.pinecone.indexName) {
      return { isValid: false, error: 'PINECONE_INDEX_NAME is required' };
    }

    return { isValid: true };
  }

  /**
   * SECURITY: Validate that the user has access to the store
   */
  private async validateStoreAccess(context?: RAGQuery['context']): Promise<void> {
    if (!context?.storeId) {
      throw new Error('[SECURITY] Store ID is required for all operations');
    }

    if (!context?.userId) {
      throw new Error('[SECURITY] User ID is required for store access validation');
    }

    // Import security functions
    const { validateStoreAccess } = await import('@/lib/security/store-access');
    const { checkCombinedRateLimit } = await import('@/lib/security/rate-limiter');

    // 1. Validate store access in database
    const accessResult = await validateStoreAccess(context.userId, context.storeId);
    
    if (!accessResult.hasAccess) {
      throw new Error(`[SECURITY] ${accessResult.reason || 'Access denied to store'}`);
    }

    // 2. Check rate limits for RAG operations
    const rateLimitResult = await checkCombinedRateLimit(
      context.storeId, 
      context.userId, 
      'rag_search'
    );

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.max(
        rateLimitResult.storeLimit.retryAfter || 0,
        rateLimitResult.userLimit.retryAfter || 0
      );
      throw new Error(`[RATE_LIMIT] RAG search rate limit exceeded. Try again in ${Math.ceil(retryAfter / 1000)} seconds.`);
    }

    console.warn(`[RAG:SECURITY] Access validated: user ${context.userId} ✓ store ${context.storeId} (${accessResult.store?.name || 'unknown'}) - Remaining: store=${rateLimitResult.storeLimit.remaining}, user=${rateLimitResult.userLimit.remaining}`);
  }

  /**
   * Log security events with anomaly detection
   */
  private async logSecurityEvent(operation: string, context?: RAGQuery['context'], success: boolean = true): Promise<void> {
    if (!context?.userId || !context?.storeId) {
      return;
    }

    try {
      const { logSecurityEventWithDetection } = await import('@/lib/security/anomaly-detector');
      
      await logSecurityEventWithDetection({
        userId: context.userId,
        storeId: context.storeId,
        operation,
        success,
        metadata: {
          agentType: context.agentType || 'unknown',
          conversationId: context.conversationId
        }
      });
    } catch (error) {
      console.error('[RAG:SECURITY] Failed to log security event:', error);
    }
  }
} 