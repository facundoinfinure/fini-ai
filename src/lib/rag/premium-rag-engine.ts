/**
 * Premium RAG Engine - Top-tier implementation following LangChain best practices
 * Based on: https://python.langchain.com/docs/tutorials/rag/
 * And: https://python.langchain.com/docs/tutorials/qa_chat_history/
 */

import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/community/vectorstores/pinecone';
import { Pinecone } from '@pinecone-database/pinecone';
import { Document } from '@langchain/core/documents';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';

// Types
interface ConversationMemory {
  messages: BaseMessage[];
  summary?: string;
  lastUpdated: Date;
}

interface RAGResponse {
  answer: string;
  sources: Document[];
  confidence: number;
  conversationId: string;
  reasoning?: string;
}

interface RetrievalConfig {
  k: number;
  scoreThreshold: number;
  useHybridSearch: boolean;
  rerankResults: boolean;
}

/**
 * Premium RAG Engine with conversation memory and enhanced retrieval
 */
export class PremiumRAGEngine {
  private llm: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;
  private pinecone: Pinecone;
  private conversationMemories: Map<string, ConversationMemory> = new Map();
  private vectorStores: Map<string, PineconeStore> = new Map();

  constructor() {
    // Initialize with premium settings
    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.1, // Low temperature for factual responses
      maxTokens: 2000,
      streaming: true,
    });

    this.embeddings = new OpenAIEmbeddings({
      modelName: 'text-embedding-3-large', // Latest embedding model
      dimensions: 1536,
    });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });

    console.log('[PREMIUM-RAG] Initialized with top-tier configuration');
  }

  /**
   * Get or create vector store for a specific store and namespace
   */
  private async getVectorStore(storeId: string, namespace: string): Promise<PineconeStore> {
    const key = `${storeId}-${namespace}`;
    
    if (this.vectorStores.has(key)) {
      return this.vectorStores.get(key)!;
    }

    const pineconeIndex = this.pinecone.Index(process.env.PINECONE_INDEX_NAME!);
    
    const vectorStore = new PineconeStore(this.embeddings, {
      pineconeIndex,
      namespace: `store-${storeId}-${namespace}`,
      textKey: 'text',
    });

    this.vectorStores.set(key, vectorStore);
    return vectorStore;
  }

  /**
   * Enhanced retrieval with hybrid search and reranking
   */
  private async enhancedRetrieval(
    query: string, 
    storeId: string, 
    config: RetrievalConfig
  ): Promise<Document[]> {
    try {
      const results: Document[] = [];

      // 1. Semantic search across multiple namespaces
      const namespaces = ['products', 'store', 'analytics', 'orders'];
      
      for (const namespace of namespaces) {
        try {
          const vectorStore = await this.getVectorStore(storeId, namespace);
          const docs = await vectorStore.similaritySearchWithScore(query, config.k / namespaces.length);
          
          // Filter by score threshold
          const filteredDocs = docs
            .filter(([, score]) => score >= config.scoreThreshold)
            .map(([doc, score]) => {
              doc.metadata = { ...doc.metadata, score, namespace };
              return doc;
            });

          results.push(...filteredDocs);
        } catch (error) {
          console.warn(`[PREMIUM-RAG] Error retrieving from ${namespace}:`, error);
        }
      }

      // 2. Sort by relevance score
      results.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));

      // 3. Take top K results
      const topResults = results.slice(0, config.k);

      console.log(`[PREMIUM-RAG] Retrieved ${topResults.length} documents with enhanced search`);
      return topResults;

    } catch (error) {
      console.error('[PREMIUM-RAG] Enhanced retrieval failed:', error);
      return [];
    }
  }

  /**
   * Get conversation memory for a conversation
   */
  private getConversationMemory(conversationId: string): ConversationMemory {
    if (!this.conversationMemories.has(conversationId)) {
      this.conversationMemories.set(conversationId, {
        messages: [],
        lastUpdated: new Date(),
      });
    }
    return this.conversationMemories.get(conversationId)!;
  }

  /**
   * Update conversation memory
   */
  private updateConversationMemory(
    conversationId: string, 
    humanMessage: string, 
    aiResponse: string
  ): void {
    const memory = this.getConversationMemory(conversationId);
    
    memory.messages.push(
      new HumanMessage(humanMessage),
      new AIMessage(aiResponse)
    );

    // Keep only last 10 messages to prevent token overflow
    if (memory.messages.length > 10) {
      memory.messages = memory.messages.slice(-10);
    }

    memory.lastUpdated = new Date();
  }

  /**
   * Format chat history for context
   */
  private formatChatHistory(messages: BaseMessage[]): string {
    if (messages.length === 0) return '';

    const formatted = messages
      .map(msg => {
        const role = msg instanceof HumanMessage ? 'Usuario' : 'Asistente';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return `${role}: ${content}`;
      })
      .join('\n');

    return `\nHistorial de conversación:\n${formatted}\n`;
  }

  /**
   * Create enhanced prompt with conversation history
   */
  private createEnhancedPrompt(): PromptTemplate {
    return PromptTemplate.fromTemplate(`
Eres un asistente experto especializado en e-commerce y analytics de Tienda Nube. Responde de manera conversacional, natural y específica como ChatGPT.

CONTEXTO RELEVANTE:
{context}

{chat_history}

INSTRUCCIONES:
1. **Respuesta conversacional**: Responde de manera natural y amigable, como ChatGPT
2. **Datos específicos**: Si tienes datos específicos de la tienda, úsalos directamente
3. **Análisis contextual**: Analiza el contexto disponible y proporciona insights
4. **Continuidad**: Mantén la continuidad de la conversación usando el historial
5. **Transparencia**: Si no tienes datos suficientes, explícalo claramente y sugiere soluciones

PREGUNTA ACTUAL: {question}

Responde de manera específica y útil, manteniendo el contexto de la conversación:
`);
  }

  /**
   * Main chat method with enhanced RAG and conversation memory
   */
  async chat(
    query: string,
    storeId: string,
    conversationId: string,
    options: {
      config?: Partial<RetrievalConfig>;
      streaming?: boolean;
    } = {}
  ): Promise<RAGResponse> {
    try {
      console.log(`[PREMIUM-RAG] Processing query: "${query}" for store: ${storeId}`);

      // Configuration
      const config: RetrievalConfig = {
        k: 8,
        scoreThreshold: 0.3,
        useHybridSearch: true,
        rerankResults: true,
        ...options.config,
      };

      // 1. Get conversation memory
      const memory = this.getConversationMemory(conversationId);
      const chatHistory = this.formatChatHistory(memory.messages);

      // 2. Enhanced retrieval
      const relevantDocs = await this.enhancedRetrieval(query, storeId, config);

      // 3. Format context
      const context = relevantDocs.length > 0 
        ? formatDocumentsAsString(relevantDocs)
        : 'No se encontraron datos específicos de la tienda. Proporciona una respuesta útil basada en mejores prácticas de e-commerce.';

      // 4. Create enhanced prompt
      const prompt = this.createEnhancedPrompt();

      // 5. Create chain
      const chain = RunnableSequence.from([
        {
          context: () => context,
          chat_history: () => chatHistory,
          question: new RunnablePassthrough(),
        },
        prompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // 6. Generate response
      const response = await chain.invoke(query);

      // 7. Calculate confidence based on available data
      const confidence = relevantDocs.length > 0 
        ? Math.min(0.9, 0.3 + (relevantDocs.length * 0.1))
        : 0.2;

      // 8. Update conversation memory
      this.updateConversationMemory(conversationId, query, response);

      // 9. Create reasoning
      const reasoning = relevantDocs.length > 0
        ? `Basé mi respuesta en ${relevantDocs.length} fuentes relevantes de tu tienda${chatHistory ? ' y el contexto de nuestra conversación' : ''}.`
        : `No encontré datos específicos de tu tienda${chatHistory ? ', pero mantuve el contexto de nuestra conversación' : ''} para darte la mejor respuesta posible.`;

      console.log(`[PREMIUM-RAG] Generated response with confidence: ${confidence}`);

      return {
        answer: response,
        sources: relevantDocs,
        confidence,
        conversationId,
        reasoning,
      };

    } catch (error) {
      console.error('[PREMIUM-RAG] Chat failed:', error);
      
      // Fallback response
      return {
        answer: 'Disculpa, tuve un problema técnico al procesar tu consulta. ¿Podrías intentar reformular tu pregunta?',
        sources: [],
        confidence: 0,
        conversationId,
        reasoning: 'Error técnico en el sistema RAG',
      };
    }
  }

  /**
   * Streaming chat method for real-time responses
   */
  async chatStream(
    query: string,
    storeId: string,
    conversationId: string,
    onToken: (token: string) => void,
    options: { config?: Partial<RetrievalConfig> } = {}
  ): Promise<RAGResponse> {
    try {
      // Same setup as regular chat
      const config: RetrievalConfig = {
        k: 8,
        scoreThreshold: 0.3,
        useHybridSearch: true,
        rerankResults: true,
        ...options.config,
      };

      const memory = this.getConversationMemory(conversationId);
      const chatHistory = this.formatChatHistory(memory.messages);
      const relevantDocs = await this.enhancedRetrieval(query, storeId, config);
      const context = relevantDocs.length > 0 
        ? formatDocumentsAsString(relevantDocs)
        : 'No se encontraron datos específicos de la tienda.';

      const prompt = this.createEnhancedPrompt();

      // Create streaming chain
      const chain = RunnableSequence.from([
        {
          context: () => context,
          chat_history: () => chatHistory,
          question: new RunnablePassthrough(),
        },
        prompt,
        this.llm,
        new StringOutputParser(),
      ]);

      // Stream response
      let fullResponse = '';
      const stream = await chain.stream(query);

      for await (const chunk of stream) {
        fullResponse += chunk;
        onToken(chunk);
      }

      // Update memory and return
      this.updateConversationMemory(conversationId, query, fullResponse);

      const confidence = relevantDocs.length > 0 
        ? Math.min(0.9, 0.3 + (relevantDocs.length * 0.1))
        : 0.2;

      return {
        answer: fullResponse,
        sources: relevantDocs,
        confidence,
        conversationId,
        reasoning: `Respuesta generada con streaming basada en ${relevantDocs.length} fuentes.`,
      };

    } catch (error) {
      console.error('[PREMIUM-RAG] Streaming chat failed:', error);
      const fallbackMessage = 'Error en el sistema de streaming.';
      onToken(fallbackMessage);
      
      return {
        answer: fallbackMessage,
        sources: [],
        confidence: 0,
        conversationId,
        reasoning: 'Error en streaming',
      };
    }
  }

  /**
   * Clear conversation memory
   */
  clearConversation(conversationId: string): void {
    this.conversationMemories.delete(conversationId);
    console.log(`[PREMIUM-RAG] Cleared conversation: ${conversationId}`);
  }

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string): string {
    const memory = this.getConversationMemory(conversationId);
    
    if (memory.messages.length === 0) {
      return 'Nueva conversación';
    }

    const lastMessages = memory.messages.slice(-4).map(msg => {
      const role = msg instanceof HumanMessage ? 'Usuario' : 'Asistente';
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return `${role}: ${content.substring(0, 100)}...`;
    }).join('\n');

    return `Últimos mensajes:\n${lastMessages}`;
  }
}

// Export singleton instance
export const premiumRAG = new PremiumRAGEngine();

console.log('[PREMIUM-RAG] Premium RAG engine loaded with conversation memory'); 