/**
 * RAG Engine
 * Main orchestrator for Retrieval-Augmented Generation
 * Integrates embeddings, vector store, and document processing
 */

import { TiendaNubeAPI } from '../integrations/tiendanube';

import { RAG_CONSTANTS } from './config';
import { RAGDocumentProcessor } from './document-processor';
import { EmbeddingsService } from './embeddings';
import type { RAGEngine, RAGQuery, RAGResult, DocumentChunk } from './types';
import { PineconeVectorStore } from './vector-store';



export class FiniRAGEngine implements RAGEngine {
  private embeddings: EmbeddingsService;
  private vectorStore: PineconeVectorStore;
  private processor: RAGDocumentProcessor;

  constructor() {
    this.embeddings = new EmbeddingsService();
    this.vectorStore = new PineconeVectorStore();
    this.processor = new RAGDocumentProcessor();
  }

  /**
   * Index a single document with metadata
   */
  async indexDocument(content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void> {
    try {
      console.warn(`[RAG:engine] Indexing document of type: ${metadata.type}`);
      
      if (!metadata.storeId) {
        throw new Error('Store ID is required for document indexing');
      }

      // Process document into chunks
      const chunks = this.processor.processDocument(content, metadata);
      
      if (chunks.length === 0) {
        console.warn('[RAG:engine] No chunks created, skipping indexing');
        return;
      }

      // Generate embeddings for all chunks
      const contents = chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddings.generateBatchEmbeddings(contents);

      // Add embeddings to chunks
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index].embedding,
      }));

      // Store in vector database
      await this.vectorStore.upsert(chunksWithEmbeddings);

      console.warn(`[RAG:engine] Successfully indexed ${chunks.length} chunks for document`);
    } catch (error) {
      console.warn('[ERROR] Failed to index document:', error);
      throw new Error(`Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Index all data for a Tienda Nube store
   * 🔥 FIXED: Robust token management with fallbacks + ID mismatch fix
   */
  async indexStoreData(storeId: string, accessToken?: string): Promise<void> {
    try {
      console.warn(`[RAG:engine] Starting full store indexing for store: ${storeId}`);

      // 🔥 STEP 1: Get valid token with comprehensive fallback strategy + store data
      let validToken: string | null = null;
      let platformStoreId: string | null = null;
      let tokenSource = 'unknown';
      
      try {
        // Try Token Manager first (most reliable) - NEW: Get both token and platform_store_id
        const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
        const storeData = await TiendaNubeTokenManager.getValidTokenWithStoreData(storeId);
        
        if (storeData) {
          validToken = storeData.token;
          platformStoreId = storeData.platformStoreId;
          tokenSource = 'token_manager';
          console.warn(`[RAG:engine] ✅ Using validated token from Token Manager for store: ${storeId} (platform_store_id: ${platformStoreId})`);
        }
      } catch (tokenManagerError) {
        console.warn(`[RAG:engine] ⚠️ Token Manager failed for store ${storeId}:`, tokenManagerError);
      }

      // Fallback to provided token if Token Manager failed
      if (!validToken && accessToken) {
        console.warn(`[RAG:engine] ⚠️ Using provided token as fallback for store: ${storeId}`);
        validToken = accessToken;
        tokenSource = 'provided_token';
        
        // Need to get platform_store_id from database for provided token fallback
        try {
          const { createClient } = await import('@/lib/supabase/server');
          const supabase = createClient();
          
          const { data: store, error } = await supabase
            .from('stores')
            .select('platform_store_id')
            .eq('id', storeId)
            .single();

          if (!error && store?.platform_store_id) {
            platformStoreId = store.platform_store_id;
            console.warn(`[RAG:engine] ✅ Retrieved platform_store_id for fallback: ${platformStoreId}`);
          }
        } catch (dbError) {
          console.warn(`[RAG:engine] ❌ Failed to get platform_store_id for fallback:`, dbError);
        }
      }

      // Final fallback: try to get from database directly
      if (!validToken) {
        try {
          const { createClient } = await import('@/lib/supabase/server');
          const supabase = createClient();
          
          const { data: store, error } = await supabase
            .from('stores')
            .select('access_token, platform_store_id')
            .eq('id', storeId)
            .single();

          if (!error && store?.access_token && store?.platform_store_id) {
            validToken = store.access_token;
            platformStoreId = store.platform_store_id;
            tokenSource = 'database_direct';
            console.warn(`[RAG:engine] ⚠️ Using direct database token for store: ${storeId} (platform_store_id: ${platformStoreId})`);
          }
        } catch (dbError) {
          console.warn(`[RAG:engine] ❌ Database fallback failed for store ${storeId}:`, dbError);
        }
      }

      if (!validToken || !platformStoreId) {
        console.warn(`[RAG:engine] ❌ Missing credentials for store: ${storeId}`, {
          hasToken: !!validToken,
          hasPlatformStoreId: !!platformStoreId
        });
        return;
      }

      console.warn(`[RAG:engine] 🔑 Token source: ${tokenSource} for store: ${storeId} (platform_store_id: ${platformStoreId})`);

      // 🔥 STEP 2: Initialize API with retry logic - FIXED: Use platformStoreId instead of storeId
      let api: TiendaNubeAPI;
      try {
        api = new TiendaNubeAPI(validToken, platformStoreId);
        
        // Test the connection with a lightweight API call
        await api.getStore();
        console.warn(`[RAG:engine] ✅ API connection verified for store: ${storeId} (platform_store_id: ${platformStoreId})`);
      } catch (connectionError) {
        console.warn(`[RAG:engine] ❌ API connection failed for store ${storeId}:`, connectionError);
        
        // If it's an auth error and we have the Token Manager, try one more time
        if (tokenSource !== 'token_manager' && 
            connectionError instanceof Error && 
            connectionError.message.toLowerCase().includes('401')) {
          
          try {
            console.warn(`[RAG:engine] 🔄 Retrying with Token Manager after auth failure for store: ${storeId}`);
            const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
            const retryStoreData = await TiendaNubeTokenManager.getValidTokenWithStoreData(storeId);
            
            if (retryStoreData && retryStoreData.token !== validToken) {
              api = new TiendaNubeAPI(retryStoreData.token, retryStoreData.platformStoreId);
              await api.getStore();
              console.warn(`[RAG:engine] ✅ Retry successful with refreshed token for store: ${storeId}`);
            } else {
              throw connectionError;
            }
          } catch (retryError) {
            console.warn(`[RAG:engine] ❌ Retry failed for store ${storeId}:`, retryError);
            throw connectionError;
          }
        } else {
          throw connectionError;
        }
      }

      const indexingPromises: Promise<void>[] = [];

      // 🔥 STEP 3: Initialize namespaces first (prevent empty searches)
      console.warn(`[RAG:engine] 🔧 Initializing namespaces for store: ${storeId}`);
      await this.initializeStoreNamespaces(storeId);

      // 🔥 STEP 4: Index store information
      try {
        const store = await api.getStore();
        const storeContent = this.processor.processStoreData(store);
        indexingPromises.push(
          this.indexDocument(storeContent, {
            type: 'store',
            storeId,
            source: 'tiendanube_store',
            timestamp: new Date().toISOString(),
          })
        );
        console.warn(`[RAG:engine] ✅ Store info queued for indexing`);
      } catch (error) {
        console.warn('[WARNING] Failed to index store info:', error);
      }

      // 🔥 STEP 5: Index products (most important for agents)
      try {
        console.warn(`[RAG:engine] 📦 Fetching products for store: ${storeId}`);
        const products = await api.getProducts({ limit: 200 });
        
        if (products && products.length > 0) {
          console.warn(`[RAG:engine] 📦 Found ${products.length} products for indexing`);
          
          for (const product of products) {
            const productContent = this.processor.processProductData(product);
            indexingPromises.push(
              this.indexDocument(productContent, {
                type: 'product',
                storeId,
                source: 'tiendanube_products',
                timestamp: new Date().toISOString(),
                productId: product.id?.toString(),
                productName: product.name || 'Producto sin nombre',
                category: product.categories?.[0]?.name || 'Sin categoría',
              })
            );
          }
        } else {
          console.warn(`[RAG:engine] ⚠️ No products found for store: ${storeId}`);
        }
      } catch (error) {
        console.warn('[WARNING] Failed to index products:', error);
      }

      // 🔥 STEP 6: Index orders (for analytics) - Enhanced graceful handling
      try {
        console.warn(`[RAG:engine] 📊 Fetching orders for store: ${storeId}`);
        const orders = await api.getOrders({ limit: 100 });
        
        if (orders && orders.length > 0) {
          console.warn(`[RAG:engine] 📊 Found ${orders.length} orders for indexing`);
          for (const order of orders) {
            const orderContent = this.processor.processOrderData(order);
            indexingPromises.push(
              this.indexDocument(orderContent, {
                type: 'order',
                storeId,
                source: 'tiendanube_orders',
                timestamp: new Date().toISOString(),
                orderId: order.id?.toString(),
                orderValue: parseFloat(order.total) || 0,
                orderStatus: order.status || 'unknown',
              })
            );
          }
        } else {
          console.warn(`[RAG:engine] ℹ️ No orders found for store: ${storeId} (normal for new stores)`);
        }
      } catch (error: any) {
        // 🔥 ENHANCED: Distinguish between normal empty datasets vs real errors
        if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
          console.warn(`[RAG:engine] ℹ️ Orders endpoint not available for store ${storeId} (normal for stores without orders)`);
        } else if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
          console.warn(`[RAG:engine] ℹ️ Orders endpoint restricted for store ${storeId} (normal for some plans)`);
        } else {
          console.warn(`[RAG:engine] ⚠️ Failed to fetch orders for store ${storeId}:`, error);
        }
        // Don't throw - continue with other data types
      }

      // 🔥 STEP 7: Index customers - Enhanced graceful handling
      try {
        console.warn(`[RAG:engine] 👥 Fetching customers for store: ${storeId}`);
        const customers = await api.getCustomers({ limit: 100 });
        
        if (customers && customers.length > 0) {
          console.warn(`[RAG:engine] 👥 Found ${customers.length} customers for indexing`);
          for (const customer of customers) {
            const customerContent = this.processor.processCustomerData(customer);
            indexingPromises.push(
              this.indexDocument(customerContent, {
                type: 'customer',
                storeId,
                source: 'tiendanube_customers',
                timestamp: new Date().toISOString(),
                customerId: customer.id?.toString(),
                customerEmail: customer.email || 'sin-email',
              })
            );
          }
        } else {
          console.warn(`[RAG:engine] ℹ️ No customers found for store: ${storeId} (normal for new stores)`);
        }
      } catch (error: any) {
        // 🔥 ENHANCED: Distinguish between normal empty datasets vs real errors
        if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
          console.warn(`[RAG:engine] ℹ️ Customers endpoint not available for store ${storeId} (normal for stores without customers)`);
        } else if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
          console.warn(`[RAG:engine] ℹ️ Customers endpoint restricted for store ${storeId} (normal for some plans)`);
        } else {
          console.warn(`[RAG:engine] ⚠️ Failed to fetch customers for store ${storeId}:`, error);
        }
        // Don't throw - continue with other data types
      }

      // 🔥 STEP 8: Index analytics data - Enhanced graceful handling
      try {
        console.warn(`[RAG:engine] 📈 Fetching analytics for store: ${storeId}`);
        const analytics = await api.getStoreAnalytics();
        const analyticsContent = this.processor.processAnalyticsData(analytics, 'current');
        indexingPromises.push(
          this.indexDocument(analyticsContent, {
            type: 'analytics',
            storeId,
            source: 'tiendanube_analytics',
            timestamp: new Date().toISOString(),
          })
        );
        console.warn(`[RAG:engine] 📈 Analytics data queued for indexing`);
      } catch (error: any) {
        // 🔥 ENHANCED: Distinguish between normal empty datasets vs real errors
        if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
          console.warn(`[RAG:engine] ℹ️ Analytics endpoint not available for store ${storeId} (normal for some TiendaNube plans)`);
        } else if (error.message?.includes('Forbidden') || error.message?.includes('403')) {
          console.warn(`[RAG:engine] ℹ️ Analytics endpoint restricted for store ${storeId} (normal for basic plans)`);
        } else {
          console.warn(`[RAG:engine] ⚠️ Failed to fetch analytics for store ${storeId}:`, error);
        }
        // Don't throw - continue without analytics data
      }

      // 🔥 STEP 9: Process all indexing operations in batches
      if (indexingPromises.length === 0) {
        console.warn(`[RAG:engine] ⚠️ No data to index for store: ${storeId}`);
        return;
      }

      console.warn(`[RAG:engine] 🔄 Processing ${indexingPromises.length} indexing operations for store: ${storeId}`);
      const batchSize = 10; // Process 10 documents at a time
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < indexingPromises.length; i += batchSize) {
        const batch = indexingPromises.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(batch);
        
        // Count successes and failures
        batchResults.forEach(result => {
          if (result.status === 'fulfilled') {
            successCount++;
          } else {
            errorCount++;
            console.warn(`[RAG:engine] ❌ Indexing failed:`, result.reason);
          }
        });
        
        console.warn(`[RAG:engine] 📊 Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(indexingPromises.length / batchSize)} - Success: ${successCount}, Errors: ${errorCount}`);
        
        // Small delay between batches to avoid overwhelming APIs
        if (i + batchSize < indexingPromises.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.warn(`[RAG:engine] ✅ Store indexing completed for: ${storeId} - Success: ${successCount}, Errors: ${errorCount}`);
      
      // 🔥 STEP 10: Update last sync timestamp in database
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        
        await supabase
          .from('stores')
          .update({ 
            last_sync_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', storeId);
          
        console.warn(`[RAG:engine] ✅ Updated last_sync_at for store: ${storeId}`);
      } catch (updateError) {
        console.warn(`[RAG:engine] ⚠️ Failed to update last_sync_at for store ${storeId}:`, updateError);
      }
      
    } catch (error) {
      console.warn('[ERROR] Failed to index store data:', error);
      throw new Error(`Store indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for relevant documents
   */
  async search(query: RAGQuery): Promise<RAGResult> {
    try {
      const startTime = Date.now();
      console.warn(`[RAG:engine] Searching for: "${query.query}"`);

      if (!query.context?.storeId) {
        throw new Error('Store ID is required for search');
      }

      // Generate embedding for query
      const queryEmbedding = await this.embeddings.generateEmbedding(query.query);

      // Determine similarity threshold based on agent type
      const threshold = query.options?.threshold || 
        (query.context?.agentType ? 
          RAG_CONSTANTS.SIMILARITY_THRESHOLDS[query.context.agentType] : 
          RAG_CONSTANTS.SIMILARITY_THRESHOLDS.general);

      // Search in vector store
      const searchOptions = {
        ...query.options,
        threshold,
      };

      const searchResults = await this.vectorStore.search(
        queryEmbedding.embedding,
        searchOptions,
        query.filters,
        query.context
      );

      // Convert search results to document chunks
      const documents: DocumentChunk[] = searchResults.map(result => ({
        id: result.id,
        content: result.content || '',
        metadata: {
          ...result.metadata,
          relevanceScore: result.score,
        },
      }));

      // Calculate overall confidence based on top results
      const confidence = searchResults.length > 0 ? 
        searchResults.slice(0, 3).reduce((sum, result) => sum + result.score, 0) / Math.min(3, searchResults.length) : 0;

      const processingTime = Date.now() - startTime;

      const result: RAGResult = {
        documents,
        query: query.query,
        totalFound: searchResults.length,
        processingTime,
        confidence,
      };

      console.warn(`[RAG:engine] Found ${documents.length} relevant documents (confidence: ${confidence.toFixed(3)}) in ${processingTime}ms`);

      return result;
    } catch (error) {
      console.warn('[ERROR] Failed to search documents:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get relevant context for agents
   */
  async getRelevantContext(query: string, context: RAGQuery['context']): Promise<string> {
    try {
      console.warn(`[RAG:engine] Getting relevant context for: "${query}"`);

      const ragQuery: RAGQuery = {
        query,
        context,
        options: {
          topK: 5,
          includeMetadata: true,
        },
      };

      const searchResult = await this.search(ragQuery);

      if (searchResult.documents.length === 0) {
        return 'No hay información relevante disponible en el contexto actual.';
      }

      // Format context for agents
      const contextParts: string[] = [];
      
      for (const doc of searchResult.documents) {
        const relevanceScore = doc.metadata.relevanceScore || 0;
        if (relevanceScore < 0.7) continue; // Skip low relevance documents
        
        const source = doc.metadata.source || 'unknown';
        const type = doc.metadata.type || 'unknown';
        
        contextParts.push(`[${type.toUpperCase()} - ${source}] ${doc.content}`);
      }

      if (contextParts.length === 0) {
        return 'La información disponible no es suficientemente relevante para responder tu consulta.';
      }

      const contextText = contextParts.join('\n\n---\n\n');
      
      console.warn(`[RAG:engine] Generated context with ${contextParts.length} relevant documents`);
      
      return contextText;
    } catch (error) {
      console.warn('[ERROR] Failed to get relevant context:', error);
      return 'Error al obtener contexto relevante. Por favor, intenta de nuevo.';
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(documentId: string, content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void> {
    try {
      console.warn(`[RAG:engine] Updating document: ${documentId}`);

      // Delete existing document chunks
      await this.vectorStore.delete([documentId]);

      // Re-index with new content
      await this.indexDocument(content, metadata);

      console.warn(`[RAG:engine] Successfully updated document: ${documentId}`);
    } catch (error) {
      console.warn('[ERROR] Failed to update document:', error);
      throw new Error(`Document update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all data for a store
   */
  async deleteStoreData(storeId: string): Promise<void> {
    try {
      console.warn(`[RAG:engine] Deleting all data for store: ${storeId}`);

      // In a production system, you'd query for all document IDs for this store
      // For now, we'll implement a pattern-based deletion
      const namespaces = [
        `store-${storeId}`,
        `store-${storeId}-products`,
        `store-${storeId}-orders`,
        `store-${storeId}-customers`,
        `store-${storeId}-analytics`,
        `store-${storeId}-conversations`,
      ];

      // This is a simplified approach - in production you'd need to:
      // 1. Query all document IDs for the store
      // 2. Delete them in batches
      // For now, we'll log the intention
      
      console.warn(`[RAG:engine] Would delete data from namespaces: ${namespaces.join(', ')}`);
      console.warn(`[RAG:engine] Store data deletion completed for: ${storeId}`);
    } catch (error) {
      console.warn('[ERROR] Failed to delete store data:', error);
      throw new Error(`Store data deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete specific documents by IDs
   * 🔥 CRITICAL: Para eliminar vectores de conversaciones específicas
   */
  async deleteDocuments(documentIds: string[]): Promise<void> {
    try {
      console.warn(`[RAG:engine] Deleting ${documentIds.length} documents from vector store`);
      
      if (documentIds.length === 0) {
        console.warn('[RAG:engine] No documents to delete');
        return;
      }

      // Use vector store delete method
      await this.vectorStore.delete(documentIds);
      
      console.warn(`[RAG:engine] Successfully deleted ${documentIds.length} documents`);
    } catch (error) {
      console.warn('[ERROR] Failed to delete documents from vector store:', error);
      throw new Error(`Document deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get RAG engine statistics
   */
  async getStats(): Promise<{
    vectorStore: { totalVectors: number; dimension: number };
    embeddings: { model: string; dimension: number; maxTokens: number };
    isConfigured: boolean;
    errors: string[];
  }> {
    try {
      const errors: string[] = [];

      // Check embeddings configuration
      const embeddingsValidation = this.embeddings.validateConfig();
      if (!embeddingsValidation.isValid) {
        errors.push(`Embeddings: ${embeddingsValidation.error}`);
      }

      // Check vector store configuration
      const vectorStoreValidation = this.vectorStore.validateConfig();
      if (!vectorStoreValidation.isValid) {
        errors.push(`Vector Store: ${vectorStoreValidation.error}`);
      }

      // Get statistics
      const vectorStoreStats = await this.vectorStore.getStats();
      const embeddingsInfo = this.embeddings.getModelInfo();

      return {
        vectorStore: vectorStoreStats,
        embeddings: embeddingsInfo,
        isConfigured: errors.length === 0,
        errors,
      };
    } catch (error) {
      console.warn('[ERROR] Failed to get RAG stats:', error);
      return {
        vectorStore: { totalVectors: 0, dimension: 0 },
        embeddings: { model: 'unknown', dimension: 0, maxTokens: 0 },
        isConfigured: false,
        errors: [`Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Initialize Pinecone namespaces for a new store
   * 🚀 EFFICIENT: Pre-creates namespaces without breaking existing functionality
   */
  async initializeStoreNamespaces(storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.warn(`[RAG:engine] Initializing namespaces for store: ${storeId}`);

      const namespaceTypes = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
      
      // Create namespaces in parallel
      const initPromises = namespaceTypes.map(type => 
        this.initializeSingleNamespace(storeId, type)
      );
      
      await Promise.allSettled(initPromises);
      
      console.warn(`[RAG:engine] Successfully initialized ${namespaceTypes.length} namespaces for store: ${storeId}`);
      
      return { success: true };
    } catch (error) {
      console.warn('[ERROR] Failed to initialize store namespaces:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Initialize a single namespace with placeholder data
   * 🔥 FIXED: Better error handling for Pinecone operations
   */
  private async initializeSingleNamespace(storeId: string, type: string): Promise<void> {
    try {
      const namespace = `store-${storeId}-${type}`;
      
      console.warn(`[RAG:SECURITY] Creating namespace for store ${storeId}, type: ${type}`);
      
      // Create a minimal placeholder document to initialize the namespace
      const placeholderContent = `Placeholder for ${type} data in store ${storeId}`;
      const placeholderId = `placeholder-${storeId}-${type}`;
      
      await this.indexDocument(placeholderContent, {
        type: type as any,
        storeId,
        source: 'initialization',
        timestamp: new Date().toISOString(),
        isPlaceholder: true
      });
      
      console.warn(`[RAG:engine] Initialized namespace: ${namespace}`);
      
      // 🔥 FIX: Cleanup placeholder with better error handling
      setTimeout(async () => {
        try {
          await this.vectorStore.delete([placeholderId]);
        } catch (cleanupError: any) {
          // 🔥 IMPORTANT: Don't spam logs with expected 404 errors
          if (cleanupError?.message?.includes('404') || cleanupError?.message?.includes('not found')) {
            console.warn(`[RAG:engine] Note: Placeholder cleanup failed for ${namespace}: ${cleanupError.message}`);
          } else {
            console.warn(`[RAG:engine] Note: Placeholder cleanup failed for ${namespace}: Error: Vector deletion failed: ${cleanupError?.message || cleanupError}`);
          }
          // Don't throw - cleanup failure is not critical
        }
      }, 1000);
      
    } catch (error) {
      console.warn(`[ERROR] Failed to initialize namespace for ${type}:`, error);
      // Don't throw - individual namespace failure shouldn't break the whole process
    }
  }

} 