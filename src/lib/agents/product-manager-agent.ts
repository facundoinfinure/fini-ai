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
    const systemPrompt = this.config.prompts.systemPrompt;
    
    // 🔥 ENHANCED: Check if we have actual product data with better detection
    const hasProductData = ragContext && 
      ragContext.length > 50 && 
      !ragContext.includes('No hay datos específicos') &&
      !ragContext.includes('No hay información relevante') &&
      (ragContext.includes('[PRODUCT') || ragContext.includes('producto') || ragContext.includes('catálogo'));
    
    if (!hasProductData) {
      console.warn(`[PRODUCT-MANAGER] ⚠️ No catalog data available for store: ${context.storeId}`);
      
      // 🔥 ENHANCED: Check if data exists with async verification
      const hasAnyData = await this.hasRAGData(context.storeId);
      
      if (!hasAnyData) {
        // 🚀 TRIGGER: Auto-sync for stores without any data
        this.triggerRAGSyncIfNeeded(context.storeId);
        
        return `**🔄 Sincronizando datos del catálogo...**

Para poder analizar tu catálogo de productos, necesito que se sincronicen los datos de tu tienda.

**¿Qué está pasando?**
- Acabas de conectar tu tienda y los datos se están sincronizando automáticamente
- Este proceso toma entre 2-5 minutos la primera vez
- Una vez completado, tendré acceso completo a toda la información de tus productos

**Mientras tanto, puedes:**
• Revisar la configuración de tu tienda en la sección **Configuración**
• Conectar WhatsApp para recibir notificaciones automáticas
• Explorar las otras funcionalidades del dashboard

**¿Tienes prisa?** Puedes forzar la sincronización manualmente desde la sección **Configuración** → **Sincronizar datos**.

¡En unos minutos podremos analizar tu catálogo completo! 🚀`;
      } else {
        // Data exists but no products found - store might not have products
        return `**📦 Análisis del catálogo**

He revisado tu tienda pero no encuentro productos específicos para analizar en este momento.

**Posibles causiones:**
- Tu tienda aún no tiene productos cargados
- Los productos están en estado borrador o inactivos
- Hay un problema de sincronización con los datos

**Recomendaciones:**
1. **Verifica en Tienda Nube** que tienes productos publicados y activos
2. **Sincroniza manualmente** desde Configuración → Sincronizar datos
3. **Contacta soporte** si el problema persiste

Una vez que tengas productos activos y sincronizados, podré ayudarte con:
• Análisis completo del catálogo
• Estrategias de precios competitivos
• Recomendaciones de productos
• Optimización de descripciones
• Gestión de inventario`;
      }
    }

    // 🔥 ENHANCED: Provide rich product analysis with detected data
    const enhancedPrompt = `${this.config.prompts.userPrompt}

**ANÁLISIS DETALLADO DEL CATÁLOGO**

Basándome en los datos actuales de tu tienda, realiza un análisis completo del catálogo:

**1. RESUMEN EJECUTIVO:**
- Cantidad total de productos
- Categorías principales
- Rango de precios
- Estado general del catálogo

**2. ANÁLISIS POR CATEGORÍA:**
- Productos por categoría
- Precios promedio por categoría
- Productos más y menos costosos

**3. OPORTUNIDADES IDENTIFICADAS:**
- Productos que podrían necesitar mejor descripción
- Oportunidades de precios
- Categorías con potencial de crecimiento
- Productos que podrían beneficiarse de promociones

**4. RECOMENDACIONES ESTRATÉGICAS:**
- Próximos pasos para optimizar el catálogo
- Estrategias de precios
- Mejoras en descripciones o imágenes

Consulta del usuario: ${context.userMessage}
Datos del catálogo: ${ragContext}

Proporciona un análisis profesional, útil y accionable. Usa emojis para hacer la respuesta más visual y fácil de leer.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generatePricingStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    
    const hasProductData = ragContext && 
      ragContext.length > 50 && 
      !ragContext.includes('No hay datos específicos') &&
      (ragContext.includes('[PRODUCT') || ragContext.includes('precio') || ragContext.includes('$'));
    
    if (!hasProductData) {
      // 🚀 TRIGGER: Auto-sync for pricing analysis
      this.triggerRAGSyncIfNeeded(context.storeId);
      
      return `**💰 Estrategia de precios**

Para desarrollar una estrategia de precios efectiva, necesito analizar los datos actuales de tus productos.

**Los datos se están sincronizando...**
- Analizaré precios actuales de todos tus productos
- Identificaré oportunidades de optimización
- Compararé con rangos de mercado
- Sugeriré ajustes estratégicos

**Una vez completada la sincronización, podré ayudarte con:**
• 📊 Análisis de precios por categoría
• 🎯 Identificación de productos subvalorados/sobrevalorados  
• 💡 Estrategias de precios psicológicos
• 🏷️ Recomendaciones de descuentos y promociones
• 📈 Optimización para maximizar rentabilidad

**Mientras tanto:** Puedes revisar tu estrategia actual en Tienda Nube y pensar en tus objetivos de precios.

¡En unos minutos tendrás un análisis completo! ⏱️`;
    }

    const enhancedPrompt = `${this.config.prompts.userPrompt}

**ESTRATEGIA DE PRECIOS AVANZADA**

Analiza los precios actuales y desarrolla una estrategia integral:

**1. ANÁLISIS DE PRECIOS ACTUAL:**
- Distribución de precios por categoría
- Productos con mejor/peor ratio precio-valor
- Identificación de outliers (muy caros/baratos)

**2. OPORTUNIDADES DE OPTIMIZACIÓN:**
- Productos que podrían aumentar precio
- Productos que necesitan ser más competitivos
- Estrategias de precios psicológicos ($99 vs $100)

**3. ESTRATEGIAS RECOMENDADAS:**
- Pricing por categoría
- Bundling de productos
- Estrategias de descuentos estacionales
- Precios premium vs competitivos

**4. PLAN DE ACCIÓN:**
- Ajustes inmediatos recomendados
- Cronograma de implementación
- Métricas para monitorear

Consulta del usuario: ${context.userMessage}
Datos de productos y precios: ${ragContext}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateProductRecommendations(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    
    const hasProductData = ragContext && ragContext.length > 50 && !ragContext.includes('No hay datos específicos');
    
    if (!hasProductData) {
      // 🚀 TRIGGER: Auto-sync for recommendations
      this.triggerRAGSyncIfNeeded(context.storeId);
      
      return `**🎯 Recomendaciones de productos**

Para ofrecerte recomendaciones personalizadas de productos, estoy analizando tu catálogo actual.

**¿Qué analizaré cuando los datos estén listos?**
- Productos actuales y sus características
- Gaps en tu catálogo vs demanda del mercado
- Oportunidades de cross-selling y up-selling
- Tendencias de productos complementarios
- Análisis de estacionalidad

**Recomendaciones que recibirás:**
• 🆕 Nuevos productos para agregar a tu catálogo
• 🔄 Productos complementarios para hacer bundles
• 📈 Productos con mayor potencial de venta
• 🎨 Variaciones de productos existentes exitosos
• 🛍️ Estrategias de merchandising

**Tip mientras esperas:** Piensa en qué productos son más exitosos actualmente y por qué. Esta información me ayudará a darte mejores recomendaciones.

¡Los datos estarán listos pronto! 🚀`;
    }

    const enhancedPrompt = `${this.config.prompts.userPrompt}

**RECOMENDACIONES ESTRATÉGICAS DE PRODUCTOS**

Basándome en el análisis de tu catálogo actual:

**1. ANÁLISIS DEL PORTAFOLIO ACTUAL:**
- Productos estrella vs productos con bajo rendimiento
- Diversidad de categorías y precios
- Gaps identificados en el catálogo

**2. NUEVOS PRODUCTOS SUGERIDOS:**
- Productos complementarios a los existentes
- Oportunidades en categorías faltantes
- Productos estacionales o de tendencia
- Variaciones de productos exitosos

**3. ESTRATEGIAS DE EXPANSIÓN:**
- Cross-selling: productos que van bien juntos
- Up-selling: versiones premium de productos existentes
- Nichos de mercado no explorados

**4. PLAN DE IMPLEMENTACIÓN:**
- Priorización de productos nuevos
- Cronograma sugerido de lanzamientos
- Estrategias de testing de mercado

Consulta del usuario: ${context.userMessage}
Análisis del catálogo: ${ragContext}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
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