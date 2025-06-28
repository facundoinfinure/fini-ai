/**
 * 📈 Sales Coach Agent
 * Especialista en estrategias de ventas, optimización de conversión y coaching comercial
 */

import { BaseAgent } from './base-agent';
import { SALES_COACH_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class SalesCoachAgent extends BaseAgent {
  constructor() {
    super(
      'sales_coach',
      'Sales Coach Agent',
      'Especialista en estrategias de ventas, optimización de conversión y coaching comercial',
      [
        {
          name: 'Conversion Optimization',
          description: 'Optimización de tasas de conversión y funnel de ventas',
          examples: [
            'Mejorar tasa de conversión',
            'Optimizar funnel de ventas',
            'Reducir abandono de carrito'
          ],
          priority: 10
        },
        {
          name: 'Sales Strategies',
          description: 'Estrategias y técnicas de venta avanzadas',
          examples: [
            'Desarrollar estrategias de venta',
            'Técnicas de closing',
            'Manejo de objeciones'
          ],
          priority: 9
        },
        {
          name: 'Customer Retention',
          description: 'Estrategias de retención y fidelización',
          examples: [
            'Aumentar customer lifetime value',
            'Reducir churn',
            'Programas de loyalty'
          ],
          priority: 8
        },
        {
          name: 'Sales Performance',
          description: 'Análisis y mejora de performance de ventas',
          examples: [
            'Analizar métricas de ventas',
            'Mejorar KPIs comerciales',
            'Coaching de performance'
          ],
          priority: 7
        }
      ],
      SALES_COACH_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing sales coaching query: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of sales coaching request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType.type}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'conversion_optimization':
          response = await this.generateConversionOptimization(context, ragContext);
          confidence = 0.9;
          break;
        case 'sales_strategies':
          response = await this.generateSalesStrategies(context, ragContext);
          confidence = 0.85;
          break;
        case 'customer_retention':
          response = await this.generateCustomerRetention(context, ragContext);
          confidence = 0.8;
          break;
        case 'sales_performance':
          response = await this.generateSalesPerformance(context, ragContext);
          confidence = 0.85;
          break;
        case 'objection_handling':
          response = await this.generateObjectionHandling(context, ragContext);
          confidence = 0.8;
          break;
        case 'lead_generation':
          response = await this.generateLeadGeneration(context, ragContext);
          confidence = 0.75;
          break;
        default:
          response = await this.generateGeneralSalesCoaching(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Sales coaching response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Sales coaching query processed: ${queryType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Sales coaching processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for sales coaching keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.sales_coach);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('conversión') && (lowerMessage.includes('mejorar') || lowerMessage.includes('aumentar'))) {
      score += 0.3;
    }
    if (lowerMessage.includes('ventas') && (lowerMessage.includes('estrategia') || lowerMessage.includes('técnica'))) {
      score += 0.25;
    }
    if (lowerMessage.includes('clientes') && (lowerMessage.includes('retener') || lowerMessage.includes('fidelizar'))) {
      score += 0.25;
    }
    if (lowerMessage.includes('cerrar venta') || lowerMessage.includes('closing')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found sales coaching keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific sales coaching keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Conversion optimization queries
    if (lowerMessage.includes('conversión') && (lowerMessage.includes('mejorar') || lowerMessage.includes('aumentar'))) {
      return { type: 'conversion_optimization', reasoning: 'Conversion optimization query detected', confidence: 0.9 };
    }
    if (lowerMessage.includes('funnel') || lowerMessage.includes('embudo')) {
      return { type: 'conversion_optimization', reasoning: 'Sales funnel optimization query', confidence: 0.85 };
    }

    // Sales strategies
    if (lowerMessage.includes('estrategia') && lowerMessage.includes('ventas')) {
      return { type: 'sales_strategies', reasoning: 'Sales strategy query', confidence: 0.9 };
    }
    if (lowerMessage.includes('técnicas de venta') || lowerMessage.includes('sales techniques')) {
      return { type: 'sales_strategies', reasoning: 'Sales techniques query', confidence: 0.85 };
    }

    // Customer retention
    if (lowerMessage.includes('retener') || lowerMessage.includes('retención')) {
      return { type: 'customer_retention', reasoning: 'Customer retention query', confidence: 0.9 };
    }
    if (lowerMessage.includes('clientes') && (lowerMessage.includes('vuelven') || lowerMessage.includes('recompra'))) {
      return { type: 'customer_retention', reasoning: 'Customer retention query', confidence: 0.8 };
    }

    // Sales performance
    if (lowerMessage.includes('performance') && lowerMessage.includes('ventas')) {
      return { type: 'sales_performance', reasoning: 'Sales performance query', confidence: 0.85 };
    }
    if (lowerMessage.includes('métricas') && lowerMessage.includes('ventas')) {
      return { type: 'sales_performance', reasoning: 'Sales metrics query', confidence: 0.8 };
    }

    // Objection handling
    if (lowerMessage.includes('objeciones') || lowerMessage.includes('objection')) {
      return { type: 'objection_handling', reasoning: 'Objection handling query', confidence: 0.8 };
    }
    if (lowerMessage.includes('cerrar venta') || lowerMessage.includes('closing')) {
      return { type: 'objection_handling', reasoning: 'Closing techniques query', confidence: 0.8 };
    }

    // Lead generation
    if (lowerMessage.includes('leads') || lowerMessage.includes('prospectos')) {
      return { type: 'lead_generation', reasoning: 'Lead generation query', confidence: 0.75 };
    }

    return { type: 'general', reasoning: 'General sales coaching query', confidence: 0.5 };
  }

  private async generateConversionOptimization(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: OPTIMIZACIÓN DE CONVERSIÓN
- Analiza el funnel de conversión actual paso a paso
- Identifica puntos de fuga y oportunidades de mejora
- Proporciona estrategias CRO específicas y testing
- Incluye métricas clave para monitorear

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateSalesStrategies(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: ESTRATEGIAS DE VENTAS
- Desarrolla estrategias de venta específicas para el negocio
- Proporciona técnicas y metodologías probadas
- Incluye scripts y playbooks de venta
- Sugiere herramientas y procesos de venta

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateCustomerRetention(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: RETENCIÓN DE CLIENTES
- Analiza el customer lifecycle y puntos de churn
- Desarrolla estrategias de fidelización específicas
- Proporciona programas de loyalty y retention
- Incluye automated nurturing campaigns

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateSalesPerformance(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: PERFORMANCE DE VENTAS
- Analiza métricas clave de performance comercial
- Identifica áreas de mejora y oportunidades
- Proporciona coaching específico y plan de acción
- Incluye KPIs y dashboard de seguimiento

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateObjectionHandling(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: MANEJO DE OBJECIONES
- Identifica objeciones comunes en el mercado argentino
- Proporciona scripts y técnicas de manejo
- Desarrolla estrategias de closing específicas
- Incluye training en negociación y persuasión

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateLeadGeneration(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: GENERACIÓN DE LEADS
- Desarrolla estrategias de lead generation multicanal
- Proporciona tácticas de prospecting específicas
- Incluye qualification frameworks y scoring
- Sugiere herramientas y automation de leads

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralSalesCoaching(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque: COACHING GENERAL DE VENTAS
- Proporciona una respuesta integral sobre ventas
- Incluye mejores prácticas y recomendaciones
- Considera el contexto específico del negocio
- Sugiere próximos pasos accionables

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 