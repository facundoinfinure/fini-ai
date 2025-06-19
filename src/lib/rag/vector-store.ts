/**
 * Vector Store Service
 * Handles vector storage and retrieval using Pinecone
 */

import { Pinecone } from '@pinecone-database/pinecone';

import { RAG_CONFIG, RAG_CONSTANTS } from './config';
import type { DocumentChunk, VectorSearchResult, VectorStore, RAGQuery } from './types';

export class PineconeVectorStore implements VectorStore {
  private pinecone: Pinecone;
  private indexName: string;

  constructor() {
    this.pinecone = new Pinecone({
      apiKey: RAG_CONFIG.pinecone.apiKey,
      environment: RAG_CONFIG.pinecone.environment,
    });
    this.indexName = RAG_CONFIG.pinecone.indexName;
  }

  /**
   * Initialize and get Pinecone index
   */
  private async getIndex() {
    try {
      const index = this.pinecone.index(this.indexName);
      return index;
    } catch (error) {
      console.warn(`[ERROR] Failed to get Pinecone index: ${this.indexName}`, error);
      throw new Error(`Failed to connect to Pinecone index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upsert document chunks to Pinecone
   */
  async upsert(chunks: DocumentChunk[]): Promise<void> {
    try {
      console.warn(`[RAG:vector-store] Upserting ${chunks.length} chunks to Pinecone`);
      
      if (chunks.length === 0) {
        console.warn('[RAG:vector-store] No chunks to upsert');
        return;
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
            ...chunk.metadata,
            // Flatten nested metadata for Pinecone
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
        
        await index.namespace(namespace).upsert(batch);
        
        console.warn(`[RAG:vector-store] Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)} to namespace: ${namespace}`);
        
        // Rate limiting between batches
        if (i + batchSize < vectors.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      console.warn(`[RAG:vector-store] Successfully upserted ${chunks.length} chunks`);
    } catch (error) {
      console.warn('[ERROR] Failed to upsert chunks to Pinecone:', error);
      throw new Error(`Vector upsert failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search for similar vectors
   */
  async search(queryEmbedding: number[], options: RAGQuery['options'] = {}, filters?: RAGQuery['filters'], context?: RAGQuery['context']): Promise<VectorSearchResult[]> {
    try {
      const topK = options.topK || RAG_CONFIG.search.defaultTopK;
      const threshold = options.threshold || RAG_CONFIG.search.defaultThreshold;
      
      console.warn(`[RAG:vector-store] Searching for ${topK} similar vectors with threshold ${threshold}`);
      
      const index = await this.getIndex();
      
      // Build Pinecone filter
      const pineconeFilter = this.buildPineconeFilter(filters);
      
      // Determine namespace(s) to search
      const namespaces = this.getSearchNamespaces(context, filters);
      
      const allResults: VectorSearchResult[] = [];
      
      // Search in each namespace
      for (const namespace of namespaces) {
        console.warn(`[RAG:vector-store] Searching in namespace: ${namespace}`);
        
        const searchRequest = {
          vector: queryEmbedding,
          topK,
          includeMetadata: options.includeMetadata !== false,
          includeValues: false,
          ...(pineconeFilter && { filter: pineconeFilter }),
        };

        const searchResponse = await index.namespace(namespace).query(searchRequest);
        
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
      }
      
      // Sort by score and limit results
      const sortedResults = allResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      console.warn(`[RAG:vector-store] Found ${sortedResults.length} matches across ${namespaces.length} namespaces`);
      
      return sortedResults;
    } catch (error) {
      console.warn('[ERROR] Failed to search vectors in Pinecone:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete vectors by IDs
   */
  async delete(ids: string[]): Promise<void> {
    try {
      console.warn(`[RAG:vector-store] Deleting ${ids.length} vectors from Pinecone`);
      
      if (ids.length === 0) {
        return;
      }

      const index = await this.getIndex();
      
      // Group IDs by namespace (we need to determine namespace from ID pattern)
      const namespaceGroups = this.groupIdsByNamespace(ids);
      
      for (const [namespace, namespaceIds] of Object.entries(namespaceGroups)) {
        await index.namespace(namespace).deleteMany(namespaceIds);
        console.warn(`[RAG:vector-store] Deleted ${namespaceIds.length} vectors from namespace: ${namespace}`);
      }
      
      console.warn(`[RAG:vector-store] Successfully deleted ${ids.length} vectors`);
    } catch (error) {
      console.warn('[ERROR] Failed to delete vectors from Pinecone:', error);
      throw new Error(`Vector deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      throw new Error('Store ID is required for search');
    }

    const storeId = context.storeId;
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
   * Group vector IDs by namespace for deletion
   */
  private groupIdsByNamespace(ids: string[]): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    
    for (const id of ids) {
      // Extract namespace from ID pattern (assuming format: namespace_actualId)
      const parts = id.split('_');
      if (parts.length >= 2) {
        const namespace = parts[0];
        if (!groups[namespace]) {
          groups[namespace] = [];
        }
        groups[namespace].push(id);
      } else {
        // Default namespace if pattern doesn't match
        const defaultNamespace = 'default';
        if (!groups[defaultNamespace]) {
          groups[defaultNamespace] = [];
        }
        groups[defaultNamespace].push(id);
      }
    }
    
    return groups;
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
} 