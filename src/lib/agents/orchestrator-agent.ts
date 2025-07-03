/**
 * Orchestrator Agent
 * Central coordinator that routes messages to appropriate specialized agents
 */

import { BaseAgent } from './base-agent';
import { ORCHESTRATOR_CONFIG, ROUTING_KEYWORDS, ROUTING_THRESHOLDS } from './config';
import type { AgentContext, AgentResponse, OrchestratorDecision, AgentType } from './types';

export class OrchestratorAgent extends BaseAgent {
  constructor() {
    super(
      'orchestrator',
      'Orchestrator Agent',
      'Central coordinator for multi-agent system',
      [
        {
          name: 'Message Routing',
          description: 'Analyze user messages and route to appropriate agents',
          examples: ['Analytics queries', 'Customer service requests', 'Marketing strategies'],
          priority: 10
        },
        {
          name: 'Agent Coordination',
          description: 'Coordinate between multiple agents for complex queries',
          examples: ['Multi-step analysis', 'Cross-functional requests'],
          priority: 9
        },
        {
          name: 'Fallback Handling',
          description: 'Provide fallback responses when no agent can handle request',
          examples: ['Unclear queries', 'Out-of-scope requests'],
          priority: 8
        }
      ],
      ORCHESTRATOR_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const _startTime = Date.now();
    this.log('info', `Processing message: "${context.userMessage}"`);

    try {
      // Get routing decision
      const _decision = await this.routeMessage(context);
      const _executionTime = Date.now() - _startTime;

      if (_decision.selectedAgent && _decision.confidence >= 0.4) {
        // For now, we'll return the routing decision
        // In the full implementation, this would call the selected agent
        const _response = `🎯 **Analizando tu consulta...**

He clasificado tu mensaje como: **${_decision.selectedAgent.toUpperCase()}**

${_decision.reasoning}

**Confianza del análisis: ${Math.round(_decision.confidence * 100)}%**

🚀 **Análisis Inteligente Activado**: Tu consulta será procesada por el agente especializado en ${_decision.selectedAgent} para darte la respuesta más precisa y útil.

*En la implementación completa, esto se enrutaría automáticamente al agente especializado correspondiente.*`;

        return this.createResponse(
          true,
          _response,
          _decision.confidence,
          _decision.reasoning,
          undefined,
          _executionTime
        );
      } else {
        // 🔥 ENHANCED: Provide useful fallback response based on query analysis
        const _enhancedFallback = this.generateIntelligentFallback(context.userMessage, _decision);

        return this.createResponse(
          true, // Changed to true since we're providing a useful response
          _enhancedFallback,
          0.6, // Higher confidence for fallback
          `Fallback response with general e-commerce guidance: ${_decision.reasoning}`,
          undefined,
          _executionTime
        );
      }
    } catch (error) {
      const _errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Processing failed: ${_errorMessage}`);
      return this.createFallbackResponse(_errorMessage);
    }
  }

  /**
   * Route message to appropriate agent using intelligent analysis
   */
  async routeMessage(context: AgentContext): Promise<OrchestratorDecision> {
    const { userMessage } = context;
    
    this.log('debug', `Routing message: "${userMessage}"`);

    try {
      // First try intelligent routing with OpenAI
      const intelligentDecision = await this.analyzeIntentWithOpenAI(userMessage);
      
      if (intelligentDecision.confidence >= 0.7) {
        this.log('info', `Intelligent routing: ${intelligentDecision.selectedAgent} (${Math.round(intelligentDecision.confidence * 100)}%)`);
        return intelligentDecision;
      }
      
      this.log('debug', 'Intelligent routing confidence too low, falling back to keyword-based routing');
    } catch (error) {
      this.log('error', 'Intelligent routing failed, using keyword fallback:', error);
    }

    // Fallback to keyword-based routing
    return await this.keywordBasedRouting(userMessage);
  }

  /**
   * Analyze user intent using OpenAI for intelligent routing
   */
  private async analyzeIntentWithOpenAI(userMessage: string): Promise<OrchestratorDecision> {
    const systemPrompt = `Eres un experto en análisis de intención para un sistema multi-agente de e-commerce argentino.

AGENTES DISPONIBLES Y SUS ESPECIALIDADES:

📊 analytics: PERFORMANCE y resultados de ventas
- Métricas, estadísticas, reportes de ventas
- ¿Cuánto vendí? ¿Cuáles son mis productos MÁS VENDIDOS? ¿Qué performance tienen?
- Revenue, conversiones, KPIs, tendencias temporales

🛍️ product_manager: INFORMACIÓN del catálogo y características de productos  
- ¿Qué productos tengo? ¿Cuál es el producto MÁS CARO/BARATO? ¿Qué precio tiene X?
- Gestión de catálogo, características, stock disponible, portfolio
- Información sobre productos (no performance de ventas)

📦 stock_manager: Gestión operativa de inventario
- Reposición, alertas de stock, gestión de almacén
- ¿Qué reponer? ¿Qué está agotado?

💰 financial_advisor: Análisis financiero y rentabilidad
- ROI, márgenes, costos, flujo de caja
- ¿Qué productos son más RENTABLES? (diferente de más caros)

🎯 marketing: Estrategias de promoción y marketing
🔧 customer_service: Atención al cliente y soporte
📈 business_consultant: Estrategia empresarial de alto nivel
⚙️ operations_manager: Procesos y logística
🎪 sales_coach: Técnicas de venta y conversión

IMPORTANTE: 
- "¿cuál es el producto más CARO?" → product_manager (información del catálogo)
- "¿cuáles son mis productos más VENDIDOS?" → analytics (performance de ventas)

RESPONDE SOLO EN JSON:
{
  "agent": "nombre_del_agente",
  "confidence": 0.95,
  "reasoning": "Explicación de por qué este agente"
}

Confidence: 0.9+ (muy seguro), 0.7+ (seguro), 0.5+ (moderado), <0.5 (inseguro)`;

    const userPrompt = `Analiza esta consulta de un dueño de tienda e-commerce argentina:

"${userMessage}"

¿Qué agente debe manejar esta consulta?`;

    try {
      const response = await this.generateResponse(systemPrompt, userPrompt, '');
      const analysis = JSON.parse(response);
      
      const selectedAgent = analysis.agent as AgentType;
      const confidence = Math.min(Math.max(analysis.confidence, 0), 1);
      const reasoning = `Análisis inteligente: ${analysis.reasoning}`;

      // Calculate keyword scores for metadata
      const _lowerMessage = userMessage.toLowerCase();
      const _routingRules = {
        analyticsScore: this.calculateAnalyticsScore(_lowerMessage),
        customerServiceScore: this.calculateCustomerServiceScore(_lowerMessage),
        marketingScore: this.calculateMarketingScore(_lowerMessage),
        stockManagerScore: this.calculateStockManagerScore(_lowerMessage),
        financialAdvisorScore: this.calculateFinancialAdvisorScore(_lowerMessage),
        businessConsultantScore: this.calculateBusinessConsultantScore(_lowerMessage),
        productManagerScore: this.calculateProductManagerScore(_lowerMessage),
        operationsManagerScore: this.calculateOperationsManagerScore(_lowerMessage),
        salesCoachScore: this.calculateSalesCoachScore(_lowerMessage),
        generalScore: this.calculateGeneralScore(_lowerMessage)
      };

      return {
        selectedAgent,
        confidence,
        reasoning,
        routingRules: _routingRules,
        fallbackMessage: confidence < 0.5 ? 
          'No pude determinar con certeza cómo ayudarte. ¿Podrías ser más específico sobre lo que necesitas?' : 
          undefined
      };

    } catch (error) {
      this.log('error', 'OpenAI analysis failed:', error);
      throw error;
    }
  }

  /**
   * Fallback keyword-based routing (original method)
   */
  private async keywordBasedRouting(userMessage: string): Promise<OrchestratorDecision> {
    const _lowerMessage = userMessage.toLowerCase();

    // Calculate scores for each agent type
    const _routingRules = {
      analyticsScore: this.calculateAnalyticsScore(_lowerMessage),
      customerServiceScore: this.calculateCustomerServiceScore(_lowerMessage),
      marketingScore: this.calculateMarketingScore(_lowerMessage),
      stockManagerScore: this.calculateStockManagerScore(_lowerMessage),
      financialAdvisorScore: this.calculateFinancialAdvisorScore(_lowerMessage),
      businessConsultantScore: this.calculateBusinessConsultantScore(_lowerMessage),
      productManagerScore: this.calculateProductManagerScore(_lowerMessage),
      operationsManagerScore: this.calculateOperationsManagerScore(_lowerMessage),
      salesCoachScore: this.calculateSalesCoachScore(_lowerMessage),
      generalScore: this.calculateGeneralScore(_lowerMessage)
    };

    this.log('debug', 'Keyword routing scores:', _routingRules);

    // Determine best agent
    const _scores = [
      { agent: 'analytics' as const, score: _routingRules.analyticsScore },
      { agent: 'customer_service' as const, score: _routingRules.customerServiceScore },
      { agent: 'marketing' as const, score: _routingRules.marketingScore },
      { agent: 'stock_manager' as const, score: _routingRules.stockManagerScore },
      { agent: 'financial_advisor' as const, score: _routingRules.financialAdvisorScore },
      { agent: 'business_consultant' as const, score: _routingRules.businessConsultantScore },
      { agent: 'product_manager' as const, score: _routingRules.productManagerScore },
      { agent: 'operations_manager' as const, score: _routingRules.operationsManagerScore },
      { agent: 'sales_coach' as const, score: _routingRules.salesCoachScore }
    ];

    // Sort by score (highest first)
    _scores.sort((a, b) => b.score - a.score);
    const _bestScore = _scores[0];

    // Determine confidence and selection
    let selectedAgent = null;
    const _confidence = _bestScore.score;
    let reasoning = '';

    if (_confidence >= ROUTING_THRESHOLDS.high_confidence) {
      selectedAgent = _bestScore.agent;
      reasoning = `Keyword routing - Alta confianza (${Math.round(_confidence * 100)}%) para ${this.getAgentDisplayName(_bestScore.agent)}`;
    } else if (_confidence >= ROUTING_THRESHOLDS.medium_confidence) {
      selectedAgent = _bestScore.agent;
      reasoning = `Keyword routing - Confianza media (${Math.round(_confidence * 100)}%) para ${this.getAgentDisplayName(_bestScore.agent)}`;
    } else if (_confidence >= ROUTING_THRESHOLDS.low_confidence) {
      selectedAgent = _bestScore.agent;
      reasoning = `Keyword routing - Confianza baja (${Math.round(_confidence * 100)}%) para ${this.getAgentDisplayName(_bestScore.agent)}`;
    } else {
      reasoning = `Keyword routing - Confianza muy baja (${Math.round(_confidence * 100)}%) - consulta poco clara`;
    }

    const decision: OrchestratorDecision = {
      selectedAgent,
      confidence: _confidence,
      reasoning,
      routingRules: _routingRules,
      fallbackMessage: _confidence < ROUTING_THRESHOLDS.fallback_threshold ? 
        'No pude entender tu consulta. ¿Podrías reformularla? Puedo ayudarte con datos de ventas, atención al cliente, estrategias de marketing, gestión de inventario, análisis financiero, consultoría estratégica, gestión de productos, operaciones, o coaching de ventas.' : 
        undefined
    };

    this.log('info', `Keyword routing: ${selectedAgent || 'fallback'} (confidence: ${Math.round(_confidence * 100)}%)`);
    return decision;
  }

  /**
   * Calculate handling score for this agent
   */
  protected async calculateHandlingScore(_context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    // Orchestrator handles routing - always available but low priority for direct queries
    return {
      confidence: 0.3,
      reasoning: 'Orchestrator handles coordination but prefers specialized agents for direct queries'
    };
  }

  private calculateAnalyticsScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.analytics);
    let score = _keywordCheck.score;

    // ANALYTICS: Métricas, performance y análisis de datos
    
    // 🔥 Core analytics keywords
    if (message.includes('analytics') || message.includes('analíticas') || 
        message.includes('analisis') || message.includes('análisis')) {
      score += 0.8;
      
      if (message.includes('performance') || message.includes('estadísticas') || 
          message.includes('métricas') || message.includes('análisis de ventas')) {
        score += 0.6;
      }
      
      // 🔥 REDUCE score para consultas de CARACTERÍSTICAS/CATÁLOGO (van a Product Manager)
      if (message.includes('caro') || message.includes('barato') || 
          message.includes('tengo') || message.includes('cargados') || 
          message.includes('hay') || message.includes('catálogo') ||
          message.includes('disponible') || message.includes('stock') ||
          message.includes('cuál es') || message.includes('qué es')) {
        score -= 0.7; // 🔥 Estas son consultas de INFORMACIÓN, van a Product Manager
      }
    }
    
    // 🔥 ENHANCED: Ventas y métricas específicas SOLO
    if ((message.includes('cuánto') || message.includes('cuántas') || message.includes('cuanto')) && 
        (message.includes('ventas') || message.includes('vendí') || message.includes('vendi') || 
         message.includes('facturé') || message.includes('facture') || message.includes('gané') ||
         message.includes('ingresos') || message.includes('revenue'))) {
      score += 0.9; // Consultas sobre cantidades de ventas/facturación
    }

    // Performance y métricas de productos
    if (message.includes('más vendidos') || message.includes('mas vendidos') ||
        message.includes('bestsellers') || message.includes('top selling') ||
        message.includes('populares') || message.includes('performance')) {
      score += 0.8; // Performance va a Analytics
    }

    // Financial metrics
    if (message.includes('revenue') || message.includes('ingresos') || 
        message.includes('facturación') || message.includes('ganancia') ||
        message.includes('margen') || message.includes('roi')) {
      score += 0.7;
    }

    // Customer analytics
    if (message.includes('clientes') && (message.includes('análisis') || 
        message.includes('comportamiento') || message.includes('segmentación'))) {
      score += 0.6;
    }

    // Time-based analytics
    if ((message.includes('esta semana') || message.includes('este mes') || 
         message.includes('hoy') || message.includes('ayer')) && 
        (message.includes('ventas') || message.includes('performance'))) {
      score += 0.6;
    }

    return Math.min(Math.max(score, 0), 1.0);
  }

  private calculateCustomerServiceScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.customer_service);
    let score = _keywordCheck.score;

    // Boost score for specific customer service patterns
    if (message.includes('cliente') && (message.includes('queja') || message.includes('problema'))) {
      score += 0.3;
    }
    if (message.includes('no llegó') || message.includes('no recibió') || message.includes('defectuoso')) {
      score += 0.3;
    }
    if (message.includes('devolución') || message.includes('cambio') || message.includes('reembolso')) {
      score += 0.2;
    }
    if (message.includes('política') || message.includes('garantía')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateMarketingScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.marketing);
    let score = _keywordCheck.score;

    // Boost score for specific marketing patterns
    if (message.includes('aumentar') && message.includes('venta')) {
      score += 0.3;
    }
    if (message.includes('idea') || message.includes('estrategia') || message.includes('plan')) {
      score += 0.2;
    }
    if (message.includes('competencia') || message.includes('mercado')) {
      score += 0.2;
    }
    if (message.includes('promoción') || message.includes('campaña') || message.includes('marketing')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateStockManagerScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.stock_manager);
    let score = _keywordCheck.score;

    // Boost score for specific stock management patterns
    if (message.includes('stock') || message.includes('inventario')) {
      score += 0.3;
    }
    if (message.includes('reponer') || message.includes('reposición') || message.includes('comprar')) {
      score += 0.3;
    }
    if (message.includes('agotado') || message.includes('sin stock') || message.includes('poco stock')) {
      score += 0.3;
    }
    if (message.includes('no se vende') || message.includes('parado') || message.includes('liquidar')) {
      score += 0.2;
    }
    if (message.includes('demanda') || message.includes('rotación') || message.includes('almacén')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateFinancialAdvisorScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.financial_advisor);
    let score = _keywordCheck.score;

    // Boost score for specific financial patterns
    if (message.includes('rentabilidad') || message.includes('rentable') || message.includes('margen')) {
      score += 0.3;
    }
    if (message.includes('flujo de caja') || message.includes('cash flow') || message.includes('liquidez')) {
      score += 0.3;
    }
    if (message.includes('precio') && (message.includes('optimizar') || message.includes('estrategia'))) {
      score += 0.3;
    }
    if (message.includes('costo') || message.includes('gasto') || message.includes('financiero')) {
      score += 0.2;
    }
    if (message.includes('presupuesto') || message.includes('inversión') || message.includes('roi')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateBusinessConsultantScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.business_consultant);
    let score = _keywordCheck.score;

    // Boost score for specific business strategy patterns
    if (message.includes('estrategia') && (message.includes('negocio') || message.includes('plan'))) {
      score += 0.3;
    }
    if (message.includes('crecimiento') || message.includes('growth') || message.includes('crecer')) {
      score += 0.3;
    }
    if (message.includes('competencia') && message.includes('análisis')) {
      score += 0.2;
    }
    if (message.includes('mercado') && (message.includes('nuevo') || message.includes('expandir'))) {
      score += 0.2;
    }
    if (message.includes('consultoría') || message.includes('asesoramiento') || message.includes('foda')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateProductManagerScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.product_manager);
    let score = _keywordCheck.score;

    // PRODUCT MANAGER: Gestión de catálogo, información y características de productos
    
    // 🔥 MÁXIMA PRIORIDAD: Información y características de productos
    if (message.includes('producto') || message.includes('productos')) {
      // 🔥 ENHANCED: PRECIOS Y CARACTERÍSTICAS - "¿cuál es el producto más caro?"
      if (message.includes('caro') || message.includes('barato') || 
          message.includes('precio') || message.includes('cuesta') ||
          message.includes('vale') || message.includes('costoso') ||
          message.includes('más caro') || message.includes('mas caro') ||
          message.includes('más barato') || message.includes('mas barato')) {
        score += 0.95; // 🔥 MÁXIMA PRIORIDAD para información de precios de productos específicos
      }
      
      // INFORMACIÓN DEL CATÁLOGO - "¿qué productos tengo?"
      if (message.includes('tengo') || message.includes('cargados') || 
          message.includes('hay') || message.includes('disponible')) {
        score += 0.8; // ALTA prioridad para gestión de catálogo
      }
      
      // CARACTERÍSTICAS Y DETALLES
      if (message.includes('cuál es') || message.includes('qué es') ||
          message.includes('características') || message.includes('detalles') ||
          message.includes('descripción') || message.includes('especificaciones')) {
        score += 0.8; // Información específica de productos
      }
      
      // STOCK E INVENTARIO (información, no gestión)
      if (message.includes('stock') || message.includes('inventario') ||
          message.includes('cantidad') || message.includes('disponible')) {
        score += 0.7; // Información de stock
      }
      
      // Gestión de portfolio
      if (message.includes('agregar') || message.includes('añadir') || message.includes('incorporar')) {
        score += 0.6;
      }
      if (message.includes('quitar') || message.includes('eliminar') || message.includes('descontinuar')) {
        score += 0.6;
      }
      
      // Estrategia de productos (NO métricas)
      if (message.includes('estrategia') || message.includes('plan') || message.includes('roadmap')) {
        score += 0.5;
      }
      
      // REDUCE para performance queries (van a Analytics)
      if (message.includes('más vendidos') || message.includes('mas vendidos') ||
          message.includes('bestsellers') || message.includes('populares') ||
          message.includes('performance') || message.includes('estadísticas')) {
        score -= 0.4; // Estas van a Analytics
      }
    }
    
    // 🔥 ENHANCED: Consultas específicas de catálogo e información
    if ((message.includes('qué') || message.includes('cuáles') || message.includes('cuántos') || 
         message.includes('cual') || message.includes('cuales') || message.includes('cuantos')) && 
        (message.includes('productos') || message.includes('catálogo'))) {
      score += 0.7; // "¿qué productos..." -> Product Manager
    }
    
    // 🔥 BOOST: Preguntas sobre precio sin contexto de ventas
    if (message.includes('precio') && !message.includes('vendido') && 
        !message.includes('venta') && !message.includes('facturación')) {
      score += 0.5; // Información de precios va a Product Manager
    }
    
    // Gestión de catálogo
    if (message.includes('catálogo')) {
      score += 0.4;
      if (message.includes('optimizar') || message.includes('mejorar')) {
        score += 0.3;
      }
    }
    
    // Pricing strategy (diferente de análisis de precios)
    if (message.includes('precio') && (message.includes('estrategia') || message.includes('competencia'))) {
      score += 0.4;
    }
    
    // Portfolio management
    if (message.includes('portfolio') || message.includes('surtido') || message.includes('mix')) {
      score += 0.4;
    }
    
    // Lanzamientos
    if (message.includes('lanzamiento') || message.includes('nuevo producto')) {
      score += 0.4;
    }

    return Math.min(score, 1.0);
  }

  private calculateOperationsManagerScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.operations_manager);
    let score = _keywordCheck.score;

    // Boost score for specific operations patterns
    if (message.includes('proceso') && (message.includes('optimizar') || message.includes('mejorar'))) {
      score += 0.3;
    }
    if (message.includes('envío') && (message.includes('costo') || message.includes('reducir'))) {
      score += 0.3;
    }
    if (message.includes('operaciones') || message.includes('logística')) {
      score += 0.3;
    }
    if (message.includes('automatizar') || message.includes('automation')) {
      score += 0.2;
    }
    if (message.includes('proveedor') || message.includes('calidad') || message.includes('workflow')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateSalesCoachScore(message: string): number {
    const _keywordCheck = this.hasKeywords(message, ROUTING_KEYWORDS.sales_coach);
    let score = _keywordCheck.score;

    // Boost score for specific sales coaching patterns
    if (message.includes('conversión') && (message.includes('mejorar') || message.includes('aumentar'))) {
      score += 0.3;
    }
    if (message.includes('ventas') && (message.includes('estrategia') || message.includes('técnica'))) {
      score += 0.3;
    }
    if (message.includes('clientes') && (message.includes('retener') || message.includes('fidelizar'))) {
      score += 0.3;
    }
    if (message.includes('cerrar venta') || message.includes('closing')) {
      score += 0.2;
    }
    if (message.includes('funnel') || message.includes('leads') || message.includes('objeciones')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
  }

  private calculateGeneralScore(message: string): number {
    // General score for messages that don't fit specific categories
    const _totalLength = message.length;
    const _wordCount = message.split(' ').length;
    
    // Shorter, vaguer messages get higher general scores
    if (_wordCount <= 3 && _totalLength <= 20) {
      return 0.7;
    }
    if (_wordCount <= 5 && _totalLength <= 30) {
      return 0.5;
    }
    if (message.includes('hola') || message.includes('ayuda') || message.includes('información')) {
      return 0.6;
    }
    
    return 0.2;
  }

  private getAgentDisplayName(agentType: string): string {
    const _displayNames = {
      analytics: 'Analytics (análisis de datos y ventas)',
      customer_service: 'Customer Service (atención al cliente)',
      marketing: 'Marketing (estrategias y promoción)',
      stock_manager: 'Stock Manager (gestión de inventario)',
      financial_advisor: 'Financial Advisor (análisis financiero)',
      business_consultant: 'Business Consultant (consultoría estratégica)',
      product_manager: 'Product Manager (gestión de productos)',
      operations_manager: 'Operations Manager (operaciones y logística)',
      sales_coach: 'Sales Coach (coaching de ventas)',
      orchestrator: 'Orchestrator (coordinador)'
    };
    
    return _displayNames[agentType as keyof typeof _displayNames] || agentType;
  }

  /**
   * 🔥 NEW: Generate intelligent fallback responses based on query context
   */
  private generateIntelligentFallback(userMessage: string, decision: any): string {
    const lowerMessage = userMessage.toLowerCase();
    
    // Detect query categories for better fallback
    if (lowerMessage.includes('venta') || lowerMessage.includes('vender') || lowerMessage.includes('ingreso')) {
      return `💰 **Estrategias de Ventas para tu Tienda**

Entiendo que te interesa mejorar las ventas. Aquí tienes estrategias comprobadas:

**🎯 Optimización de Conversión:**
• **Landing pages efectivas**: Páginas de producto claras y atractivas
• **Checkout simplificado**: Reduce pasos para completar compra
• **Social proof**: Reviews, testimonios, badges de confianza
• **Urgencia**: Stock limitado, ofertas por tiempo limitado

**📈 Crecimiento de Tráfico:**
• **SEO local**: Optimiza para búsquedas en tu área
• **Redes sociales**: Instagram, Facebook, TikTok según tu audiencia
• **Email marketing**: Newsletters, carritos abandonados, reactivación
• **Publicidad pagada**: Google Ads, Facebook Ads con targeting preciso

**🛍️ Aumentar Ticket Promedio:**
• **Cross-selling**: "Productos relacionados" en cada página
• **Bundles**: Paquetes con descuento
• **Upselling**: Sugiere versiones premium
• **Envío gratis**: Con compra mínima para incentivar más productos

¿Hay algún aspecto específico de ventas que te gustaría explorar más?`;
    }
    
    if (lowerMessage.includes('producto') || lowerMessage.includes('catalogo') || lowerMessage.includes('inventario')) {
      return `📦 **Gestión Inteligente de Productos**

Te ayudo a optimizar tu catálogo de productos:

**🎯 Fundamentos del Catálogo:**
• **Categorización**: Organiza productos de forma intuitiva para clientes
• **Imágenes profesionales**: Mínimo 3-5 fotos por producto
• **Descripciones SEO**: Incluye palabras clave que buscan tus clientes
• **Precios competitivos**: Investiga competencia y posiciona estratégicamente

**📊 Análisis de Performance:**
• **Top sellers**: Identifica productos estrella y replica su éxito
• **Productos lentos**: Analiza qué mejorar o considerar descontinuar
• **Estacionalidad**: Prepara inventario según temporadas
• **Márgenes**: Balance entre competitividad y rentabilidad

**🚀 Oportunidades de Crecimiento:**
• **Productos complementarios**: Amplía con accesorios o variaciones
• **Gaps de mercado**: Productos que pide tu audiencia pero no ofreces
• **Bundles estratégicos**: Combina productos para aumentar valor
• **Tendencias**: Mantente al día con nuevas demandas del mercado

¿Tienes preguntas específicas sobre gestión de productos?`;
    }
    
    if (lowerMessage.includes('cliente') || lowerMessage.includes('atencion') || lowerMessage.includes('servicio')) {
      return `🤝 **Excelencia en Atención al Cliente**

La atención al cliente es clave para el éxito a largo plazo:

**⚡ Respuesta Rápida:**
• **Chat en vivo**: Respuesta inmediata durante horarios activos
• **WhatsApp Business**: Canal directo y personal con clientes
• **FAQ completa**: Responde dudas comunes automáticamente
• **Email automatizado**: Confirmaciones y seguimiento automático

**🎯 Experiencia Personalizada:**
• **Historial del cliente**: Conoce compras y preferencias anteriores
• **Recomendaciones**: Sugiere productos basados en historial
• **Programas de lealtad**: Recompensa clientes frecuentes
• **Comunicación proactiva**: Updates de envío, nuevos productos

**🔧 Herramientas Efectivas:**
• **CRM integrado**: Gestiona toda la información del cliente
• **Reviews automáticos**: Solicita feedback post-compra
• **Encuestas**: Mide satisfacción y mejora continuamente
• **Soporte multicanal**: Email, chat, redes sociales, teléfono

¿Qué aspecto de atención al cliente te interesa mejorar más?`;
    }
    
    // General fallback for unclear queries
    return `🤖 **Asistente de E-commerce Listo para Ayudar**

No estoy 100% seguro de qué necesitas específicamente, pero puedo ayudarte con:

**📊 Analytics y Datos:**
• Análisis de ventas y performance
• Métricas de conversión y tráfico
• Reportes de productos más vendidos
• Tendencias y patrones de compra

**🛍️ Gestión de Productos:**
• Optimización de catálogo
• Estrategias de precios
• Gestión de inventario
• Recomendaciones de nuevos productos

**🎯 Marketing y Ventas:**
• Estrategias de crecimiento
• Campañas promocionales
• Email marketing
• Redes sociales y publicidad

**🤝 Atención al Cliente:**
• Optimización de experiencia
• Procesos de soporte
• Programas de fidelización
• Canales de comunicación

**💡 Tip**: Sé más específico en tu pregunta para una respuesta más precisa. Por ejemplo:
- "¿Cómo analizar mis ventas del mes?"
- "¿Qué productos debería agregar a mi catálogo?"
- "¿Cómo mejorar mi atención al cliente?"

¿Con cuál de estos temas te gustaría que empecemos?`;
  }
} 