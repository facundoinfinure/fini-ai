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

// Create singleton instance for easy access
import { FiniRAGEngine } from './rag-engine';
export const ragEngine = new FiniRAGEngine(); 