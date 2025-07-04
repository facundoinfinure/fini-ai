/**
 * 🧠 Conversation Memory System with LangChain
 * Manages conversation context and memory for enhanced agent interactions
 */

import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { ChatOpenAI } from '@langchain/openai';
import { Document } from '@langchain/core/documents';

export interface ConversationContext {
  conversationId: string;
  userId: string;
  storeId: string;
  agentType: string;
  lastMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export interface MemoryConfig {
  maxTokenLimit: number;
  returnMessages: boolean;
  memoryKey: string;
}

export class ConversationMemoryManager {
  private memoryCache: Map<string, ConversationSummaryBufferMemory> = new Map();
  private llm: ChatOpenAI;
  private defaultConfig: MemoryConfig = {
    maxTokenLimit: 1000,
    returnMessages: true,
    memoryKey: 'chat_history',
  };

  constructor() {
    this.llm = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Gets or creates memory for a conversation
   */
  async getMemory(conversationId: string, config?: Partial<MemoryConfig>): Promise<ConversationSummaryBufferMemory> {
    const cacheKey = conversationId;
    
    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey)!;
    }

    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Temporary fix for LangChain version compatibility
    const memory = new ConversationSummaryBufferMemory({
      llm: this.llm as any, // Type cast to fix version incompatibility
      maxTokenLimit: finalConfig.maxTokenLimit,
      returnMessages: finalConfig.returnMessages,
      memoryKey: finalConfig.memoryKey,
    });

    // Load existing conversation history
    await this.loadExistingHistory(conversationId, memory);

    this.memoryCache.set(cacheKey, memory);
    
    // Auto-cleanup after 1 hour
    setTimeout(() => {
      this.memoryCache.delete(cacheKey);
    }, 60 * 60 * 1000);

    return memory;
  }

  /**
   * Loads conversation history from database into memory
   */
  private async loadExistingHistory(conversationId: string, memory: ConversationSummaryBufferMemory): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content, created_at, metadata')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20); // Last 20 messages

      if (messages && messages.length > 0) {
        for (const message of messages) {
          if (message.role === 'user') {
            await memory.saveContext(
              { input: message.content },
              { output: '' }
            );
          } else if (message.role === 'assistant') {
            // Find the corresponding user message
            const userMessage = messages.find(m => 
              m.role === 'user' && 
              new Date(m.created_at) < new Date(message.created_at)
            );
            
            if (userMessage) {
              await memory.saveContext(
                { input: userMessage.content },
                { output: message.content }
              );
            }
          }
        }
        
        console.log(`[MEMORY] 🧠 Loaded ${messages.length} messages for conversation ${conversationId}`);
      }
    } catch (error) {
      console.warn('[MEMORY] Failed to load conversation history:', error);
    }
  }

  /**
   * Saves a conversation turn to memory
   */
  async saveConversationTurn(
    conversationId: string,
    userInput: string,
    assistantOutput: string,
    metadata?: any
  ): Promise<void> {
    try {
      const memory = await this.getMemory(conversationId);
      
      await memory.saveContext(
        { input: userInput },
        { output: assistantOutput }
      );

      // Also save to database
      await this.saveToDatabase(conversationId, userInput, assistantOutput, metadata);
      
      console.log(`[MEMORY] 💾 Saved conversation turn for ${conversationId}`);
    } catch (error) {
      console.error('[MEMORY] Failed to save conversation turn:', error);
    }
  }

  /**
   * Gets conversation context as a formatted string
   */
  async getConversationContext(conversationId: string): Promise<string> {
    try {
      const memory = await this.getMemory(conversationId);
      const buffer = await memory.loadMemoryVariables({});
      
      return buffer.chat_history || '';
    } catch (error) {
      console.warn('[MEMORY] Failed to get conversation context:', error);
      return '';
    }
  }

  /**
   * Gets conversation summary
   */
  async getConversationSummary(conversationId: string): Promise<string> {
    try {
      const memory = await this.getMemory(conversationId);
      
      // Access the internal summary if available
      if (memory.movingSummaryBuffer) {
        return memory.movingSummaryBuffer;
      }
      
      return 'Nueva conversación';
    } catch (error) {
      console.warn('[MEMORY] Failed to get conversation summary:', error);
      return '';
    }
  }

  /**
   * Clears memory for a conversation
   */
  async clearMemory(conversationId: string): Promise<void> {
    try {
      const memory = await this.getMemory(conversationId);
      await memory.clear();
      this.memoryCache.delete(conversationId);
      
      console.log(`[MEMORY] 🗑️ Cleared memory for conversation ${conversationId}`);
    } catch (error) {
      console.error('[MEMORY] Failed to clear memory:', error);
    }
  }

  /**
   * Gets enriched context for RAG queries
   */
  async getEnrichedContext(conversationId: string, currentQuery: string): Promise<{
    conversationHistory: string;
    relevantTopics: string[];
    userIntent: string;
    contextualCues: string[];
  }> {
    try {
      const memory = await this.getMemory(conversationId);
      const buffer = await memory.loadMemoryVariables({});
      const history = buffer.chat_history || '';

      // Extract relevant topics from conversation
      const topics = this.extractTopics(history + ' ' + currentQuery);
      
      // Analyze user intent
      const intent = await this.analyzeUserIntent(currentQuery, history);
      
      // Find contextual cues
      const cues = this.extractContextualCues(history, currentQuery);

      return {
        conversationHistory: history,
        relevantTopics: topics,
        userIntent: intent,
        contextualCues: cues,
      };
    } catch (error) {
      console.warn('[MEMORY] Failed to get enriched context:', error);
      return {
        conversationHistory: '',
        relevantTopics: [],
        userIntent: 'unknown',
        contextualCues: [],
      };
    }
  }

  /**
   * Saves conversation to database
   */
  private async saveToDatabase(
    conversationId: string,
    userInput: string,
    assistantOutput: string,
    metadata?: any
  ): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();

      const timestamp = new Date().toISOString();

      // Save user message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userInput,
        created_at: timestamp,
        metadata: { ...metadata, memory_enhanced: true },
      });

      // Save assistant response
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantOutput,
        created_at: timestamp,
        metadata: { ...metadata, memory_enhanced: true },
      });
    } catch (error) {
      console.warn('[MEMORY] Failed to save to database:', error);
    }
  }

  /**
   * Extracts relevant topics from text
   */
  private extractTopics(text: string): string[] {
    const ecommerceTopics = [
      'productos', 'ventas', 'analytics', 'clientes', 'órdenes',
      'inventario', 'marketing', 'promociones', 'categorías',
      'precios', 'descuentos', 'envíos', 'pagos', 'reportes'
    ];

    const foundTopics = ecommerceTopics.filter(topic =>
      text.toLowerCase().includes(topic)
    );

    return foundTopics;
  }

  /**
   * Analyzes user intent using simple heuristics
   */
  private async analyzeUserIntent(query: string, history: string): Promise<string> {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('cómo') || lowerQuery.includes('como')) return 'how_to';
    if (lowerQuery.includes('cuánto') || lowerQuery.includes('cuanto')) return 'quantity';
    if (lowerQuery.includes('qué') || lowerQuery.includes('que')) return 'what_is';
    if (lowerQuery.includes('dónde') || lowerQuery.includes('donde')) return 'location';
    if (lowerQuery.includes('cuándo') || lowerQuery.includes('cuando')) return 'time';
    if (lowerQuery.includes('por qué') || lowerQuery.includes('porque')) return 'reason';
    if (lowerQuery.includes('mostrar') || lowerQuery.includes('ver')) return 'display';
    if (lowerQuery.includes('analizar') || lowerQuery.includes('análisis')) return 'analysis';

    return 'general_inquiry';
  }

  /**
   * Extracts contextual cues from conversation
   */
  private extractContextualCues(history: string, currentQuery: string): string[] {
    const cues: string[] = [];

    // Reference to previous topics
    if (history.includes('producto') && currentQuery.includes('venta')) {
      cues.push('product_sales_correlation');
    }

    // Time-based references
    if (currentQuery.includes('hoy') || currentQuery.includes('ahora')) {
      cues.push('current_time_reference');
    }

    // Comparison references
    if (currentQuery.includes('comparar') || currentQuery.includes('versus')) {
      cues.push('comparison_request');
    }

    // Follow-up questions
    if (currentQuery.includes('también') || currentQuery.includes('además')) {
      cues.push('follow_up_question');
    }

    return cues;
  }

  /**
   * Gets memory statistics
   */
  async getMemoryStats(): Promise<{
    activeSessions: number;
    totalMemoryUsage: number;
    avgMessagesPerSession: number;
  }> {
    return {
      activeSessions: this.memoryCache.size,
      totalMemoryUsage: this.memoryCache.size * 1000, // Estimated
      avgMessagesPerSession: 10, // Estimated
    };
  }
}

export const conversationMemoryManager = new ConversationMemoryManager(); 