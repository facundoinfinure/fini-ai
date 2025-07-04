/**
 * LangChain Vector Store
 * Advanced Pinecone integration using LangChain's PineconeStore
 * Implements best practices from LangChain documentation
 */

import { Document } from '@langchain/core/documents';
import { VectorStore } from '@langchain/core/vectorstores';
import { Embeddings } from '@langchain/core/embeddings';
import { Pinecone } from '@pinecone-database/pinecone';

import { LANGCHAIN_CONFIG, LangChainFactory, getNamespaceForStore, type RAGAgentType } from './langchain-config';

/**
 * Custom Pinecone Vector Store implementation with namespace support
 * Based on LangChain's PineconeStore but with enhanced features for our multi-tenant system
 */
export class FiniPineconeVectorStore extends VectorStore {
  _vectorstoreType(): string {
    return 'fini-pinecone';
  }
  private pinecone: Pinecone;
  private indexName: string;
  private textKey: string;
  private namespace?: string;

  constructor(
    embeddings: Embeddings,
    args: {
      pinecone: Pinecone;
      indexName: string;
      textKey?: string;
      namespace?: string;
    }
  ) {
    super(embeddings, args);
    this.pinecone = args.pinecone;
    this.indexName = args.indexName;
    this.textKey = args.textKey ?? 'text';
    this.namespace = args.namespace;
  }

  /**
   * Add documents to the vector store
   */
  async addDocuments(
    documents: Document[],
    options?: { 
      ids?: string[]; 
      namespace?: string;
      batchSize?: number;
    }
  ): Promise<string[]> {
    const texts = documents.map((doc) => doc.pageContent);
    const metadatas = documents.map((doc) => doc.metadata);
    return this.addVectors(
      await this.embeddings.embedDocuments(texts),
      texts,
      metadatas,
      options
    );
  }

  /**
   * Add vectors to the vector store with enhanced batch processing
   */
  async addVectors(
    vectors: number[][],
    texts: string[],
    metadatas: object[],
    options?: { 
      ids?: string[]; 
      namespace?: string;
      batchSize?: number;
    }
  ): Promise<string[]> {
    const index = this.pinecone.Index(this.indexName);
    const namespace = options?.namespace ?? this.namespace;
    const batchSize = options?.batchSize ?? 100;
    
    // Generate IDs if not provided
    const ids = options?.ids ?? texts.map(() => 
      `doc_${Date.now()}_${Math.random().toString(36).substring(2)}`
    );

    if (vectors.length !== texts.length || texts.length !== metadatas.length) {
      throw new Error('Vectors, texts, and metadatas must have the same length');
    }

    // Prepare upsert data
    const upsertData = vectors.map((vector, i) => ({
      id: ids[i],
      values: vector,
      metadata: {
        [this.textKey]: texts[i],
        ...metadatas[i],
        // Add indexing metadata
        indexedAt: new Date().toISOString(),
        vectorDimension: vector.length,
      },
    }));

    // Process in batches for better performance
    const results: string[] = [];
    for (let i = 0; i < upsertData.length; i += batchSize) {
      const batch = upsertData.slice(i, i + batchSize);
      
      try {
        if (namespace) {
          await index.namespace(namespace).upsert(batch);
        } else {
          await index.upsert(batch);
        }
        
        results.push(...batch.map(item => item.id));
        console.log(`[LANGCHAIN-VECTORSTORE] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(upsertData.length / batchSize)} to namespace: ${namespace || 'default'}`);
      } catch (error) {
        console.error(`[LANGCHAIN-VECTORSTORE] Failed to upsert batch ${Math.floor(i / batchSize) + 1}:`, error);
        throw error;
      }
    }

    console.log(`[LANGCHAIN-VECTORSTORE] Successfully added ${results.length} vectors to namespace: ${namespace || 'default'}`);
    return results;
  }

  /**
   * Enhanced similarity search with MMR support
   */
  async similaritySearchWithScore(
    query: string,
    k = 4,
    filter?: object,
    options?: {
      namespace?: string;
      searchType?: 'similarity' | 'mmr';
      mmrDiversityBias?: number;
      scoreThreshold?: number;
    }
  ): Promise<Array<[Document, number]>> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    return this.similaritySearchVectorWithScore(queryEmbedding, k, filter, options);
  }

  /**
   * Vector similarity search with advanced options
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number,
    filter?: object,
    options?: {
      namespace?: string;
      searchType?: 'similarity' | 'mmr';
      mmrDiversityBias?: number;
      scoreThreshold?: number;
    }
  ): Promise<Array<[Document, number]>> {
    const index = this.pinecone.Index(this.indexName);
    const namespace = options?.namespace ?? this.namespace;
    const scoreThreshold = options?.scoreThreshold ?? 0.3;

    try {
      const queryRequest = {
        vector: query,
        topK: k * 2, // Get more results for MMR filtering
        includeMetadata: true,
        includeValues: false,
        ...(filter && { filter }),
      };

      const queryResponse = namespace
        ? await index.namespace(namespace).query(queryRequest)
        : await index.query(queryRequest);

      if (!queryResponse.matches) {
        console.warn(`[LANGCHAIN-VECTORSTORE] No matches found in namespace: ${namespace || 'default'}`);
        return [];
      }

      // Filter by score threshold
      const filteredMatches = queryResponse.matches
        .filter(match => (match.score ?? 0) >= scoreThreshold)
        .slice(0, k); // Take only k results after filtering

      // Convert to LangChain Document format
      const results: Array<[Document, number]> = filteredMatches.map(match => {
        const metadata = { ...match.metadata };
        const text = metadata[this.textKey] as string;
        delete metadata[this.textKey];

        const doc = new Document({
          pageContent: text || '',
          metadata: {
            ...metadata,
            id: match.id,
            score: match.score,
          },
        });

        return [doc, match.score ?? 0];
      });

      // Apply MMR if requested
      if (options?.searchType === 'mmr' && results.length > 1) {
        const mmrResults = this.applyMMR(results, k, options.mmrDiversityBias ?? 0.7);
        console.log(`[LANGCHAIN-VECTORSTORE] Applied MMR filtering: ${results.length} -> ${mmrResults.length} results`);
        return mmrResults;
      }

      console.log(`[LANGCHAIN-VECTORSTORE] Found ${results.length} results in namespace: ${namespace || 'default'}`);
      return results;
    } catch (error) {
      console.error(`[LANGCHAIN-VECTORSTORE] Search failed in namespace: ${namespace || 'default'}:`, error);
      throw error;
    }
  }

  /**
   * Apply Maximum Marginal Relevance for result diversification
   */
  private applyMMR(
    results: Array<[Document, number]>,
    k: number,
    diversityBias: number
  ): Array<[Document, number]> {
    if (results.length <= k) {
      return results;
    }

    const selected: Array<[Document, number]> = [];
    const remaining = [...results];

    // Select the highest scoring document first
    const first = remaining.shift();
    if (first) {
      selected.push(first);
    }

    // Select remaining documents based on MMR
    while (selected.length < k && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const relevanceScore = candidate[1];
        
        // Calculate maximum similarity to already selected documents
        let maxSimilarity = 0;
        for (const selectedDoc of selected) {
          const similarity = this.calculateCosineSimilarity(
            candidate[0].pageContent,
            selectedDoc[0].pageContent
          );
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }

        // MMR score: balance relevance and diversity
        const mmrScore = diversityBias * relevanceScore - (1 - diversityBias) * maxSimilarity;
        
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  /**
   * Simple cosine similarity calculation for MMR
   */
  private calculateCosineSimilarity(text1: string, text2: string): number {
    // Simple word-based similarity for MMR
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = new Set([...words1, ...words2]);
    
    return intersection.length / union.size;
  }

  /**
   * Delete documents by IDs
   */
  async delete(options: { 
    ids: string[]; 
    namespace?: string;
    deleteAll?: boolean;
  }): Promise<void> {
    const index = this.pinecone.Index(this.indexName);
    const namespace = options.namespace ?? this.namespace;

    try {
      if (options.deleteAll) {
        if (namespace) {
          await index.namespace(namespace).deleteAll();
        } else {
          await index.deleteAll();
        }
        console.log(`[LANGCHAIN-VECTORSTORE] Deleted all vectors from namespace: ${namespace || 'default'}`);
      } else if (options.ids.length > 0) {
        if (namespace) {
          await index.namespace(namespace).deleteMany(options.ids);
        } else {
          await index.deleteMany(options.ids);
        }
        console.log(`[LANGCHAIN-VECTORSTORE] Deleted ${options.ids.length} vectors from namespace: ${namespace || 'default'}`);
      }
    } catch (error) {
      console.error(`[LANGCHAIN-VECTORSTORE] Delete failed in namespace: ${namespace || 'default'}:`, error);
      throw error;
    }
  }

  /**
   * Create a new instance for a specific namespace
   */
  withNamespace(namespace: string): FiniPineconeVectorStore {
    return new FiniPineconeVectorStore(this.embeddings, {
      pinecone: this.pinecone,
      indexName: this.indexName,
      textKey: this.textKey,
      namespace,
    });
  }

  /**
   * Get store statistics
   */
  async getStats(namespace?: string): Promise<{
    totalVectors: number;
    dimension: number;
    namespaces: string[];
  }> {
    try {
      const index = this.pinecone.Index(this.indexName);
      const stats = await index.describeIndexStats();
      
      return {
        totalVectors: stats.totalRecordCount || 0,
        dimension: stats.dimension || 1536,
        namespaces: Object.keys(stats.namespaces || {}),
      };
    } catch (error) {
      console.error('[LANGCHAIN-VECTORSTORE] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Required method for VectorStore interface
   */
  async similaritySearch(
    query: string,
    k = 4,
    filter?: object
  ): Promise<Document[]> {
    const results = await this.similaritySearchWithScore(query, k, filter);
    return results.map(([doc]) => doc);
  }

  /**
   * Factory method to create vector store from documents
   */
  static async fromDocuments(
    documents: Document[],
    embeddings: Embeddings,
    args: {
      pinecone: Pinecone;
      indexName: string;
      namespace?: string;
      textKey?: string;
    }
  ): Promise<FiniPineconeVectorStore> {
    const instance = new FiniPineconeVectorStore(embeddings, args);
    await instance.addDocuments(documents, { namespace: args.namespace });
    return instance;
  }

  /**
   * Factory method to create vector store from existing index
   */
  static async fromExistingIndex(
    embeddings: Embeddings,
    args: {
      pinecone: Pinecone;
      indexName: string;
      namespace?: string;
      textKey?: string;
    }
  ): Promise<FiniPineconeVectorStore> {
    return new FiniPineconeVectorStore(embeddings, args);
  }
}

/**
 * Factory for creating vector stores with proper configuration
 */
export class VectorStoreFactory {
  /**
   * Create vector store for a specific store and data type
   */
  static async createForStore(
    storeId: string,
    dataType: keyof typeof LANGCHAIN_CONFIG.namespaces = 'store'
  ): Promise<FiniPineconeVectorStore> {
    const embeddings = LangChainFactory.createEmbeddings();
    const pinecone = LangChainFactory.createPineconeClient();
    const namespace = getNamespaceForStore(storeId, dataType);

    return FiniPineconeVectorStore.fromExistingIndex(embeddings, {
      pinecone,
      indexName: LANGCHAIN_CONFIG.pinecone.indexName,
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
  ): Promise<FiniPineconeVectorStore> {
    const embeddings = LangChainFactory.createEmbeddings();
    const pinecone = LangChainFactory.createPineconeClient();
    const namespace = getNamespaceForStore(storeId, dataType);

    return FiniPineconeVectorStore.fromDocuments(documents, embeddings, {
      pinecone,
      indexName: LANGCHAIN_CONFIG.pinecone.indexName,
      namespace,
      textKey: 'text',
    });
  }
}

console.log('[LANGCHAIN-VECTORSTORE] Advanced Pinecone vector store initialized'); 