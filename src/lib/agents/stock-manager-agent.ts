/**
 * Stock Manager Agent
 * Specialized agent for inventory management, stock optimization, and supply chain analysis
 */

import { BaseAgent } from './base-agent';
import { STOCK_MANAGER_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class StockManagerAgent extends BaseAgent {
  constructor() {
    super(
      'stock_manager',
      'Stock Manager Agent',
      'Expert in inventory management, stock optimization, and supply chain analysis',
      [
        {
          name: 'Inventory Analysis',
          description: 'Analyze inventory levels, rotation, and optimization opportunities',
          examples: ['Stock levels analysis', 'Inventory turnover', 'ABC analysis'],
          priority: 10
        },
        {
          name: 'Replenishment Planning',
          description: 'Calculate optimal reorder points and quantities',
          examples: ['Reorder alerts', 'Purchase planning', 'Lead time optimization'],
          priority: 9
        },
        {
          name: 'Stock Alerts',
          description: 'Proactive alerts for low stock, overstock, and critical items',
          examples: ['Low stock warnings', 'Stockout prevention', 'Critical alerts'],
          priority: 10
        },
        {
          name: 'Slow-Moving Analysis',
          description: 'Identify and strategize for slow-moving inventory',
          examples: ['Dead stock identification', 'Liquidation strategies', 'Clearance planning'],
          priority: 8
        },
        {
          name: 'Demand Forecasting',
          description: 'Predict future demand patterns and seasonal trends',
          examples: ['Seasonal forecasting', 'Trend analysis', 'Demand planning'],
          priority: 7
        }
      ],
      STOCK_MANAGER_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing inventory query: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of inventory request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType.type}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'stock_levels':
          response = await this.analyzeStockLevels(context, ragContext);
          confidence = 0.9;
          break;
        case 'replenishment':
          response = await this.generateReplenishmentPlan(context, ragContext);
          confidence = 0.9;
          break;
        case 'slow_moving':
          response = await this.analyzeSlowMovingStock(context, ragContext);
          confidence = 0.85;
          break;
        case 'alerts':
          response = await this.generateStockAlerts(context, ragContext);
          confidence = 0.9;
          break;
        case 'demand_forecast':
          response = await this.generateDemandForecast(context, ragContext);
          confidence = 0.8;
          break;
        case 'inventory_optimization':
          response = await this.optimizeInventory(context, ragContext);
          confidence = 0.85;
          break;
        default:
          response = await this.generateGeneralInventoryAdvice(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Stock management response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Inventory analysis completed: ${queryType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Stock management processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for stock management keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.stock_manager);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('stock') || lowerMessage.includes('inventario')) {
      score += 0.3;
    }
    if (lowerMessage.includes('reponer') || lowerMessage.includes('reposición')) {
      score += 0.3;
    }
    if (lowerMessage.includes('agotado') || lowerMessage.includes('sin stock')) {
      score += 0.3;
    }
    if (lowerMessage.includes('no se vende') || lowerMessage.includes('parado')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found inventory keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific inventory keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Stock levels and analysis
    if (lowerMessage.includes('stock') || lowerMessage.includes('inventario')) {
      if (lowerMessage.includes('nivel') || lowerMessage.includes('cantidad') || lowerMessage.includes('cuánto')) {
        return { type: 'stock_levels', reasoning: 'Stock level inquiry', confidence: 0.9 };
      }
      return { type: 'stock_levels', reasoning: 'General stock inquiry', confidence: 0.8 };
    }

    // Replenishment and reordering
    if (lowerMessage.includes('reponer') || lowerMessage.includes('reposición') || lowerMessage.includes('comprar')) {
      return { type: 'replenishment', reasoning: 'Replenishment planning request', confidence: 0.9 };
    }
    if (lowerMessage.includes('pedido') && (lowerMessage.includes('cuándo') || lowerMessage.includes('hacer'))) {
      return { type: 'replenishment', reasoning: 'Purchase timing inquiry', confidence: 0.85 };
    }

    // Slow-moving inventory
    if (lowerMessage.includes('no se vende') || lowerMessage.includes('parado') || lowerMessage.includes('lento')) {
      return { type: 'slow_moving', reasoning: 'Slow-moving inventory issue', confidence: 0.9 };
    }
    if (lowerMessage.includes('liquidar') || lowerMessage.includes('liquidación') || lowerMessage.includes('remate')) {
      return { type: 'slow_moving', reasoning: 'Liquidation strategy request', confidence: 0.85 };
    }

    // Stock alerts and critical situations
    if (lowerMessage.includes('agotado') || lowerMessage.includes('sin stock') || lowerMessage.includes('crítico')) {
      return { type: 'alerts', reasoning: 'Critical stock alert', confidence: 0.9 };
    }
    if (lowerMessage.includes('alerta') || lowerMessage.includes('urgente') || lowerMessage.includes('poco stock')) {
      return { type: 'alerts', reasoning: 'Stock alert request', confidence: 0.85 };
    }

    // Demand forecasting
    if (lowerMessage.includes('demanda') || lowerMessage.includes('proyección') || lowerMessage.includes('forecast')) {
      return { type: 'demand_forecast', reasoning: 'Demand forecasting request', confidence: 0.8 };
    }
    if (lowerMessage.includes('temporada') || lowerMessage.includes('estacional')) {
      return { type: 'demand_forecast', reasoning: 'Seasonal planning request', confidence: 0.8 };
    }

    // Inventory optimization
    if (lowerMessage.includes('optimizar') || lowerMessage.includes('mejorar') || lowerMessage.includes('eficiencia')) {
      return { type: 'inventory_optimization', reasoning: 'Optimization request', confidence: 0.8 };
    }

    return { type: 'general', reasoning: 'General inventory inquiry', confidence: 0.5 };
  }

  private async analyzeStockLevels(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de inventario disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona un análisis detallado de niveles de stock que incluya:
- Estado actual del inventario por producto/categoría
- Identificación de productos con stock crítico o bajo
- Análisis de rotación de inventario y días de cobertura
- Recomendaciones específicas de acción inmediata
- Alertas proactivas sobre productos que requieren atención
- Métricas clave de performance de inventario

Incluye datos específicos, cronogramas y acciones concretas.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateReplenishmentPlan(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de reposición disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla un plan de reposición integral que incluya:
- Lista priorizada de productos a reponer con cantidades específicas
- Cronograma optimizado de pedidos considerando lead times
- Cálculo de puntos de reorden por producto crítico
- Consideración de estacionalidad y tendencias de demanda
- Presupuesto estimado de inversión en inventario
- Estrategias para optimizar capital de trabajo
- Proveedores recomendados y términos de compra

Proporciona un plan de acción específico con fechas y cantidades.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async analyzeSlowMovingStock(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de stock lento disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Analiza productos de movimiento lento y proporciona:
- Identificación específica de productos con rotación baja
- Análisis de causas del bajo movimiento (precio, demanda, competencia)
- Estrategias de liquidación escalonadas por producto
- Tácticas promocionales específicas para acelerar rotación
- Cronograma de acciones correctivas con fechas específicas
- Proyección de recuperación de capital invertido
- Recomendaciones para evitar futuros problemas de stock lento

Incluye estrategias creativas y realistas para el mercado argentino.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateStockAlerts(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos de alertas disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Genera alertas proactivas de inventario que incluyan:
- Productos con stock crítico que requieren acción inmediata
- Predicción de agotamiento por producto con fechas específicas
- Productos con sobrestock que afectan el capital de trabajo
- Oportunidades de optimización de inventario detectadas
- Recomendaciones de acción prioritaria con cronograma
- Sistema de monitoreo continuo para prevenir stockouts
- Métricas de seguimiento para mantener niveles óptimos

Proporciona alertas específicas, accionables y priorizadas por impacto.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateDemandForecast(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos históricos suficientes para forecasting'
    });

    const enhancedPrompt = `${userPrompt}

Desarrolla proyecciones de demanda que incluyan:
- Análisis de patrones históricos de demanda por producto
- Identificación de tendencias estacionales argentinas específicas
- Proyecciones de demanda para próximos 3-6 meses
- Factores externos que pueden afectar la demanda (económicos, competencia)
- Escenarios múltiples (optimista, realista, pesimista)
- Recomendaciones de niveles de inventario por escenario
- Plan de contingencia para variaciones de demanda

Considera especialmente la estacionalidad del mercado argentino.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async optimizeInventory(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos suficientes para optimización'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona estrategias de optimización de inventario que incluyan:
- Análisis ABC de productos con clasificación de importancia
- Identificación de oportunidades de reducción de capital invertido
- Estrategias para mejorar la rotación de inventario
- Optimización de mix de productos basada en rentabilidad
- Recomendaciones de niveles óptimos por categoría
- Plan de implementación con cronograma específico
- Métricas de seguimiento para monitorear mejoras
- ROI esperado de las optimizaciones propuestas

Enfócate en mejoras que generen impacto inmediato y sostenible.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralInventoryAdvice(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Consulta general sobre inventario'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona asesoramiento general de inventario que incluya:
- Mejores prácticas de gestión de inventario para e-commerce argentino
- Recomendaciones específicas basadas en la consulta
- Estrategias para optimizar capital de trabajo
- Herramientas y métricas clave para monitorear inventario
- Consejos prácticos adaptados al tamaño del negocio
- Próximos pasos recomendados

Adapta las recomendaciones al contexto específico del usuario.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 