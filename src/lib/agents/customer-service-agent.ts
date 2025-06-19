/**
 * Customer Service Agent
 * Specialized agent for customer support, order management, and customer relations
 */

import { BaseAgent } from './base-agent';
import type { AgentContext, AgentResponse } from './types';
import { CUSTOMER_SERVICE_CONFIG, ROUTING_KEYWORDS } from './config';

export class CustomerServiceAgent extends BaseAgent {
  constructor() {
    super(
      'customer_service',
      'Customer Service Agent',
      'Expert in customer support, order management, and customer relations',
      [
        {
          name: 'Order Support',
          description: 'Handle order inquiries, status updates, and shipping issues',
          examples: ['Order status', 'Shipping delays', 'Order modifications'],
          priority: 10
        },
        {
          name: 'Product Support',
          description: 'Product information, technical issues, and compatibility',
          examples: ['Product specifications', 'Usage instructions', 'Troubleshooting'],
          priority: 9
        },
        {
          name: 'Returns & Refunds',
          description: 'Process returns, refunds, and exchanges',
          examples: ['Return policy', 'Refund requests', 'Product exchanges'],
          priority: 9
        },
        {
          name: 'General Inquiries',
          description: 'General customer questions and store information',
          examples: ['Store policies', 'Contact information', 'General help'],
          priority: 8
        },
        {
          name: 'Complaint Resolution',
          description: 'Handle customer complaints and escalations',
          examples: ['Service complaints', 'Product issues', 'Satisfaction problems'],
          priority: 10
        }
      ],
      CUSTOMER_SERVICE_CONFIG
    );
  }

  async process(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    this.log('info', `Processing customer service request: "${context.userMessage}"`);

    try {
      // Get relevant context from RAG
      const ragContext = await this.getRelevantContext(context.userMessage, context);
      
      // Identify the type of customer service request
      const requestType = this.identifyRequestType(context.userMessage);
      this.log('debug', `Identified request type: ${requestType.type}`);

      // Generate appropriate response based on request type
      let response: string;
      let confidence: number;

      switch (requestType.type) {
        case 'order_inquiry':
          response = await this.handleOrderInquiry(context, ragContext);
          confidence = 0.9;
          break;
        case 'product_support':
          response = await this.handleProductSupport(context, ragContext);
          confidence = 0.85;
          break;
        case 'returns_refunds':
          response = await this.handleReturnsRefunds(context, ragContext);
          confidence = 0.9;
          break;
        case 'complaint':
          response = await this.handleComplaint(context, ragContext);
          confidence = 0.85;
          break;
        case 'general_inquiry':
          response = await this.handleGeneralInquiry(context, ragContext);
          confidence = 0.8;
          break;
        case 'policy_question':
          response = await this.handlePolicyQuestion(context, ragContext);
          confidence = 0.85;
          break;
        default:
          response = await this.handleGeneralSupport(context, ragContext);
          confidence = 0.6;
      }

      const executionTime = Date.now() - startTime;
      this.log('info', `Customer service response generated in ${executionTime}ms`);

      return this.createResponse(
        true,
        response,
        confidence,
        `Customer service request handled: ${requestType.reasoning}`,
        ragContext,
        executionTime
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Customer service processing failed: ${errorMessage}`);
      return this.createFallbackResponse(errorMessage);
    }
  }

  protected async calculateHandlingScore(context: AgentContext): Promise<{ confidence: number; reasoning: string }> {
    const { userMessage } = context;
    const lowerMessage = userMessage.toLowerCase();

    // Check for customer service keywords
    const keywordCheck = this.hasKeywords(lowerMessage, ROUTING_KEYWORDS.customer_service);
    let score = keywordCheck.score;

    // Boost for specific patterns
    if (lowerMessage.includes('cliente') && (lowerMessage.includes('problema') || lowerMessage.includes('queja'))) {
      score += 0.3;
    }
    if (lowerMessage.includes('pedido') || lowerMessage.includes('orden') || lowerMessage.includes('envío')) {
      score += 0.3;
    }
    if (lowerMessage.includes('devolución') || lowerMessage.includes('reembolso') || lowerMessage.includes('cambio')) {
      score += 0.3;
    }
    if (lowerMessage.includes('no funciona') || lowerMessage.includes('defectuoso') || lowerMessage.includes('no llegó')) {
      score += 0.3;
    }

    const confidence = Math.min(score, 1.0);
    const reasoning = keywordCheck.found ? 
      `Found customer service keywords: ${keywordCheck.matches.join(', ')}` :
      'No specific customer service keywords found';

    return { confidence, reasoning };
  }

  private identifyRequestType(message: string): { type: string; reasoning: string; confidence: number } {
    const lowerMessage = message.toLowerCase();

    // Order inquiries
    if (lowerMessage.includes('pedido') || lowerMessage.includes('orden')) {
      if (lowerMessage.includes('estado') || lowerMessage.includes('cuando') || lowerMessage.includes('llegará')) {
        return { type: 'order_inquiry', reasoning: 'Order status inquiry', confidence: 0.9 };
      }
      return { type: 'order_inquiry', reasoning: 'General order inquiry', confidence: 0.8 };
    }

    // Product support
    if (lowerMessage.includes('producto') && (lowerMessage.includes('cómo') || lowerMessage.includes('usar') || lowerMessage.includes('funciona'))) {
      return { type: 'product_support', reasoning: 'Product usage question', confidence: 0.85 };
    }
    if (lowerMessage.includes('no funciona') || lowerMessage.includes('defectuoso') || lowerMessage.includes('problema con')) {
      return { type: 'product_support', reasoning: 'Product issue', confidence: 0.9 };
    }

    // Returns and refunds
    if (lowerMessage.includes('devolución') || lowerMessage.includes('devolver')) {
      return { type: 'returns_refunds', reasoning: 'Return request', confidence: 0.9 };
    }
    if (lowerMessage.includes('reembolso') || lowerMessage.includes('reintegro')) {
      return { type: 'returns_refunds', reasoning: 'Refund request', confidence: 0.9 };
    }
    if (lowerMessage.includes('cambio') || lowerMessage.includes('cambiar')) {
      return { type: 'returns_refunds', reasoning: 'Exchange request', confidence: 0.85 };
    }

    // Complaints
    if (lowerMessage.includes('queja') || lowerMessage.includes('quejar') || lowerMessage.includes('reclamo')) {
      return { type: 'complaint', reasoning: 'Customer complaint', confidence: 0.9 };
    }
    if (lowerMessage.includes('insatisfecho') || lowerMessage.includes('molesto') || lowerMessage.includes('enojado')) {
      return { type: 'complaint', reasoning: 'Customer dissatisfaction', confidence: 0.85 };
    }

    // Policy questions
    if (lowerMessage.includes('política') || lowerMessage.includes('garantía') || lowerMessage.includes('términos')) {
      return { type: 'policy_question', reasoning: 'Policy inquiry', confidence: 0.85 };
    }

    // General inquiries
    if (lowerMessage.includes('información') || lowerMessage.includes('ayuda') || lowerMessage.includes('consulta')) {
      return { type: 'general_inquiry', reasoning: 'General information request', confidence: 0.7 };
    }

    return { type: 'general_support', reasoning: 'General customer support request', confidence: 0.5 };
  }

  private async handleOrderInquiry(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay información específica del pedido disponible'
    });

    const enhancedPrompt = `${userPrompt}

Maneja esta consulta sobre pedido proporcionando:
- Información específica del pedido (si está disponible)
- Estado actual del envío y fechas estimadas
- Pasos para rastrear el pedido
- Contactos para seguimiento adicional
- Soluciones a problemas comunes de envío

Mantén un tono empático y profesional. Si no tienes información específica, explica cómo el cliente puede obtenerla.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async handleProductSupport(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay información específica del producto disponible'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona soporte de producto incluyendo:
- Información técnica del producto
- Instrucciones de uso paso a paso
- Solución de problemas comunes
- Recomendaciones de mantenimiento
- Opciones si el producto está defectuoso

Sé detallado en las explicaciones y ofrece múltiples soluciones cuando sea posible.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async handleReturnsRefunds(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay información específica de políticas disponible'
    });

    const enhancedPrompt = `${userPrompt}

Maneja esta solicitud de devolución/reembolso proporcionando:
- Política clara de devoluciones y términos
- Pasos específicos para procesar la devolución
- Tiempo estimado de procesamiento
- Documentación requerida
- Alternativas como cambios o crédito en tienda

Sé comprensivo y facilita el proceso al máximo para el cliente.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async handleComplaint(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay contexto específico de la queja disponible'
    });

    const enhancedPrompt = `${userPrompt}

Maneja esta queja de cliente con especial cuidado:
- Reconoce y valida las preocupaciones del cliente
- Disculpas sinceras cuando sea apropiado
- Soluciones específicas y compensación si corresponde
- Pasos para prevenir problemas similares
- Seguimiento y escalamiento si es necesario

Prioriza la satisfacción del cliente y la resolución efectiva del problema.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async handlePolicyQuestion(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'No hay información específica de políticas disponible'
    });

    const enhancedPrompt = `${userPrompt}

Responde a esta consulta sobre políticas incluyendo:
- Información clara y completa de la política relevante
- Ejemplos prácticos de cómo se aplica
- Excepciones o casos especiales
- Contactos para clarificaciones adicionales
- Vínculos a documentación completa

Asegúrate de que la información sea precisa y fácil de entender.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async handleGeneralInquiry(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Información general de la tienda'
    });

    const enhancedPrompt = `${userPrompt}

Responde a esta consulta general proporcionando:
- Información solicitada de manera clara
- Recursos adicionales relevantes
- Pasos siguientes si es necesario
- Contactos para asistencia especializada
- Información proactiva que pueda ser útil

Mantén un tono amigable y servicial.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }

  private async handleGeneralSupport(context: AgentContext, ragContext: string): Promise<string> {
    const systemPrompt = this.config.prompts.systemPrompt;
    const userPrompt = this.formatPrompt(this.config.prompts.userPrompt, {
      userMessage: context.userMessage,
      context: ragContext || 'Soporte general disponible'
    });

    const enhancedPrompt = `${userPrompt}

Proporciona soporte general incluyendo:
- Análisis de la consulta del cliente
- Información relevante disponible
- Opciones de asistencia
- Escalamiento si es necesario
- Seguimiento recomendado

Si la consulta no es clara, haz preguntas clarificadoras de manera amigable.`;

    return await this.generateResponse(systemPrompt, enhancedPrompt, ragContext);
  }
} 