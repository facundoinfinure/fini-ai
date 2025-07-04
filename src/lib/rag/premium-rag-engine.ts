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
import { PromptTemplate, ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { formatDocumentsAsString } from 'langchain/util/document';

// Types
interface ConversationMemory {
  conversationId: string;
  messages: BaseMessage[];
  context: Record<string, any>;
  lastAccessed: string;
  storeId: string;
  sessionMetadata: {
    startTime: string;
    messageCount: number;
    topics: string[];
    lastActivity: string;
  };
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
  private memoryStore: Map<string, ConversationMemory> = new Map(); // Simple in-memory store

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
   * Enhanced conversation memory management
   */
  private async getConversationMemory(conversationId: string): Promise<ConversationMemory> {
    try {
      // Try to get from cache first
      const cacheKey = `conversation:${conversationId}`;
      const cached = await this.memoryStoreGet(cacheKey);
      
      if (cached) {
        console.log(`[PREMIUM-RAG] Retrieved conversation memory from cache: ${conversationId}`);
        return cached;
      }

      // If not in cache, initialize new memory
      const memory = {
        conversationId,
        messages: [],
        context: {},
        lastAccessed: new Date().toISOString(),
        storeId: '',
        sessionMetadata: {
          startTime: new Date().toISOString(),
          messageCount: 0,
          topics: [],
          lastActivity: new Date().toISOString(),
        }
      };

      // Store in cache
      await this.memoryStoreSet(cacheKey, memory, { ttl: 3600 }); // 1 hour TTL
      
      console.log(`[PREMIUM-RAG] Created new conversation memory: ${conversationId}`);
      return memory;
    } catch (error) {
      console.error('[PREMIUM-RAG] Error managing conversation memory:', error);
      // Return default memory if error
      return {
        conversationId,
        messages: [],
        context: {},
        lastAccessed: new Date().toISOString(),
        storeId: '',
        sessionMetadata: {
          startTime: new Date().toISOString(),
          messageCount: 0,
          topics: [],
          lastActivity: new Date().toISOString(),
        }
      };
    }
  }

  /**
   * Enhanced memory update with topic tracking and session management
   */
  private async updateConversationMemory(
    conversationId: string,
    userMessage: string,
    aiResponse: string,
    context: Record<string, any> = {}
  ): Promise<void> {
    try {
      const memory = await this.getConversationMemory(conversationId);
      
      // Add messages to memory
      memory.messages.push(
        new HumanMessage(userMessage),
        new AIMessage(aiResponse)
      );

      // Update session metadata
      memory.sessionMetadata.messageCount += 2;
      memory.sessionMetadata.lastActivity = new Date().toISOString();
      
      // Extract and track topics from user message
      const topics = this.extractTopicsFromMessage(userMessage);
      memory.sessionMetadata.topics = [
        ...new Set([...memory.sessionMetadata.topics, ...topics])
      ].slice(0, 10); // Keep only last 10 topics

      // Update context with new information
      memory.context = {
        ...memory.context,
        ...context,
        lastQuery: userMessage,
        lastResponse: aiResponse,
        queryCount: (memory.context.queryCount || 0) + 1,
      };

      memory.lastAccessed = new Date().toISOString();

      // Keep only last 20 messages to prevent memory bloat
      if (memory.messages.length > 20) {
        memory.messages = memory.messages.slice(-20);
      }

      // Store updated memory
      const cacheKey = `conversation:${conversationId}`;
      await this.memoryStoreSet(cacheKey, memory, { ttl: 3600 });
      
      console.log(`[PREMIUM-RAG] Updated conversation memory: ${conversationId} (${memory.messages.length} messages, ${memory.sessionMetadata.topics.length} topics)`);
    } catch (error) {
      console.error('[PREMIUM-RAG] Error updating conversation memory:', error);
    }
  }

  /**
   * Extract topics from user message for better context tracking
   */
  private extractTopicsFromMessage(message: string): string[] {
    const topics: string[] = [];
    const lowerMessage = message.toLowerCase();
    
    // E-commerce specific topics
    const topicPatterns = {
      'productos': /\b(producto|productos|artículo|artículos|item|items)\b/g,
      'ventas': /\b(venta|ventas|vender|vendido|vendidos)\b/g,
      'clientes': /\b(cliente|clientes|comprador|compradores|usuario|usuarios)\b/g,
      'inventario': /\b(stock|inventario|existencia|disponible|disponibilidad)\b/g,
      'precios': /\b(precio|precios|costo|costos|valor|valores)\b/g,
      'categorías': /\b(categoría|categorías|tipo|tipos|sección|secciones)\b/g,
      'órdenes': /\b(orden|órdenes|pedido|pedidos|compra|compras)\b/g,
      'analytics': /\b(análisis|estadística|estadísticas|reporte|reportes|métrica|métricas)\b/g,
      'marketing': /\b(marketing|promoción|promociones|campaña|campañas|publicidad)\b/g,
      'envíos': /\b(envío|envíos|entrega|entregas|shipping|logística)\b/g,
    };

    for (const [topic, pattern] of Object.entries(topicPatterns)) {
      if (pattern.test(lowerMessage)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  /**
   * Enhanced context building with conversation history
   */
  private async buildEnhancedContext(
    query: string,
    storeId: string,
    conversationId: string,
    relevantDocs: Document[]
  ): Promise<string> {
    const memory = await this.getConversationMemory(conversationId);
    
    const contextParts = [];
    
    // Add store context
    contextParts.push('=== INFORMACIÓN DE LA TIENDA ===');
    if (relevantDocs.length > 0) {
      const storeDoc = relevantDocs.find(doc => doc.metadata.type === 'store');
      if (storeDoc) {
        contextParts.push(storeDoc.pageContent);
      }
    }
    
    // Add conversation history context
    if (memory.messages.length > 0) {
      contextParts.push('\n=== HISTORIAL DE CONVERSACIÓN ===');
      const recentMessages = memory.messages.slice(-6); // Last 3 exchanges
      const historyContext = recentMessages.map(msg => {
        const role = msg instanceof HumanMessage ? 'Usuario' : 'Asistente';
        const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        return `${role}: ${content}`;
      }).join('\n');
      contextParts.push(historyContext);
    }
    
    // Add session context
    if (memory.sessionMetadata.topics.length > 0) {
      contextParts.push('\n=== TEMAS DE LA SESIÓN ===');
      contextParts.push(`Temas discutidos: ${memory.sessionMetadata.topics.join(', ')}`);
    }
    
    // Add relevant documents by type
    const docsByType = this.groupDocumentsByType(relevantDocs);
    
    if (docsByType.products.length > 0) {
      contextParts.push('\n=== PRODUCTOS RELEVANTES ===');
      docsByType.products.slice(0, 5).forEach(doc => {
        contextParts.push(doc.pageContent);
      });
    }
    
    if (docsByType.orders.length > 0) {
      contextParts.push('\n=== ÓRDENES RELEVANTES ===');
      docsByType.orders.slice(0, 3).forEach(doc => {
        contextParts.push(doc.pageContent);
      });
    }
    
    if (docsByType.analytics.length > 0) {
      contextParts.push('\n=== ANALYTICS RELEVANTES ===');
      docsByType.analytics.slice(0, 2).forEach(doc => {
        contextParts.push(doc.pageContent);
      });
    }
    
    if (docsByType.customers.length > 0) {
      contextParts.push('\n=== INFORMACIÓN DE CLIENTES ===');
      docsByType.customers.slice(0, 3).forEach(doc => {
        contextParts.push(doc.pageContent);
      });
    }
    
    return contextParts.join('\n\n');
  }

  /**
   * Group documents by type for better context organization
   */
  private groupDocumentsByType(docs: Document[]): Record<string, Document[]> {
    const grouped: Record<string, Document[]> = {
      store: [],
      products: [],
      orders: [],
      customers: [],
      analytics: [],
      conversations: [],
    };

    docs.forEach(doc => {
      const type = doc.metadata.type || 'store';
      if (grouped[type]) {
        grouped[type].push(doc);
      } else {
        grouped.store.push(doc);
      }
    });

    return grouped;
  }

  /**
   * Enhanced prompt with conversation awareness
   */
  private buildConversationAwarePrompt(
    query: string,
    context: string,
    memory: ConversationMemory
  ): string {
    const isFirstMessage = memory.messages.length === 0;
    const hasRecentContext = memory.messages.length > 0;
    
    let prompt = `Eres un asistente AI especializado en e-commerce y análisis de datos para tiendas online de Argentina. 
Tu trabajo es ayudar a los dueños de tienda a entender y optimizar su negocio.

CONTEXTO DE LA TIENDA:
${context}

CONSULTA ACTUAL: "${query}"
`;

    if (isFirstMessage) {
      prompt += `
INSTRUCCIONES PARA PRIMERA INTERACCIÓN:
- Saluda de manera amigable y profesional
- Presenta brevemente las capacidades del sistema
- Responde la consulta de manera completa y útil
- Ofrece sugerencias de próximos pasos o análisis adicionales
`;
    } else {
      prompt += `
INSTRUCCIONES PARA CONVERSACIÓN CONTINUA:
- Mantén el contexto de la conversación previa
- Haz referencias a información mencionada anteriormente cuando sea relevante
- Construye sobre las respuestas anteriores
- Sé más directo y específico (ya estableciste el contexto)
`;
    }

    if (hasRecentContext && memory.sessionMetadata.topics.length > 0) {
      prompt += `
CONTEXTO DE LA SESIÓN:
- Temas ya discutidos: ${memory.sessionMetadata.topics.join(', ')}
- Mensajes en la sesión: ${memory.sessionMetadata.messageCount}
- Puedes hacer referencias a estos temas si son relevantes para la consulta actual
`;
    }

    prompt += `
ESTILO DE RESPUESTA:
- Usa un tono profesional pero amigable
- Proporciona datos específicos y números cuando estén disponibles
- Incluye insights y recomendaciones prácticas
- Usa formato claro con viñetas o listas cuando sea apropiado
- Responde en español argentino
- Si no tienes información específica, sé honesto y sugiere cómo obtenerla

IMPORTANTE:
- Basa tus respuestas SOLO en la información proporcionada en el contexto
- Si no tienes datos suficientes, dilo claramente
- Sugiere análisis adicionales que podrían ser útiles
- Mantén la consistencia con respuestas anteriores en esta conversación
`;

    return prompt;
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
      const memory = await this.getConversationMemory(conversationId);
      const chatHistory = this.formatChatHistory(memory.messages);

      // 2. Enhanced retrieval
      const relevantDocs = await this.enhancedRetrieval(query, storeId, config);

      // 3. Format context
      const context = await this.buildEnhancedContext(query, storeId, conversationId, relevantDocs);

      // 4. Create enhanced prompt
      const prompt = this.buildConversationAwarePrompt(query, context, memory);

      // 5. Create retrieval chain with enhanced context
      const contextualPrompt = this.buildConversationAwarePrompt(query, context, memory);
      
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", contextualPrompt],
        ["human", "{question}"]
      ]);

      const chain = RunnableSequence.from([
        {
          context: () => context,
          chat_history: () => this.formatChatHistory(memory.messages),
          question: new RunnablePassthrough(),
        },
        promptTemplate,
        this.llm,
        new StringOutputParser(),
      ]);

      // 6. Generate response
      const response = await chain.invoke({ question: query });

      // 7. Calculate confidence based on available data
      const confidence = relevantDocs.length > 0 
        ? Math.min(0.9, 0.3 + (relevantDocs.length * 0.1))
        : 0.2;

      // 8. Update conversation memory
      await this.updateConversationMemory(conversationId, query, response);

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

      const memory = await this.getConversationMemory(conversationId);
      const chatHistory = this.formatChatHistory(memory.messages);
      const relevantDocs = await this.enhancedRetrieval(query, storeId, config);
      const context = await this.buildEnhancedContext(query, storeId, conversationId, relevantDocs);

      // Create streaming prompt template
      const contextualPrompt = this.buildConversationAwarePrompt(query, context, memory);
      const promptTemplate = ChatPromptTemplate.fromMessages([
        ["system", contextualPrompt],
        ["human", "{question}"]
      ]);

      // Create streaming chain
      const chain = RunnableSequence.from([
        {
          context: () => context,
          chat_history: () => chatHistory,
          question: new RunnablePassthrough(),
        },
        promptTemplate,
        this.llm,
        new StringOutputParser(),
      ]);

      // Stream response
      let fullResponse = '';
      const stream = await chain.stream({ question: query });

      for await (const chunk of stream) {
        fullResponse += chunk;
        onToken(chunk);
      }

      // Update memory and calculate confidence
      await this.updateConversationMemory(conversationId, query, fullResponse);

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
   * Get conversation summary for context
   */
  async getConversationSummary(conversationId: string): Promise<string> {
    const memory = await this.getConversationMemory(conversationId);
    
    if (!memory.messages || memory.messages.length === 0) {
      return 'Nueva conversación';
    }

    const lastMessages = memory.messages.slice(-4).map(msg => {
      const role = msg instanceof HumanMessage ? 'Usuario' : 'Asistente';
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return `${role}: ${content.substring(0, 100)}...`;
    }).join('\n');

    return `Últimos mensajes:\n${lastMessages}`;
  }

  /**
   * Format chat history for conversation context
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
   * Simple memory store implementation
   */
  private async memoryStoreGet(key: string): Promise<ConversationMemory | null> {
    return this.memoryStore.get(key) || null;
  }

  private async memoryStoreSet(key: string, value: ConversationMemory, options?: { ttl?: number }): Promise<void> {
    this.memoryStore.set(key, value);
    
    // Simple TTL implementation
    if (options?.ttl) {
      setTimeout(() => {
        this.memoryStore.delete(key);
      }, options.ttl * 1000);
    }
  }
}

// Export singleton instance
export const premiumRAG = new PremiumRAGEngine();

console.log('[PREMIUM-RAG] Premium RAG engine loaded with conversation memory'); 