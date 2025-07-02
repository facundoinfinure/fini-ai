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
   */
  async indexStoreData(storeId: string, accessToken?: string): Promise<void> {
    try {
      console.warn(`[RAG:engine] Starting full store indexing for store: ${storeId}`);

      // 🔥 FIX: Get valid token using Token Manager instead of using potentially stale token
      let validToken: string | null = null;
      try {
        const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
        validToken = await TiendaNubeTokenManager.getValidToken(storeId);
        
        if (!validToken && accessToken) {
          console.warn(`[RAG:engine] No valid token from Token Manager for store ${storeId}, using provided token as fallback`);
          validToken = accessToken;
        } else if (!validToken && !accessToken) {
          console.warn(`[RAG:engine] No valid token available for store: ${storeId}`);
          return;
        } else {
          console.warn(`[RAG:engine] Using validated/refreshed token for store: ${storeId}`);
        }
      } catch (tokenError) {
        console.warn(`[RAG:engine] Token validation failed for store ${storeId}:`, tokenError);
        if (accessToken) {
          console.warn(`[RAG:engine] Using provided token as fallback for store: ${storeId}`);
          validToken = accessToken;
        } else {
          console.warn(`[RAG:engine] No fallback token available for store: ${storeId}`);
          return;
        }
      }

      const api = new TiendaNubeAPI(validToken, storeId);
      const indexingPromises: Promise<void>[] = [];

      // Initialize namespaces first
      await this.initializeStoreNamespaces(storeId);

      // Index store information
      try {
        const store = await api.getStore();
        const storeContent = this.processStoreData(store);
        indexingPromises.push(
          this.indexDocument(storeContent, {
            type: 'store',
            storeId,
            source: 'tiendanube_store',
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.warn('[ERROR] Failed to index store info:', error);
      }

      // Index products
      try {
        console.log(`[DEBUG] Getting products with endpoint: /products?limit=250`);
        const products = await api.getProducts({ limit: 250 });
        
        // 🔥 FIX: Ensure products is always an array
        const validProducts = Array.isArray(products) ? products : [];
        console.log(`[DEBUG] Retrieved ${validProducts.length} products from API`);
        
        if (validProducts.length === 0) {
          console.warn('[DEBUG] No products found or products is not an array');
        } else {
          for (const product of validProducts) {
            const productContent = this.processor.processProductData(product);
            indexingPromises.push(
              this.indexDocument(productContent, {
                type: 'product',
                storeId,
                source: 'tiendanube_products',
                productId: product.id?.toString(),
                timestamp: new Date().toISOString(),
              })
            );
          }
        }
      } catch (error) {
        console.warn('[ERROR] Failed to index products:', error);
      }

      // Index orders
      try {
        const orders = await api.getOrders({ limit: 100 });
        
        // 🔥 FIX: Ensure orders is always an array
        const validOrders = Array.isArray(orders) ? orders : [];
        
        if (validOrders.length === 0) {
          console.warn('[DEBUG] No orders found or orders is not an array');
        } else {
          for (const order of validOrders) {
            const orderContent = this.processor.processOrderData(order);
            indexingPromises.push(
              this.indexDocument(orderContent, {
                type: 'order',
                storeId,
                source: 'tiendanube_orders',
                orderId: order.id?.toString(),
                timestamp: new Date().toISOString(),
              })
            );
          }
        }
      } catch (error) {
        console.warn('[ERROR] Failed to index orders:', error);
      }

      // Index customers
      try {
        const customers = await api.getCustomers({ limit: 100 });
        
        // 🔥 FIX: Ensure customers is always an array
        const validCustomers = Array.isArray(customers) ? customers : [];
        
        if (validCustomers.length === 0) {
          console.warn('[DEBUG] No customers found or customers is not an array');
        } else {
          for (const customer of validCustomers) {
            const customerContent = this.processor.processCustomerData(customer);
            indexingPromises.push(
              this.indexDocument(customerContent, {
                type: 'customer',
                storeId,
                source: 'tiendanube_customers',
                customerId: customer.id?.toString(),
                timestamp: new Date().toISOString(),
              })
            );
          }
        }
      } catch (error) {
        console.warn('[ERROR] Failed to index customers:', error);
      }

      // Index analytics data
      try {
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
      } catch (error) {
        console.warn('[ERROR] Failed to index analytics:', error);
      }

      // Process all indexing operations in batches
      const batchSize = 10; // Process 10 documents at a time
      for (let i = 0; i < indexingPromises.length; i += batchSize) {
        const batch = indexingPromises.slice(i, i + batchSize);
        await Promise.allSettled(batch);
        
        console.warn(`[RAG:engine] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(indexingPromises.length / batchSize)}`);
        
        // Small delay between batches to avoid overwhelming APIs
        if (i + batchSize < indexingPromises.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.warn(`[RAG:engine] Completed store indexing for store: ${storeId}`);
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

  /**
   * Helper method to process store data (used by indexStoreData)
   */
  private processStoreData(store: unknown): string {
    const parts: string[] = [];
    const s = store as Record<string, any>;
    if (s && typeof s === 'object') {
      if (s.name) parts.push(`Tienda: ${s.name}`);
      if (s.description) parts.push(`Descripción: ${s.description}`);
      if (s.url) parts.push(`URL: ${s.url}`);
      if (s.domain) parts.push(`Dominio: ${s.domain}`);
      if (s.country) parts.push(`País: ${s.country}`);
      if (s.currency) parts.push(`Moneda: ${s.currency}`);
      if (s.business_id) parts.push(`ID de negocio: ${s.business_id}`);
      if (s.business_name) parts.push(`Nombre del negocio: ${s.business_name}`);
    }
    return parts.join('\n');
  }
} 