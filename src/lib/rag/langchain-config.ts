/**
 * LangChain RAG Configuration
 * Advanced configuration for LangChain + Pinecone integration
 * Following best practices from LangChain documentation
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Environment validation
export const validateLangChainConfig = (): {
  isValid: boolean;
  missing: string[];
  warnings: string[];
} => {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required variables
  if (!process.env.PINECONE_API_KEY) missing.push('PINECONE_API_KEY');
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY');
  if (!process.env.PINECONE_INDEX_NAME) missing.push('PINECONE_INDEX_NAME');

  return {
    isValid: missing.length === 0,
    missing,
    warnings,
  };
};

// LangChain Configuration
export const LANGCHAIN_CONFIG = {
  // Pinecone settings
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY || '',
    indexName: process.env.PINECONE_INDEX_NAME || 'fini-ai-store-data',
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
  },
  
  // OpenAI settings optimized for embeddings and chat
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    embeddingModel: 'text-embedding-3-small', // Most cost-effective for Spanish
    chatModel: 'gpt-4o-mini', // Latest and most efficient model
    temperature: 0.1, // Low temperature for consistent responses
    maxTokens: 4000,
    streaming: true, // Enable streaming by default
  },
  
  // Text splitter configuration
  textSplitter: {
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', ''], // Spanish-optimized
    keepSeparator: true,
  },
  
  // Retrieval settings
  retrieval: {
    topK: 8, // More results for better context
    scoreThreshold: 0.3, // Lower threshold for better recall
    searchType: 'mmr' as const, // Maximum Marginal Relevance for diversity
    mmrDiversityBias: 0.7, // Balance between similarity and diversity
    returnSourceDocuments: true,
  },
  
  // Vector search settings by agent type
  agentThresholds: {
    'analytics': 0.75,
    'product_manager': 0.7,
    'customer_service': 0.65,
    'marketing': 0.6,
    'orchestrator': 0.7,
    'general': 0.65,
  },
  
  // Chain configurations
  chains: {
    maxConcurrency: 3, // Parallel processing limit
    timeout: 30000, // 30 second timeout
    retryAttempts: 2,
    retryDelay: 1000,
  },
  
  // Memory settings for conversation history
  memory: {
    maxTokenLimit: 8000, // Token limit for conversation memory
    memoryKey: 'chat_history',
    returnMessages: true,
    inputKey: 'question',
    outputKey: 'answer',
  },
  
  // Namespace patterns (matching existing system)
  namespaces: {
    store: (storeId: string) => `store-${storeId}`,
    products: (storeId: string) => `store-${storeId}-products`,
    orders: (storeId: string) => `store-${storeId}-orders`,
    customers: (storeId: string) => `store-${storeId}-customers`,
    analytics: (storeId: string) => `store-${storeId}-analytics`,
    conversations: (storeId: string) => `store-${storeId}-conversations`,
  },
} as const;

// Factory functions for creating LangChain components
export class LangChainFactory {
  /**
   * Create OpenAI embeddings instance
   */
  static createEmbeddings(): OpenAIEmbeddings {
    const config = validateLangChainConfig();
    if (!config.isValid) {
      throw new Error(`Missing required config: ${config.missing.join(', ')}`);
    }

    return new OpenAIEmbeddings({
      apiKey: LANGCHAIN_CONFIG.openai.apiKey,
      model: LANGCHAIN_CONFIG.openai.embeddingModel,
      // Optimization for batch processing
      batchSize: 512,
      maxRetries: 3,
      timeout: 30000,
    });
  }

  /**
   * Create ChatOpenAI instance with streaming
   */
  static createChatModel(streaming = true): ChatOpenAI {
    const config = validateLangChainConfig();
    if (!config.isValid) {
      throw new Error(`Missing required config: ${config.missing.join(', ')}`);
    }

    return new ChatOpenAI({
      apiKey: LANGCHAIN_CONFIG.openai.apiKey,
      model: LANGCHAIN_CONFIG.openai.chatModel,
      temperature: LANGCHAIN_CONFIG.openai.temperature,
      maxTokens: LANGCHAIN_CONFIG.openai.maxTokens,
      streaming,
      // Advanced settings for better performance
      maxRetries: 2,
      timeout: 30000,
      // Enhanced token management
      modelKwargs: {
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
      },
    });
  }

  /**
   * Create intelligent text splitter
   */
  static createTextSplitter(): RecursiveCharacterTextSplitter {
    return new RecursiveCharacterTextSplitter({
      chunkSize: LANGCHAIN_CONFIG.textSplitter.chunkSize,
      chunkOverlap: LANGCHAIN_CONFIG.textSplitter.chunkOverlap,
      separators: [...LANGCHAIN_CONFIG.textSplitter.separators],
      keepSeparator: LANGCHAIN_CONFIG.textSplitter.keepSeparator,
      // Advanced options for better Spanish text handling
      lengthFunction: (text: string) => text.length,
    });
  }

  /**
   * Create Pinecone client
   */
  static createPineconeClient(): Pinecone {
    const config = validateLangChainConfig();
    if (!config.isValid) {
      throw new Error(`Missing required config: ${config.missing.join(', ')}`);
    }

    return new Pinecone({
      apiKey: LANGCHAIN_CONFIG.pinecone.apiKey,
    });
  }
}

// Constants for better type safety
export const RAG_AGENT_TYPES = [
  'analytics',
  'product_manager',
  'customer_service',
  'marketing',
  'orchestrator',
  'general',
] as const;

export type RAGAgentType = typeof RAG_AGENT_TYPES[number];

// Utility functions
export const getAgentThreshold = (agentType: RAGAgentType): number => {
  return LANGCHAIN_CONFIG.agentThresholds[agentType] ?? LANGCHAIN_CONFIG.agentThresholds.general;
};

export const getNamespaceForStore = (storeId: string, dataType: keyof typeof LANGCHAIN_CONFIG.namespaces): string => {
  return LANGCHAIN_CONFIG.namespaces[dataType](storeId);
};

console.log(`[LANGCHAIN-CONFIG] Configuration loaded - Pinecone: ${LANGCHAIN_CONFIG.pinecone.indexName}, Model: ${LANGCHAIN_CONFIG.openai.chatModel}`); 