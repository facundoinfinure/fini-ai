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
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of product management request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType.type}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'catalog_analysis':
          response = await this.generateCatalogAnalysis(context, ragContext);
          confidence = 0.9;
          break;
        case 'pricing_strategy':
          response = await this.generatePricingStrategy(context, ragContext);
          confidence = 0.85;
          break;
        case 'product_recommendations':
          response = await this.generateProductRecommendations(context, ragContext);
          confidence = 0.8;
          break;
        case 'lifecycle_management':
          response = await this.generateLifecycleManagement(context, ragContext);
          confidence = 0.85;
          break;
        case 'competitive_analysis':
          response = await this.generateCompetitiveAnalysis(context, ragContext);
          confidence = 0.8;
          break;
        case 'trend_analysis':
          response = await this.generateTrendAnalysis(context, ragContext);
          confidence = 0.75;
          break;
        default:
          response = await this.generateGeneralProductManagement(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Product management response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Product management query processed: ${queryType.reasoning}`,
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
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: ANÁLISIS DE CATÁLOGO
- Evalúa la estructura y organización del catálogo
- Identifica oportunidades de optimización
- Analiza la performance de categorías y productos
- Proporciona recomendaciones específicas de mejora

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generatePricingStrategy(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: ESTRATEGIA DE PRECIOS
- Analiza la competitividad de los precios actuales
- Identifica oportunidades de optimización de márgenes
- Considera factores del mercado argentino
- Proporciona estrategias de pricing específicas

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateProductRecommendations(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: RECOMENDACIONES DE PRODUCTOS
- Identifica gaps en el portfolio actual
- Analiza tendencias del mercado argentino
- Recomienda productos con alto potencial
- Considera viabilidad y recursos necesarios

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

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
} 