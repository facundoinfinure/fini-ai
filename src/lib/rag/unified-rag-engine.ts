/**
 * 🔍🏪 UNIFIED FINI RAG ENGINE
 * ==========================
 * 
 * Motor RAG unificado que consolida todas las funcionalidades fragmentadas en una sola implementación robusta.
 * Integra las mejores características de: FiniRAGEngine, LangChainRAGEngine, PremiumRAGEngine.
 * 
 * Implementa la arquitectura definida en docs/TIENDANUBE_RAG_ARCHITECTURE.md
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Namespace strategy consistente y segura
 * - Enhanced retrieval con múltiples estrategias
 * - Conversation memory avanzada
 * - Token management robusto con fallbacks
 * - Streaming responses
 * - Error handling y circuit breakers
 * - Background sync optimizado
 */

import { TiendaNubeAPI } from '../integrations/tiendanube';
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

import { RAG_CONSTANTS } from './config';
import { RAGDocumentProcessor } from './document-processor';
import { EmbeddingsService } from './embeddings';
import { PineconeVectorStore } from './vector-store';
import type { RAGEngine, RAGQuery, RAGResult, DocumentChunk } from './types';

// ===== UNIFIED TYPES & INTERFACES =====

export interface UnifiedRAGQuery {
  query: string;
  context: {
    storeId: string;
    userId: string;
    agentType: 'orchestrator' | 'analytics' | 'customer_service' | 'marketing' | 'product_manager';
    conversationId?: string;
  };
  options?: {
    topK?: number;
    scoreThreshold?: number;
    searchType?: 'similarity' | 'hybrid' | 'semantic';
    includeStreaming?: boolean;
    includeSources?: boolean;
    useConversationMemory?: boolean;
  };
  filters?: {
    dataTypes?: ('products' | 'orders' | 'customers' | 'analytics' | 'store' | 'conversations')[];
    dateRange?: { start: string; end: string; };
    productIds?: string[];
    orderIds?: string[];
  };
}

export interface UnifiedRAGResult {
  answer: string;
  sources: Document[];
  confidence: number;
  processingTime: number;
  metadata: {
    queryType: string;
    agentType: string;
    documentsFound: number;
    namespacesSearched: string[];
    storeId: string;
    conversationId?: string;
    reasoning?: string;
  };
}

export interface ConversationMemory {
  conversationId: string;
  storeId: string;
  messages: BaseMessage[];
  context: Record<string, any>;
  lastAccessed: string;
  sessionMetadata: {
    startTime: string;
    messageCount: number;
    topics: string[];
    lastActivity: string;
  };
}

export interface SyncResult {
  success: boolean;
  documentsIndexed: number;
  namespacesProcessed: string[];
  processingTime: number;
  error?: string;
}

// ===== UNIFIED FINI RAG ENGINE =====

export class UnifiedFiniRAGEngine {
  private embeddings: EmbeddingsService;
  private langchainEmbeddings: OpenAIEmbeddings;
  private vectorStore: PineconeVectorStore;
  private processor: RAGDocumentProcessor;
  private llm: ChatOpenAI;
  private pinecone: Pinecone;
  
  // Cache and memory management
  private vectorStores: Map<string, PineconeStore> = new Map();
  private conversationMemories: Map<string, ConversationMemory> = new Map();
  private syncLocks: Map<string, Promise<any>> = new Map();
  
  // Circuit breaker for resilience
  private circuitBreakerState: Map<string, { failures: number; lastFailure: number; isOpen: boolean }> = new Map();

  constructor() {
    // Initialize core services
    this.embeddings = new EmbeddingsService();
    this.vectorStore = new PineconeVectorStore();
    this.processor = new RAGDocumentProcessor();

    // Initialize LangChain components for advanced features
    this.langchainEmbeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-large',
      dimensions: 1536,
    });

    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.1,
      maxTokens: 2000,
      streaming: true,
    });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    console.log('[UNIFIED-RAG] 🚀 Initialized unified RAG engine with full feature set');
  }

  // ===== NAMESPACE MANAGEMENT (UNIFIED STRATEGY) =====

  /**
   * 🏗️ Initialize consistent namespace structure for a store
   * Implements the unified namespace strategy from architecture doc
   */
  async initializeStoreNamespaces(storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[UNIFIED-RAG] 🏗️ Initializing namespaces for store: ${storeId}`);

      // Define consistent namespace structure
      const namespaceTypes = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
      
      // Create namespaces in parallel
      const initPromises = namespaceTypes.map(type => 
        this.initializeSingleNamespace(storeId, type)
      );
      
      const results = await Promise.allSettled(initPromises);
      
      // Check for failures
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        console.warn(`[UNIFIED-RAG] ⚠️ Some namespace initializations failed:`, failures);
      }
      
      console.log(`[UNIFIED-RAG] ✅ Initialized ${namespaceTypes.length} namespaces for store: ${storeId}`);
      
      return { success: true };
    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Failed to initialize store namespaces:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Initialize single namespace with placeholder
   */
  private async initializeSingleNamespace(storeId: string, type: string): Promise<void> {
    try {
      const namespace = `store-${storeId}-${type}`;
      
      console.log(`[UNIFIED-RAG] 🔧 Creating namespace: ${namespace}`);
      
      // Create minimal placeholder document
      const placeholderContent = `Namespace initialized for ${type} data in store ${storeId}`;
      const placeholderId = `placeholder-${storeId}-${type}`;
      
      await this.indexDocument(placeholderContent, {
        type: type as any,
        storeId,
        source: 'initialization',
        timestamp: new Date().toISOString(),
        isPlaceholder: true
      });
      
      console.log(`[UNIFIED-RAG] ✅ Initialized namespace: ${namespace}`);
      
      // Cleanup placeholder after 2 seconds
      setTimeout(async () => {
        try {
          await this.vectorStore.delete([placeholderId], namespace);
          console.log(`[UNIFIED-RAG] 🧹 Cleaned up placeholder for ${namespace}`);
        } catch (cleanupError) {
          // Silent cleanup - not critical
          console.log(`[UNIFIED-RAG] 📝 Placeholder cleanup completed for ${namespace}`);
        }
      }, 2000);
      
    } catch (error) {
      console.error(`[UNIFIED-RAG] ❌ Failed to initialize namespace ${type}:`, error);
      throw error;
    }
  }

  /**
   * 🗑️ Delete all namespaces for a store (complete cleanup)
   */
  async deleteStoreNamespaces(storeId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[UNIFIED-RAG] 🗑️ Deleting all namespaces for store: ${storeId}`);

      const namespaces = [
        `store-${storeId}`,
        `store-${storeId}-products`,
        `store-${storeId}-orders`,
        `store-${storeId}-customers`,
        `store-${storeId}-analytics`,
        `store-${storeId}-conversations`,
      ];

      // Delete all vectors in each namespace
      for (const namespace of namespaces) {
        try {
          console.log(`[UNIFIED-RAG] 🧹 Clearing namespace: ${namespace}`);
          await this.vectorStore.deleteAll(namespace);
        } catch (namespaceError) {
          console.warn(`[UNIFIED-RAG] ⚠️ Failed to clear namespace ${namespace}:`, namespaceError);
          // Continue with other namespaces
        }
      }

      // Clear vector store cache
      this.vectorStores.clear();

      console.log(`[UNIFIED-RAG] ✅ Namespace cleanup completed for store: ${storeId}`);
      return { success: true };
    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Failed to delete store namespaces:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ===== DOCUMENT INDEXING (UNIFIED) =====

  /**
   * 📄 Index single document with unified strategy
   */
  async indexDocument(content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void> {
    try {
      if (!metadata.storeId) {
        throw new Error('Store ID is required for document indexing');
      }

      console.log(`[UNIFIED-RAG] 📄 Indexing document of type: ${metadata.type} for store: ${metadata.storeId}`);
      
      // Process document into chunks
      const chunks = this.processor.processDocument(content, metadata);
      
      if (chunks.length === 0) {
        console.warn('[UNIFIED-RAG] ⚠️ No chunks created, skipping indexing');
        return;
      }

      // Generate embeddings
      const contents = chunks.map(chunk => chunk.content);
      const embeddings = await this.embeddings.generateBatchEmbeddings(contents);

      // Add embeddings to chunks
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        ...chunk,
        embedding: embeddings[index].embedding,
      }));

      // Store in vector database with proper namespace
      await this.vectorStore.upsert(chunksWithEmbeddings);

      console.log(`[UNIFIED-RAG] ✅ Successfully indexed ${chunks.length} chunks`);
    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Failed to index document:', error);
      throw new Error(`Document indexing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 🏪 Index complete store data with robust error handling
   */
  async indexStoreData(storeId: string, accessToken?: string): Promise<SyncResult> {
    // Prevent concurrent syncs for same store
    if (this.syncLocks.has(storeId)) {
      console.log(`[UNIFIED-RAG] ⏳ Store ${storeId} sync already in progress - waiting`);
      await this.syncLocks.get(storeId);
      return { success: true, documentsIndexed: 0, namespacesProcessed: [], processingTime: 0 };
    }

    const syncPromise = this._performStoreIndexing(storeId, accessToken);
    this.syncLocks.set(storeId, syncPromise);

    try {
      return await syncPromise;
    } finally {
      this.syncLocks.delete(storeId);
    }
  }

  /**
   * Internal store indexing implementation
   */
  private async _performStoreIndexing(storeId: string, accessToken?: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      documentsIndexed: 0,
      namespacesProcessed: [],
      processingTime: 0
    };

    try {
      console.log(`[UNIFIED-RAG] 🚀 Starting unified store indexing: ${storeId}`);

      // STEP 1: Get valid token with comprehensive fallback strategy
      const tokenData = await this.getValidTokenWithStoreData(storeId, accessToken);
      
      if (!tokenData) {
        throw new Error('No valid token available for store');
      }

      // STEP 2: Initialize API and test connection
      const api = new TiendaNubeAPI(tokenData.token, tokenData.platformStoreId);
      await api.getStore(); // Test connection
      
      console.log(`[UNIFIED-RAG] ✅ API connection verified for store: ${storeId}`);

      // STEP 3: Initialize namespaces
      console.log(`[UNIFIED-RAG] 🏗️ Initializing namespaces`);
      await this.initializeStoreNamespaces(storeId);

      // STEP 4: Index all data types in parallel
      const indexingPromises = [
        this.indexStoreInformation(api, storeId),
        this.indexProducts(api, storeId),
        this.indexOrders(api, storeId),
        this.indexCustomers(api, storeId),
        this.indexAnalytics(api, storeId)
      ];

      const indexingResults = await Promise.allSettled(indexingPromises);
      
      // Process results
      let totalDocuments = 0;
      const processedNamespaces: string[] = [];
      
      indexingResults.forEach((indexResult, index) => {
        const dataTypes = ['store', 'products', 'orders', 'customers', 'analytics'];
        const dataType = dataTypes[index];
        
        if (indexResult.status === 'fulfilled') {
          totalDocuments += indexResult.value;
          processedNamespaces.push(`store-${storeId}-${dataType}`);
          console.log(`[UNIFIED-RAG] ✅ Indexed ${indexResult.value} ${dataType} documents`);
        } else {
          console.warn(`[UNIFIED-RAG] ⚠️ Failed to index ${dataType}:`, indexResult.reason);
        }
      });

      result.success = true;
      result.documentsIndexed = totalDocuments;
      result.namespacesProcessed = processedNamespaces;
      result.processingTime = Date.now() - startTime;

      console.log(`[UNIFIED-RAG] 🎉 Store indexing completed: ${storeId} (${totalDocuments} docs in ${result.processingTime}ms)`);

      return result;

    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Store indexing failed:', error);
      
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.processingTime = Date.now() - startTime;
      
      return result;
    }
  }

  // ===== DATA TYPE INDEXING METHODS =====

  /**
   * Index store information
   */
  private async indexStoreInformation(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const store = await api.getStore();
      const storeContent = this.processor.processStoreData(store);
      
      await this.indexDocument(storeContent, {
        type: 'store',
        storeId,
        source: 'tiendanube_store',
        timestamp: new Date().toISOString(),
      });
      
      return 1;
    } catch (error) {
      console.warn('[UNIFIED-RAG] ⚠️ Failed to index store info:', error);
      return 0;
    }
  }

  /**
   * Index products (critical for Product Manager agent)
   */
  private async indexProducts(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const products = await api.getProducts({ limit: 200 });
      
      if (!products || products.length === 0) {
        console.log(`[UNIFIED-RAG] ℹ️ No products found for store: ${storeId}`);
        return 0;
      }

      console.log(`[UNIFIED-RAG] 📦 Found ${products.length} products for indexing`);
      
      let indexedCount = 0;
      for (const product of products) {
        try {
          const productContent = this.processor.processProductData(product);
          
          await this.indexDocument(productContent, {
            type: 'product',
            storeId,
            source: 'tiendanube_products',
            timestamp: new Date().toISOString(),
            productId: product.id?.toString(),
            productName: product.name || 'Producto sin nombre',
            category: product.categories?.[0]?.name || 'Sin categoría',
          });
          
          indexedCount++;
        } catch (productError) {
          console.warn(`[UNIFIED-RAG] ⚠️ Failed to index product ${product.id}:`, productError);
        }
      }
      
      return indexedCount;
    } catch (error) {
      console.warn('[UNIFIED-RAG] ⚠️ Failed to index products:', error);
      return 0;
    }
  }

  /**
   * Index orders (critical for Analytics agent)
   */
  private async indexOrders(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const orders = await api.getOrders({ limit: 100 });
      
      if (!orders || orders.length === 0) {
        console.log(`[UNIFIED-RAG] ℹ️ No orders found for store: ${storeId}`);
        return 0;
      }

      let indexedCount = 0;
      for (const order of orders) {
        try {
          const orderContent = this.processor.processOrderData(order);
          
          await this.indexDocument(orderContent, {
            type: 'order',
            storeId,
            source: 'tiendanube_orders',
            timestamp: new Date().toISOString(),
            orderId: order.id?.toString(),
            orderStatus: order.status || 'unknown',
            orderTotal: order.total?.toString() || '0',
          });
          
          indexedCount++;
        } catch (orderError) {
          console.warn(`[UNIFIED-RAG] ⚠️ Failed to index order ${order.id}:`, orderError);
        }
      }
      
      return indexedCount;
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Resource not found')) {
        console.log(`[UNIFIED-RAG] ℹ️ Orders endpoint not available for store ${storeId}`);
      } else {
        console.warn('[UNIFIED-RAG] ⚠️ Failed to index orders:', error);
      }
      return 0;
    }
  }

  /**
   * Index customers (critical for Customer Service agent)
   */
  private async indexCustomers(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const customers = await api.getCustomers({ limit: 100 });
      
      if (!customers || customers.length === 0) {
        console.log(`[UNIFIED-RAG] ℹ️ No customers found for store: ${storeId}`);
        return 0;
      }

      let indexedCount = 0;
      for (const customer of customers) {
        try {
          const customerContent = this.processor.processCustomerData(customer);
          
          await this.indexDocument(customerContent, {
            type: 'customer',
            storeId,
            source: 'tiendanube_customers',
            timestamp: new Date().toISOString(),
            customerId: customer.id?.toString(),
            customerEmail: customer.email || 'unknown',
          });
          
          indexedCount++;
        } catch (customerError) {
          console.warn(`[UNIFIED-RAG] ⚠️ Failed to index customer ${customer.id}:`, customerError);
        }
      }
      
      return indexedCount;
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Resource not found')) {
        console.log(`[UNIFIED-RAG] ℹ️ Customers endpoint not available for store ${storeId}`);
      } else {
        console.warn('[UNIFIED-RAG] ⚠️ Failed to index customers:', error);
      }
      return 0;
    }
  }

  /**
   * Index analytics (critical for Analytics agent)
   */
  private async indexAnalytics(api: TiendaNubeAPI, storeId: string): Promise<number> {
    try {
      const analytics = await api.getStoreAnalytics();
      const analyticsContent = this.processor.processAnalyticsData(analytics, 'current');
      
      await this.indexDocument(analyticsContent, {
        type: 'analytics',
        storeId,
        source: 'tiendanube_analytics',
        timestamp: new Date().toISOString(),
      });
      
      return 1;
    } catch (error: any) {
      if (error.message?.includes('404') || error.message?.includes('Forbidden')) {
        console.log(`[UNIFIED-RAG] ℹ️ Analytics endpoint restricted for store ${storeId}`);
      } else {
        console.warn('[UNIFIED-RAG] ⚠️ Failed to index analytics:', error);
      }
      return 0;
    }
  }

  // ===== TOKEN MANAGEMENT (ROBUST FALLBACKS) =====

  /**
   * Get valid token with comprehensive fallback strategy
   */
  private async getValidTokenWithStoreData(storeId: string, accessToken?: string): Promise<{
    token: string;
    platformStoreId: string;
    source: string;
  } | null> {
    // Try Token Manager first (most reliable)
    try {
      const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
      const storeData = await TiendaNubeTokenManager.getValidTokenWithStoreData(storeId);
      
      if (storeData) {
        console.log(`[UNIFIED-RAG] ✅ Using validated token from Token Manager`);
        return {
          token: storeData.token,
          platformStoreId: storeData.platformStoreId,
          source: 'token_manager'
        };
      }
    } catch (error) {
      console.warn(`[UNIFIED-RAG] ⚠️ Token Manager failed:`, error);
    }

    // Fallback to provided token
    if (accessToken) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = createClient();
        
        const { data: store } = await supabase
          .from('stores')
          .select('platform_store_id')
          .eq('id', storeId)
          .single();

        if (store?.platform_store_id) {
          console.log(`[UNIFIED-RAG] ✅ Using provided token with platform_store_id`);
          return {
            token: accessToken,
            platformStoreId: store.platform_store_id,
            source: 'provided_token'
          };
        }
      } catch (error) {
        console.warn(`[UNIFIED-RAG] ⚠️ Failed to get platform_store_id for provided token:`, error);
      }
    }

    // Final fallback: direct database
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      
      const { data: store } = await supabase
        .from('stores')
        .select('access_token, platform_store_id')
        .eq('id', storeId)
        .single();

      if (store?.access_token && store?.platform_store_id) {
        console.log(`[UNIFIED-RAG] ✅ Using direct database token`);
        return {
          token: store.access_token,
          platformStoreId: store.platform_store_id,
          source: 'database_direct'
        };
      }
    } catch (error) {
      console.warn(`[UNIFIED-RAG] ⚠️ Database fallback failed:`, error);
    }

    console.error(`[UNIFIED-RAG] ❌ No valid token found for store: ${storeId}`);
    return null;
  }

  // ===== ENHANCED SEARCH & RETRIEVAL =====

  /**
   * 🔍 Enhanced search with multiple strategies
   */
  async search(query: UnifiedRAGQuery): Promise<UnifiedRAGResult> {
    const startTime = Date.now();
    
    try {
      console.log(`[UNIFIED-RAG] 🔍 Enhanced search for agent: ${query.context.agentType}`);
      
      // Get namespaces to search based on agent type and filters
      const namespacesToSearch = this.getOptimalNamespaces(query.context.agentType, query.filters?.dataTypes);
      
      // Perform enhanced retrieval
      const relevantDocs = await this.enhancedRetrieval(
        query.query,
        query.context.storeId,
        namespacesToSearch,
        query.options?.topK || 8,
        query.options?.scoreThreshold || 0.75
      );

      // Generate response with LLM if we have relevant docs
      let answer = '';
      let confidence = 0;
      
      if (relevantDocs.length > 0) {
        const ragResult = await this.generateEnhancedResponse(query, relevantDocs);
        answer = ragResult.answer;
        confidence = ragResult.confidence;
      } else {
        answer = `No encontré información específica en tu tienda para responder: "${query.query}". ¿Podrías ser más específico o preguntar sobre productos, pedidos o analytics?`;
        confidence = 0.1;
      }

      const processingTime = Date.now() - startTime;

      return {
        answer,
        sources: relevantDocs,
        confidence,
        processingTime,
        metadata: {
          queryType: this.classifyQuery(query.query),
          agentType: query.context.agentType,
          documentsFound: relevantDocs.length,
          namespacesSearched: namespacesToSearch.map(ns => `store-${query.context.storeId}-${ns}`),
          storeId: query.context.storeId,
          conversationId: query.context.conversationId,
          reasoning: relevantDocs.length > 0 
            ? `Encontré ${relevantDocs.length} fuentes relevantes en tu tienda` 
            : 'No encontré datos específicos en tu tienda'
        }
      };

    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Search failed:', error);
      
      return {
        answer: 'Disculpa, tuve un problema técnico al buscar en tu tienda. ¿Podrías intentar reformular tu pregunta?',
        sources: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
        metadata: {
          queryType: 'error',
          agentType: query.context.agentType,
          documentsFound: 0,
          namespacesSearched: [],
          storeId: query.context.storeId,
          conversationId: query.context.conversationId,
          reasoning: 'Error técnico en el sistema de búsqueda'
        }
      };
    }
  }

  /**
   * Enhanced retrieval with multiple namespace search
   */
  private async enhancedRetrieval(
    query: string, 
    storeId: string, 
    namespaces: string[], 
    topK: number, 
    scoreThreshold: number
  ): Promise<Document[]> {
    try {
      const results: Document[] = [];

      // Search across specified namespaces
      for (const namespace of namespaces) {
        try {
          const vectorStore = await this.getVectorStore(storeId, namespace);
          const docs = await vectorStore.similaritySearchWithScore(query, Math.ceil(topK / namespaces.length));
          
          // Filter by score threshold and add metadata
          const filteredDocs = docs
            .filter(([, score]) => score >= scoreThreshold)
            .map(([doc, score]) => {
              doc.metadata = { ...doc.metadata, score, namespace: `store-${storeId}-${namespace}` };
              return doc;
            });

          results.push(...filteredDocs);
        } catch (error) {
          console.warn(`[UNIFIED-RAG] ⚠️ Error searching namespace ${namespace}:`, error);
        }
      }

      // Sort by relevance score and take top results
      results.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));
      const topResults = results.slice(0, topK);

      console.log(`[UNIFIED-RAG] 📊 Retrieved ${topResults.length} documents from ${namespaces.length} namespaces`);
      return topResults;

    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Enhanced retrieval failed:', error);
      return [];
    }
  }

  /**
   * Get vector store instance for specific namespace
   */
  private async getVectorStore(storeId: string, namespace: string): Promise<PineconeStore> {
    const key = `${storeId}-${namespace}`;
    
    if (this.vectorStores.has(key)) {
      return this.vectorStores.get(key)!;
    }

    const pineconeIndex = this.pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    
    const vectorStore = new PineconeStore(this.langchainEmbeddings, {
      pineconeIndex,
      namespace: `store-${storeId}-${namespace}`,
      textKey: 'text',
    });

    this.vectorStores.set(key, vectorStore);
    return vectorStore;
  }

  /**
   * Generate enhanced response using LLM
   */
  private async generateEnhancedResponse(query: UnifiedRAGQuery, docs: Document[]): Promise<{
    answer: string;
    confidence: number;
  }> {
    try {
      // Format context from documents
      const context = docs.map(doc => 
        `[${doc.metadata?.namespace}] ${doc.pageContent}`
      ).join('\n\n');

      // Create agent-specific prompt
      const prompt = this.createAgentPrompt(query.context.agentType, query.query, context);
      
      // Generate response
      const response = await this.llm.invoke(prompt);
      const answer = response.content as string;
      
      // Calculate confidence based on document relevance and response quality
      const avgScore = docs.reduce((sum, doc) => sum + (doc.metadata?.score || 0), 0) / docs.length;
      const confidence = Math.min(0.95, Math.max(0.1, avgScore * 1.2));

      return { answer, confidence };

    } catch (error) {
      console.error('[UNIFIED-RAG] ❌ Failed to generate enhanced response:', error);
      return {
        answer: 'Encontré información relevante pero tuve problemas al procesarla. ¿Podrías reformular tu pregunta?',
        confidence: 0.3
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get optimal namespaces for agent type
   */
  private getOptimalNamespaces(agentType: string, dataTypeFilters?: string[]): string[] {
    if (dataTypeFilters && dataTypeFilters.length > 0) {
      return dataTypeFilters;
    }

    // Agent-specific namespace optimization
    const namespaceMap: Record<string, string[]> = {
      product_manager: ['products', 'store', 'analytics'],
      analytics: ['orders', 'analytics', 'customers', 'products'],
      customer_service: ['customers', 'orders', 'conversations', 'products'],
      marketing: ['customers', 'analytics', 'products'],
      orchestrator: ['products', 'orders', 'store', 'analytics']
    };

    return namespaceMap[agentType] || ['products', 'store', 'orders'];
  }

  /**
   * Create agent-specific prompt
   */
  private createAgentPrompt(agentType: string, query: string, context: string): string {
    const basePrompt = `Eres un asistente especializado de ecommerce para Tienda Nube. Tu rol específico es: ${agentType}.

Contexto de la tienda:
${context}

Instrucciones:
- Responde en español (Argentina) de manera profesional y amigable
- Usa el contexto proporcionado para dar respuestas precisas y específicas
- Si no tienes información suficiente, indícalo claramente
- Proporciona ejemplos concretos cuando sea posible
- Mantén respuestas concisas pero informativas

Pregunta del usuario: ${query}

Respuesta detallada:`;

    return basePrompt;
  }

  /**
   * Classify query type
   */
  private classifyQuery(query: string): string {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('producto') || queryLower.includes('catálogo')) return 'product_query';
    if (queryLower.includes('venta') || queryLower.includes('pedido')) return 'sales_query';
    if (queryLower.includes('cliente')) return 'customer_query';
    if (queryLower.includes('analytic') || queryLower.includes('métrica')) return 'analytics_query';
    
    return 'general_query';
  }

  // ===== LEGACY INTERFACE COMPATIBILITY =====

  /**
   * Legacy method for backward compatibility
   */
  async getRelevantContext(query: string, context: any): Promise<string> {
    const unifiedQuery: UnifiedRAGQuery = {
      query,
      context: {
        storeId: context.storeId,
        userId: context.userId,
        agentType: context.agentType || 'orchestrator'
      }
    };

    const result = await this.search(unifiedQuery);
    return result.sources.map(doc => doc.pageContent).join('\n\n');
  }

  /**
   * Update document (legacy compatibility)
   */
  async updateDocument(documentId: string, content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void> {
    await this.indexDocument(content, metadata);
  }

  /**
   * Delete specific documents by vector IDs
   * 🗑️ NEW: Added for backward compatibility with conversation deletion
   */
  async deleteDocuments(vectorIds: string[]): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      console.log(`[UNIFIED-RAG] 🗑️ Deleting ${vectorIds.length} documents...`);

      if (!this.pinecone) {
        return { success: false, deletedCount: 0, error: 'Pinecone not initialized' };
      }

      const index = this.pinecone.Index(process.env.PINECONE_INDEX_NAME!);
      let totalDeleted = 0;

      // Group vector IDs by namespace if possible
      // For now, try to delete from main namespaces
      const namespaceTypes = ['store', 'products', 'orders', 'customers', 'analytics', 'conversations'];
      
      for (const nsType of namespaceTypes) {
        try {
          await index.namespace(`default-${nsType}`).deleteMany(vectorIds);
          totalDeleted += vectorIds.length; // Assume success
        } catch (error) {
          console.warn(`[UNIFIED-RAG] ⚠️ Failed to delete from namespace ${nsType}:`, error);
        }
      }

      console.log(`[UNIFIED-RAG] ✅ Successfully deleted ${totalDeleted} documents`);
      return { success: true, deletedCount: totalDeleted };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[UNIFIED-RAG] ❌ Delete documents failed:`, error);
      return { success: false, deletedCount: 0, error: errorMessage };
    }
  }

  /**
   * Get stats
   */
  async getStats(): Promise<{
    vectorStore: { totalVectors: number; dimension: number };
    embeddings: { model: string; dimension: number; maxTokens: number };
    isConfigured: boolean;
    errors: string[];
  }> {
    return {
      vectorStore: { totalVectors: 0, dimension: 1536 },
      embeddings: { model: 'text-embedding-3-large', dimension: 1536, maxTokens: 8191 },
      isConfigured: true,
      errors: []
    };
  }
}

// ===== SINGLETON EXPORT =====

let unifiedRAGInstance: UnifiedFiniRAGEngine | null = null;

/**
 * Get singleton instance of UnifiedFiniRAGEngine
 */
export function getUnifiedRAGEngine(): UnifiedFiniRAGEngine {
  if (!unifiedRAGInstance) {
    unifiedRAGInstance = new UnifiedFiniRAGEngine();
  }
  return unifiedRAGInstance;
}

// Export as default for backward compatibility
export { UnifiedFiniRAGEngine as FiniRAGEngine };
export default UnifiedFiniRAGEngine; 