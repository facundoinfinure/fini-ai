/**
 * LangChain Vector Store - Simplified Implementation
 * Using official LangChain Pinecone integration for compatibility
 */

import { Document } from '@langchain/core/documents';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';

import { LANGCHAIN_CONFIG, LangChainFactory, getNamespaceForStore, type RAGAgentType } from './langchain-config';

/**
 * Factory for creating vector stores with proper configuration
 * Using official LangChain PineconeStore for maximum compatibility
 */
export class VectorStoreFactory {
  /**
   * Create vector store for a specific store and data type
   */
  static async createForStore(
    storeId: string,
    dataType: keyof typeof LANGCHAIN_CONFIG.namespaces = 'store'
  ): Promise<PineconeStore> {
    const embeddings = LangChainFactory.createEmbeddings();
    const pinecone = LangChainFactory.createPineconeClient();
    const namespace = getNamespaceForStore(storeId, dataType);

    const pineconeIndex = pinecone.Index(LANGCHAIN_CONFIG.pinecone.indexName);

    return new PineconeStore(embeddings, {
      pineconeIndex,
      namespace,
      textKey: 'text',
    });
  }

  /**
   * Create vector store from documents with automatic namespace
   */
  static async createFromDocuments(
    documents: Document[],
    storeId: string,
    dataType: keyof typeof LANGCHAIN_CONFIG.namespaces = 'store'
  ): Promise<PineconeStore> {
    const embeddings = LangChainFactory.createEmbeddings();
    const pinecone = LangChainFactory.createPineconeClient();
    const namespace = getNamespaceForStore(storeId, dataType);

    const pineconeIndex = pinecone.Index(LANGCHAIN_CONFIG.pinecone.indexName);

    return await PineconeStore.fromDocuments(documents, embeddings, {
      pineconeIndex,
      namespace,
      textKey: 'text',
    });
  }

  /**
   * Create vector store from texts
   */
  static async createFromTexts(
    texts: string[],
    metadatas: object[],
    storeId: string,
    dataType: keyof typeof LANGCHAIN_CONFIG.namespaces = 'store'
  ): Promise<PineconeStore> {
    const embeddings = LangChainFactory.createEmbeddings();
    const pinecone = LangChainFactory.createPineconeClient();
    const namespace = getNamespaceForStore(storeId, dataType);

    const pineconeIndex = pinecone.Index(LANGCHAIN_CONFIG.pinecone.indexName);

    return await PineconeStore.fromTexts(texts, metadatas, embeddings, {
      pineconeIndex,
      namespace,
      textKey: 'text',
    });
  }

  /**
   * Create vector store with enhanced search capabilities
   */
  static async createEnhancedStore(
    storeId: string,
    dataType: keyof typeof LANGCHAIN_CONFIG.namespaces = 'store'
  ): Promise<EnhancedPineconeStore> {
    const baseStore = await this.createForStore(storeId, dataType);
    return new EnhancedPineconeStore(baseStore, storeId, dataType);
  }
}

/**
 * Enhanced wrapper around PineconeStore with additional features
 */
export class EnhancedPineconeStore {
  private store: PineconeStore;
  private storeId: string;
  private dataType: keyof typeof LANGCHAIN_CONFIG.namespaces;

  constructor(
    store: PineconeStore, 
    storeId: string, 
    dataType: keyof typeof LANGCHAIN_CONFIG.namespaces
  ) {
    this.store = store;
    this.storeId = storeId;
    this.dataType = dataType;
  }

  /**
   * Enhanced similarity search with configurable options
   */
  async similaritySearchWithScore(
    query: string,
    k = 8,
    options?: {
      searchType?: 'similarity' | 'mmr';
      scoreThreshold?: number;
      mmrDiversityBias?: number;
    }
  ): Promise<Array<[Document, number]>> {
    const threshold = options?.scoreThreshold ?? LANGCHAIN_CONFIG.retrieval.scoreThreshold;
    
    try {
      // Use MMR if requested and supported
      if (options?.searchType === 'mmr') {
        const docs = await this.store.maxMarginalRelevanceSearch(
          query, 
          {
            k,
            fetchK: k * 2,
            lambda: options.mmrDiversityBias ?? LANGCHAIN_CONFIG.retrieval.mmrDiversityBias,
          }
        );
        
        // For MMR, we don't have scores, so we'll do a separate similarity search
        const withScores = await this.store.similaritySearchWithScore(query, k);
        return withScores.filter(([, score]) => score >= threshold);
      }
      
      // Regular similarity search
      const results = await this.store.similaritySearchWithScore(query, k);
      return results.filter(([, score]) => score >= threshold);
    } catch (error) {
      console.error(`[ENHANCED-VECTORSTORE] Search failed for store ${this.storeId}:`, error);
      throw error;
    }
  }

  /**
   * Add documents with automatic batching
   */
  async addDocuments(
    documents: Document[],
    options?: { batchSize?: number }
  ): Promise<string[]> {
    const batchSize = options?.batchSize ?? 100;
    const ids: string[] = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      try {
        const batchIds = await this.store.addDocuments(batch);
        ids.push(...batchIds);
        console.log(`[ENHANCED-VECTORSTORE] Added batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documents.length / batchSize)} for store ${this.storeId}`);
      } catch (error) {
        console.error(`[ENHANCED-VECTORSTORE] Failed to add batch for store ${this.storeId}:`, error);
        throw error;
      }
    }

    return ids;
  }

  /**
   * Delete documents by IDs
   */
  async delete(ids: string[]): Promise<void> {
    try {
      await this.store.delete({ ids });
      console.log(`[ENHANCED-VECTORSTORE] Deleted ${ids.length} documents from store ${this.storeId}`);
    } catch (error) {
      console.error(`[ENHANCED-VECTORSTORE] Failed to delete documents from store ${this.storeId}:`, error);
      throw error;
    }
  }

  /**
   * Get the underlying store for direct access
   */
  getStore(): PineconeStore {
    return this.store;
  }

  /**
   * Create a retriever with enhanced configuration
   */
  asRetriever(options?: {
    k?: number;
    searchType?: 'similarity' | 'mmr';
    scoreThreshold?: number;
  }) {
    const k = options?.k ?? LANGCHAIN_CONFIG.retrieval.topK;
    
    // Use the simple asRetriever interface that's compatible with the current version
    return this.store.asRetriever({ k });
  }
}

console.log('[LANGCHAIN-VECTORSTORE] Simplified Pinecone vector store initialized'); 