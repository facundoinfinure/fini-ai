/**
 * Marketing Agent
 * Specialized agent for marketing strategies, campaigns, and growth optimization
 */

import { BaseAgent } from './base-agent';
import { MARKETING_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class MarketingAgent extends BaseAgent {
  constructor() {
    super(
      'marketing',
      'Marketing Agent',
      'Expert in marketing strategies, campaigns, and business growth',
      [
        {
          name: 'Growth Strategies',
          description: 'Develop strategies to increase sales and customer acquisition',
          examples: ['Sales increase plans', 'Customer acquisition', 'Market expansion'],
          priority: 10
        },
        {
          name: 'Campaign Planning',
          description: 'Design and plan marketing campaigns and promotions',
          examples: ['Promotional campaigns', 'Seasonal marketing', 'Product launches'],
          priority: 9
        },
        {
          name: 'Competitive Analysis',
          description: 'Analyze competition and market positioning',
          examples: ['Competitor research', 'Market analysis', 'Positioning strategy'],
          priority: 8
        },
        {
          name: 'Customer Segmentation',
          description: 'Segment customers and personalize marketing approaches',
          examples: ['Target audience', 'Customer personas', 'Personalization'],
          priority: 8
        },
        {
          name: 'Content Strategy',
          description: 'Develop content marketing and social media strategies',
          examples: ['Content calendar', 'Social media strategy', 'Brand messaging'],
          priority: 7
        }
      ],
      MARKETING_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing marketing request: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // For demo, generate a basic marketing response
      const response = `Como tu Marketing Agent, he analizado tu consulta: "${context.userMessage}"

${ragContext ? `Basándome en los datos de tu tienda:\n${ragContext.substring(0, 200)}...\n\n` : ''}

Aquí tienes mis recomendaciones de marketing:
- Estrategia personalizada basada en tu audiencia
- Plan de crecimiento escalable
- Optimización de conversiones
- Análisis de competencia

¿Te gustaría profundizar en alguna estrategia específica?`;

      const executionTime = Date.now() - startTime;
      this.log('info', `Marketing response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        0.8,
        'Marketing consultation provided',
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Marketing processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for marketing keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.marketing);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('aumentar') && lowerMessage.includes('venta')) {
      score += 0.3;
    }
    if (lowerMessage.includes('estrategia') || lowerMessage.includes('plan') || lowerMessage.includes('campaña')) {
      score += 0.2;
    }
    if (lowerMessage.includes('marketing') || lowerMessage.includes('promoción') || lowerMessage.includes('publicidad')) {
      score += 0.3;
    }
    if (lowerMessage.includes('competencia') || lowerMessage.includes('mercado')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found marketing keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific marketing keywords found';

    return { confidence, reasoning };
  }

  private identifyRequestType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Growth strategies
    if (lowerMessage.includes('aumentar') && (lowerMessage.includes('venta') || lowerMessage.includes('ingreso'))) {
      return { type: 'growth_strategy', reasoning: 'Sales growth request', confidence: 0.9 };
    }
    if (lowerMessage.includes('crecer') || lowerMessage.includes('crecimiento')) {
      return { type: 'growth_strategy', reasoning: 'Business growth request', confidence: 0.85 };
    }

    // Campaign planning
    if (lowerMessage.includes('campaña') || lowerMessage.includes('promoción')) {
      return { type: 'campaign_planning', reasoning: 'Campaign planning request', confidence: 0.9 };
    }
    if (lowerMessage.includes('black friday') || lowerMessage.includes('navidad') || lowerMessage.includes('temporada')) {
      return { type: 'seasonal_marketing', reasoning: 'Seasonal marketing request', confidence: 0.9 };
    }

    // Competitive analysis
    if (lowerMessage.includes('competencia') || lowerMessage.includes('competidor')) {
      return { type: 'competitive_analysis', reasoning: 'Competitive analysis request', confidence: 0.9 };
    }
    if (lowerMessage.includes('mercado') && lowerMessage.includes('análisis')) {
      return { type: 'competitive_analysis', reasoning: 'Market analysis request', confidence: 0.8 };
    }

    // Customer segmentation
    if (lowerMessage.includes('audiencia') || lowerMessage.includes('público') || lowerMessage.includes('segmento')) {
      return { type: 'customer_segmentation', reasoning: 'Customer segmentation request', confidence: 0.8 };
    }
    if (lowerMessage.includes('cliente') && lowerMessage.includes('tipo')) {
      return { type: 'customer_segmentation', reasoning: 'Customer type analysis', confidence: 0.75 };
    }

    // Content strategy
    if (lowerMessage.includes('contenido') || lowerMessage.includes('redes sociales') || lowerMessage.includes('social media')) {
      return { type: 'content_strategy', reasoning: 'Content strategy request', confidence: 0.85 };
    }

    // Pricing strategy
    if (lowerMessage.includes('precio') && (lowerMessage.includes('estrategia') || lowerMessage.includes('cómo'))) {
      return { type: 'pricing_strategy', reasoning: 'Pricing strategy request', confidence: 0.8 };
    }

    // General marketing
    if (lowerMessage.includes('marketing') || lowerMessage.includes('estrategia') || lowerMessage.includes('plan')) {
      return { type: 'general_marketing', reasoning: 'General marketing request', confidence: 0.6 };
    }

    return { type: 'general_marketing', reasoning: 'General marketing inquiry', confidence: 0.5 };
  }

  private async generateGrowthStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos del negocio disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla una estrategia de crecimiento integral que incluya:
- Análisis de la situación actual del negocio
- Oportunidades de crecimiento identificadas
- Estrategias específicas para aumentar ventas
- Tácticas de adquisición de nuevos clientes
- Plan de retención de clientes existentes
- Métricas clave para medir el éxito
- Cronograma de implementación
- Presupuesto estimado y ROI esperado

Proporciona estrategias accionables y realistas basadas en los datos disponibles.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateCampaignPlan(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos para la campaña disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Crea un plan de campaña completo que incluya:
- Objetivos específicos y medibles de la campaña
- Público objetivo y segmentación
- Mensaje clave y propuesta de valor
- Canales de marketing recomendados
- Calendario de actividades
- Presupuesto sugerido por canal
- Métricas de éxito y KPIs
- Plan de contingencia

Asegúrate de que la campaña sea coherente con la marca y objetivos del negocio.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateCompetitiveAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de competencia disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis competitivo que incluya:
- Identificación de competidores directos e indirectos
- Análisis de fortalezas y debilidades competitivas
- Estrategias de precios de la competencia
- Análisis de productos y servicios competitivos
- Estrategias de marketing de competidores
- Oportunidades de diferenciación
- Recomendaciones de posicionamiento
- Estrategias para ganar ventaja competitiva

Proporciona insights accionables para superar a la competencia.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateSegmentationStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de clientes disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla una estrategia de segmentación que incluya:
- Análisis de la base de clientes actual
- Criterios de segmentación relevantes
- Perfiles detallados de cada segmento
- Necesidades y comportamientos por segmento
- Estrategias de marketing personalizadas
- Canales preferidos por segmento
- Mensajes específicos para cada grupo
- Métricas de efectividad por segmento

Crea estrategias personalizadas que maximicen el valor de cada segmento.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateContentStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de contenido disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Crea una estrategia de contenido integral que incluya:
- Objetivos de contenido alineados con el negocio
- Audiencias objetivo para el contenido
- Pilares de contenido y temas principales
- Calendario editorial con frecuencia de publicación
- Tipos de contenido recomendados
- Distribución por canales (redes sociales, blog, email)
- Estrategia de engagement y comunidad
- Métricas de performance y KPIs

Asegúrate de que el contenido sea valioso, relevante y genere engagement.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generatePricingStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de precios disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla una estrategia de precios que incluya:
- Análisis de costos y márgenes actuales
- Investigación de precios de competidores
- Estrategias de fijación de precios
- Segmentación de precios por producto/servicio
- Estrategias de descuentos y promociones
- Precios psicológicos y percepción de valor
- Pruebas A/B recomendadas para precios
- Impacto esperado en ventas y rentabilidad

Proporciona recomendaciones que optimicen tanto las ventas como la rentabilidad.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateSeasonalMarketing(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos estacionales disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Crea una estrategia de marketing estacional que incluya:
- Análisis de tendencias estacionales históricas
- Oportunidades específicas de la temporada
- Productos o servicios a destacar
- Mensajes y creatividades estacionales
- Cronograma de actividades pre, durante y post temporada
- Estrategias de inventario y logística
- Campañas específicas por canal
- Métricas de éxito estacionales

Maximiza las oportunidades de la temporada con una planificación integral.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralMarketing(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Información general del negocio'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona consultoría de marketing general que incluya:
- Análisis de la consulta específica del usuario
- Recomendaciones estratégicas relevantes
- Mejores prácticas aplicables
- Recursos y herramientas recomendadas
- Próximos pasos sugeridos
- Consideraciones importantes

Si la consulta no es específica, proporciona un framework de marketing útil y preguntas clarificadoras.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 