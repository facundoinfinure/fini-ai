/**
 * Vector Store Service
 * 🔥 ENHANCED: Handles vector storage and retrieval using Pinecone with robust network error handling
 */

import { Pinecone } from '@pinecone-database/pinecone';

import { RAG_CONFIG, RAG_CONSTANTS } from './config';
import type { DocumentChunk, VectorSearchResult, VectorStore, RAGQuery } from './types';

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

export class PineconeVectorStore implements VectorStore {
  private pinecone: Pinecone | null = null;
  private indexName: string;

  constructor() {
    this.indexName = RAG_CONFIG.pinecone.indexName;
    
    // Lazy initialization - only create Pinecone client when needed
    // This prevents build errors when API keys are not available
  }

  /**
   * Get or create Pinecone client instance
   * 🔥 ENHANCED: Better error handling and connection validation
   */
  private getPineconeClient(): Pinecone {
    if (!this.pinecone) {
      if (!RAG_CONFIG.pinecone.apiKey) {
        throw new Error('Pinecone API key not configured. Set PINECONE_API_KEY environment variable.');
      }
      
      this.pinecone = new Pinecone({
        apiKey: RAG_CONFIG.pinecone.apiKey,
      });
    }
    
    return this.pinecone;
  }

  /**
   * Initialize and get Pinecone index
   * 🔥 ENHANCED: Includes retry logic for connection issues
   */
  private async getIndex() {
    return retryPineconeOperation(async () => {
      try {
        const pinecone = this.getPineconeClient();
        const index = pinecone.index(this.indexName);
        return index;
      } catch (error) {
        console.warn(`[ERROR] Failed to get Pinecone index: ${this.indexName}`, error);
        throw new Error(`Failed to connect to Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }, 2, 1000, 'getIndex'); // Shorter retry for index access
  }

  /**
   * Upsert document chunks to Pinecone
   * 🔥 ENHANCED: Comprehensive error handling and retry logic + metadata flattening
   */
  async upsert(chunks: DocumentChunk[]): Promise<void> {
    try {
      console.warn(`[RAG:vector-store] Upserting ${chunks.length} chunks to Pinecone`);
      
      if (chunks.length === 0) {
        console.warn('[RAG:vector-store] No chunks to upsert');
        return;
      }

      // SECURITY: Validate all chunks have the same store ID
      const storeIds = Array.from(new Set(chunks.map(chunk => chunk.metadata.storeId)));
      if (storeIds.length > 1) {
        throw new Error(`[SECURITY] Cannot upsert chunks from multiple stores in single operation: ${storeIds.join(', ')}`);
      }

      const index = await this.getIndex();
      
      // Prepare vectors for Pinecone
      const vectors = chunks.map(chunk => {
        if (!chunk.embedding || chunk.embedding.length === 0) {
          throw new Error(`Chunk ${chunk.id} is missing embedding`);
        }

        return {
          id: chunk.id,
          values: chunk.embedding,
          metadata: {
            content: chunk.content,
            // 🔥 CRITICAL FIX: Flatten nested metadata for Pinecone validation
            ...this.flattenMetadataForPinecone(chunk.metadata),
            indexedAt: new Date().toISOString(),
          },
        };
      });

      // Batch upsert to handle large datasets
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        
        // Get namespace for this batch (use first chunk's metadata)
        const namespace = this.getNamespace(chunks[i]);
        
        // 🔥 NEW: Wrap each batch operation in retry logic
        await retryPineconeOperation(async () => {
          await index.namespace(namespace).upsert(batch);
        }, PINECONE_NETWORK_CONFIG.RETRY_ATTEMPTS, PINECONE_NETWORK_CONFIG.RETRY_DELAY_BASE, `upsert:${namespace}:batch${Math.floor(i / batchSize) + 1}`);
        
        console.warn(`[RAG:vector-store] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} to namespace: ${namespace}`);
        
        // Rate limiting between batches
        if (i + batchSize < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.warn(`[RAG:vector-store] Successfully upserted ${chunks.length} chunks`);
    } catch (error) {
      const networkError = classifyPineconeError(error instanceof Error ? error : new Error(String(error)), 'upsert');
      
      if (networkError.isNetworkError) {
        console.warn('[RAG:vector-store] 🌐 Network error during upsert (graceful degradation):', error);
        // Don't throw for network errors during upsert - allow graceful degradation
        return;
      }
      
      console.warn('[ERROR] Failed to upsert chunks to Pinecone:', error);
      throw new Error(`Vector upsert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🔥 NEW: Flatten nested metadata for Pinecone validation
   * Pinecone only accepts string, number, boolean, or list of strings
   * TiendaNube often returns objects like {es: "nombre", en: "name"}
   */
  private flattenMetadataForPinecone(metadata: DocumentChunk['metadata']): Record<string, string | number | boolean | string[]> {
    const flattened: Record<string, string | number | boolean | string[]> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      if (value === null || value === undefined) {
        continue; // Skip null/undefined values
      }
      
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        flattened[key] = value;
      } else if (Array.isArray(value)) {
        // Convert array to array of strings
        flattened[key] = value.map(item => String(item));
      } else if (typeof value === 'object') {
        // 🔥 CRITICAL: Handle TiendaNube multilingual objects
        if (this.isMultilingualObject(value)) {
          // Extract the first available language value
          const firstValue = this.extractMultilingualValue(value);
          if (firstValue) {
            flattened[key] = String(firstValue);
          }
        } else {
          // For other objects, convert to JSON string as fallback
          try {
            flattened[key] = JSON.stringify(value);
          } catch {
            flattened[key] = String(value);
          }
        }
      } else {
        // Fallback: convert to string
        flattened[key] = String(value);
      }
    }
    
    return flattened;
  }

  /**
   * 🔥 NEW: Check if object is a TiendaNube multilingual field
   * Common patterns: {es: "value", en: "value"} or {es: "value", pt: "value"}
   */
  private isMultilingualObject(obj: unknown): boolean {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return false;
    }
    
    const keys = Object.keys(obj as Record<string, unknown>);
    
    // Check if all keys are language codes (2-3 characters)
    return keys.length > 0 && keys.every(key => 
      typeof key === 'string' && key.length >= 2 && key.length <= 3 && /^[a-z]+$/i.test(key)
    );
  }

  /**
   * 🔥 NEW: Extract value from multilingual object
   * Prefers Spanish (es), then English (en), then first available
   */
  private extractMultilingualValue(obj: unknown): string | null {
    if (!obj || typeof obj !== 'object') {
      return null;
    }
    
    const multilingual = obj as Record<string, unknown>;
    
    // Preference order: es -> en -> pt -> first available
    const preferredLanguages = ['es', 'en', 'pt'];
    
    for (const lang of preferredLanguages) {
      if (multilingual[lang] && typeof multilingual[lang] === 'string') {
        return multilingual[lang] as string;
      }
    }
    
    // Fallback to first available value
    const firstKey = Object.keys(multilingual)[0];
    if (firstKey && typeof multilingual[firstKey] === 'string') {
      return multilingual[firstKey] as string;
    }
    
    return null;
  }

  /**
   * Search for similar vectors
   * 🔥 ENHANCED: Network-aware search with retry logic
   */
  async search(queryEmbedding: number[], options: RAGQuery['options'] = {}, filters?: RAGQuery['filters'], context?: RAGQuery['context']): Promise<VectorSearchResult[]> {
    try {
      // SECURITY: Validate store access and log event
      await this.validateStoreAccess(context);
      await this.logSecurityEvent('rag_search', context, true);
      
      const topK = options.topK || RAG_CONFIG.search.defaultTopK;
      const threshold = options.threshold || RAG_CONFIG.search.defaultThreshold;
      
      console.warn(`[RAG:vector-store] Searching for ${topK} similar vectors with threshold ${threshold}`);
      
      const index = await this.getIndex();
      
      // Build Pinecone filter
      const pineconeFilter = this.buildPineconeFilter(filters);
      
      // Determine namespace(s) to search
      const namespaces = this.getSearchNamespaces(context, filters);
      
      const allResults: VectorSearchResult[] = [];
      
      // Search in each namespace with retry logic
      for (const namespace of namespaces) {
        console.warn(`[RAG:vector-store] Searching in namespace: ${namespace}`);
        
        try {
          const searchRequest = {
            vector: queryEmbedding,
            topK,
            includeMetadata: options.includeMetadata !== false,
            includeValues: false,
            ...(pineconeFilter && { filter: pineconeFilter }),
          };

          // 🔥 NEW: Wrap search operation in retry logic
          const searchResponse = await retryPineconeOperation(async () => {
            return await index.namespace(namespace).query(searchRequest);
          }, PINECONE_NETWORK_CONFIG.RETRY_ATTEMPTS, PINECONE_NETWORK_CONFIG.RETRY_DELAY_BASE, `search:${namespace}`);
          
          if (searchResponse.matches) {
            const namespaceResults = searchResponse.matches
              .filter(match => match.score && match.score >= threshold)
              .map(match => ({
                id: match.id,
                score: match.score || 0,
                metadata: match.metadata as DocumentChunk['metadata'],
                content: match.metadata?.content as string,
              }));
            
            allResults.push(...namespaceResults);
          }
        } catch (namespaceError) {
          const networkError = classifyPineconeError(
            namespaceError instanceof Error ? namespaceError : new Error(String(namespaceError)), 
            `search:${namespace}`
          );
          
          if (networkError.isNetworkError) {
            console.warn(`[RAG:vector-store] 🌐 Network error searching namespace ${namespace}, continuing with other namespaces:`, namespaceError);
            continue; // Continue with other namespaces
          }
          
          console.warn(`[RAG:vector-store] Non-network error in namespace ${namespace}:`, namespaceError);
          // Continue with other namespaces for non-network errors too
        }
      }
      
      // Sort by score and limit results
      const sortedResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      console.warn(`[RAG:vector-store] Found ${sortedResults.length} matches across ${namespaces.length} namespaces`);
      
      return sortedResults;
    } catch (error) {
      const networkError = classifyPineconeError(error instanceof Error ? error : new Error(String(error)), 'search');
      
      if (networkError.isNetworkError) {
        console.warn('[RAG:vector-store] 🌐 Network error during search, returning empty results:', error);
        return []; // Return empty results for network errors
      }
      
      console.warn('[ERROR] Failed to search vectors in Pinecone:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
   */
  private getNamespace(chunk: DocumentChunk): string {
    const { storeId, type } = chunk.metadata;
    
    // SECURITY: Validate store ID format
    if (!storeId || typeof storeId !== 'string' || !storeId.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error(`Invalid store ID for namespace generation: ${storeId}`);
    }
    
    console.warn(`[RAG:SECURITY] Creating namespace for store ${storeId}, type: ${type}`);
    
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
   */
  private getSearchNamespaces(context?: RAGQuery['context'], filters?: RAGQuery['filters']): string[] {
    if (!context?.storeId) {
      throw new Error('[SECURITY] Store ID is required for search - data segregation enforced');
    }

    const storeId = context.storeId;
    
    // SECURITY: Validate store ID format
    if (!storeId.match(/^[a-zA-Z0-9_-]+$/)) {
      throw new Error(`[SECURITY] Invalid store ID format: ${storeId}`);
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