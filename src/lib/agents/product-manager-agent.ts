/**
 * 🛍️ Product Manager Agent
 * Especialista en gestión de productos, catálogo y estrategia de productos
 */

import { BaseAgent } from './base-agent';
import { PRODUCT_MANAGER_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class ProductManagerAgent extends BaseAgent {
  constructor() {
    super(
      'product_manager',
      'Product Manager Agent',
      'Especialista en gestión de productos, optimización de catálogo y estrategia de productos',
      [
        {
          name: 'Product Catalog Analysis',
          description: 'Análisis y optimización del catálogo de productos',
          examples: [
            'Analizar performance de productos',
            'Identificar productos con mayor potencial',
            'Optimizar estructura de catálogo'
          ],
          priority: 10
        },
        {
          name: 'Pricing Strategy',
          description: 'Estrategias de precios y posicionamiento',
          examples: [
            'Análisis de precios competitivos',
            'Estrategias de pricing dinámico',
            'Optimización de márgenes por producto'
          ],
          priority: 9
        },
        {
          name: 'Product Recommendations',
          description: 'Recomendaciones de nuevos productos y tendencias',
          examples: [
            'Identificar oportunidades de mercado',
            'Recomendar nuevos productos',
            'Análisis de tendencias de consumo'
          ],
          priority: 8
        },
        {
          name: 'Product Lifecycle',
          description: 'Gestión del ciclo de vida de productos',
          examples: [
            'Estrategias de lanzamiento',
            'Gestión de productos maduros',
            'Descontinuación de productos'
          ],
          priority: 7
        }
      ],
      PRODUCT_MANAGER_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing product management query: "${context.userMessage}"`);

    try {
      // 🔍 CRITICAL FIX: Get RAG context for products and catalog
      console.warn(`[PRODUCT-MANAGER] Getting catalog context for store: ${context.storeId}`);
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      if (ragContext.trim().length > 0) {
        console.warn(`[PRODUCT-MANAGER] Found ${ragContext.length} chars of catalog data`);
      } else {
        console.warn(`[PRODUCT-MANAGER] No catalog data found for store ${context.storeId}`);
        
        // 🚀 CHECK: Verificar si hay sincronización en progreso
        try {
          const syncStatus = await this.checkSyncStatus(context.storeId);
          if (syncStatus?.needsSync) {
            console.warn(`[PRODUCT-MANAGER] Store needs sync - triggering intelligent sync`);
            // Trigger sync asynchronously
            this.triggerIntelligentSync(context.storeId);
          }
        } catch (error) {
          console.warn(`[PRODUCT-MANAGER] Sync status check failed:`, error);
        }
      }

      // Identify the type of query to provide focused response
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Query classified as: ${queryType.type} (confidence: ${queryType.confidence})`);

      let response: string;

      // Route to specific handler based on query type
      switch (queryType.type) {
        case 'catalog_analysis':
          response = await this.generateCatalogAnalysis(context, ragContext);
          break;
        case 'pricing_strategy':
          response = await this.generatePricingStrategy(context, ragContext);
          break;
        case 'product_recommendations':
          response = await this.generateProductRecommendations(context, ragContext);
          break;
        case 'lifecycle_management':
          response = await this.generateLifecycleManagement(context, ragContext);
          break;
        case 'competitive_analysis':
          response = await this.generateCompetitiveAnalysis(context, ragContext);
          break;
        case 'trend_analysis':
          response = await this.generateTrendAnalysis(context, ragContext);
          break;
        default:
          response = await this.generateGeneralProductManagement(context, ragContext);
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Product management response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        queryType.confidence,
        queryType.reasoning,
        ragContext,
        executionTime
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Product management processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for product management keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.product_manager);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('producto') && (lowerMessage.includes('análisis') || lowerMessage.includes('performance'))) {
      score += 0.3;
    }
    if (lowerMessage.includes('precio') && (lowerMessage.includes('estrategia') || lowerMessage.includes('competencia'))) {
      score += 0.25;
    }
    if (lowerMessage.includes('catálogo') && (lowerMessage.includes('optimizar') || lowerMessage.includes('mejorar'))) {
      score += 0.25;
    }
    if (lowerMessage.includes('lanzamiento') || lowerMessage.includes('nuevo producto')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found product management keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific product management keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Catalog analysis queries
    if (lowerMessage.includes('catálogo') && (lowerMessage.includes('análisis') || lowerMessage.includes('optimizar'))) {
      return { type: 'catalog_analysis', reasoning: 'Catalog optimization query detected', confidence: 0.9 };
    }
    if (lowerMessage.includes('productos') && (lowerMessage.includes('performance') || lowerMessage.includes('más vendidos'))) {
      return { type: 'catalog_analysis', reasoning: 'Product performance query', confidence: 0.85 };
    }

    // Pricing strategy
    if (lowerMessage.includes('precio') && (lowerMessage.includes('estrategia') || lowerMessage.includes('competencia'))) {
      return { type: 'pricing_strategy', reasoning: 'Pricing strategy query', confidence: 0.9 };
    }
    if (lowerMessage.includes('pricing') || (lowerMessage.includes('precio') && lowerMessage.includes('optimizar'))) {
      return { type: 'pricing_strategy', reasoning: 'Pricing optimization query', confidence: 0.85 };
    }

    // Product recommendations
    if (lowerMessage.includes('nuevo producto') || lowerMessage.includes('recomendar producto')) {
      return { type: 'product_recommendations', reasoning: 'New product recommendation query', confidence: 0.9 };
    }
    if (lowerMessage.includes('tendencia') && lowerMessage.includes('producto')) {
      return { type: 'product_recommendations', reasoning: 'Product trend query', confidence: 0.8 };
    }

    // Lifecycle management
    if (lowerMessage.includes('lanzamiento') || lowerMessage.includes('descontinuar')) {
      return { type: 'lifecycle_management', reasoning: 'Product lifecycle query', confidence: 0.85 };
    }
    if (lowerMessage.includes('ciclo de vida') || lowerMessage.includes('producto maduro')) {
      return { type: 'lifecycle_management', reasoning: 'Lifecycle management query', confidence: 0.8 };
    }

    // Competitive analysis
    if (lowerMessage.includes('competencia') && lowerMessage.includes('producto')) {
      return { type: 'competitive_analysis', reasoning: 'Competitive product analysis', confidence: 0.8 };
    }
    if (lowerMessage.includes('benchmark') || lowerMessage.includes('comparar producto')) {
      return { type: 'competitive_analysis', reasoning: 'Product benchmarking query', confidence: 0.8 };
    }

    // Trend analysis
    if (lowerMessage.includes('tendencia') || lowerMessage.includes('mercado')) {
      return { type: 'trend_analysis', reasoning: 'Market trend analysis', confidence: 0.75 };
    }

    return { type: 'general', reasoning: 'General product management query', confidence: 0.5 };
  }

  private async generateCatalogAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const hasProductData = ragContext && ragContext.length > 50 && !ragContext.includes('ESTADO DE DATOS');
    
    if (!hasProductData) {
      // 🚀 ENHANCED: Provide valuable catalog strategy even without specific product data
      return `📦 **Análisis de Catálogo - Optimizando tu Tienda**

He iniciado la sincronización de datos de tus productos. Mientras tanto, aquí tienes estrategias clave:

**🎯 Fundamentos de un Catálogo Exitoso:**
• **Categorización clara**: Organiza productos por tipo, precio, público objetivo
• **Imágenes profesionales**: Mínimo 3-5 fotos por producto desde diferentes ángulos
• **Descripciones SEO**: Incluye palabras clave que buscan tus clientes
• **Precios competitivos**: Investiga la competencia y define tu posicionamiento

**📊 Métricas de Catálogo a Monitorear:**
• **Productos más vistos**: Identifica qué atrae a tus clientes
• **Conversión por producto**: % de vistas que se convierten en ventas
• **Inventario disponible**: Evita quedarte sin stock de top sellers
• **Productos relacionados**: Sugiere complementos para aumentar ticket promedio

**🚀 Optimizaciones Inmediatas:**
1. **Reviews y ratings**: Activa sistema de reseñas
2. **Cross-selling**: Configura "productos relacionados"
3. **Filtros de búsqueda**: Facilita encontrar productos
4. **Promociones**: Destaca ofertas y productos estrella

**🔧 Herramientas Recomendadas:**
• Google Merchant Center para aparecer en Shopping
• Apps de reviews automáticos (Loox, Stamped)
• Herramientas de A/B testing para descripciones

Una vez completada la sincronización, te daré insights específicos sobre tu catálogo actual. ¿Hay algún aspecto particular de gestión de productos que te interese?`;
    }

    // Use existing logic for when we have data
    return `📦 **Análisis de Catálogo**

Basándome en los datos de tu tienda:

${ragContext}

Análisis completado - información específica de tu catálogo disponible.`;
  }

  private async generatePricingStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const hasData = ragContext && ragContext.length > 50 && !ragContext.includes('ESTADO DE DATOS');
    
    if (!hasData) {
      return `💰 **Estrategia de Precios Inteligente**

Activando sincronización de datos. Mientras tanto, estrategias de pricing efectivas:

**🎯 Metodologías de Pricing:**
• **Cost-plus**: Costo + margen deseado (simple pero limitado)
• **Value-based**: Precio basado en valor percibido por cliente
• **Competitive**: Análisis de precios de competencia directa
• **Dynamic**: Ajustar según demanda, temporada, inventario

**📊 Factores Clave a Considerar:**
• **Margen objetivo**: 40-60% para retail, 20-30% para productos commodity
• **Elasticidad de demanda**: Qué tan sensible es tu audiencia al precio
• **Posicionamiento**: Premium, mid-market, o budget-friendly
• **Ciclo de vida**: Precios diferentes para lanzamiento vs madurez

**🚀 Estrategias Avanzadas:**
• **Bundle pricing**: Vende paquetes con descuento
• **Psychological pricing**: $99 en lugar de $100
• **Penetration pricing**: Precio bajo para ganar mercado rápido
• **Skimming**: Precio alto inicial, luego reducir gradualmente

**🔧 Herramientas de Monitoreo:**
• Competitors pricing apps (PriceSpider, Competera)
• A/B testing de precios en productos similares
• Analytics de abandono de carrito por precio

¿Quieres que analice algún aspecto específico de pricing cuando termine la sincronización?`;
    }

    return `💰 **Estrategia de Precios**

${ragContext}

Análisis de precios completado con datos específicos de tu tienda.`;
  }

  private async generateProductRecommendations(context: AgentContext, ragContext: string): Promise<string> {
    const hasData = ragContext && ragContext.length > 50;
    
    if (!hasData) {
      return `🎯 **Recomendaciones de Productos**

Sincronizando catálogo actual. Estrategias universales para optimizar tu mix de productos:

**📈 Productos de Alto Impacto:**
• **Hero products**: 2-3 productos que definen tu marca
• **Traffic drivers**: Productos que atraen visitantes (pueden tener menor margen)
• **High-margin items**: Productos con excelente rentabilidad
• **Seasonal winners**: Productos estacionales con alta demanda

**🔍 Análisis de Gap de Productos:**
• **Competitor gap analysis**: Qué venden otros que tú no tienes
• **Customer requests**: Qué piden tus clientes que no ofreces
• **Cross-sell opportunities**: Productos complementarios faltantes
• **Price range gaps**: Segmentos de precio sin cubrir

**🚀 Ideas de Expansión:**
• **Bundles y kits**: Combina productos existentes
• **Variaciones**: Diferentes colores, tamaños, materiales
• **Productos de temporada**: Aprovecha eventos y festividades
• **Private label**: Desarrolla productos exclusivos

**📊 Validación Antes de Agregar:**
• Research de demanda (Google Trends, keywords)
• Análisis de competencia en ese segmento
• Test con pequeño inventario inicial
• Feedback directo de clientes actuales

Te daré recomendaciones específicas basadas en tu catálogo actual una vez que termine la sincronización.`;
    }

    return `🎯 **Recomendaciones de Productos**

${ragContext}

Recomendaciones específicas generadas para tu catálogo.`;
  }

  private async generateLifecycleManagement(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: GESTIÓN DEL CICLO DE VIDA
- Evalúa la etapa actual de los productos
- Proporciona estrategias según la fase del ciclo
- Identifica productos para revitalizar o descontinuar
- Planifica estrategias de lanzamiento o retirada

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateCompetitiveAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: ANÁLISIS COMPETITIVO
- Compara productos con la competencia
- Identifica ventajas competitivas y debilidades
- Analiza posicionamiento en el mercado
- Proporciona estrategias de diferenciación

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateTrendAnalysis(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: ANÁLISIS DE TENDENCIAS
- Identifica tendencias emergentes del mercado
- Analiza el impacto en el portfolio actual
- Proporciona insights sobre demanda futura
- Recomienda adaptaciones del catálogo

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralProductManagement(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque: CONSULTA GENERAL DE GESTIÓN DE PRODUCTOS
- Proporciona una respuesta integral sobre gestión de productos
- Incluye mejores prácticas y recomendaciones
- Considera el contexto específico del negocio
- Sugiere próximos pasos accionables

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  /**
   * 🚀 Check sync status for a store
   */
  private async checkSyncStatus(storeId: string): Promise<{ needsSync: boolean; lastSync?: string } | null> {
    try {
      // 🔥 FIX: Use absolute URL for server-side fetch
      const baseUrl = process.env.VERCEL_URL ? 
        `https://${process.env.VERCEL_URL}` : 
        'https://fini-tn.vercel.app';
        
      const response = await fetch(`${baseUrl}/api/stores/sync-status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.stores) {
          const storeStatus = data.data.stores.find((s: { storeId: string; needsSync: boolean; lastSyncAt?: string }) => s.storeId === storeId);
          return storeStatus ? {
            needsSync: storeStatus.needsSync,
            lastSync: storeStatus.lastSyncAt
          } : null;
        }
      }
      return null;
    } catch (error) {
      console.warn('[PRODUCT-MANAGER] Sync status check failed:', error);
      return null;
    }
  }

  /**
   * 🚀 Trigger intelligent sync for a store
   */
  private triggerIntelligentSync(storeId: string): void {
    // 🔥 FIX: Use absolute URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      'https://fini-tn.vercel.app';
      
    // Fire-and-forget sync trigger
    fetch(`${baseUrl}/api/stores/sync-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeIds: [storeId] })
    }).catch(error => {
      console.warn('[PRODUCT-MANAGER] Intelligent sync trigger failed:', error);
    });
  }
} 