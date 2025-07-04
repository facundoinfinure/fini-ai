/**
 * LangChain Retrieval QA System
 * Advanced question-answering with retrieval augmentation, streaming, and memory
 * Implements best practices from LangChain documentation
 */

import { Document } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { ChatOpenAI } from '@langchain/openai';
import { RetrievalQAChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';
import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnablePassthrough, RunnableMap } from '@langchain/core/runnables';

import { FiniPineconeVectorStore, VectorStoreFactory } from './langchain-vectorstore';
import { LANGCHAIN_CONFIG, LangChainFactory, getAgentThreshold, type RAGAgentType } from './langchain-config';

/**
 * Context for RAG queries
 */
export interface RAGContext {
  storeId: string;
  userId: string;
  conversationId?: string;
  agentType: RAGAgentType;
  language?: 'es' | 'en';
}

/**
 * Enhanced retriever that supports multiple namespaces and filtering
 */
export class MultiNamespaceRetriever extends BaseRetriever {
  lc_namespace: string[] = ['fini', 'retrievers', 'multi_namespace'];
  
  private vectorStores: Map<string, FiniPineconeVectorStore> = new Map();
  private storeId: string;
  private k: number;
  private scoreThreshold: number;
  private searchType: 'similarity' | 'mmr';

  constructor(
    storeId: string,
    options: {
      k?: number;
      scoreThreshold?: number;
      searchType?: 'similarity' | 'mmr';
    } = {}
  ) {
    super();
    this.storeId = storeId;
    this.k = options.k ?? LANGCHAIN_CONFIG.retrieval.topK;
    this.scoreThreshold = options.scoreThreshold ?? LANGCHAIN_CONFIG.retrieval.scoreThreshold;
    this.searchType = options.searchType ?? LANGCHAIN_CONFIG.retrieval.searchType;
  }

  /**
   * Initialize vector stores for different data types
   */
  async initialize(): Promise<void> {
    const dataTypes = ['store', 'products', 'orders', 'customers', 'analytics'] as const;
    
    for (const dataType of dataTypes) {
      try {
        const vectorStore = await VectorStoreFactory.createForStore(this.storeId, dataType);
        this.vectorStores.set(dataType, vectorStore);
      } catch (error) {
        console.warn(`[MULTI-RETRIEVER] Failed to initialize ${dataType} vector store:`, error);
      }
    }

    console.log(`[MULTI-RETRIEVER] Initialized ${this.vectorStores.size} vector stores for store: ${this.storeId}`);
  }

  /**
   * Get relevant documents across all namespaces
   */
  async getRelevantDocuments(query: string): Promise<Document[]> {
    if (this.vectorStores.size === 0) {
      await this.initialize();
    }

    const allResults: Array<[Document, number]> = [];

    // Search across all initialized vector stores
    for (const [dataType, vectorStore] of this.vectorStores) {
      try {
        const results = await vectorStore.similaritySearchWithScore(
          query,
          this.k,
          undefined,
          {
            scoreThreshold: this.scoreThreshold,
          }
        );

        // Add data type to metadata
        const enhancedResults = results.map(([doc, score]): [Document, number] => [
          new Document({
            pageContent: doc.pageContent,
            metadata: {
              ...doc.metadata,
              dataType,
              namespace: `store-${this.storeId}-${dataType}`,
            },
          }),
          score,
        ]);

        allResults.push(...enhancedResults);
        console.log(`[MULTI-RETRIEVER] Found ${results.length} results from ${dataType} namespace`);
      } catch (error) {
        console.warn(`[MULTI-RETRIEVER] Search failed in ${dataType} namespace:`, error);
      }
    }

    // Sort by score and apply MMR if needed
    allResults.sort(([, scoreA], [, scoreB]) => scoreB - scoreA);
    
    if (this.searchType === 'mmr' && allResults.length > this.k) {
      return this.applyMMR(allResults).slice(0, this.k);
    }

    return allResults.slice(0, this.k).map(([doc]) => doc);
  }

  /**
   * Apply Maximum Marginal Relevance for diversity
   */
  private applyMMR(results: Array<[Document, number]>): Document[] {
    // Simplified MMR implementation
    const selected: Document[] = [];
    const remaining = [...results];

    // Select highest scoring first
    if (remaining.length > 0) {
      selected.push(remaining.shift()![0]);
    }

    // Select remaining based on diversity
    while (selected.length < this.k && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const [candidate, relevanceScore] = remaining[i];
        
        // Calculate diversity score (simplified)
        let maxSimilarity = 0;
        for (const selectedDoc of selected) {
          const overlap = this.calculateContentOverlap(candidate.pageContent, selectedDoc.pageContent);
          maxSimilarity = Math.max(maxSimilarity, overlap);
        }

        const mmrScore = LANGCHAIN_CONFIG.retrieval.mmrDiversityBias * relevanceScore - 
                        (1 - LANGCHAIN_CONFIG.retrieval.mmrDiversityBias) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0][0]);
    }

    return selected;
  }

  /**
   * Calculate content overlap for MMR
   */
  private calculateContentOverlap(content1: string, content2: string): number {
    const words1 = new Set(content1.toLowerCase().split(/\s+/));
    const words2 = new Set(content2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }
}

/**
 * Advanced RAG QA System with streaming and memory
 */
export class FiniRetrievalQA {
  public retriever: MultiNamespaceRetriever;
  private llm: ChatOpenAI;
  private memory: ConversationSummaryBufferMemory;
  private qaChain: RunnableSequence<any, any>;
  private context: RAGContext;

  constructor(context: RAGContext) {
    this.context = context;
    this.retriever = new MultiNamespaceRetriever(context.storeId, {
      scoreThreshold: getAgentThreshold(context.agentType),
    });
    this.llm = LangChainFactory.createChatModel(true); // Enable streaming
    this.memory = new ConversationSummaryBufferMemory({
      llm: this.llm as any, // Type cast to fix version incompatibility
      maxTokenLimit: LANGCHAIN_CONFIG.memory.maxTokenLimit,
      memoryKey: LANGCHAIN_CONFIG.memory.memoryKey,
      returnMessages: LANGCHAIN_CONFIG.memory.returnMessages,
    });
    
    this.qaChain = this.createQAChain();
  }

  /**
   * Create the QA chain with enhanced prompts
   */
  private createQAChain() {
    const qaPrompt = PromptTemplate.fromTemplate(`
Eres un asistente especializado de ecommerce para Tienda Nube. Tu rol específico es: {agentType}.

Contexto de la tienda:
{context}

Historial de conversación:
{chat_history}

Instrucciones:
- Responde en español (Argentina) de manera profesional y amigable
- Usa el contexto proporcionado para dar respuestas precisas
- Si no tienes información suficiente, indícalo claramente
- Proporciona ejemplos concretos cuando sea posible
- Incluye recomendaciones accionables

Pregunta del usuario: {question}

Respuesta detallada:`);

    const retrieverChain = RunnablePassthrough.assign({
      context: (input: { question: string }) => 
        this.retriever.getRelevantDocuments(input.question).then(docs => 
          docs.map(doc => `[${doc.metadata.dataType}] ${doc.pageContent}`).join('\n\n')
        ),
    });

    const memoryChain = RunnablePassthrough.assign({
      chat_history: async () => {
        const messages = await this.memory.chatHistory.getMessages();
        return messages.map(msg => `${msg._getType()}: ${msg.content}`).join('\n');
      },
    });

    return RunnableSequence.from([
      memoryChain,
      retrieverChain,
      RunnablePassthrough.assign({
        agentType: () => this.context.agentType,
      }),
      qaPrompt,
      this.llm,
      new StringOutputParser(),
    ]);
  }

  /**
   * Ask a question with streaming response
   */
  async *askStreaming(question: string): AsyncGenerator<string, string, unknown> {
    try {
      console.log(`[RETRIEVAL-QA] Processing question for ${this.context.agentType}: "${question}"`);

      let fullResponse = '';
      const stream = await this.qaChain.stream({
        question,
      });

      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          fullResponse += chunk;
          yield chunk;
        }
      }

      // Save to memory
      await this.memory.saveContext(
        { input: question },
        { output: fullResponse }
      );

      console.log(`[RETRIEVAL-QA] Generated response of ${fullResponse.length} characters`);
      return fullResponse;
    } catch (error) {
      console.error('[RETRIEVAL-QA] Streaming failed:', error);
      const errorMsg = 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente.';
      yield errorMsg;
      return errorMsg;
    }
  }

  /**
   * Ask a question with regular response
   */
  async ask(question: string): Promise<{
    answer: string;
    sources: Document[];
    confidence: number;
  }> {
    try {
      console.log(`[RETRIEVAL-QA] Processing question for ${this.context.agentType}: "${question}"`);

      // Get relevant documents for sources
      const sources = await this.retriever.getRelevantDocuments(question);
      
      // Generate response
      const answer = await this.qaChain.invoke({
        question,
      });

      // Calculate confidence based on source quality
      const confidence = this.calculateConfidence(sources, question);

      // Save to memory
      await this.memory.saveContext(
        { input: question },
        { output: answer }
      );

      console.log(`[RETRIEVAL-QA] Generated response with confidence: ${confidence.toFixed(3)}`);

      return {
        answer: typeof answer === 'string' ? answer : String(answer),
        sources,
        confidence,
      };
    } catch (error) {
      console.error('[RETRIEVAL-QA] Question processing failed:', error);
      return {
        answer: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente.',
        sources: [],
        confidence: 0,
      };
    }
  }

  /**
   * Calculate confidence based on retrieval quality
   */
  private calculateConfidence(sources: Document[], question: string): number {
    if (sources.length === 0) return 0;

    const avgScore = sources.reduce((sum, doc) => {
      const score = doc.metadata.score || 0;
      return sum + score;
    }, 0) / sources.length;

    // Boost confidence if we have multiple relevant sources
    const diversityBonus = Math.min(sources.length / 5, 0.2);
    
    // Check if sources are relevant to question
    const relevanceBonus = this.checkRelevance(sources, question) ? 0.1 : 0;

    return Math.min(avgScore + diversityBonus + relevanceBonus, 1);
  }

  /**
   * Check if sources are relevant to the question
   */
  private checkRelevance(sources: Document[], question: string): boolean {
    const questionWords = question.toLowerCase().split(/\s+/);
    const sourceText = sources.map(doc => doc.pageContent.toLowerCase()).join(' ');
    
    const relevantWords = questionWords.filter(word => 
      word.length > 3 && sourceText.includes(word)
    );

    return relevantWords.length >= Math.min(questionWords.length * 0.3, 3);
  }

  /**
   * Clear conversation memory
   */
  async clearMemory(): Promise<void> {
    await this.memory.clear();
    console.log('[RETRIEVAL-QA] Conversation memory cleared');
  }

  /**
   * Get conversation history
   */
  async getHistory(): Promise<string[]> {
    const messages = await this.memory.chatHistory.getMessages();
    return messages.map(msg => `${msg._getType()}: ${msg.content}`);
  }
}

/**
 * Factory for creating QA systems
 */
export class RetrievalQAFactory {
  /**
   * Create QA system for specific context
   */
  static async create(context: RAGContext): Promise<FiniRetrievalQA> {
    const qa = new FiniRetrievalQA(context);
    
    // Initialize retriever
    await qa.retriever.initialize();
    
    console.log(`[QA-FACTORY] Created QA system for ${context.agentType} agent (store: ${context.storeId})`);
    return qa;
  }

  /**
   * Create QA system with custom retriever settings
   */
  static async createWithSettings(
    context: RAGContext,
    settings: {
      k?: number;
      scoreThreshold?: number;
      searchType?: 'similarity' | 'mmr';
    }
  ): Promise<FiniRetrievalQA> {
    const qa = new FiniRetrievalQA(context);
    qa.retriever = new MultiNamespaceRetriever(context.storeId, settings);
    
    await qa.retriever.initialize();
    
    console.log(`[QA-FACTORY] Created custom QA system for ${context.agentType} agent`);
    return qa;
  }
}

console.log('[RETRIEVAL-QA] Advanced retrieval QA system initialized'); 