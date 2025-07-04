/**
 * LangChain RAG Engine
 * Main orchestrator for the enhanced RAG system using LangChain
 * Integrates vector store, document processing, retrieval QA, and streaming
 */

import { Document } from '@langchain/core/documents';
import { TiendaNubeAPI } from '../integrations/tiendanube';

import { LANGCHAIN_CONFIG, validateLangChainConfig } from './langchain-config';
import { FiniPineconeVectorStore, VectorStoreFactory } from './langchain-vectorstore';
import { LangChainDocumentProcessor, type TiendaNubeDocumentMetadata } from './langchain-document-processor';
import { FiniRetrievalQA, RetrievalQAFactory, type RAGContext } from './retrieval-qa';

/**
 * Enhanced RAG query interface
 */
export interface LangChainRAGQuery {
  query: string;
  context: RAGContext;
  options?: {
    topK?: number;
    scoreThreshold?: number;
    searchType?: 'similarity' | 'mmr';
    includeStreaming?: boolean;
    includeSources?: boolean;
  };
  filters?: {
    dataTypes?: Array<keyof typeof LANGCHAIN_CONFIG.namespaces>;
    dateRange?: {
      start: string;
      end: string;
    };
    productIds?: string[];
    orderIds?: string[];
  };
}

/**
 * Enhanced RAG result interface
 */
export interface LangChainRAGResult {
  answer: string;
  sources: Document[];
  confidence: number;
  processingTime: number;
  metadata: {
    queryType: string;
    agentType: string;
    documentsFound: number;
    namespacesSearched: string[];
    langchainUsed: true;
  };
}

/**
 * Main LangChain RAG Engine
 */
export class LangChainRAGEngine {
  private documentProcessor: LangChainDocumentProcessor;
  private qaSystemCache: Map<string, FiniRetrievalQA> = new Map();
  private isInitialized = false;

  constructor() {
    this.documentProcessor = new LangChainDocumentProcessor();
  }

  /**
   * Initialize the RAG engine
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const config = validateLangChainConfig();
    if (!config.isValid) {
      throw new Error(`LangChain RAG Engine configuration error: ${config.missing.join(', ')}`);
    }

    console.log('[LANGCHAIN-RAG] Initializing enhanced RAG engine...');

    if (config.warnings.length > 0) {
      console.warn('[LANGCHAIN-RAG] Configuration warnings:', config.warnings);
    }

    this.isInitialized = true;
    console.log('[LANGCHAIN-RAG] Enhanced RAG engine initialized successfully');
  }

  /**
   * Enhanced store data indexing with LangChain
   */
  async indexStoreData(storeId: string, accessToken?: string): Promise<{
    success: boolean;
    documentsIndexed: number;
    error?: string;
  }> {
    try {
      await this.initialize();
      
      console.log(`[LANGCHAIN-RAG] Starting enhanced indexing for store: ${storeId}`);
      const startTime = Date.now();

      if (!accessToken) {
        // Try to get access token from database
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        
        const { data: store } = await supabase
          .from('stores')
          .select('access_token')
          .eq('id', storeId)
          .single();

        if (!store?.access_token) {
          throw new Error('No access token available for store');
        }
        
        accessToken = store.access_token;
      }

      // Initialize TiendaNube API
      const api = new TiendaNubeAPI(accessToken, storeId);
      const indexingResults: Document[][] = [];

      // Index store information
      try {
        const store = await api.getStore();
        const storeDocuments = await this.documentProcessor.processStoreData(store, storeId);
        
        if (storeDocuments.length > 0) {
          const vectorStore = await VectorStoreFactory.createForStore(storeId, 'store');
          await vectorStore.addDocuments(storeDocuments);
          indexingResults.push(storeDocuments);
          console.log(`[LANGCHAIN-RAG] ✅ Indexed ${storeDocuments.length} store documents`);
        }
      } catch (error) {
        console.warn('[LANGCHAIN-RAG] ⚠️ Failed to index store data:', error);
      }

      // Index products (most important for agents)
      try {
        console.log(`[LANGCHAIN-RAG] 📦 Fetching products for store: ${storeId}`);
        const products = await api.getProducts({ limit: 200 });
        
        if (products && products.length > 0) {
          const productDocuments = await this.documentProcessor.processProductData(products, storeId);
          
          if (productDocuments.length > 0) {
            const vectorStore = await VectorStoreFactory.createForStore(storeId, 'products');
            await vectorStore.addDocuments(productDocuments);
            indexingResults.push(productDocuments);
            console.log(`[LANGCHAIN-RAG] ✅ Indexed ${productDocuments.length} product documents from ${products.length} products`);
          }
        } else {
          console.log(`[LANGCHAIN-RAG] ℹ️ No products found for store: ${storeId}`);
        }
      } catch (error) {
        console.warn('[LANGCHAIN-RAG] ⚠️ Failed to index products:', error);
      }

      // Index orders (for analytics)
      try {
        console.log(`[LANGCHAIN-RAG] 📊 Fetching orders for store: ${storeId}`);
        const orders = await api.getOrders({ limit: 100 });
        
        if (orders && orders.length > 0) {
          const orderDocuments = await this.documentProcessor.processOrderData(orders, storeId);
          
          if (orderDocuments.length > 0) {
            const vectorStore = await VectorStoreFactory.createForStore(storeId, 'orders');
            await vectorStore.addDocuments(orderDocuments);
            indexingResults.push(orderDocuments);
            console.log(`[LANGCHAIN-RAG] ✅ Indexed ${orderDocuments.length} order documents from ${orders.length} orders`);
          }
        } else {
          console.log(`[LANGCHAIN-RAG] ℹ️ No orders found for store: ${storeId}`);
        }
      } catch (error: any) {
        if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
          console.log(`[LANGCHAIN-RAG] ℹ️ Orders endpoint not available for store ${storeId}`);
        } else {
          console.warn(`[LANGCHAIN-RAG] ⚠️ Failed to fetch orders:`, error);
        }
      }

      // Index analytics data
      try {
        console.log(`[LANGCHAIN-RAG] 📈 Fetching analytics for store: ${storeId}`);
        const analytics = await api.getStoreAnalytics();
        const analyticsDocuments = await this.documentProcessor.processAnalyticsData(analytics, storeId);
        
        if (analyticsDocuments.length > 0) {
          const vectorStore = await VectorStoreFactory.createForStore(storeId, 'analytics');
          await vectorStore.addDocuments(analyticsDocuments);
          indexingResults.push(analyticsDocuments);
          console.log(`[LANGCHAIN-RAG] ✅ Indexed ${analyticsDocuments.length} analytics documents`);
        }
      } catch (error: any) {
        if (error.message?.includes('Resource not found') || error.message?.includes('404')) {
          console.log(`[LANGCHAIN-RAG] ℹ️ Analytics endpoint not available for store ${storeId}`);
        } else {
          console.warn(`[LANGCHAIN-RAG] ⚠️ Failed to fetch analytics:`, error);
        }
      }

      // Calculate total documents indexed
      const totalDocuments = indexingResults.reduce((sum, docs) => sum + docs.length, 0);
      const processingTime = Date.now() - startTime;

      // Update last sync timestamp
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
      } catch (error) {
        console.warn(`[LANGCHAIN-RAG] ⚠️ Failed to update last_sync_at:`, error);
      }

      console.log(`[LANGCHAIN-RAG] ✅ Enhanced indexing completed for store ${storeId}: ${totalDocuments} documents in ${processingTime}ms`);

      return {
        success: true,
        documentsIndexed: totalDocuments,
      };
    } catch (error) {
      console.error('[LANGCHAIN-RAG] Enhanced indexing failed:', error);
      return {
        success: false,
        documentsIndexed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Enhanced search with LangChain retrieval QA
   */
  async search(query: LangChainRAGQuery): Promise<LangChainRAGResult> {
    try {
      await this.initialize();
      
      const startTime = Date.now();
      console.log(`[LANGCHAIN-RAG] Processing enhanced query: "${query.query}" for agent: ${query.context.agentType}`);

      // Get or create QA system for this context
      const qaSystem = await this.getQASystem(query.context);

      // Execute query
      const result = await qaSystem.ask(query.query);

      const processingTime = Date.now() - startTime;

      const ragResult: LangChainRAGResult = {
        answer: result.answer,
        sources: result.sources,
        confidence: result.confidence,
        processingTime,
        metadata: {
          queryType: this.classifyQuery(query.query),
          agentType: query.context.agentType,
          documentsFound: result.sources.length,
          namespacesSearched: this.getNamespacesSearched(result.sources),
          langchainUsed: true,
        },
      };

      console.log(`[LANGCHAIN-RAG] Enhanced query completed in ${processingTime}ms with confidence: ${result.confidence.toFixed(3)}`);

      return ragResult;
    } catch (error) {
      console.error('[LANGCHAIN-RAG] Enhanced search failed:', error);
      
      return {
        answer: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente.',
        sources: [],
        confidence: 0,
        processingTime: 0,
        metadata: {
          queryType: 'error',
          agentType: query.context.agentType,
          documentsFound: 0,
          namespacesSearched: [],
          langchainUsed: true,
        },
      };
    }
  }

  /**
   * Enhanced streaming search
   */
  async *searchStreaming(query: LangChainRAGQuery): AsyncGenerator<string, LangChainRAGResult, unknown> {
    try {
      await this.initialize();
      
      const startTime = Date.now();
      console.log(`[LANGCHAIN-RAG] Starting enhanced streaming for: "${query.query}"`);

      const qaSystem = await this.getQASystem(query.context);

      let fullAnswer = '';
      let sources: Document[] = [];

      // Get sources first for metadata
      try {
        const staticResult = await qaSystem.ask(query.query);
        sources = staticResult.sources;
      } catch (error) {
        console.warn('[LANGCHAIN-RAG] Failed to get sources for streaming:', error);
      }

      // Stream the response
      for await (const chunk of qaSystem.askStreaming(query.query)) {
        fullAnswer += chunk;
        yield chunk;
      }

      const processingTime = Date.now() - startTime;

      const finalResult: LangChainRAGResult = {
        answer: fullAnswer,
        sources,
        confidence: this.calculateStreamingConfidence(sources),
        processingTime,
        metadata: {
          queryType: this.classifyQuery(query.query),
          agentType: query.context.agentType,
          documentsFound: sources.length,
          namespacesSearched: this.getNamespacesSearched(sources),
          langchainUsed: true,
        },
      };

      console.log(`[LANGCHAIN-RAG] Enhanced streaming completed in ${processingTime}ms`);
      return finalResult;
    } catch (error) {
      console.error('[LANGCHAIN-RAG] Enhanced streaming failed:', error);
      
      const errorMsg = 'Lo siento, hubo un error al procesar tu consulta.';
      yield errorMsg;
      
      return {
        answer: errorMsg,
        sources: [],
        confidence: 0,
        processingTime: 0,
        metadata: {
          queryType: 'error',
          agentType: query.context.agentType,
          documentsFound: 0,
          namespacesSearched: [],
          langchainUsed: true,
        },
      };
    }
  }

  /**
   * Get or create QA system for context
   */
  private async getQASystem(context: RAGContext): Promise<FiniRetrievalQA> {
    const cacheKey = `${context.storeId}-${context.agentType}`;
    
    if (this.qaSystemCache.has(cacheKey)) {
      return this.qaSystemCache.get(cacheKey)!;
    }

    const qaSystem = await RetrievalQAFactory.create(context);
    this.qaSystemCache.set(cacheKey, qaSystem);
    
    // Clear cache after 30 minutes to prevent memory leaks
    setTimeout(() => {
      this.qaSystemCache.delete(cacheKey);
    }, 30 * 60 * 1000);

    return qaSystem;
  }

  /**
   * Classify query type for metadata
   */
  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('producto') || lowerQuery.includes('catálogo')) return 'product_query';
    if (lowerQuery.includes('venta') || lowerQuery.includes('analytics')) return 'analytics_query';
    if (lowerQuery.includes('pedido') || lowerQuery.includes('orden')) return 'order_query';
    if (lowerQuery.includes('cliente') || lowerQuery.includes('customer')) return 'customer_query';
    if (lowerQuery.includes('tienda') || lowerQuery.includes('store')) return 'store_query';
    
    return 'general_query';
  }

  /**
   * Get namespaces searched from sources
   */
  private getNamespacesSearched(sources: Document[]): string[] {
    const namespaces = new Set<string>();
    
    for (const source of sources) {
      if (source.metadata.namespace) {
        namespaces.add(source.metadata.namespace);
      }
    }
    
    return Array.from(namespaces);
  }

  /**
   * Calculate confidence for streaming responses
   */
  private calculateStreamingConfidence(sources: Document[]): number {
    if (sources.length === 0) return 0.3; // Base confidence for streaming
    
    const avgScore = sources.reduce((sum, doc) => {
      const score = doc.metadata.score || 0.5;
      return sum + score;
    }, 0) / sources.length;
    
    return Math.min(avgScore + 0.1, 1); // Slight boost for having sources
  }

  /**
   * Delete store data from all namespaces
   */
  async deleteStoreData(storeId: string): Promise<void> {
    try {
      console.log(`[LANGCHAIN-RAG] Deleting all data for store: ${storeId}`);

      const dataTypes = ['store', 'products', 'orders', 'customers', 'analytics'] as const;
      
      for (const dataType of dataTypes) {
        try {
          const vectorStore = await VectorStoreFactory.createForStore(storeId, dataType);
          await vectorStore.delete({ ids: [], deleteAll: true });
          console.log(`[LANGCHAIN-RAG] ✅ Deleted ${dataType} data for store: ${storeId}`);
        } catch (error) {
          console.warn(`[LANGCHAIN-RAG] ⚠️ Failed to delete ${dataType} data:`, error);
        }
      }

      // Clear QA system cache for this store
      for (const [key, _] of this.qaSystemCache) {
        if (key.startsWith(storeId)) {
          this.qaSystemCache.delete(key);
        }
      }

      console.log(`[LANGCHAIN-RAG] ✅ Store data deletion completed for: ${storeId}`);
    } catch (error) {
      console.error('[LANGCHAIN-RAG] Store data deletion failed:', error);
      throw error;
    }
  }

  /**
   * Get engine statistics
   */
  async getStats(): Promise<{
    isConfigured: boolean;
    totalStores: number;
    cacheSize: number;
    errors: string[];
  }> {
    try {
      const config = validateLangChainConfig();
      
      return {
        isConfigured: config.isValid,
        totalStores: this.qaSystemCache.size,
        cacheSize: this.qaSystemCache.size,
        errors: config.missing,
      };
    } catch (error) {
      return {
        isConfigured: false,
        totalStores: 0,
        cacheSize: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

// Export singleton instance
export const langchainRAGEngine = new LangChainRAGEngine();

console.log('[LANGCHAIN-RAG] Enhanced RAG engine module loaded'); 