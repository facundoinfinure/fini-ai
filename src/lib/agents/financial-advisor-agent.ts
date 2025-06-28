/**
 * Financial Advisor Agent
 * Specialized agent for financial analysis, profitability optimization, and cash flow management
 */

import { BaseAgent } from './base-agent';
import { FINANCIAL_ADVISOR_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class FinancialAdvisorAgent extends BaseAgent {
  constructor() {
    super(
      'financial_advisor',
      'Financial Advisor Agent',
      'Expert in financial analysis, profitability, pricing optimization, and cash flow management',
      [
        {
          name: 'Profitability Analysis',
          description: 'Deep dive into product and business profitability',
          examples: ['Product margin analysis', 'True cost calculation', 'ROI evaluation'],
          priority: 10
        },
        {
          name: 'Cash Flow Management',
          description: 'Cash flow projections and liquidity optimization',
          examples: ['Cash flow forecasting', 'Working capital analysis', 'Payment terms optimization'],
          priority: 9
        },
        {
          name: 'Pricing Strategy',
          description: 'Data-driven pricing optimization and market positioning',
          examples: ['Price elasticity analysis', 'Competitive pricing', 'Value-based pricing'],
          priority: 8
        },
        {
          name: 'Financial Planning',
          description: 'Strategic financial planning and budgeting',
          examples: ['Budget planning', 'Investment analysis', 'Growth financing'],
          priority: 8
        },
        {
          name: 'Cost Optimization',
          description: 'Identify and reduce operational costs',
          examples: ['Cost structure analysis', 'Expense reduction', 'Efficiency improvements'],
          priority: 7
        },
        {
          name: 'Financial KPIs',
          description: 'Monitor and improve key financial metrics',
          examples: ['KPI dashboard', 'Financial health check', 'Performance tracking'],
          priority: 7
        }
      ],
      FINANCIAL_ADVISOR_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing financial query: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of financial request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType.type}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'profitability':
          response = await this.analyzeProfitability(context, ragContext);
          confidence = 0.9;
          break;
        case 'cash_flow':
          response = await this.analyzeCashFlow(context, ragContext);
          confidence = 0.9;
          break;
        case 'pricing':
          response = await this.optimizePricing(context, ragContext);
          confidence = 0.85;
          break;
        case 'financial_planning':
          response = await this.createFinancialPlan(context, ragContext);
          confidence = 0.85;
          break;
        case 'cost_analysis':
          response = await this.analyzeCosts(context, ragContext);
          confidence = 0.8;
          break;
        case 'financial_kpis':
          response = await this.analyzeFinancialKPIs(context, ragContext);
          confidence = 0.85;
          break;
        case 'investment_analysis':
          response = await this.analyzeInvestment(context, ragContext);
          confidence = 0.8;
          break;
        default:
          response = await this.generateGeneralFinancialAdvice(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Financial analysis response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Financial analysis completed: ${queryType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Financial analysis processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for financial keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.financial_advisor);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('rentabilidad') || lowerMessage.includes('margen') || lowerMessage.includes('ganancia')) {
      score += 0.3;
    }
    if (lowerMessage.includes('precio') || lowerMessage.includes('pricing') || lowerMessage.includes('costo')) {
      score += 0.3;
    }
    if (lowerMessage.includes('flujo de caja') || lowerMessage.includes('cash flow') || lowerMessage.includes('liquidez')) {
      score += 0.3;
    }
    if (lowerMessage.includes('financiero') || lowerMessage.includes('financial') || lowerMessage.includes('presupuesto')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found financial keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific financial keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Profitability analysis
    if (lowerMessage.includes('rentabilidad') || lowerMessage.includes('rentable')) {
      return { type: 'profitability', reasoning: 'Profitability analysis request', confidence: 0.9 };
    }
    if (lowerMessage.includes('margen') || lowerMessage.includes('ganancia') || lowerMessage.includes('profit')) {
      return { type: 'profitability', reasoning: 'Margin/profit analysis', confidence: 0.85 };
    }

    // Cash flow management
    if (lowerMessage.includes('flujo de caja') || lowerMessage.includes('cash flow')) {
      return { type: 'cash_flow', reasoning: 'Cash flow analysis request', confidence: 0.9 };
    }
    if (lowerMessage.includes('liquidez') || lowerMessage.includes('efectivo') || lowerMessage.includes('capital de trabajo')) {
      return { type: 'cash_flow', reasoning: 'Liquidity analysis request', confidence: 0.85 };
    }

    // Pricing strategy
    if (lowerMessage.includes('precio') && (lowerMessage.includes('optimizar') || lowerMessage.includes('estrategia'))) {
      return { type: 'pricing', reasoning: 'Pricing strategy request', confidence: 0.9 };
    }
    if (lowerMessage.includes('pricing') || lowerMessage.includes('elasticidad') || lowerMessage.includes('competitivo')) {
      return { type: 'pricing', reasoning: 'Pricing optimization request', confidence: 0.85 };
    }

    // Financial planning
    if (lowerMessage.includes('presupuesto') || lowerMessage.includes('planificación financiera')) {
      return { type: 'financial_planning', reasoning: 'Financial planning request', confidence: 0.9 };
    }
    if (lowerMessage.includes('inversión') || lowerMessage.includes('financiamiento') || lowerMessage.includes('proyección')) {
      return { type: 'financial_planning', reasoning: 'Investment/financing planning', confidence: 0.8 };
    }

    // Cost analysis
    if (lowerMessage.includes('costo') && (lowerMessage.includes('reducir') || lowerMessage.includes('optimizar'))) {
      return { type: 'cost_analysis', reasoning: 'Cost optimization request', confidence: 0.9 };
    }
    if (lowerMessage.includes('gastos') || lowerMessage.includes('expenses') || lowerMessage.includes('overhead')) {
      return { type: 'cost_analysis', reasoning: 'Cost structure analysis', confidence: 0.8 };
    }

    // Financial KPIs
    if (lowerMessage.includes('kpi') && lowerMessage.includes('financiero')) {
      return { type: 'financial_kpis', reasoning: 'Financial KPI analysis', confidence: 0.9 };
    }
    if (lowerMessage.includes('métricas') || lowerMessage.includes('indicadores') || lowerMessage.includes('performance')) {
      return { type: 'financial_kpis', reasoning: 'Financial metrics request', confidence: 0.8 };
    }

    // Investment analysis
    if (lowerMessage.includes('roi') || lowerMessage.includes('retorno')) {
      return { type: 'investment_analysis', reasoning: 'ROI analysis request', confidence: 0.85 };
    }
    if (lowerMessage.includes('evaluación') && lowerMessage.includes('inversión')) {
      return { type: 'investment_analysis', reasoning: 'Investment evaluation request', confidence: 0.8 };
    }

    return { type: 'general', reasoning: 'General financial inquiry', confidence: 0.5 };
  }

  private async analyzeProfitability(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos financieros específicos disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis profundo de rentabilidad que incluya:
- Cálculo de rentabilidad real por producto incluyendo TODOS los costos ocultos
- Análisis de márgenes brutos, operativos y netos con contexto argentino
- Identificación de productos más y menos rentables con ranking específico
- Análisis ABC de productos por contribución a la rentabilidad total
- Impacto de comisiones, impuestos y costos logísticos argentinos
- Recomendaciones específicas para optimizar márgenes
- Análisis de sensibilidad ante cambios de costos e inflación
- Estrategias para mejorar rentabilidad a corto y mediano plazo

Incluye cálculos específicos, porcentajes exactos y recomendaciones accionables.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeCashFlow(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos de flujo de caja disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un análisis completo de flujo de caja que incluya:
- Proyección de cash flow para próximos 3-6 meses con múltiples escenarios
- Análisis de patrones de cobros y pagos actuales
- Identificación de brechas de liquidez y momentos críticos
- Optimización de capital de trabajo y ciclo de conversión de efectivo
- Estrategias para mejorar términos de cobro y pago
- Plan de contingencia para situaciones de stress financiero
- Recomendaciones para mantener liquidez óptima
- Consideración de factores macroeconómicos argentinos (inflación, devaluación)

Proporciona proyecciones específicas con fechas y montos, incluyendo escenarios pesimista, realista y optimista.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async optimizePricing(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos de precios disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla una estrategia de pricing integral que incluya:
- Análisis de elasticidad de precios por producto y categoría
- Benchmarking competitivo con posicionamiento de mercado
- Estrategias de pricing psicológico adaptadas al consumidor argentino
- Optimización de precios basada en valor percibido y demanda
- Análisis de punto de equilibrio y márgenes mínimos aceptables
- Estrategias de pricing dinámico para diferentes canales
- Consideración de estacionalidad y eventos comerciales argentinos
- Plan de implementación gradual con testing A/B
- Proyección de impacto en ventas y rentabilidad

Incluye recomendaciones específicas de precios, cronograma de implementación y métricas de seguimiento.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async createFinancialPlan(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos suficientes para planificación financiera'
    });

    const enhancedPrompt = `${userPrompt}

Crea un plan financiero estratégico que incluya:
- Presupuesto anual detallado por categorías (ingresos, gastos, inversiones)
- Proyecciones financieras trimester por trimestre
- Análisis de viabilidad financiera y puntos de equilibrio
- Plan de inversiones prioritarias con ROI esperado
- Estrategias de financiamiento adaptadas al contexto argentino
- Gestión de riesgos financieros (inflación, devaluación, recesión)
- KPIs financieros clave para monitorear el plan
- Escenarios de contingencia y planes de ajuste
- Cronograma de revisiones y ajustes del plan

Proporciona un roadmap financiero específico con hitos, fechas y métricas de control.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeCosts(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos detallados de costos disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis exhaustivo de costos que incluya:
- Descomposición detallada de estructura de costos (fijos vs variables)
- Identificación de costos ocultos y no evidentes en e-commerce argentino
- Análisis de eficiencia operativa y oportunidades de optimización
- Benchmarking de costos vs industria y mejores prácticas
- Estrategias específicas para reducción de costos sin afectar calidad
- Análisis de punto de equilibrio operativo y financiero
- Impacto de la inflación argentina en la estructura de costos
- Plan de acción priorizado para optimización de gastos
- ROI esperado de las optimizaciones propuestas

Incluye porcentajes específicos de ahorro, cronograma de implementación y métricas de seguimiento.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeFinancialKPIs(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos suficientes para análisis de KPIs'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un análisis completo de KPIs financieros que incluya:
- Dashboard de métricas financieras clave con valores actuales vs objetivos
- Análisis de tendencias y evolución histórica de KPIs críticos
- Identificación de métricas con desempeño subóptimo y causas raíz
- Benchmarking de KPIs vs estándares de la industria argentina
- Correlaciones entre diferentes métricas y impactos cruzados
- Alertas tempranas y sistemas de monitoreo automático
- Plan de mejora específico para cada KPI problemático
- Proyecciones de mejora con cronograma realista

Incluye valores específicos, porcentajes de mejora esperados y acciones concretas para cada KPI.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeInvestment(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos suficientes para análisis de inversión'
    });

    const enhancedPrompt = `${userPrompt}

Realiza una evaluación completa de inversión que incluya:
- Análisis de ROI, payback period y VAN de la inversión propuesta
- Evaluación de riesgos específicos del contexto argentino
- Análisis de sensibilidad ante diferentes escenarios económicos
- Comparación con alternativas de inversión disponibles
- Impacto en cash flow y necesidades de financiamiento
- Plan de implementación con cronograma y milestones
- Métricas de seguimiento para evaluar éxito de la inversión
- Estrategias de mitigación de riesgos identificados
- Recomendación final con justificación técnica

Proporciona análisis cuantitativo detallado con cálculos específicos y recomendación clara de proceder o no.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralFinancialAdvice(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Consulta financiera general'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona asesoramiento financiero integral que incluya:
- Diagnóstico de la situación financiera actual
- Identificación de oportunidades de mejora financiera
- Mejores prácticas financieras para e-commerce argentino
- Estrategias para optimizar rentabilidad y liquidez
- Recomendaciones adaptadas al tamaño y madurez del negocio
- Próximos pasos prioritarios con cronograma
- Herramientas y métricas clave para monitoreo financiero
- Consideraciones específicas del mercado argentino

Adapta las recomendaciones al contexto específico y capacidades del usuario.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 