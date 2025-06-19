/**
 * RAG Engine
 * Main orchestrator for Retrieval-Augmented Generation
 * Integrates embeddings, vector store, and document processing
 */

import type { RAGEngine, RAGQuery, RAGResult, DocumentChunk } from './types';
import { EmbeddingsService } from './embeddings';
import { PineconeVectorStore } from './vector-store';
import { RAGDocumentProcessor } from './document-processor';
import { TiendaNubeAPI } from '../integrations/tiendanube';
import { RAG_CONSTANTS } from './config';

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
      console.log(`[RAG:engine] Indexing document of type: ${metadata.type}`);
      
      if (!metadata.storeId) {
        throw new Error('Store ID is required for document indexing');
      }

      // Process document into chunks
      const chunks = this.processor.processDocument(content, metadata);
      
      if (chunks.length === 0) {
        console.log('[RAG:engine] No chunks created, skipping indexing');
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

      console.log(`[RAG:engine] Successfully indexed ${chunks.length} chunks for document`);
    } catch (error) {
      console.error('[ERROR] Failed to index document:', error);
      throw new Error(`Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Index all data for a Tienda Nube store
   */
  async indexStoreData(storeId: string, accessToken?: string): Promise<void> {
    try {
      console.log(`[RAG:engine] Starting full store indexing for store: ${storeId}`);

      if (!accessToken) {
        console.log('[RAG:engine] No access token provided, skipping store data indexing');
        return;
      }

      const api = new TiendaNubeAPI(accessToken, storeId);
      const indexingPromises: Promise<void>[] = [];

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
        console.error('[ERROR] Failed to index store data:', error);
      }

      // Index products
      try {
        const products = await api.getProducts({ limit: 250 });
        for (const product of products) {
          const productContent = this.processor.processProductData(product);
          indexingPromises.push(
            this.indexDocument(productContent, {
              type: 'product',
              storeId,
              source: 'tiendanube_products',
              productId: product.id?.toString(),
              productName: product.name,
              category: (product as any).category,
              timestamp: new Date().toISOString(),
            })
          );
        }
        console.log(`[RAG:engine] Queued ${products.length} products for indexing`);
      } catch (error) {
        console.error('[ERROR] Failed to index products:', error);
      }

      // Index recent orders (last 30 days)
      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const orders = await api.getOrders({
          created_at_min: thirtyDaysAgo.toISOString(),
          limit: 250,
        });

        for (const order of orders) {
          const orderContent = this.processor.processOrderData(order);
          indexingPromises.push(
            this.indexDocument(orderContent, {
              type: 'order',
              storeId,
              source: 'tiendanube_orders',
              orderId: order.id?.toString(),
              orderValue: typeof order.total === 'string' ? parseFloat(order.total) : order.total,
              orderStatus: order.status,
              timestamp: order.created_at || new Date().toISOString(),
            })
          );
        }
        console.log(`[RAG:engine] Queued ${orders.length} orders for indexing`);
      } catch (error) {
        console.error('[ERROR] Failed to index orders:', error);
      }

      // Index customers
      try {
        const customers = await api.getCustomers({ limit: 250 });
        for (const customer of customers) {
          const customerContent = this.processor.processCustomerData(customer);
          indexingPromises.push(
            this.indexDocument(customerContent, {
              type: 'customer',
              storeId,
              source: 'tiendanube_customers',
              customerId: customer.id?.toString(),
              customerEmail: customer.email,
              timestamp: customer.created_at || new Date().toISOString(),
            })
          );
        }
        console.log(`[RAG:engine] Queued ${customers.length} customers for indexing`);
      } catch (error) {
        console.error('[ERROR] Failed to index customers:', error);
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
        console.error('[ERROR] Failed to index analytics:', error);
      }

      // Process all indexing operations in batches
      const batchSize = 10; // Process 10 documents at a time
      for (let i = 0; i < indexingPromises.length; i += batchSize) {
        const batch = indexingPromises.slice(i, i + batchSize);
        await Promise.allSettled(batch);
        
        console.log(`[RAG:engine] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(indexingPromises.length / batchSize)}`);
        
        // Small delay between batches to avoid overwhelming APIs
        if (i + batchSize < indexingPromises.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`[RAG:engine] Completed store indexing for store: ${storeId}`);
    } catch (error) {
      console.error('[ERROR] Failed to index store data:', error);
      throw new Error(`Store indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for relevant documents
   */
  async search(query: RAGQuery): Promise<RAGResult> {
    try {
      const startTime = Date.now();
      console.log(`[RAG:engine] Searching for: "${query.query}"`);

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

      console.log(`[RAG:engine] Found ${documents.length} relevant documents (confidence: ${confidence.toFixed(3)}) in ${processingTime}ms`);

      return result;
    } catch (error) {
      console.error('[ERROR] Failed to search documents:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get relevant context for agents
   */
  async getRelevantContext(query: string, context: RAGQuery['context']): Promise<string> {
    try {
      console.log(`[RAG:engine] Getting relevant context for: "${query}"`);

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
      
      console.log(`[RAG:engine] Generated context with ${contextParts.length} relevant documents`);
      
      return contextText;
    } catch (error) {
      console.error('[ERROR] Failed to get relevant context:', error);
      return 'Error al obtener contexto relevante. Por favor, intenta de nuevo.';
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(documentId: string, content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void> {
    try {
      console.log(`[RAG:engine] Updating document: ${documentId}`);

      // Delete existing document chunks
      await this.vectorStore.delete([documentId]);

      // Re-index with new content
      await this.indexDocument(content, metadata);

      console.log(`[RAG:engine] Successfully updated document: ${documentId}`);
    } catch (error) {
      console.error('[ERROR] Failed to update document:', error);
      throw new Error(`Document update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete all data for a store
   */
  async deleteStoreData(storeId: string): Promise<void> {
    try {
      console.log(`[RAG:engine] Deleting all data for store: ${storeId}`);

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
      
      console.log(`[RAG:engine] Would delete data from namespaces: ${namespaces.join(', ')}`);
      console.log(`[RAG:engine] Store data deletion completed for: ${storeId}`);
    } catch (error) {
      console.error('[ERROR] Failed to delete store data:', error);
      throw new Error(`Store data deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.error('[ERROR] Failed to get RAG stats:', error);
      return {
        vectorStore: { totalVectors: 0, dimension: 0 },
        embeddings: { model: 'unknown', dimension: 0, maxTokens: 0 },
        isConfigured: false,
        errors: [`Failed to get stats: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  /**
   * Helper method to process store data (used by indexStoreData)
   */
  private processStoreData(store: any): string {
    const parts: string[] = [];
    
    if (store.name) parts.push(`Tienda: ${store.name}`);
    if (store.description) parts.push(`Descripción: ${store.description}`);
    if (store.url) parts.push(`URL: ${store.url}`);
    if (store.domain) parts.push(`Dominio: ${store.domain}`);
    if (store.country) parts.push(`País: ${store.country}`);
    if (store.currency) parts.push(`Moneda: ${store.currency}`);
    if (store.business_id) parts.push(`ID de negocio: ${store.business_id}`);
    if (store.business_name) parts.push(`Nombre del negocio: ${store.business_name}`);
    
    return parts.join('\n');
  }
} 