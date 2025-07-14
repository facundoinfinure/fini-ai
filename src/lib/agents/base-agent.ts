/**
 * Base Agent Class
 * Abstract base class for all AI agents in the system
 */

import { AGENT_CONFIG } from './config';
import type { 
  Agent, 
  AgentContext, 
  AgentResponse, 
  AgentType, 
  AgentCapability,
  AgentTypeConfig 
} from './types';

// Dynamic import to avoid Pinecone initialization during build
const getRagEngine = async () => {
  try {
    const { ragEngine } = await import('@/lib/rag');
    return ragEngine;
  } catch (error) {
    console.warn('[AGENT] RAG engine not available:', error);
    return null;
  }
};

export abstract class BaseAgent implements Agent {
  public readonly type: AgentType;
  public readonly name: string;
  public readonly description: string;
  public readonly capabilities: AgentCapability[];
  protected readonly config: AgentTypeConfig;

  constructor(
    type: AgentType,
    name: string,
    description: string,
    capabilities: AgentCapability[],
    config: AgentTypeConfig
  ) {
    this.type = type;
    this.name = name;
    this.description = description;
    this.capabilities = capabilities;
    this.config = config;
  }

  /**
   * Main processing method - must be implemented by each agent
   */
  abstract process(context: AgentContext): Promise<AgentResponse>;

  /**
   * Check if this agent can handle the given request
   */
  async canHandle(context: AgentContext): Promise<{ canHandle: boolean; confidence: number; reasoning: string }> {
    const _startTime = Date.now();
    
    try {
      const { userMessage: _userMessage } = context;
      // const _lowerMessage = userMessage.toLowerCase();
      
      // Get agent-specific handling logic
      const _handlingScore = await this.calculateHandlingScore(context);
      
      const _canHandle = _handlingScore.confidence >= 0.5;
      const _executionTime = Date.now() - _startTime;
      
      if (AGENT_CONFIG.debugMode) {
        console.warn(`[AGENT:${this.type}] canHandle check: ${_canHandle} (${_handlingScore.confidence.toFixed(3)}) in ${_executionTime}ms`);
      }
      
      return {
        canHandle: _canHandle,
        confidence: _handlingScore.confidence,
        reasoning: _handlingScore.reasoning
      };
    } catch (error) {
      console.error(`[ERROR] Agent ${this.type} canHandle failed:`, error);
      return {
        canHandle: false,
        confidence: 0,
        reasoning: `Error checking capability: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get relevant context using RAG engine
   * 🔥 ENHANCED: Check data availability and provide intelligent fallbacks
   */
  async getRelevantContext(query: string, context: AgentContext): Promise<string> {
    const _startTime = Date.now();
    
    try {
      if (!this.config.ragConfig.enabled || !AGENT_CONFIG.enableRAG) {
        if (AGENT_CONFIG.debugMode) {
          console.warn(`[AGENT:${this.type}] RAG disabled, skipping context retrieval`);
        }
        return '';
      }

      // 🚀 UNIFIED: Use unified RAG engine for all operations
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // Map AgentType to enhanced RAG agent types
      const agentTypeMapping: Record<string, string> = {
        'product_manager': 'product_manager',
        'analytics': 'analytics', 
        'customer_service': 'customer_service',
        'marketing': 'marketing',
        'orchestrator': 'orchestrator',
        'stock_manager': 'general', // Map stock_manager to general
        'general': 'general'
      };

      const mappedAgentType = agentTypeMapping[this.type] || 'general';

      const _ragQuery = {
        query,
        context: {
          storeId: context.storeId,
          userId: context.userId,
          conversationId: context.conversationId,
          agentType: mappedAgentType as any,
        },
        options: {
          topK: 8,
          scoreThreshold: 0.3, // Use scoreThreshold instead of threshold
          includeMetadata: true,
        },
      };

      const _ragResult = await ragEngine.search(_ragQuery);
      const _executionTime = Date.now() - _startTime;

      if (_ragResult.sources && _ragResult.sources.length > 0) {
        console.warn(`[AGENT:${this.type}] Enhanced RAG retrieved ${_ragResult.sources.length} contexts in ${_executionTime}ms`);
      }

      // Check if we have meaningful context
      if (_ragResult.sources.length === 0) {
        console.warn(`[AGENT:${this.type}] No relevant context found - triggering sync`);
        this.triggerRAGSyncIfNeeded(context.storeId);
        return 'No hay datos disponibles. Se está sincronizando la información.';
      }

      // Filter and process documents based on score in metadata
      const highQualityDocs = _ragResult.sources.filter(doc =>
        (doc.metadata?.score || 0) >= 0.4
      );

      const mediumQualityDocs = _ragResult.sources.filter(doc =>
        (doc.metadata?.score || 0) >= 0.25 && (doc.metadata?.score || 0) < 0.4
      );

      console.warn(`[AGENT:${this.type}] Context quality - High: ${highQualityDocs.length}, Medium: ${mediumQualityDocs.length}`);

      if (highQualityDocs.length === 0 && mediumQualityDocs.length === 0) {
        console.warn(`[AGENT:${this.type}] Low quality context - generating basic response`);
        return this.generateBasicStoreContext(_ragResult.sources, context.storeId);
      }

      // Combine high and medium quality documents
      const relevantDocs = [...highQualityDocs, ...mediumQualityDocs.slice(0, 3)];
      
      return relevantDocs.map(doc => doc.pageContent).join('\n\n');

    } catch (error) {
      console.error(`[ERROR] Agent ${this.type} RAG retrieval failed:`, error);
      
      // 🔥 ENHANCED: Trigger sync on RAG errors
      this.triggerRAGSyncIfNeeded(context.storeId);
      
      return this.generateDataAvailabilityContext(context.storeId);
    }
  }

  /**
   * 🔥 NEW: Generate context when no data is available
   */
  private generateDataAvailabilityContext(storeId: string): string {
    return `[ESTADO DE DATOS] Los datos de la tienda están siendo sincronizados. 
    Estoy trabajando con la información disponible y activando la sincronización automática de datos.
    Puedo proporcionar análisis generales y recomendaciones basadas en mejores prácticas del e-commerce.`;
  }

  /**
   * 🔥 NEW: Generate basic context from low-quality results
   */
  private generateBasicStoreContext(documents: any[], storeId: string): string {
    if (documents.length === 0) return this.generateDataAvailabilityContext(storeId);
    
    const basicInfo = documents.slice(0, 3).map(doc => {
      return `[INFORMACIÓN BÁSICA] ${doc.content?.substring(0, 200) || 'Información de tienda disponible'}`;
    }).join('\n\n');
    
    return `${basicInfo}\n\n[NOTA] Datos adicionales siendo sincronizados para análisis más detallado.`;
  }

  /**
   * 🔒 ENHANCED: Lock-aware RAG sync trigger when no data is found (non-blocking)
   * Respects global lock system to prevent race conditions during sync
   */
  protected triggerRAGSyncIfNeeded(storeId: string): void {
    // Fire-and-forget sync trigger with lock awareness
    setTimeout(async () => {
      try {
        console.warn(`[AGENT:${this.type}] 🔒 Checking if lock-aware RAG sync needed for store: ${storeId}`);
        
        // 🔒 STEP 1: Check for lock conflicts before triggering sync
        try {
          const { checkRAGLockConflicts, RAGLockType } = await import('@/lib/rag/global-locks');
          
          const conflictCheck = await checkRAGLockConflicts(storeId, RAGLockType.MANUAL_SYNC);
          
          if (!conflictCheck.canProceed) {
            console.warn(`[AGENT:${this.type}] ⏳ Skipping agent-triggered sync for store ${storeId} - ${conflictCheck.reason}`);
            return; // Exit early - another operation is handling this store
          }
        } catch (lockError) {
          console.warn(`[AGENT:${this.type}] ⚠️ Lock check failed, proceeding with direct sync:`, lockError);
          // Continue with direct sync trigger if lock system unavailable
        }
        
        // STEP 2: 🔥 Use simple store sync for immediate data synchronization
        try {
          console.warn(`[AGENT:${this.type}] 🔄 Triggering immediate sync for store: ${storeId}`);
          
          // Use direct sync endpoint for immediate sync
          const syncUrl = process.env.VERCEL_URL ? 
            `https://${process.env.VERCEL_URL}/api/stores/${storeId}/sync-rag` :
            `https://fini-tn.vercel.app/api/stores/${storeId}/sync-rag`;
            
          fetch(syncUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }).then(response => {
            if (response.ok) {
              console.warn(`[AGENT:${this.type}] ✅ Immediate sync triggered for store: ${storeId}`);
            } else {
              console.warn(`[AGENT:${this.type}] ⚠️ Sync trigger failed for store ${storeId}: ${response.status}`);
            }
          }).catch(syncError => {
            console.warn(`[AGENT:${this.type}] Direct sync trigger failed:`, syncError);
          });
          
        } catch (syncError) {
          console.warn(`[AGENT:${this.type}] ⚠️ Sync trigger error:`, syncError);
        }
        
      } catch (error) {
        console.warn(`[AGENT:${this.type}] Lock-aware sync trigger error:`, error);
      }
    }, 100); // Small delay to not block current response
  }

  /**
   * 🔥 NEW: Check if store has RAG data available
   */
  protected async hasRAGData(storeId: string): Promise<boolean> {
    try {
      const ragEngineInstance = await getRagEngine();
      if (!ragEngineInstance) return false;

      const testQuery = {
        query: 'test',
        context: {
          storeId,
          userId: 'test',
          agentType: this.type as any
        },
        options: {
          topK: 1,
          threshold: 0.1 // Very low threshold just to check if any data exists
        }
      };

      const result = await ragEngineInstance.search(testQuery);
      return result.sources.length > 0;
    } catch (error) {
      console.warn(`[AGENT:${this.type}] RAG data check failed:`, error);
      return false;
    }
  }

  /**
   * Calculate how well this agent can handle a specific context
   */
  protected abstract calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }>;

  /**
   * Generate OpenAI chat completion
   */
  protected async generateResponse(systemPrompt: string, userPrompt: string, context?: string): Promise<string> {
    try {
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];

      if (context) {
        messages.push({ 
          role: 'user', 
          content: `Contexto relevante:\n${context}\n\n---\n\n${userPrompt}` 
        });
      } else {
        messages.push({ role: 'user', content: userPrompt });
      }

      // Use OpenAI API directly (we'll need to install it)
      const _response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages,
          max_tokens: this.config.responseConfig.maxLength,
          temperature: 0.7,
          stream: false
        })
      });

      if (!_response.ok) {
        throw new Error(`OpenAI API error: ${_response.status} ${_response.statusText}`);
      }

      const _data = await _response.json();
      return _data.choices[0]?.message?.content || 'No pude generar una respuesta.';
    } catch (error) {
      console.error(`[ERROR] Agent ${this.type} response generation failed:`, error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format response with agent metadata
   */
  protected createResponse(
    success: boolean,
    response?: string,
    confidence = 0,
    reasoning?: string,
    contextUsed?: unknown,
    executionTime?: number,
    error?: string
  ): AgentResponse {
    return {
      success,
      agentType: this.type,
      response,
      confidence,
      reasoning,
      contextUsed,
      metadata: {
        executionTime,
        ragUsed: !!contextUsed,
        fallbackUsed: false
      },
      error
    };
  }

  /**
   * Create fallback response when agent fails
   */
  protected createFallbackResponse(originalError: string): AgentResponse {
    return {
      success: false,
      agentType: this.type,
      response: this.config.prompts.fallbackPrompt,
      confidence: 0.1,
      reasoning: `Fallback response due to error: ${originalError}`,
      metadata: {
        fallbackUsed: true,
        ragUsed: false
      },
      error: originalError
    };
  }

  /**
   * Utility method to check for keywords in text
   */
  protected hasKeywords(text: string, keywords: string[]): { found: boolean; matches: string[]; score: number } {
    const _lowerText = text.toLowerCase();
    const _matches = keywords.filter(keyword => _lowerText.includes(keyword.toLowerCase()));
    const _score = _matches.length / keywords.length;
    
    return {
      found: _matches.length > 0,
      matches: _matches,
      score: _score
    };
  }

  /**
   * Utility method to format prompts with context
   */
  protected formatPrompt(template: string, variables: Record<string, string>): string {
    let formatted = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const _placeholder = `{${key}}`;
      formatted = formatted.replace(new RegExp(_placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return formatted;
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'debug' | 'error', message: string, data?: unknown): void {
    if (!AGENT_CONFIG.debugMode && level === 'debug') return;
    
    const _prefix = `[AGENT:${this.type.toUpperCase()}]`;
    
    switch (level) {
      case 'info':
        console.warn(`${_prefix} ${message}`, data ? data : '');
        break;
      case 'debug':
        console.debug(`${_prefix} ${message}`, data ? data : '');
        break;
      case 'error':
        console.error(`${_prefix} ${message}`, data ? data : '');
        break;
    }
  }

  protected async hasRelevantData(query: string, context: AgentContext): Promise<boolean> {
    try {
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      const result = await ragEngine.search({
        query,
        context: {
          storeId: context.storeId,
          userId: context.userId,
          conversationId: context.conversationId,
          agentType: 'orchestrator',
        },
        options: { topK: 1, scoreThreshold: 0.3 },
      });

      return result.sources.length > 0;
    } catch (error) {
      console.error(`[AGENT:${this.type}] Error checking relevant data:`, error);
      return false;
    }
  }
} 