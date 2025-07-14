/**
 * RAG Engine Exports
 * Unified system - single source of truth for RAG operations
 */

// 🔄 UNIFIED RAG ENGINE (Single system - production ready)
export { UnifiedFiniRAGEngine, getUnifiedRAGEngine } from './unified-rag-engine';

// 🔄 CORE COMPONENTS
export { PineconeVectorStore } from './vector-store';
export { EmbeddingsService } from './embeddings';
export { RAGDocumentProcessor } from './document-processor';

// 🔄 TYPES
export type { 
  RAGEngine, 
  RAGQuery, 
  RAGResult, 
  DocumentChunk
} from './types';

// 🔄 CONFIG
export { RAG_CONSTANTS } from './config';

// 🔄 ENHANCED FEATURES (Optional)
export { EnhancedRAGEngine } from './enhanced-rag-engine';
export type { 
  EnhancedRAGQuery,
  EnhancedRAGResult
} from './enhanced-rag-engine';

// 🚀 MAIN RAG INSTANCE: UnifiedFiniRAGEngine is the single source of truth
import { getUnifiedRAGEngine } from './unified-rag-engine';
export const ragEngine = getUnifiedRAGEngine(); 