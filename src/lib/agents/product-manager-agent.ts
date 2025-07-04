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
      // 🚀 ENHANCED: Try LangChain RAG first, fallback to legacy
      console.warn(`[PRODUCT-MANAGER] Getting enhanced catalog context for store: ${context.storeId}`);
      const ragContext = await this.getEnhancedRelevantContext(context.userMessage, context);
      
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

    // 🔥 ENHANCED: Catalog information and product listing queries
    if (lowerMessage.includes('qué productos') || lowerMessage.includes('que productos')) {
      return { type: 'catalog_analysis', reasoning: 'Product listing query detected', confidence: 0.95 };
    }
    if (lowerMessage.includes('productos') && (lowerMessage.includes('tengo') || lowerMessage.includes('cargados') || lowerMessage.includes('disponible'))) {
      return { type: 'catalog_analysis', reasoning: 'Product availability query', confidence: 0.9 };
    }

    // Catalog analysis queries
    if (lowerMessage.includes('catálogo') && (lowerMessage.includes('análisis') || lowerMessage.includes('optimizar'))) {
      return { type: 'catalog_analysis', reasoning: 'Catalog optimization query detected', confidence: 0.9 };
    }
    if (lowerMessage.includes('productos') && (lowerMessage.includes('performance') || lowerMessage.includes('más vendidos'))) {
      return { type: 'catalog_analysis', reasoning: 'Product performance query', confidence: 0.85 };
    }

    // 🔥 ENHANCED: Price-related queries
    if (lowerMessage.includes('caro') || lowerMessage.includes('barato')) {
      return { type: 'pricing_strategy', reasoning: 'Product price inquiry detected', confidence: 0.95 };
    }
    if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta') || lowerMessage.includes('vale')) {
      return { type: 'pricing_strategy', reasoning: 'Product pricing query', confidence: 0.9 };
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
    const hasProductData = ragContext && ragContext.length > 50 && !ragContext.includes('ESTADO DE DATOS') && !ragContext.includes('No hay datos') && !ragContext.includes('Error al obtener');
    
    if (!hasProductData) {
      // 🔥 ENHANCED: More specific and actionable response based on query
      const userMessage = context.userMessage.toLowerCase();
      
      if (userMessage.includes('tengo') || userMessage.includes('productos')) {
        return `📦 **Gestión de Productos**

Puedo ayudarte a optimizar tu catálogo:

**🎯 Mejores prácticas:**
• **Fotos**: 3-5 imágenes profesionales por producto
• **Títulos**: Claros y con palabras clave
• **Descripciones**: Beneficios + características
• **Precios**: Competitivos y psicológicos (.99, .95)

**📊 Métricas clave a seguir:**
• Productos más visitados
• Tasa de conversión por producto
• Tiempo en página de producto

¿Qué aspecto específico te gustaría mejorar?`;
      }
      
      return `📦 **Análisis de Catálogo**

Activando sincronización de datos. Mientras tanto:

**🚀 Optimizaciones inmediatas:**
• Revisá categorías y subcategorías
• Actualizá stock y precios
• Mejorá SEO de productos
• Configurá productos relacionados

¿Necesitas ayuda con algún aspecto específico?`;
    }

    // 🔥 ENHANCED: Process real data with specific product analysis
    const userMessage = context.userMessage.toLowerCase();
    
    if (userMessage.includes('tengo') || userMessage.includes('productos') || userMessage.includes('qué productos')) {
      const systemPrompt = `Eres un experto en análisis de catálogos. Proporciona un resumen CONCISO y DIRECTO.

INSTRUCCIONES:
- Máximo 3-4 líneas
- Lista los productos específicos encontrados
- Menciona nombres y precios reales
- No agregues información genérica

Formato: "Tienes X productos en tu catálogo: [lista con nombres y precios]"`;

      const userPrompt = `El usuario pregunta: ${context.userMessage}

Datos del catálogo:
${ragContext}

Proporciona un resumen directo de los productos disponibles con nombres y precios específicos.`;

      return await this.generateResponse(systemPrompt, userPrompt, ragContext);
    }

    // Default analysis for other catalog queries
    return `📦 **Análisis de Catálogo**

${ragContext}

Análisis completado - información específica de tu catálogo disponible.`;
  }

  private async generatePricingStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const hasData = ragContext && ragContext.length > 50 && !ragContext.includes('ESTADO DE DATOS') && !ragContext.includes('No hay datos');
    
    if (!hasData) {
      const userMessage = context.userMessage.toLowerCase();
      
      // 🔥 ENHANCED: More specific responses for pricing queries
      if (userMessage.includes('caro') || userMessage.includes('barato')) {
        return `💰 **Análisis de Precios**

Para identificar productos más caros/baratos:

**🎯 Estrategias de pricing:**
• **Premium**: Productos de mayor valor
• **Económicos**: Productos de entrada  
• **Bundles**: Combos para aumentar ticket
• **Dinámico**: Ajustes según demanda

**📊 Métricas importantes:**
• Margen por producto vs volumen
• Elasticidad de precios
• Comparación con competencia

¿Te interesa optimizar algún segmento específico?`;
      }
      
      return `💰 **Estrategia de Precios**

**🎯 Framework de pricing:**
• **Margen objetivo**: 40-60% para retail
• **Precios psicológicos**: .99, .95, .90
• **Análisis competitivo**: Benchmark mensual
• **Testing A/B**: Proba precios diferentes

**🚀 Tácticas inmediatas:**
• Revisá márgenes por categoría
• Implementá precios ancla
• Configurá ofertas por volumen

¿Qué aspecto específico querés trabajar?`;
    }

    // 🔥 ENHANCED: Direct pricing analysis with real data
    const userMessage = context.userMessage.toLowerCase();
    
    // Check if this is asking for specific product pricing info
    if (userMessage.includes('caro') || userMessage.includes('barato') || 
        userMessage.includes('precio') || userMessage.includes('cuál es')) {
      
      // Use the RAG context to provide specific pricing information
      return await this.generateSpecificPricingResponse(context, ragContext);
    }

    return `💰 **Estrategia de Precios**

${ragContext}

Análisis de precios completado con datos específicos de tu tienda.`;
  }

  /**
   * 🚀 ENHANCED: Get relevant context using LangChain RAG system
   */
  private async getEnhancedRelevantContext(query: string, context: AgentContext): Promise<string> {
    try {
      console.warn(`[PRODUCT-MANAGER] Attempting enhanced LangChain RAG for: "${query}"`);
      
      // Try the enhanced RAG system first
      const { enhancedRAGEngine } = await import('@/lib/rag/enhanced-rag-engine');
      
      const ragQuery = {
        query,
        context: {
          storeId: context.storeId,
          userId: context.userId,
          agentType: 'product_manager' as any,
          conversationId: context.conversationId,
        },
        options: {
          topK: 8,
          scoreThreshold: 0.3,
        },
      };

      const result = await enhancedRAGEngine.search(ragQuery);
      
      if (result.sources.length > 0) {
        console.warn(`[PRODUCT-MANAGER] ✅ Enhanced RAG found ${result.sources.length} sources with confidence: ${result.confidence.toFixed(3)}`);
        
        // Format enhanced context with source attribution
        const enhancedContext = result.sources.map(doc => {
          const dataType = doc.metadata.dataType || 'unknown';
          return `[${dataType.toUpperCase()}] ${doc.pageContent}`;
        }).join('\n\n');
        
        return `🚀 ENHANCED RAG CONTEXT (LangChain):\n${enhancedContext}\n\nConfidence: ${result.confidence.toFixed(3)}`;
      } else {
        console.warn(`[PRODUCT-MANAGER] ⚠️ Enhanced RAG found no sources, falling back to legacy`);
      }
    } catch (error) {
      console.warn(`[PRODUCT-MANAGER] ⚠️ Enhanced RAG failed, falling back to legacy:`, error);
    }

    // Fallback to legacy RAG system
    console.warn(`[PRODUCT-MANAGER] Using legacy RAG system`);
    return await this.getRelevantContext(query, context);
  }

  /**
   * 🔥 NEW: Generate specific, concise pricing responses
   */
  private async generateSpecificPricingResponse(context: AgentContext, ragContext: string): Promise<string> {
    // Check if we have actual product data
    const hasProductData = ragContext && 
      ragContext.length > 100 && 
      !ragContext.includes('Error al obtener contexto') && 
      !ragContext.includes('No hay datos') &&
      !ragContext.includes('ESTADO DE DATOS') &&
      (ragContext.includes('producto') || ragContext.includes('price') || ragContext.includes('Precio'));

    if (!hasProductData) {
      // 🔥 ENHANCED: Specific guidance for pricing queries when no data available
      const userMessage = context.userMessage.toLowerCase();
      
      if (userMessage.includes('caro') || userMessage.includes('barato')) {
        return `❌ **No puedo acceder a los datos de tu tienda**

Para identificar tu producto más caro necesito sincronizar los datos de tu tienda.

**🔧 Solución rápida:**
1. Ve a **Configuración** → **Tienda**
2. Haz click en **Reconectar Tienda**
3. Regresa en unos minutos y pregunta de nuevo

**💡 Mientras tanto:**
• Revisa tus productos en TiendaNube
• Organiza por precio para identificar el más caro
• Asegúrate que los productos estén publicados

¿Necesitas ayuda para reconectar tu tienda?`;
      }
      
      return `📊 **Datos de tienda no disponibles**

Para analizar precios específicos necesito acceso a tu catálogo.

**🔧 Pasos para solucionarlo:**
1. **Configuración** → **Tienda** → **Reconectar**
2. Espera 2-3 minutos para sincronización
3. Pregunta nuevamente sobre tus productos

¿Te ayudo con otro tema mientras tanto?`;
    }

    // When we do have product data, use the enhanced system prompt
    const systemPrompt = `Eres un experto en análisis de productos. Responde de forma DIRECTA y CONCISA.

INSTRUCCIONES CRÍTICAS:
- Máximo 2-3 líneas de respuesta
- Ve directo al punto sin información genérica
- Analiza CUIDADOSAMENTE los precios en el contexto
- Si preguntan por el producto más caro/barato, identifica el correcto comparando TODOS los precios
- NO hagas generalizaciones incorrectas como "todos tienen el mismo precio"
- Compara precios numéricamente, no como texto

IMPORTANTE: 
- Si ves precios diferentes, menciona específicamente cuál es cuál
- Ejemplo: "producto caro" a $999.999 vs "prueba prod barato" a $10

Formato de respuesta:
"Tu producto más caro es [NOMBRE EXACTO] a $[PRECIO EXACTO]. El más barato es [NOMBRE] a $[PRECIO]."`;

    const userPrompt = `Consulta: ${context.userMessage}

Datos de productos disponibles:
${ragContext}

IMPORTANTE: Analiza TODOS los precios y compáralos numéricamente. No digas que "todos tienen el mismo precio" a menos que realmente sea así.

Responde de forma DIRECTA mostrando el producto específico más caro/barato con su precio exacto.`;

    return await this.generateResponse(systemPrompt, userPrompt, ragContext);
  }

  private async generateProductRecommendations(context: AgentContext, ragContext: string): Promise<string> {
    const hasData = ragContext && ragContext.length > 50;
    
    if (!hasData) {
      return `🎯 **Sincronizando catálogo...**

Activando análisis de productos. Estrategias mientras tanto:

**🚀 Ideas de expansión:**
• Bundles de productos existentes
• Variaciones de color/tamaño
• Productos complementarios
• Items estacionales

Te daré recomendaciones específicas cuando termine la sincronización.`;
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
    const hasProductData = ragContext && ragContext.length > 50 && !ragContext.includes('ESTADO DE DATOS') && !ragContext.includes('No hay datos');
    const userMessage = context.userMessage.toLowerCase();
    
    if (!hasProductData) {
      // 🔥 ENHANCED: Smart fallback based on query intent
      if (userMessage.includes('tengo') || userMessage.includes('productos') || userMessage.includes('catálogo')) {
        return `📦 **Gestión de Productos**

Te ayudo a organizar tu catálogo:

**🎯 Para empezar:**
• **Auditoría**: Listá todos tus productos actuales
• **Categorías**: Organizá por tipo, precio, popularidad
• **Información**: Completá descripciones y fotos
• **Precios**: Verificá márgenes y competencia

**📋 Próximos pasos:**
1. Hacer inventario completo
2. Definir categorías principales
3. Optimizar productos top

¿Con qué aspecto arrancamos?`;
      }
      
      return `🛍️ **Product Management**

**🚀 Gestión eficaz de productos:**
• **Análisis de catálogo**: Performance y optimización
• **Estrategia de precios**: Competitividad y márgenes
• **Inventario inteligente**: Stock y rotación
• **Nuevos productos**: Oportunidades y tendencias

¿Qué área específica querés trabajar?`;
    }

    // Use enhanced prompt for when we have data
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque: CONSULTA GENERAL DE GESTIÓN DE PRODUCTOS
- Proporciona una respuesta integral sobre gestión de productos
- Incluye mejores prácticas y recomendaciones
- Considera el contexto específico del negocio
- Sugiere próximos pasos accionables

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext}`;

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