/**
 * RAG Engine Exports
 * Main entry point for the Retrieval-Augmented Generation system
 */

// Main RAG Engine
export { FiniRAGEngine } from './rag-engine';

// Components
export { EmbeddingsService } from './embeddings';
export { PineconeVectorStore } from './vector-store';
export { RAGDocumentProcessor } from './document-processor';

// Configuration
export { RAG_CONFIG, RAG_CONSTANTS, validateRAGConfig } from './config';

// Types
export type {
  DocumentChunk,
  RAGQuery,
  RAGResult,
  EmbeddingResult,
  VectorSearchResult,
  RAGEngineConfig,
  DocumentProcessor,
  VectorStore,
  RAGEngine,
} from './types';

// Create singleton instance for easy access (lazy initialization)
import { FiniRAGEngine } from './rag-engine';

let _ragEngineInstance: FiniRAGEngine | null = null;

export const ragEngine = {
  get instance(): FiniRAGEngine {
    if (!_ragEngineInstance) {
      _ragEngineInstance = new FiniRAGEngine();
    }
    return _ragEngineInstance;
  },
  
  // For compatibility with existing code
  async search(query: any): Promise<any> {
    return this.instance.search(query);
  },
  
  async upsert(documents: any, storeId: string): Promise<any> {
    return this.instance.upsert(documents, storeId);
  },
  
  async deleteByStoreId(storeId: string): Promise<any> {
    return this.instance.deleteByStoreId(storeId);
  },

  // 🔥 CRITICAL: Para eliminar vectores de conversaciones específicas
  async deleteDocuments(documentIds: string[]): Promise<any> {
    return this.instance.deleteDocuments(documentIds);
  }
}; 