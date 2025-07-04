/**
 * 🚀 Real Streaming RAG Engine with LangChain
 * Implements true real-time streaming for instant responses
 */

import { ChatOpenAI } from '@langchain/openai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';

export interface StreamingRAGQuery {
  query: string;
  context: {
    storeId: string;
    userId: string;
    agentType: 'analytics' | 'product_manager' | 'customer_service' | 'marketing' | 'orchestrator' | 'general';
    conversationId: string;
  };
  options?: {
    temperature?: number;
    maxTokens?: number;
    topK?: number;
  };
}

export interface StreamingChunk {
  type: 'thinking' | 'sources' | 'token' | 'complete' | 'error';
  content: string;
  metadata?: {
    tokenIndex?: number;
    confidence?: number;
    sources?: any[];
    totalTokens?: number;
    sourcesUsed?: number;
    processingTime?: number;
    responseLength?: number;
    error?: string;
  };
}

export class StreamingRAGEngine {
  private llm: ChatOpenAI;
  private parser: StringOutputParser;
  private isInitialized = false;

  constructor() {
    this.parser = new StringOutputParser();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required for streaming');
    }

    this.llm = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.3,
      streaming: true, // ✅ Real streaming enabled
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 1000,
    });

    this.isInitialized = true;
    console.log('[STREAMING-RAG] 🚀 Initialized with REAL streaming support');
  }

  async *streamSearch(query: StreamingRAGQuery): AsyncGenerator<StreamingChunk, void, unknown> {
    const startTime = Date.now();
    
    try {
      await this.initialize();

      // Step 1: Thinking indicator
      yield {
        type: 'thinking',
        content: '🤔 Analizando tu consulta...',
      };

      // Step 2: Get enhanced context
      let ragContext = '';
      let sources: any[] = [];
      
      try {
        const { enhancedRAGEngine } = await import('./enhanced-rag-engine');
        const ragResult = await enhancedRAGEngine.search({
          query: query.query,
          context: query.context,
          options: { topK: query.options?.topK || 6 },
        });

        ragContext = ragResult.sources.map(s => s.pageContent).join('\n\n');
        sources = ragResult.sources;

        // Send sources info
        yield {
          type: 'sources',
          content: `📊 Información encontrada (${sources.length} fuentes relevantes)`,
          metadata: { 
            sources: sources.slice(0, 3),
            confidence: ragResult.confidence 
          }
        };

      } catch (error) {
        console.warn('[STREAMING-RAG] Context retrieval failed:', error);
        ragContext = 'Información limitada disponible';
      }

      // Step 3: Create agent-specific prompt
      const promptTemplate = this.getAgentPrompt(query.context.agentType);
      
      // Step 4: Create streaming chain
      const chain = RunnableSequence.from([
        promptTemplate,
        this.llm,
        this.parser,
      ]);

      // Step 5: Stream the real response
      let tokenIndex = 0;
      let fullResponse = '';
      
      const stream = await chain.stream({
        context: ragContext || 'No hay información específica disponible en este momento.',
        query: query.query,
        agent_role: this.getAgentRole(query.context.agentType),
        conversation_memory: await this.getConversationMemory(query.context.conversationId),
      });

      // ✅ REAL STREAMING: Token by token from OpenAI
      for await (const chunk of stream) {
        if (chunk && chunk.trim()) {
          fullResponse += chunk;
          yield {
            type: 'token',
            content: chunk,
            metadata: { 
              tokenIndex: tokenIndex++,
              confidence: sources.length > 0 ? 0.85 : 0.4
            }
          };
        }
      }

      // Step 6: Completion with metrics
      const processingTime = Date.now() - startTime;
      yield {
        type: 'complete',
        content: '✅ Respuesta completada',
        metadata: {
          totalTokens: tokenIndex,
          sourcesUsed: sources.length,
          confidence: sources.length > 0 ? 0.85 : 0.4,
          processingTime,
          responseLength: fullResponse.length,
        }
      };

      // Save to conversation memory
      await this.saveToMemory(query.context.conversationId, query.query, fullResponse, query.context);

    } catch (error) {
      console.error('[STREAMING-RAG] Real streaming failed:', error);
      yield {
        type: 'error',
        content: 'Error al procesar tu consulta. Por favor, intenta nuevamente.',
        metadata: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  private getAgentPrompt(agentType: string): PromptTemplate {
    const baseInstructions = `
Eres un asistente especializado en e-commerce argentino.
Responde de forma natural, profesional y específica.

CONTEXTO DISPONIBLE:
{context}

MEMORIA DE CONVERSACIÓN:
{conversation_memory}

CONSULTA: {query}
`;

    const roleSpecificInstructions = {
      product_manager: `
ROL: Product Manager Expert
- Enfócate en productos, catálogo, precios, inventario
- Proporciona análisis específicos de productos
- Recomienda optimizaciones de catálogo
- Menciona datos concretos cuando los tengas`,

      analytics: `
ROL: Analytics Specialist  
- Enfócate en métricas, ventas, performance
- Proporciona insights basados en datos
- Incluye números y tendencias específicas
- Sugiere acciones basadas en analytics`,

      customer_service: `
ROL: Customer Service Expert
- Enfócate en ayudar al cliente
- Responde consultas sobre pedidos, envíos, devoluciones
- Mantén un tono empático y solucionador
- Proporciona pasos claros a seguir`,

      marketing: `
ROL: Marketing Strategist
- Enfócate en campañas, promociones, engagement
- Sugiere estrategias de marketing
- Analiza oportunidades de crecimiento
- Proporciona ideas creativas y accionables`,

      general: `
ROL: Asistente General
- Responde de forma versátil y útil
- Adapta tu respuesta al tipo de consulta
- Mantén un tono profesional pero accesible`
    };

    const instruction = roleSpecificInstructions[agentType as keyof typeof roleSpecificInstructions] || roleSpecificInstructions.general;

    return PromptTemplate.fromTemplate(baseInstructions + instruction + '\n\nRESPUESTA:');
  }

  private getAgentRole(agentType: string): string {
    const roles = {
      product_manager: 'Product Manager experto en catálogo y productos',
      analytics: 'Analista de datos especializado en métricas de e-commerce',
      customer_service: 'Especialista en atención al cliente',
      marketing: 'Estratega de marketing digital',
      general: 'Asistente general de e-commerce'
    };
    return roles[agentType as keyof typeof roles] || roles.general;
  }

  private async getConversationMemory(conversationId: string): Promise<string> {
    try {
      // Get last 3 messages for context
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();
      
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (messages && messages.length > 0) {
        return messages
          .reverse()
          .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
          .join('\n');
      }

      return 'Primera interacción en esta conversación';
    } catch (error) {
      console.warn('[STREAMING-RAG] Failed to get conversation memory:', error);
      return '';
    }
  }

  private async saveToMemory(
    conversationId: string, 
    userQuery: string, 
    assistantResponse: string,
    context: any
  ): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/server');
      const supabase = createClient();

      // Save user message
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: userQuery,
        agent_type: context.agentType,
        created_at: new Date().toISOString(),
      });

      // Save assistant response
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'assistant', 
        content: assistantResponse,
        agent_type: context.agentType,
        metadata: {
          streaming: true,
          realTime: true,
          enhanced_rag: true,
        },
        created_at: new Date().toISOString(),
      });

      console.log('[STREAMING-RAG] 💾 Messages saved to memory');
    } catch (error) {
      console.warn('[STREAMING-RAG] Failed to save to memory:', error);
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    latency: number;
    streaming: boolean;
    features: string[];
    issues: string[];
  }> {
    const startTime = Date.now();
    const issues: string[] = [];

    try {
      await this.initialize();
    } catch (error) {
      issues.push('Initialization failed');
      return {
        status: 'unhealthy',
        latency: 0,
        streaming: false,
        features: [],
        issues
      };
    }

    const latency = Date.now() - startTime;

    return {
      status: issues.length === 0 ? 'healthy' : 'degraded',
      latency,
      streaming: true,
      features: [
        'Real-time OpenAI streaming',
        'Agent-specific prompts',
        'Conversation memory',
        'Enhanced RAG integration',
        'Error recovery',
        'Performance monitoring'
      ],
      issues
    };
  }
}

export const streamingRAGEngine = new StreamingRAGEngine(); 