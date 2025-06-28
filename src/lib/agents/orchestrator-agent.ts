/**
 * Orchestrator Agent
 * Central coordinator that routes messages to appropriate specialized agents
 */

import { BaseAgent } from './base-agent';
import { ORCHESTRATOR_CONFIG, ROUTING_KEYWORDS, ROUTING_THRESHOLDS } from './config';
import type { AgentContext, AgentResponse, OrchestratorDecision } from './types';

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

      if (_decision.selectedAgent) {
        // For now, we'll return the routing decision
        // In the full implementation, this would call the selected agent
        const _response = `He analizado tu consulta y la he clasificado como: **${_decision.selectedAgent}**

${_decision.reasoning}

*Confianza: ${Math.round(_decision.confidence * 100)}%*

En la implementación completa, esto se enrutaría automáticamente al agente especializado correspondiente.`;

        return this.createResponse(
          true,
          _response,
          _decision.confidence,
          _decision.reasoning,
          undefined,
          _executionTime
        );
      } else {
        // Fallback response
        const _fallbackResponse = _decision.fallbackMessage || 
          'No pude determinar cómo manejar tu consulta específica. ¿Podrías ser más específico? Puedo ayudarte con analytics de ventas, atención al cliente, o estrategias de marketing.';

        return this.createResponse(
          false,
          _fallbackResponse,
          _decision.confidence,
          _decision.reasoning,
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
   * Route message to appropriate agent
   */
  async routeMessage(context: AgentContext): Promise<OrchestratorDecision> {
    const { userMessage } = context;
    const _lowerMessage = userMessage.toLowerCase();

    this.log('debug', `Routing message: "${userMessage}"`);

    // Calculate scores for each agent type
    const _routingRules = {
      analyticsScore: this.calculateAnalyticsScore(_lowerMessage),
      customerServiceScore: this.calculateCustomerServiceScore(_lowerMessage),
      marketingScore: this.calculateMarketingScore(_lowerMessage),
      stockManagerScore: this.calculateStockManagerScore(_lowerMessage),
      financialAdvisorScore: this.calculateFinancialAdvisorScore(_lowerMessage),
      businessConsultantScore: this.calculateBusinessConsultantScore(_lowerMessage),
      generalScore: this.calculateGeneralScore(_lowerMessage)
    };

    this.log('debug', 'Routing scores:', _routingRules);

    // Determine best agent
    const _scores = [
      { agent: 'analytics' as const, score: _routingRules.analyticsScore },
      { agent: 'customer_service' as const, score: _routingRules.customerServiceScore },
      { agent: 'marketing' as const, score: _routingRules.marketingScore },
      { agent: 'stock_manager' as const, score: _routingRules.stockManagerScore },
      { agent: 'financial_advisor' as const, score: _routingRules.financialAdvisorScore },
      { agent: 'business_consultant' as const, score: _routingRules.businessConsultantScore }
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
      reasoning = `Alta confianza (${Math.round(_confidence * 100)}%) para ${this.getAgentDisplayName(_bestScore.agent)}`;
    } else if (_confidence >= ROUTING_THRESHOLDS.medium_confidence) {
      selectedAgent = _bestScore.agent;
      reasoning = `Confianza media (${Math.round(_confidence * 100)}%) para ${this.getAgentDisplayName(_bestScore.agent)}`;
    } else if (_confidence >= ROUTING_THRESHOLDS.low_confidence) {
      selectedAgent = _bestScore.agent;
      reasoning = `Confianza baja (${Math.round(_confidence * 100)}%) para ${this.getAgentDisplayName(_bestScore.agent)} - puede requerir clarificación`;
    } else {
      reasoning = `Confianza muy baja (${Math.round(_confidence * 100)}%) - consulta poco clara o fuera del alcance`;
    }

    const decision: OrchestratorDecision = {
      selectedAgent,
      confidence: _confidence,
      reasoning,
      routingRules: _routingRules,
      fallbackMessage: _confidence < ROUTING_THRESHOLDS.fallback_threshold ? 
        'No pude entender tu consulta. ¿Podrías reformularla? Puedo ayudarte con datos de ventas, atención al cliente, estrategias de marketing, gestión de inventario, análisis financiero, o consultoría estratégica.' : 
        undefined
    };

    this.log('info', `Routing decision: ${selectedAgent || 'fallback'} (confidence: ${Math.round(_confidence * 100)}%)`);
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

    // Boost score for specific analytics patterns
    if (message.includes('cuánto') && (message.includes('vend') || message.includes('gané'))) {
      score += 0.3;
    }
    if (message.includes('reporte') || message.includes('estadística') || message.includes('métrica')) {
      score += 0.2;
    }
    if (message.includes('producto') && message.includes('más')) {
      score += 0.2;
    }
    if (message.includes('comparar') || message.includes('vs') || message.includes('anterior')) {
      score += 0.2;
    }

    return Math.min(score, 1.0);
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
      orchestrator: 'Orchestrator (coordinador)'
    };
    
    return _displayNames[agentType as keyof typeof _displayNames] || agentType;
  }
} 