/**
 * Enhanced RAG Engine with LangChain
 * Main orchestrator for the enhanced RAG system
 */

import { Document } from '@langchain/core/documents';
import { TiendaNubeAPI } from '../integrations/tiendanube';

import { LANGCHAIN_CONFIG, validateLangChainConfig } from './langchain-config';
import { VectorStoreFactory } from './langchain-vectorstore';
import { LangChainDocumentProcessor } from './langchain-document-processor';
import { RetrievalQAFactory, type RAGContext } from './retrieval-qa';

export interface EnhancedRAGQuery {
  query: string;
  context: RAGContext;
  options?: {
    topK?: number;
    scoreThreshold?: number;
    includeStreaming?: boolean;
  };
}

export interface EnhancedRAGResult {
  answer: string;
  sources: Array<{
    pageContent: string;
    metadata: any;
    score?: number;
  }>;
  documents: Array<{
    pageContent: string;
    metadata: any;
    score?: number;
  }>;
  confidence: number;
  metadata: {
    totalSources: number;
    avgScore: number;
    processingTime: number;
    agentType?: string;
    storeId?: string;
    [key: string]: any;
  };
}

export class EnhancedRAGEngine {
  private documentProcessor: LangChainDocumentProcessor;
  private qaSystemCache: Map<string, any> = new Map();
  private isInitialized = false;

  constructor() {
    this.documentProcessor = new LangChainDocumentProcessor();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const config = validateLangChainConfig();
    if (!config.isValid) {
      throw new Error(`RAG Engine configuration error: ${config.missing.join(', ')}`);
    }

    console.log('[ENHANCED-RAG] Initializing enhanced RAG engine...');
    this.isInitialized = true;
    console.log('[ENHANCED-RAG] Enhanced RAG engine initialized successfully');
  }

  async indexStoreData(storeId: string, accessToken?: string): Promise<{
    success: boolean;
    documentsIndexed: number;
    error?: string;
  }> {
    try {
      await this.initialize();
      
      console.log(`[ENHANCED-RAG] Starting enhanced indexing for store: ${storeId}`);
      const startTime = Date.now();

      if (!accessToken) {
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
          console.log(`[ENHANCED-RAG] ✅ Indexed ${storeDocuments.length} store documents`);
        }
      } catch (error) {
        console.warn('[ENHANCED-RAG] ⚠️ Failed to index store data:', error);
      }

      // Index products
      try {
        const products = await api.getProducts({ limit: 200 });
        
        if (products && products.length > 0) {
          const productDocuments = await this.documentProcessor.processProductData(products, storeId);
          
          if (productDocuments.length > 0) {
            const vectorStore = await VectorStoreFactory.createForStore(storeId, 'products');
            await vectorStore.addDocuments(productDocuments);
            indexingResults.push(productDocuments);
            console.log(`[ENHANCED-RAG] ✅ Indexed ${productDocuments.length} product documents`);
          }
        }
      } catch (error) {
        console.warn('[ENHANCED-RAG] ⚠️ Failed to index products:', error);
      }

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
        console.warn(`[ENHANCED-RAG] ⚠️ Failed to update last_sync_at:`, error);
      }

      console.log(`[ENHANCED-RAG] ✅ Enhanced indexing completed: ${totalDocuments} documents in ${processingTime}ms`);

      return {
        success: true,
        documentsIndexed: totalDocuments,
      };
    } catch (error) {
      console.error('[ENHANCED-RAG] Enhanced indexing failed:', error);
      return {
        success: false,
        documentsIndexed: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async search(query: EnhancedRAGQuery): Promise<EnhancedRAGResult> {
    try {
      await this.initialize();
      
      const startTime = Date.now();
      console.log(`[ENHANCED-RAG] Processing query: "${query.query}" for agent: ${query.context.agentType}`);

      const qaSystem = await this.getQASystem(query.context);
      const result = await qaSystem.ask(query.query);

      const processingTime = Date.now() - startTime;

      const ragResult: EnhancedRAGResult = {
        answer: result.answer,
        sources: result.sources,
        documents: result.sources,
        confidence: result.confidence,
        metadata: {
          totalSources: result.sources.length,
          avgScore: result.confidence,
          processingTime,
          agentType: query.context.agentType,
          storeId: query.context.storeId,
          langchainUsed: true,
        },
      };

      console.log(`[ENHANCED-RAG] Query completed in ${processingTime}ms with confidence: ${result.confidence.toFixed(3)}`);
      return ragResult;
    } catch (error) {
      console.error('[ENHANCED-RAG] Search failed:', error);
      
      return {
        answer: 'Lo siento, hubo un error al procesar tu consulta.',
        sources: [],
        documents: [],
        confidence: 0,
        metadata: {
          totalSources: 0,
          avgScore: 0,
          processingTime: 0,
          agentType: query.context.agentType,
          storeId: query.context.storeId,
          langchainUsed: true,
        },
      };
    }
  }

  private async getQASystem(context: RAGContext) {
    const cacheKey = `${context.storeId}-${context.agentType}`;
    
    if (this.qaSystemCache.has(cacheKey)) {
      return this.qaSystemCache.get(cacheKey);
    }

    const qaSystem = await RetrievalQAFactory.create(context);
    this.qaSystemCache.set(cacheKey, qaSystem);
    
    setTimeout(() => {
      this.qaSystemCache.delete(cacheKey);
    }, 30 * 60 * 1000);

    return qaSystem;
  }

  private classifyQuery(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('producto') || lowerQuery.includes('catálogo')) return 'product_query';
    if (lowerQuery.includes('venta') || lowerQuery.includes('analytics')) return 'analytics_query';
    if (lowerQuery.includes('pedido') || lowerQuery.includes('orden')) return 'order_query';
    
    return 'general_query';
  }

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

  async deleteDocuments(vectorIds: string[]): Promise<boolean> {
    try {
      console.warn('[ENHANCED-RAG] DeleteDocuments called - delegating to legacy RAG');
      const { ragEngine } = await import('./index');
      if (ragEngine && typeof ragEngine.deleteDocuments === 'function') {
        return await ragEngine.deleteDocuments(vectorIds);
      }
      return false;
    } catch (error) {
      console.error('[ENHANCED-RAG] DeleteDocuments failed:', error);
      return false;
    }
  }

  async *searchStreaming(query: EnhancedRAGQuery): AsyncGenerator<string, void, unknown> {
    try {
      console.warn('[ENHANCED-RAG] Streaming simulation - generating response');
      const result = await this.search(query);
      
      // Simulate streaming by yielding words
      const words = result.answer.split(' ');
      for (let i = 0; i < words.length; i += 2) {
        const chunk = words.slice(i, i + 2).join(' ') + ' ';
        yield chunk;
        
        // Small delay to simulate realistic streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } catch (error) {
      console.error('[ENHANCED-RAG] Streaming failed:', error);
      yield 'Error al procesar la consulta.';
    }
  }
}

export const enhancedRAGEngine = new EnhancedRAGEngine(); 