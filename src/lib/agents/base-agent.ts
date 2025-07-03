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

      const _ragQuery = {
        query,
        context: {
          storeId: context.storeId,
          userId: context.userId,
          conversationId: context.conversationId,
          agentType: this.type
        },
        options: {
          topK: this.config.ragConfig.maxResults,
          threshold: 0.3, // 🔥 LOWERED from 0.7 to 0.3 for better recall
          includeMetadata: true
        }
      };

      const ragEngineInstance = await getRagEngine();
      if (!ragEngineInstance) {
        if (AGENT_CONFIG.debugMode) {
          console.warn(`[AGENT:${this.type}] RAG engine not available, skipping context retrieval`);
        }
        return '';
      }

      const _ragResult = await ragEngineInstance.search(_ragQuery);
      const _executionTime = Date.now() - _startTime;

      if (AGENT_CONFIG.debugMode) {
        console.warn(`[AGENT:${this.type}] RAG retrieved ${_ragResult.documents.length} contexts in ${_executionTime}ms`);
      }

      // 🔥 ENHANCED: Check if we have meaningful data with more permissive approach
      if (_ragResult.documents.length === 0) {
        console.warn(`[AGENT:${this.type}] ⚠️ No RAG documents found for store: ${context.storeId}`);
        
        // 🚀 TRIGGER: Auto-sync if no data found (non-blocking)
        this.triggerRAGSyncIfNeeded(context.storeId);
        
        return this.generateDataAvailabilityContext(context.storeId);
      }

      // 🔥 ENHANCED: Accept all results but classify by quality
      const highQualityDocs = _ragResult.documents.filter(doc => 
        doc.metadata.relevanceScore && doc.metadata.relevanceScore > 0.6
      );

      const mediumQualityDocs = _ragResult.documents.filter(doc => 
        doc.metadata.relevanceScore && doc.metadata.relevanceScore > 0.3 && doc.metadata.relevanceScore <= 0.6
      );

      // Use high quality docs if available, otherwise use medium quality
      const docsToUse = highQualityDocs.length > 0 ? highQualityDocs : mediumQualityDocs;

      if (docsToUse.length === 0) {
        console.warn(`[AGENT:${this.type}] ⚠️ No quality RAG results for query: "${query}"`);
        
        // 🔥 ENHANCED: Still return basic store context even with low quality results
        return this.generateBasicStoreContext(_ragResult.documents, context.storeId);
      }

      // Format context for the agent with quality indicators
      const _contextSections = docsToUse.map((doc: { metadata?: { type?: string; relevanceScore?: number }; content: string }) => {
        const qualityTag = doc.metadata?.relevanceScore && doc.metadata.relevanceScore > 0.6 ? '[ALTA RELEVANCIA]' : '[RELEVANCIA MEDIA]';
        return `${qualityTag} [${doc.metadata?.type || 'data'}] ${doc.content}`;
      });

      return _contextSections.join('\n\n');
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
   * 🚀 NEW: Trigger RAG sync when no data is found (non-blocking)
   */
  protected triggerRAGSyncIfNeeded(storeId: string): void {
    // Fire-and-forget sync trigger
    setTimeout(async () => {
      try {
        console.warn(`[AGENT:${this.type}] 🔄 Triggering RAG sync for store: ${storeId}`);
        
        // Try to trigger sync endpoint (non-blocking)
        const syncUrl = process.env.VERCEL_URL ? 
          `https://${process.env.VERCEL_URL}/api/stores/${storeId}/sync-rag` :
          `https://fini-tn.vercel.app/api/stores/${storeId}/sync-rag`;
          
        fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(syncError => {
          console.warn(`[AGENT:${this.type}] Auto-sync trigger failed:`, syncError);
        });
      } catch (error) {
        console.warn(`[AGENT:${this.type}] Sync trigger error:`, error);
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
      return result.documents.length > 0;
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
} 