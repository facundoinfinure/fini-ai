/**
 * Analytics Agent
 * Specialized agent for data analysis, sales metrics, and business insights
 */

import { BaseAgent } from './base-agent';
import { ANALYTICS_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class AnalyticsAgent extends BaseAgent {
  constructor() {
    super(
      'analytics',
      'Analytics Agent',
      'Expert in data analysis, sales metrics, and business insights',
      [
        {
          name: 'Sales Analysis',
          description: 'Analyze sales data, revenue trends, and conversion metrics',
          examples: ['Total sales today', 'Best selling products', 'Revenue comparison'],
          priority: 10
        },
        {
          name: 'Product Performance',
          description: 'Track product metrics, inventory, and popularity trends',
          examples: ['Top products', 'Low stock alerts', 'Category performance'],
          priority: 9
        },
        {
          name: 'Customer Analytics',
          description: 'Customer behavior analysis and segmentation',
          examples: ['Customer lifetime value', 'Purchase patterns', 'Customer segments'],
          priority: 8
        },
        {
          name: 'Financial Reporting',
          description: 'Financial KPIs, profit analysis, and business metrics',
          examples: ['Monthly revenue', 'Profit margins', 'Cost analysis'],
          priority: 9
        },
        {
          name: 'Trend Analysis',
          description: 'Identify trends, patterns, and forecasting',
          examples: ['Seasonal trends', 'Growth predictions', 'Market patterns'],
          priority: 7
        }
      ],
      ANALYTICS_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing analytics query: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of analytics request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'product_pricing':
          response = await this.generateProductPricing(context, ragContext);
          confidence = 0.95;
          break;
        case 'sales_summary':
          response = await this.generateSalesSummary(context, ragContext);
          confidence = 0.9;
          break;
        case 'product_analysis':
          response = await this.generateProductAnalysis(context, ragContext);
          confidence = 0.85;
          break;
        case 'customer_insights':
          response = await this.generateCustomerInsights(context, ragContext);
          confidence = 0.8;
          break;
        case 'financial_report':
          response = await this.generateFinancialReport(context, ragContext);
          confidence = 0.85;
          break;
        case 'trend_analysis':
          response = await this.generateTrendAnalysis(context, ragContext);
          confidence = 0.75;
          break;
        case 'comparison':
          response = await this.generateComparison(context, ragContext);
          confidence = 0.8;
          break;
        default:
          response = await this.generateGeneralAnalytics(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Analytics response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Analytics query processed: ${queryType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Analytics processing failed: ${errorMessage}`);
      
      // 🔥 ENHANCED: Provide useful analytics advice even on error
      const fallbackResponse = `📊 **Analytics de Tu Tienda - Sistema en Sincronización**

He detectado un problema técnico temporal, pero puedo ayudarte con análisis generales:

**🎯 Métricas Clave a Monitorear:**
• **Conversión**: % de visitantes que compran
• **Ticket promedio**: Valor promedio por venta
• **Retorno de clientes**: % de clientes que recompran
• **Margen bruto**: Ganancia después de costos directos

**📈 Estrategias de Crecimiento:**
• **A/B Testing**: Prueba diferentes versiones de productos
• **Upselling**: Sugiere productos complementarios
• **Email marketing**: Reactivar clientes inactivos
• **SEO**: Mejorar posicionamiento en búsquedas

**🔧 Herramientas Recomendadas:**
• Google Analytics para tráfico web
• Pixel de Facebook para remarketing
• Reviews automáticos para confianza

Estoy solucionando el problema técnico. ¿Hay algún aspecto específico de analytics que te interese mientras tanto?`;

      return {
        success: true,
        agentType: this.type,
        response: fallbackResponse,
        confidence: 0.7,
        reasoning: 'Fallback analytics advice provided due to technical issue',
                 metadata: {
           fallbackUsed: true,
           ragUsed: false
         }
       };
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for analytics keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.analytics);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('cuánto') && (lowerMessage.includes('vend') || lowerMessage.includes('gané'))) {
      score += 0.3;
    }
    if (lowerMessage.includes('reporte') || lowerMessage.includes('análisis') || lowerMessage.includes('datos')) {
      score += 0.2;
    }
    if (lowerMessage.includes('producto') && lowerMessage.includes('más')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found analytics keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific analytics keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // 🔥 NEW: Product pricing analysis queries
    if (lowerMessage.includes('caro') || lowerMessage.includes('barato') || 
        (lowerMessage.includes('producto') && lowerMessage.includes('precio'))) {
      return { type: 'product_pricing', reasoning: 'Product pricing analysis query detected', confidence: 0.95 };
    }

    // Sales summary queries
    if (lowerMessage.includes('cuánto') && (lowerMessage.includes('vend') || lowerMessage.includes('gané'))) {
      return { type: 'sales_summary', reasoning: 'Sales amount query detected', confidence: 0.9 };
    }
    if (lowerMessage.includes('ventas') && (lowerMessage.includes('hoy') || lowerMessage.includes('ayer') || lowerMessage.includes('mes'))) {
      return { type: 'sales_summary', reasoning: 'Time-based sales query', confidence: 0.85 };
    }

    // Product analysis
    if (lowerMessage.includes('producto') && (lowerMessage.includes('más') || lowerMessage.includes('mejor') || lowerMessage.includes('top'))) {
      return { type: 'product_analysis', reasoning: 'Product ranking query', confidence: 0.9 };
    }
    if (lowerMessage.includes('inventario') || lowerMessage.includes('stock')) {
      return { type: 'product_analysis', reasoning: 'Inventory query', confidence: 0.8 };
    }

    // Customer insights
    if (lowerMessage.includes('cliente') && (lowerMessage.includes('compra') || lowerMessage.includes('comportamiento'))) {
      return { type: 'customer_insights', reasoning: 'Customer behavior query', confidence: 0.8 };
    }

    // Financial reports
    if (lowerMessage.includes('ingreso') || lowerMessage.includes('ganancia') || lowerMessage.includes('facturación')) {
      return { type: 'financial_report', reasoning: 'Financial metrics query', confidence: 0.85 };
    }

    // Trend analysis
    if (lowerMessage.includes('tendencia') || lowerMessage.includes('crecimiento') || lowerMessage.includes('evolución')) {
      return { type: 'trend_analysis', reasoning: 'Trend analysis query', confidence: 0.8 };
    }

    // Comparison queries
    if (lowerMessage.includes('comparar') || lowerMessage.includes('vs') || lowerMessage.includes('contra')) {
      return { type: 'comparison', reasoning: 'Comparison analysis query', confidence: 0.75 };
    }

    return { type: 'general', reasoning: 'General analytics query', confidence: 0.5 };
  }

  private async generateSalesSummary(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos específicos disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona un resumen de ventas detallado que incluya:
- Cifras específicas de ventas (si están disponibles)
- Comparaciones con períodos anteriores
- Insights sobre el rendimiento
- Recomendaciones basadas en los datos

Formato de respuesta profesional en español.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateProductAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    
    // Check if we have actual product data
    const hasData = ragContext && ragContext.length > 50 && !ragContext.includes('No hay datos') && !ragContext.includes('ESTADO DE DATOS');
    
    if (!hasData) {
      return `📊 **Sincronizando productos...**

No encuentro productos para analizar. Esto es normal si:
• Es una tienda nueva sin productos
• Los productos están en borrador
• Es necesario sincronizar datos

**Próximos pasos:**
1. Agrega productos reales en Tienda Nube
2. Asegúrate que estén publicados
3. Regresa y pregunta sobre analytics específicos

¿Te ayudo con estrategias mientras preparas tu catálogo?`;
    }

    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis de productos que incluya:
- Productos más vendidos y su performance
- Análisis de categorías
- Recomendaciones de inventario
- Oportunidades de mejora
- Insights sobre demanda y tendencias

Usa datos específicos cuando estén disponibles y proporciona recomendaciones accionables.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateProductPricing(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    
    // Check if we have actual product data
    const hasData = ragContext && ragContext.length > 50 && !ragContext.includes('No hay datos') && !ragContext.includes('ESTADO DE DATOS');
    
    if (!hasData) {
      // 🔥 AUTO-SYNC: Trigger immediate RAG sync when no product data found
      console.warn(`[ANALYTICS-AGENT] No product data found for pricing query. Triggering sync for store: ${context.storeId}`);
      
      try {
        // Fire sync request (don't wait for response to avoid timeout)
        const syncUrl = process.env.VERCEL_URL ? 
          `https://${process.env.VERCEL_URL}/api/stores/${context.storeId}/sync-rag` :
          `https://fini-tn.vercel.app/api/stores/${context.storeId}/sync-rag`;
          
        fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => {
          console.warn(`[ANALYTICS-AGENT] Auto-sync failed for store ${context.storeId}:`, error);
        });
      } catch (error) {
        console.warn(`[ANALYTICS-AGENT] Auto-sync trigger failed:`, error);
      }

      // 🚀 ENHANCED: Provide useful but CONCISE pricing strategy advice
      return `💰 **Sincronizando datos de productos...**

Activé la sincronización automática. Estrategias rápidas:

• **Margen objetivo**: 40-60% para retail
• **Pricing psicológico**: $99 en lugar de $100  
• **Análisis competencia**: Investiga precios similares

¿Qué aspecto específico de pricing te interesa?`;
    }

    // 🔥 ENHANCED: Use the real product data to provide specific, concise pricing analysis
    const enhancedPrompt = `INSTRUCCIONES CRÍTICAS PARA ANÁLISIS DE PRECIOS:

1. **RESPUESTA MÁXIMO 3-4 LÍNEAS**
2. **USA ÚNICAMENTE DATOS REALES** del contexto proporcionado
3. **IDENTIFICA PRODUCTOS ESPECÍFICOS** con nombres y precios exactos
4. **NO agregues información genérica** sobre estrategias de pricing
5. **RESPONDE DIRECTAMENTE** la pregunta específica del usuario

Consulta del usuario: "${context.userMessage}"

Datos de productos disponibles:
${ragContext}

Formato esperado de respuesta:
- Para "producto más caro": "Tu producto más caro es [NOMBRE] a $[PRECIO]"
- Para "producto más barato": "Tu producto más barato es [NOMBRE] a $[PRECIO]"  
- Para consultas generales: Lista los productos con sus precios reales

IMPORTANTE: Usa números y nombres EXACTOS del contexto, NO inventes información.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateCustomerInsights(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos de clientes disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona insights de clientes que incluyan:
- Patrones de comportamiento de compra
- Segmentación de clientes
- Valor de vida del cliente (CLV)
- Análisis de retención y frecuencia
- Recomendaciones para mejorar la experiencia del cliente

Enfócate en insights accionables para el negocio.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateFinancialReport(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos financieros disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Genera un reporte financiero que incluya:
- Métricas clave de revenue y profit
- Análisis de márgenes y costos
- KPIs financieros importantes
- Comparaciones temporales
- Recomendaciones para optimización financiera

Presenta datos claros con contexto y recomendaciones.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateTrendAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos de tendencias disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza un análisis de tendencias que incluya:
- Identificación de patrones y tendencias
- Análisis estacional si aplica
- Predicciones y forecasting básico
- Factores que influyen en las tendencias
- Recomendaciones estratégicas basadas en las tendencias

Proporciona insights prospectivos para la toma de decisiones.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateComparison(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay datos para comparación disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Realiza una comparación detallada que incluya:
- Comparación de métricas específicas
- Análisis de diferencias y cambios
- Contexto sobre las variaciones
- Factores que explican los cambios
- Recomendaciones basadas en la comparación

Presenta datos comparativos de manera clara y con insights valiosos.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralAnalytics(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Datos limitados disponibles'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona un análisis general que incluya:
- Resumen de datos disponibles
- Insights principales del negocio
- Métricas clave relevantes
- Recomendaciones generales
- Próximos pasos sugeridos

Si no hay datos específicos, proporciona un framework de análisis útil.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 