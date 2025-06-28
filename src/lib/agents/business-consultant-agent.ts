/**
 * Business Consultant Agent
 * Specialized agent for strategic business consulting, growth planning, and market analysis
 */

import { BaseAgent } from './base-agent';
import { BUSINESS_CONSULTANT_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class BusinessConsultantAgent extends BaseAgent {
  constructor() {
    super(
      'business_consultant',
      'Business Consultant Agent',
      'Expert in strategic business consulting, growth planning, competitive analysis, and market expansion',
      [
        {
          name: 'Strategic Planning',
          description: 'Comprehensive business strategy development and roadmapping',
          examples: ['Business strategy', 'Growth planning', 'Strategic roadmaps'],
          priority: 10
        },
        {
          name: 'Market Analysis',
          description: 'Deep market research and competitive intelligence',
          examples: ['Market opportunity assessment', 'Competitive analysis', 'Industry trends'],
          priority: 9
        },
        {
          name: 'Growth Strategy',
          description: 'Scalable growth strategies and expansion planning',
          examples: ['Growth hacking', 'Market expansion', 'Scaling strategies'],
          priority: 9
        },
        {
          name: 'Business Model Optimization',
          description: 'Business model innovation and optimization',
          examples: ['Revenue model optimization', 'Value proposition design', 'Business model canvas'],
          priority: 8
        },
        {
          name: 'SWOT Analysis',
          description: 'Comprehensive strengths, weaknesses, opportunities, and threats analysis',
          examples: ['SWOT assessment', 'Risk analysis', 'Opportunity identification'],
          priority: 8
        },
        {
          name: 'Performance Optimization',
          description: 'Operational efficiency and business performance improvement',
          examples: ['Process optimization', 'KPI improvement', 'Efficiency gains'],
          priority: 7
        }
      ],
      BUSINESS_CONSULTANT_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing business strategy query: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of strategic request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType.type}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'strategic_planning':
          response = await this.developStrategicPlan(context, ragContext);
          confidence = 0.9;
          break;
        case 'market_analysis':
          response = await this.analyzeMarket(context, ragContext);
          confidence = 0.85;
          break;
        case 'growth_strategy':
          response = await this.createGrowthStrategy(context, ragContext);
          confidence = 0.9;
          break;
        case 'business_model':
          response = await this.optimizeBusinessModel(context, ragContext);
          confidence = 0.85;
          break;
        case 'swot_analysis':
          response = await this.conductSWOTAnalysis(context, ragContext);
          confidence = 0.85;
          break;
        case 'competitive_analysis':
          response = await this.analyzeCompetition(context, ragContext);
          confidence = 0.8;
          break;
        case 'expansion_strategy':
          response = await this.planExpansion(context, ragContext);
          confidence = 0.8;
          break;
        case 'performance_optimization':
          response = await this.optimizePerformance(context, ragContext);
          confidence = 0.8;
          break;
        default:
          response = await this.generateGeneralBusinessAdvice(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Business strategy response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Strategic analysis completed: ${queryType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Business strategy processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for business consulting keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.business_consultant);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('estrategia') || lowerMessage.includes('strategic') || lowerMessage.includes('plan estratégico')) {
      score += 0.3;
    }
    if (lowerMessage.includes('crecimiento') || lowerMessage.includes('growth') || lowerMessage.includes('crecer')) {
      score += 0.3;
    }
    if (lowerMessage.includes('competencia') || lowerMessage.includes('mercado') || lowerMessage.includes('market')) {
      score += 0.2;
    }
    if (lowerMessage.includes('consultoría') || lowerMessage.includes('consulting') || lowerMessage.includes('asesoramiento')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found business strategy keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific business strategy keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Strategic planning
    if (lowerMessage.includes('estrategia') && (lowerMessage.includes('plan') || lowerMessage.includes('desarrollar'))) {
      return { type: 'strategic_planning', reasoning: 'Strategic planning request', confidence: 0.9 };
    }
    if (lowerMessage.includes('roadmap') || lowerMessage.includes('hoja de ruta') || lowerMessage.includes('planificación estratégica')) {
      return { type: 'strategic_planning', reasoning: 'Strategic roadmap request', confidence: 0.85 };
    }

    // Market analysis
    if (lowerMessage.includes('mercado') && (lowerMessage.includes('análisis') || lowerMessage.includes('investigación'))) {
      return { type: 'market_analysis', reasoning: 'Market analysis request', confidence: 0.9 };
    }
    if (lowerMessage.includes('tendencias') || lowerMessage.includes('oportunidad') || lowerMessage.includes('market research')) {
      return { type: 'market_analysis', reasoning: 'Market research request', confidence: 0.8 };
    }

    // Growth strategy
    if (lowerMessage.includes('crecimiento') || lowerMessage.includes('growth')) {
      return { type: 'growth_strategy', reasoning: 'Growth strategy request', confidence: 0.9 };
    }
    if (lowerMessage.includes('escalar') || lowerMessage.includes('scaling') || lowerMessage.includes('expandir')) {
      return { type: 'growth_strategy', reasoning: 'Scaling strategy request', confidence: 0.85 };
    }

    // Business model
    if (lowerMessage.includes('modelo de negocio') || lowerMessage.includes('business model')) {
      return { type: 'business_model', reasoning: 'Business model optimization', confidence: 0.9 };
    }
    if (lowerMessage.includes('monetización') || lowerMessage.includes('revenue model') || lowerMessage.includes('propuesta de valor')) {
      return { type: 'business_model', reasoning: 'Business model design request', confidence: 0.8 };
    }

    // SWOT Analysis
    if (lowerMessage.includes('foda') || lowerMessage.includes('swot')) {
      return { type: 'swot_analysis', reasoning: 'SWOT analysis request', confidence: 0.9 };
    }
    if (lowerMessage.includes('fortalezas') || lowerMessage.includes('debilidades') || lowerMessage.includes('amenazas')) {
      return { type: 'swot_analysis', reasoning: 'Strategic analysis request', confidence: 0.8 };
    }

    // Competitive analysis
    if (lowerMessage.includes('competencia') && lowerMessage.includes('análisis')) {
      return { type: 'competitive_analysis', reasoning: 'Competitive analysis request', confidence: 0.9 };
    }
    if (lowerMessage.includes('competidor') || lowerMessage.includes('benchmarking') || lowerMessage.includes('rival')) {
      return { type: 'competitive_analysis', reasoning: 'Competition analysis request', confidence: 0.8 };
    }

    // Expansion strategy
    if (lowerMessage.includes('expansión') || lowerMessage.includes('expansion')) {
      return { type: 'expansion_strategy', reasoning: 'Expansion strategy request', confidence: 0.9 };
    }
    if (lowerMessage.includes('nuevo mercado') || lowerMessage.includes('internacionalización') || lowerMessage.includes('diversificación')) {
      return { type: 'expansion_strategy', reasoning: 'Market expansion request', confidence: 0.8 };
    }

    // Performance optimization
    if (lowerMessage.includes('optimizar') && (lowerMessage.includes('negocio') || lowerMessage.includes('performance'))) {
      return { type: 'performance_optimization', reasoning: 'Performance optimization request', confidence: 0.8 };
    }
    if (lowerMessage.includes('eficiencia') || lowerMessage.includes('mejora') || lowerMessage.includes('productivity')) {
      return { type: 'performance_optimization', reasoning: 'Business improvement request', confidence: 0.7 };
    }

    return { type: 'general', reasoning: 'General business inquiry', confidence: 0.5 };
  }

  private async developStrategicPlan(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos del negocio disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un plan estratégico integral que incluya:
- Análisis de situación actual del negocio con diagnóstico FODA
- Definición clara de visión, misión y objetivos estratégicos
- Identificación de ventajas competitivas únicas y diferenciadores
- Roadmap estratégico con hitos específicos y cronograma trimestral
- Estrategias detalladas para cada área clave del negocio
- Plan de recursos y capacidades necesarias para implementación
- KPIs estratégicos para monitorear progreso y éxito
- Análisis de riesgos y planes de contingencia
- Cronograma de revisiones y ajustes estratégicos

Proporciona un plan estratégico específico, realizable y adaptado al mercado argentino.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeMarket(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de mercado disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis completo de mercado que incluya:
- Tamaño y características del mercado objetivo argentino
- Segmentación detallada de clientes potenciales
- Tendencias de mercado relevantes y oportunidades emergentes
- Análisis de la demanda actual y proyecciones futuras
- Barreras de entrada y factores críticos de éxito
- Análisis del ecosistema competitivo y posicionamiento
- Identificación de nichos desatendidos y oportunidades específicas
- Factores macroeconómicos que afectan al mercado
- Recomendaciones estratégicas para aprovechar oportunidades

Incluye datos específicos, tendencias cuantificadas y oportunidades accionables.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async createGrowthStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de crecimiento disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Diseña una estrategia de crecimiento integral que incluya:
- Análisis de potencial de crecimiento actual y limitaciones
- Estrategias de crecimiento orgánico vs inorgánico adaptadas al contexto
- Plan de escalabilidad de operaciones y sistemas
- Estrategias de adquisición y retención de clientes
- Diversificación de productos/servicios y nuevos mercados
- Plan de financiamiento para el crecimiento sostenible
- Cronograma de crecimiento con metas específicas por período
- Métricas de crecimiento y KPIs de seguimiento
- Gestión de riesgos asociados al crecimiento acelerado

Proporciona una estrategia de crecimiento específica, escalable y realista para el mercado argentino.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async optimizeBusinessModel(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos del modelo de negocio disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Optimiza el modelo de negocio considerando:
- Análisis actual del Business Model Canvas
- Optimización de la propuesta de valor única
- Diversificación y optimización de fuentes de ingresos
- Análisis y mejora de la estructura de costos
- Identificación de recursos clave y actividades críticas
- Optimización de canales de distribución y relación con clientes
- Análisis de partnerships estratégicos y alianzas clave
- Modelo de escalabilidad y crecimiento sostenible
- Innovación del modelo adaptada al mercado argentino

Proporciona recomendaciones específicas de optimización con impacto proyectado y cronograma de implementación.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async conductSWOTAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos para análisis FODA disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un análisis FODA completo que incluya:
- FORTALEZAS: Ventajas competitivas únicas, recursos distintivos, capacidades clave
- OPORTUNIDADES: Tendencias favorables, nichos emergentes, cambios regulatorios positivos
- DEBILIDADES: Limitaciones internas, recursos escasos, capacidades a desarrollar
- AMENAZAS: Competencia, cambios de mercado, riesgos macroeconómicos argentinos
- Matriz de estrategias FO, FA, DO, DA con acciones específicas
- Priorización de elementos críticos que requieren atención inmediata
- Plan de acción para potenciar fortalezas y oportunidades
- Estrategias de mitigación para debilidades y amenazas
- Cronograma de revisión y actualización del análisis

Proporciona un FODA específico, accionable y contextualizado para el mercado argentino.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeCompetition(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de competencia disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis competitivo profundo que incluya:
- Mapeo completo del ecosistema competitivo directo e indirecto
- Análisis detallado de competidores principales (fortalezas, debilidades, estrategias)
- Posicionamiento competitivo y diferenciación en el mercado
- Análisis de precios, propuestas de valor y estrategias de marketing
- Identificación de ventajas competitivas sostenibles vs temporales
- Análisis de cuota de mercado y tendencias competitivas
- Benchmarking de mejores prácticas de la industria
- Oportunidades de diferenciación y nichos desatendidos
- Estrategias para ganar ventaja competitiva y defenderse de amenazas

Incluye inteligencia competitiva específica y estrategias accionables para superar a la competencia.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async planExpansion(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de expansión disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un plan de expansión estratégico que incluya:
- Evaluación de mercados objetivos con criterios de priorización
- Análisis de viabilidad y atractivo de cada oportunidad de expansión
- Estrategias de entrada por mercado (orgánica, partnerships, adquisiciones)
- Plan de inversión y recursos necesarios por fase de expansión
- Cronograma de expansión con hitos y métricas de éxito
- Análisis de riesgos específicos por mercado y estrategias de mitigación
- Adaptación de productos/servicios a nuevos mercados
- Estructura organizacional y operativa para la expansión
- Plan de contingencia y escenarios alternativos

Proporciona un plan de expansión específico, realista y adaptado a las capacidades del negocio.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async optimizePerformance(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de performance disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un plan de optimización de performance que incluya:
- Diagnóstico integral de eficiencia operativa actual
- Identificación de cuellos de botella y procesos ineficientes
- Estrategias de automatización y digitalización prioritarias
- Optimización de recursos humanos y estructura organizacional
- Mejoras en productividad y eficiencia por área funcional
- Implementación de KPIs y sistemas de monitoreo de performance
- Plan de mejora continua con metodologías lean y agile
- ROI esperado de las optimizaciones propuestas
- Cronograma de implementación con quick wins y proyectos a largo plazo

Incluye mejoras específicas, métricas de impacto y cronograma de implementación realista.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralBusinessAdvice(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Consulta estratégica general'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona asesoramiento estratégico integral que incluya:
- Diagnóstico de la situación empresarial actual
- Identificación de oportunidades estratégicas principales
- Mejores prácticas empresariales para el contexto argentino
- Estrategias para mejorar competitividad y posicionamiento
- Recomendaciones adaptadas al tamaño y madurez del negocio
- Próximos pasos prioritarios con cronograma estratégico
- Herramientas y frameworks útiles para la gestión estratégica
- Consideraciones específicas del entorno empresarial argentino

Adapta las recomendaciones al contexto específico y capacidades del emprendedor.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 