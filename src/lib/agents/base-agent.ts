/**
 * Base Agent Class
 * Abstract base class for all AI agents in the system
 */

import type { 
  Agent, 
  AgentContext, 
  AgentResponse, 
  AgentType, 
  AgentCapability,
  AgentTypeConfig 
} from './types';
import { ragEngine } from '@/lib/rag';
import { AGENT_CONFIG } from './config';

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
    const startTime = Date.now();
    
    try {
      const { userMessage } = context;
      const lowerMessage = userMessage.toLowerCase();
      
      // Get agent-specific handling logic
      const handlingScore = await this.calculateHandlingScore(context);
      
      const canHandle = handlingScore.confidence >= 0.5;
      const executionTime = Date.now() - startTime;
      
      if (AGENT_CONFIG.debugMode) {
        console.log(`[AGENT:${this.type}] canHandle check: ${canHandle} (${handlingScore.confidence.toFixed(3)}) in ${executionTime}ms`);
      }
      
      return {
        canHandle,
        confidence: handlingScore.confidence,
        reasoning: handlingScore.reasoning
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
   */
  async getRelevantContext(query: string, context: AgentContext): Promise<string> {
    const startTime = Date.now();
    
    try {
      if (!this.config.ragConfig.enabled || !AGENT_CONFIG.enableRAG) {
        if (AGENT_CONFIG.debugMode) {
          console.log(`[AGENT:${this.type}] RAG disabled, skipping context retrieval`);
        }
        return '';
      }

      const ragQuery = {
        query: query,
        context: {
          storeId: context.storeId,
          userId: context.userId,
          conversationId: context.conversationId,
          agentType: this.type
        },
        options: {
          topK: this.config.ragConfig.maxResults,
          threshold: this.config.ragConfig.threshold,
          includeMetadata: true
        }
      };

      const ragResult = await ragEngine.search(ragQuery);
      const executionTime = Date.now() - startTime;

      if (AGENT_CONFIG.debugMode) {
        console.log(`[AGENT:${this.type}] RAG retrieved ${ragResult.documents.length} contexts in ${executionTime}ms`);
      }

      if (ragResult.documents.length === 0) {
        return '';
      }

      // Format context for the agent
      const contextSections = ragResult.documents.map((doc: any) => {
        return `[${doc.metadata?.type || 'data'}] ${doc.content}`;
      });

      return contextSections.join('\n\n');
    } catch (error) {
      console.error(`[ERROR] Agent ${this.type} RAG retrieval failed:`, error);
      return '';
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No pude generar una respuesta.';
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
    contextUsed?: any,
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
    const lowerText = text.toLowerCase();
    const matches = keywords.filter(keyword => lowerText.includes(keyword.toLowerCase()));
    const score = matches.length / keywords.length;
    
    return {
      found: matches.length > 0,
      matches,
      score
    };
  }

  /**
   * Utility method to format prompts with context
   */
  protected formatPrompt(template: string, variables: Record<string, string>): string {
    let formatted = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      formatted = formatted.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return formatted;
  }

  /**
   * Log agent activity
   */
  protected log(level: 'info' | 'debug' | 'error', message: string, data?: any): void {
    if (!AGENT_CONFIG.debugMode && level === 'debug') return;
    
    const prefix = `[AGENT:${this.type.toUpperCase()}]`;
    
    switch (level) {
      case 'info':
        console.log(`${prefix} ${message}`, data ? data : '');
        break;
      case 'debug':
        console.debug(`${prefix} ${message}`, data ? data : '');
        break;
      case 'error':
        console.error(`${prefix} ${message}`, data ? data : '');
        break;
    }
  }
} 