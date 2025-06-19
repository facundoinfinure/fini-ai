/**
 * RAG Engine Configuration
 * Centralizes all configuration for the RAG system
 */

import type { RAGEngineConfig } from './types';

export const RAG_CONFIG: RAGEngineConfig = {
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    environment: process.env.PINECONE_ENVIRONMENT || 'gcp-starter',
    indexName: process.env.PINECONE_INDEX_NAME || 'fini-ai-store-data',
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'text-embedding-3-small', // Más económico y eficiente
    maxTokens: 8000,
  },
  search: {
    defaultTopK: 5,
    defaultThreshold: 0.7,
    maxChunkSize: 1000,
    chunkOverlap: 100,
  },
};

/**
 * Validates that all required environment variables are set
 */
export const validateRAGConfig = (): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} => {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required variables
  if (!RAG_CONFIG.pinecone.apiKey) missing.push('PINECONE_API_KEY');
  if (!RAG_CONFIG.openai.apiKey) missing.push('OPENAI_API_KEY');

  // Optional but recommended
  if (!process.env.PINECONE_ENVIRONMENT) {
    warnings.push('PINECONE_ENVIRONMENT not set, using default: gcp-starter');
  }
  if (!process.env.PINECONE_INDEX_NAME) {
    warnings.push('PINECONE_INDEX_NAME not set, using default: fini-ai-store-data');
  }

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
};

/**
 * Constants for RAG operations
 */
export const RAG_CONSTANTS = {
  // Embedding dimensions for OpenAI text-embedding-3-small
  EMBEDDING_DIMENSION: 1536,
  
  // Document types with their processing priorities
  DOCUMENT_TYPES: {
    product: { priority: 1, ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 días
    order: { priority: 2, ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 días
    customer: { priority: 3, ttl: 90 * 24 * 60 * 60 * 1000 }, // 90 días
    store: { priority: 1, ttl: 24 * 60 * 60 * 1000 }, // 1 día
    analytics: { priority: 2, ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 días
    conversation: { priority: 3, ttl: 30 * 24 * 60 * 60 * 1000 }, // 30 días
  },
  
  // Similarity thresholds by query type
  SIMILARITY_THRESHOLDS: {
    analytics: 0.8,
    customer_service: 0.75,
    marketing: 0.7,
    orchestrator: 0.72,
    general: 0.72,
  },
  
  // Rate limits
  RATE_LIMITS: {
    embeddings_per_minute: 3000,
    searches_per_minute: 100,
    upserts_per_minute: 50,
  },
  
  // Namespace patterns for Pinecone
  NAMESPACES: {
    store: (storeId: string) => `store-${storeId}`,
    products: (storeId: string) => `store-${storeId}-products`,
    orders: (storeId: string) => `store-${storeId}-orders`,
    customers: (storeId: string) => `store-${storeId}-customers`,
    analytics: (storeId: string) => `store-${storeId}-analytics`,
    conversations: (storeId: string) => `store-${storeId}-conversations`,
  },
} as const; 