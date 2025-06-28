/**
 * 🏭 Operations Manager Agent
 * Especialista en operaciones, logística y optimización de procesos
 */

import { BaseAgent } from './base-agent';
import { OPERATIONS_MANAGER_CONFIG, ROUTING_KEYWORDS } from './config';
import type { AgentContext, AgentResponse } from './types';

export class OperationsManagerAgent extends BaseAgent {
  constructor() {
    super(
      'operations_manager',
      'Operations Manager Agent',
      'Especialista en operaciones, logística y optimización de procesos',
      [
        {
          name: 'Process Optimization',
          description: 'Optimización de procesos operativos y workflows',
          examples: [
            'Mejorar procesos de preparación de pedidos',
            'Optimizar flujos de trabajo',
            'Identificar bottlenecks operativos'
          ],
          priority: 10
        },
        {
          name: 'Logistics Management',
          description: 'Gestión de logística y distribución',
          examples: [
            'Optimizar costos de envío',
            'Mejorar tiempos de entrega',
            'Gestionar proveedores logísticos'
          ],
          priority: 9
        },
        {
          name: 'Supply Chain',
          description: 'Optimización de cadena de suministro',
          examples: [
            'Gestionar proveedores',
            'Optimizar lead times',
            'Mejorar procurement'
          ],
          priority: 8
        },
        {
          name: 'Quality Control',
          description: 'Control de calidad y estándares operativos',
          examples: [
            'Implementar controles de calidad',
            'Definir SLAs operativos',
            'Mejorar performance operativa'
          ],
          priority: 7
        }
      ],
      OPERATIONS_MANAGER_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing operations query: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of operations request
      const queryType = this.identifyQueryType(context.userMessage);
      this.log('debug', `Identified query type: ${queryType.type}`);

      // Generate appropriate response based on query type
      let response: string;
      let confidence: number;

      switch (queryType.type) {
        case 'process_optimization':
          response = await this.generateProcessOptimization(context, ragContext);
          confidence = 0.9;
          break;
        case 'logistics_management':
          response = await this.generateLogisticsManagement(context, ragContext);
          confidence = 0.85;
          break;
        case 'supply_chain':
          response = await this.generateSupplyChain(context, ragContext);
          confidence = 0.8;
          break;
        case 'quality_control':
          response = await this.generateQualityControl(context, ragContext);
          confidence = 0.85;
          break;
        case 'cost_optimization':
          response = await this.generateCostOptimization(context, ragContext);
          confidence = 0.8;
          break;
        case 'automation':
          response = await this.generateAutomation(context, ragContext);
          confidence = 0.75;
          break;
        default:
          response = await this.generateGeneralOperations(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Operations response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Operations query processed: ${queryType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Operations processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for operations management keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.operations_manager);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('proceso') && (lowerMessage.includes('optimizar') || lowerMessage.includes('mejorar'))) {
      score += 0.3;
    }
    if (lowerMessage.includes('envío') && (lowerMessage.includes('costo') || lowerMessage.includes('reducir'))) {
      score += 0.25;
    }
    if (lowerMessage.includes('operaciones') || lowerMessage.includes('logística')) {
      score += 0.25;
    }
    if (lowerMessage.includes('automatizar') || lowerMessage.includes('automation')) {
      score += 0.2;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found operations keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific operations keywords found';

    return { confidence, reasoning };
  }

  private identifyQueryType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Process optimization queries
    if (lowerMessage.includes('proceso') && (lowerMessage.includes('optimizar') || lowerMessage.includes('mejorar'))) {
      return { type: 'process_optimization', reasoning: 'Process optimization query detected', confidence: 0.9 };
    }
    if (lowerMessage.includes('workflow') || lowerMessage.includes('bottleneck')) {
      return { type: 'process_optimization', reasoning: 'Workflow optimization query', confidence: 0.85 };
    }

    // Logistics management
    if (lowerMessage.includes('envío') && (lowerMessage.includes('costo') || lowerMessage.includes('reducir'))) {
      return { type: 'logistics_management', reasoning: 'Shipping cost optimization query', confidence: 0.9 };
    }
    if (lowerMessage.includes('logística') || lowerMessage.includes('distribución')) {
      return { type: 'logistics_management', reasoning: 'Logistics management query', confidence: 0.85 };
    }

    // Supply chain
    if (lowerMessage.includes('proveedor') || lowerMessage.includes('supplier')) {
      return { type: 'supply_chain', reasoning: 'Supplier management query', confidence: 0.8 };
    }
    if (lowerMessage.includes('lead time') || lowerMessage.includes('tiempo de entrega')) {
      return { type: 'supply_chain', reasoning: 'Lead time optimization query', confidence: 0.8 };
    }

    // Quality control
    if (lowerMessage.includes('calidad') || lowerMessage.includes('quality')) {
      return { type: 'quality_control', reasoning: 'Quality control query', confidence: 0.85 };
    }
    if (lowerMessage.includes('sla') || lowerMessage.includes('estándares')) {
      return { type: 'quality_control', reasoning: 'Standards management query', confidence: 0.8 };
    }

    // Cost optimization
    if (lowerMessage.includes('reducir costos') || lowerMessage.includes('cost reduction')) {
      return { type: 'cost_optimization', reasoning: 'Cost reduction query', confidence: 0.8 };
    }

    // Automation
    if (lowerMessage.includes('automatizar') || lowerMessage.includes('automation')) {
      return { type: 'automation', reasoning: 'Automation query', confidence: 0.75 };
    }

    return { type: 'general', reasoning: 'General operations query', confidence: 0.5 };
  }

  private async generateProcessOptimization(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: OPTIMIZACIÓN DE PROCESOS
- Mapea los procesos actuales paso a paso
- Identifica bottlenecks y puntos de mejora
- Proporciona soluciones de optimización específicas
- Incluye métricas para medir la mejora

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateLogisticsManagement(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: GESTIÓN LOGÍSTICA
- Analiza la estructura de costos logísticos actual
- Identifica oportunidades de optimización
- Proporciona estrategias de negociación con carriers
- Sugiere mejoras en tiempos y costos de entrega

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateSupplyChain(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: CADENA DE SUMINISTRO
- Evalúa la performance de proveedores actuales
- Identifica oportunidades de mejora en procurement
- Proporciona estrategias de optimización de lead times
- Sugiere diversificación y gestión de riesgos

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateQualityControl(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: CONTROL DE CALIDAD
- Define estándares de calidad operativa
- Proporciona métricas y KPIs de control
- Sugiere procesos de verificación y validación
- Incluye planes de mejora continua

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateCostOptimization(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: OPTIMIZACIÓN DE COSTOS
- Analiza la estructura de costos operativos
- Identifica áreas de mayor impacto en reducción
- Proporciona estrategias de optimización específicas
- Incluye proyección de ahorros y timeline

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateAutomation(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque específico: AUTOMATIZACIÓN
- Identifica procesos candidatos para automatización
- Proporciona roadmap de implementación
- Sugiere herramientas y tecnologías apropiadas
- Incluye análisis costo-beneficio de la automatización

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async generateGeneralOperations(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const enhancedPrompt = `${this.config.prompts.userPrompt}

Enfoque: CONSULTA GENERAL OPERATIVA
- Proporciona una respuesta integral sobre operaciones
- Incluye mejores prácticas y recomendaciones
- Considera el contexto específico del negocio
- Sugiere próximos pasos accionables

Consulta del usuario: ${context.userMessage}
Contexto: ${ragContext || 'No hay datos específicos disponibles'}`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 