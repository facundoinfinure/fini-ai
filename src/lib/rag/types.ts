/**
 * RAG Engine Types
 * Defines interfaces and types for the Retrieval-Augmented Generation system
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: string;
    type: 'product' | 'order' | 'customer' | 'store' | 'analytics' | 'conversation';
    storeId: string;
    timestamp: string;
    relevanceScore?: number;
    // Product specific
    productId?: string;
    productName?: string;
    category?: string;
    // Order specific
    orderId?: string;
    orderValue?: number;
    orderStatus?: string;
    // Customer specific
    customerId?: string;
    customerEmail?: string;
    // Additional context
    [key: string]: unknown;
  };
  embedding?: number[];
}

export interface RAGQuery {
  query: string;
  context?: {
    storeId: string;
    userId: string;
    conversationId?: string;
    agentType?: 'analytics' | 'customer_service' | 'marketing' | 'orchestrator';
  };
  filters?: {
    source?: string[];
    type?: DocumentChunk['metadata']['type'][];
    dateRange?: {
      start: string;
      end: string;
    };
    productIds?: string[];
    orderIds?: string[];
    customerIds?: string[];
  };
  options?: {
    topK?: number;
    threshold?: number;
    includeMetadata?: boolean;
  };
}

export interface RAGResult {
  documents: DocumentChunk[];
  query: string;
  totalFound: number;
  processingTime: number;
  confidence: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: DocumentChunk['metadata'];
  content?: string;
}

export interface RAGEngineConfig {
  pinecone: {
    apiKey: string;
    indexName: string;
  };
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  search: {
    defaultTopK: number;
    defaultThreshold: number;
    maxChunkSize: number;
    chunkOverlap: number;
  };
}

export interface DocumentProcessor {
  processDocument(content: string, metadata: Partial<DocumentChunk['metadata']>): DocumentChunk[];
  chunkText(text: string, maxSize: number, overlap: number): string[];
}

export interface VectorStore {
  upsert(chunks: DocumentChunk[]): Promise<void>;
  search(queryEmbedding: number[], options?: RAGQuery['options'], filters?: RAGQuery['filters'], context?: RAGQuery['context']): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  getStats(): Promise<{ totalVectors: number; dimension: number }>;
}

export interface RAGEngine {
  indexDocument(content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void>;
  indexStoreData(storeId: string): Promise<void>;
  search(query: RAGQuery): Promise<RAGResult>;
  getRelevantContext(query: string, context: RAGQuery['context']): Promise<string>;
  deleteStoreData(storeId: string): Promise<void>;
  updateDocument(documentId: string, content: string, metadata: Partial<DocumentChunk['metadata']>): Promise<void>;
} 