/**
 * RAG Engine Exports
 * Enhanced with LangChain integration
 */

// Legacy RAG components (maintained for backward compatibility)
export { FiniRAGEngine } from './rag-engine';
export { RAGDocumentProcessor } from './document-processor';
export { EmbeddingsService } from './embeddings';
export { PineconeVectorStore } from './vector-store';
export type { NamespaceManager } from './namespace-manager';
export { RAG_CONFIG, RAG_CONSTANTS, validateRAGConfig } from './config';

// 🚀 Enhanced LangChain RAG components  
export { LANGCHAIN_CONFIG, LangChainFactory, validateLangChainConfig } from './langchain-config';
// TODO: Fix LangChain interface compatibility issues
// export type { FiniPineconeVectorStore, VectorStoreFactory } from './langchain-vectorstore';
// export type { LangChainDocumentProcessor } from './langchain-document-processor';
// export type { FiniRetrievalQA, MultiNamespaceRetriever, RetrievalQAFactory } from './retrieval-qa';
export { EnhancedRAGEngine, enhancedRAGEngine } from './enhanced-rag-engine';

// 🔄 Streaming RAG components
export { streamingRAGEngine } from './streaming-rag';

// 🧠 Conversation Memory components  
export { conversationMemoryManager } from './conversation-memory';

// 🔍 Hybrid Search components
export { hybridSearchEngine } from './hybrid-search-engine';

// Types
export type { 
  RAGEngine, 
  RAGQuery, 
  RAGResult, 
  DocumentChunk, 
  VectorSearchResult,
  VectorStore as LegacyVectorStore,
  DocumentProcessor as LegacyDocumentProcessor
} from './types';

export type {
  RAGAgentType
} from './langchain-config';

export type {
  RAGContext
} from './retrieval-qa';

export type {
  TiendaNubeDocumentMetadata
} from './langchain-document-processor';

export type {
  EnhancedRAGQuery,
  EnhancedRAGResult  
} from './enhanced-rag-engine';

// Streaming RAG types
export type {
  StreamingRAGQuery,
  StreamingChunk
} from './streaming-rag';

// Conversation Memory types
export type {
  ConversationContext,
  MemoryConfig
} from './conversation-memory';

// Hybrid Search types
export type {
  HybridSearchQuery,
  HybridSearchResult
} from './hybrid-search-engine';

// Create and export the main RAG instance
import { enhancedRAGEngine } from './enhanced-rag-engine';
export { enhancedRAGEngine as ragEngine };

// Create legacy instance for backward compatibility
import { FiniRAGEngine } from './rag-engine';
const legacyRagEngine = new FiniRAGEngine();
export { legacyRagEngine as ragEngineInstance };

console.log('[RAG] Enhanced RAG module with LangChain integration loaded'); 