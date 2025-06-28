/**
 * Smart Template Service
 * Maneja inteligentemente el envío de templates según el contexto y agente
 */

import { createLogger } from '@/lib/logger';
import { TwilioWhatsAppService, type TwilioConfig } from '../twilio-whatsapp';
import { FINI_TEMPLATE_CONFIGS, AGENT_TEMPLATE_MAPPING } from '../twilio-content-templates';
import type { AgentType } from '@/lib/agents/types';
import type { WhatsAppConversation } from './types';
import twilio from 'twilio';

interface TemplateVariable {
  [key: string]: string;
}

interface ConversationContext {
  phoneNumber: string;
  storeId: string;
  userId: string;
  currentAgent?: AgentType;
  lastMessageAt?: string;
  conversationHistory?: Array<{
    message: string;
    timestamp: string;
    fromUser: boolean;
    agentType?: AgentType;
  }>;
}

type MessageType = 'proactive' | 'notification' | 'welcome' | 'contextSwitch' | 'error' | 'multiAgent';

export class SmartTemplateService {
  private twilioService: TwilioWhatsAppService;
  private twilioClient: twilio.Twilio;
  private logger = createLogger('SmartTemplateService');

  constructor() {
    const config: TwilioConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID!,
      authToken: process.env.TWILIO_AUTH_TOKEN!,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER!,
      webhookUrl: process.env.TWILIO_WEBHOOK_URL || ''
    };
    this.twilioService = new TwilioWhatsAppService(config);
    
    // Cliente independiente para templates
    this.twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  /**
   * Envía un mensaje inteligente - detecta automáticamente si usar template o freeform
   */
  async sendSmartAgentMessage(
    context: ConversationContext,
    agentType: AgentType,
    messageType: MessageType,
    variables: TemplateVariable,
    fallbackMessage?: string
  ): Promise<{ success: boolean; messageSid?: string; usedTemplate?: boolean; error?: string }> {
    
    try {
      this.logger.info('Sending smart agent message', { 
        phoneNumber: context.phoneNumber, 
        agentType, 
        messageType 
      });

      // 1. Detectar si estamos fuera de la ventana de 24hrs
      const isOutsideWindow = await this.isOutside24HourWindow(context);
      
      if (isOutsideWindow) {
        // Usar template (obligatorio fuera de 24hrs)
        this.logger.info('Outside 24h window, using template', { agentType, messageType });
        return await this.sendAgentTemplate(context, agentType, messageType, variables);
      } else {
        // Intentar freeform primero (más flexible)
        if (fallbackMessage) {
          this.logger.info('Inside 24h window, trying freeform first', { agentType });
          const freeformResult = await this.sendFreeformMessage(context.phoneNumber, fallbackMessage);
          
          if (freeformResult.success) {
            return { ...freeformResult, usedTemplate: false };
          }
        }
        
        // Si freeform falla, usar template como fallback
        this.logger.warn('Freeform failed, falling back to template', { agentType });
        return await this.sendAgentTemplate(context, agentType, messageType, variables);
      }

    } catch (error) {
      this.logger.error('Smart message sending failed', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Maneja cambio de contexto entre agentes
   */
  async handleContextSwitch(
    context: ConversationContext,
    fromAgent: AgentType,
    toAgent: AgentType,
    transitionReason: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    const agentNames = {
      analytics: 'Analytics',
      customer_service: 'Atención al Cliente',
      marketing: 'Marketing',
      stock_manager: 'Gestión de Inventario',
      financial_advisor: 'Asesoría Financiera', 
      business_consultant: 'Consultoría Estratégica',
      product_manager: 'Gestión de Productos',
      operations_manager: 'Optimización Operativa',
      sales_coach: 'Coaching de Ventas',
      orchestrator: 'Coordinador'
    };

    const variables = {
      '1': agentNames[fromAgent] || fromAgent,
      '2': agentNames[toAgent] || toAgent,
      '3': transitionReason
    };

    return await this.sendSmartAgentMessage(
      context,
      toAgent,
      'contextSwitch',
      variables,
      `🔄 Cambio de especialista: de ${agentNames[fromAgent]} a ${agentNames[toAgent]}. ${transitionReason}`
    );
  }

  /**
   * Envía notificación proactiva específica del agente
   */
  async sendProactiveNotification(
    context: ConversationContext,
    agentType: AgentType,
    notificationData: {
      title: string;
      details: string;
      action?: string;
    }
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    // Mapear datos específicos según el tipo de agente
    const variables = this.mapNotificationVariables(agentType, notificationData);
    
    return await this.sendSmartAgentMessage(
      context,
      agentType,
      'proactive',
      variables,
      `${notificationData.title}\n\n${notificationData.details}${notificationData.action ? `\n\n${notificationData.action}` : ''}`
    );
  }

  /**
   * Envía alerta crítica del sistema
   */
  async sendCriticalAlert(
    context: ConversationContext,
    agentType: AgentType,
    alertData: {
      type: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      message: string;
      action: string;
    }
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    const variables = {
      '1': alertData.type,
      '2': alertData.message,
      '3': alertData.action
    };

    return await this.sendSmartAgentMessage(
      context,
      agentType,
      'notification',
      variables,
      `🚨 ALERTA ${alertData.severity}\n\n${alertData.type}: ${alertData.message}\n\n${alertData.action}`
    );
  }

  /**
   * Coordina respuesta multi-agente
   */
  async sendMultiAgentResponse(
    context: ConversationContext,
    involvedAgents: AgentType[],
    coordinationPlan: string,
    topic: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    const agentNames = {
      analytics: 'Analytics',
      customer_service: 'Atención',
      marketing: 'Marketing',
      stock_manager: 'Inventario',
      financial_advisor: 'Finanzas',
      business_consultant: 'Consultoría',
      product_manager: 'Productos',
      operations_manager: 'Operaciones',
      sales_coach: 'Ventas',
      orchestrator: 'Coordinador'
    };

    const agentList = involvedAgents.map(agent => agentNames[agent] || agent).join(', ');
    
    const variables = {
      '1': agentList,
      '2': topic,
      '3': coordinationPlan
    };

    // Usar el primer agente como coordinador
    const primaryAgent = involvedAgents[0] || 'orchestrator';

    return await this.sendSmartAgentMessage(
      context,
      primaryAgent,
      'multiAgent',
      variables,
      `🤝 Consulta Multi-Especialista\n\nEquipo: ${agentList}\nTema: ${topic}\nPlan: ${coordinationPlan}`
    );
  }

  /**
   * Detecta si estamos fuera de la ventana de 24 horas
   */
  private async isOutside24HourWindow(context: ConversationContext): Promise<boolean> {
    if (!context.lastMessageAt) {
      return true; // No hay historial, asumir fuera de ventana
    }

    const lastMessageTime = new Date(context.lastMessageAt).getTime();
    const now = Date.now();
    const timeDifference = now - lastMessageTime;
    const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    return timeDifference > twentyFourHours;
  }

  /**
   * Envía template específico del agente usando Twilio directamente
   */
  private async sendAgentTemplate(
    context: ConversationContext,
    agentType: AgentType,
    messageType: MessageType,
    variables: TemplateVariable
  ): Promise<{ success: boolean; messageSid?: string; usedTemplate: boolean; error?: string }> {
    
    try {
      // Obtener el template correcto
      const templateKey = this.getTemplateKey(agentType, messageType);
      
      if (!templateKey) {
        throw new Error(`No template found for agent ${agentType} and type ${messageType}`);
      }

      const templateConfig = FINI_TEMPLATE_CONFIGS[templateKey as keyof typeof FINI_TEMPLATE_CONFIGS];
      
      if (!templateConfig) {
        throw new Error(`Template configuration not found for ${templateKey}`);
      }

      // Crear el mensaje con template usando variables del templateConfig
      const contentVariables: Record<string, string> = {};
      
      // Mapear variables basándose en la configuración del template
      Object.keys(templateConfig.variables || {}).forEach((key, index) => {
        const variableKey = String(index + 1);
        contentVariables[variableKey] = variables[variableKey] || variables[key] || '';
      });

      // Enviar usando Twilio API directamente
      const result = await this.sendTemplateViaAPI(context.phoneNumber, templateConfig.friendlyName, contentVariables);
      
      return {
        success: result.success,
        messageSid: result.messageSid,
        usedTemplate: true,
        error: result.error
      };

    } catch (error) {
      this.logger.error('Template sending failed', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        usedTemplate: true,
        error: error instanceof Error ? error.message : 'Template send failed'
      };
    }
  }

  /**
   * Envía template usando la API de Twilio directamente
   */
  private async sendTemplateViaAPI(
    phoneNumber: string,
    contentSid: string,
    variables: Record<string, string>
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    try {
      // Usar el cliente de Twilio directamente para envío de template
      const twilioClient = this.twilioClient;
      
      const twilioMessage = await twilioClient.messages.create({
        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
        to: `whatsapp:${phoneNumber}`,
        contentSid: contentSid,
        contentVariables: JSON.stringify(variables)
      });

      this.logger.info('Template sent successfully', { 
        messageSid: twilioMessage.sid,
        contentSid,
        phoneNumber
      });

      return {
        success: true,
        messageSid: twilioMessage.sid
      };
    } catch (error) {
      this.logger.error('Template API call failed', { 
        error: error instanceof Error ? error.message : error,
        contentSid,
        phoneNumber
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template API call failed'
      };
    }
  }

  /**
   * Envía mensaje freeform
   */
  private async sendFreeformMessage(
    phoneNumber: string,
    message: string
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    try {
      const result = await this.twilioService.sendMessage({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER!,
        body: message
      });

      return result;
    } catch (error) {
      this.logger.error('Freeform message failed', { error: error instanceof Error ? error.message : error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Freeform send failed'
      };
    }
  }

  /**
   * Obtiene la clave del template según agente y tipo
   */
  private getTemplateKey(agentType: AgentType, messageType: MessageType): string | null {
    // Mapeos especiales
    const specialMappings: Record<string, string> = {
      'contextSwitch': 'CONTEXT_SWITCH',
      'multiAgent': 'MULTI_AGENT_QUERY',
      'error': 'ERROR_FALLBACK',
      'welcome': 'WELCOME_MULTI_AGENT'
    };

    if (specialMappings[messageType]) {
      return specialMappings[messageType];
    }

    // Mapeos por agente
    const agentMapping = AGENT_TEMPLATE_MAPPING[agentType as keyof typeof AGENT_TEMPLATE_MAPPING];
    
    if (!agentMapping) {
      this.logger.warn(`No template mapping found for agent: ${agentType}`);
      return null;
    }

    const templateKey = agentMapping[messageType as keyof typeof agentMapping];
    
    if (!templateKey) {
      this.logger.warn(`No template found for agent ${agentType} and type ${messageType}`);
      return null;
    }

    return templateKey;
  }

  /**
   * Mapea variables de notificación específicas por agente
   */
  private mapNotificationVariables(agentType: AgentType, data: { title: string; details: string; action?: string }): TemplateVariable {
    // Variables base
    const baseVariables: TemplateVariable = {
      '1': data.title,
      '2': data.details,
      '3': data.action || 'Revisemos juntos'
    };

    // Personalizaciones específicas por agente
    switch (agentType) {
      case 'stock_manager':
        return {
          '1': data.title, // Nombre del producto
          '2': data.details, // Stock restante 
          '3': data.action || '3' // Días estimados
        };
        
      case 'financial_advisor':
        return {
          '1': data.title, // Métrica financiera
          '2': data.details, // Cambio porcentual
          '3': data.action || 'Optimizar estrategia' // Acción
        };
        
      case 'analytics':
        return {
          '1': data.title, // Métrica
          '2': data.details, // Cambio
          '3': data.action || 'Analizar tendencia' // Recomendación
        };
        
      default:
        return baseVariables;
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  async getServiceStats(): Promise<{
    templatesAvailable: number;
    agentsSupported: number;
    messageTypeSupported: string[];
  }> {
    return {
      templatesAvailable: Object.keys(FINI_TEMPLATE_CONFIGS).length,
      agentsSupported: Object.keys(AGENT_TEMPLATE_MAPPING).length,
      messageTypeSupported: ['proactive', 'notification', 'welcome', 'contextSwitch', 'error', 'multiAgent']
    };
  }
}

// Export singleton instance
export const smartTemplateService = new SmartTemplateService();

// Export types for use in other modules
export type { ConversationContext, TemplateVariable, MessageType }; 