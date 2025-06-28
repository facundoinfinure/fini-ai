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

/**
 * Template Fallback Chain Configuration
 * Define what template to use if the primary template fails
 */
interface FallbackMapping {
  [templateKey: string]: string;
}

const TEMPLATE_FALLBACK_CHAIN: FallbackMapping = {
  // Agent Proactive Templates → Daily Summary or Welcome
  'ANALYTICS_PROACTIVE': 'DAILY_SUMMARY',
  'CUSTOMER_SERVICE_PROACTIVE': 'WELCOME_MULTI_AGENT',
  'MARKETING_PROACTIVE': 'WELCOME_MULTI_AGENT',
  'STOCK_MANAGER_PROACTIVE': 'STOCK_CRITICAL_ALERT',
  'FINANCIAL_ADVISOR_PROACTIVE': 'DAILY_SUMMARY',
  'BUSINESS_CONSULTANT_PROACTIVE': 'WELCOME_MULTI_AGENT',
  'PRODUCT_MANAGER_PROACTIVE': 'DAILY_SUMMARY',
  'OPERATIONS_MANAGER_PROACTIVE': 'WELCOME_MULTI_AGENT',
  'SALES_COACH_PROACTIVE': 'DAILY_SUMMARY',

  // Agent Notification Templates → Error Fallback
  'ANALYTICS_NOTIFICATION': 'ERROR_FALLBACK',
  'CUSTOMER_SERVICE_NOTIFICATION': 'ERROR_FALLBACK',
  'MARKETING_NOTIFICATION': 'MARKETING_PROACTIVE',
  'STOCK_CRITICAL_ALERT': 'ERROR_FALLBACK',
  'FINANCIAL_ADVISOR_NOTIFICATION': 'ERROR_FALLBACK',
  'BUSINESS_CONSULTANT_NOTIFICATION': 'ERROR_FALLBACK',
  'PRODUCT_MANAGER_NOTIFICATION': 'ERROR_FALLBACK',
  'OPERATIONS_MANAGER_NOTIFICATION': 'ERROR_FALLBACK',
  'SALES_COACH_NOTIFICATION': 'ERROR_FALLBACK',

  // System Coordination Templates → Welcome
  'CONTEXT_SWITCH': 'WELCOME_MULTI_AGENT',
  'MULTI_AGENT_QUERY': 'WELCOME_MULTI_AGENT',

  // Daily Summary → Welcome (in case daily fails)
  'DAILY_SUMMARY': 'WELCOME_MULTI_AGENT',

  // Welcome and Error Fallback have NO fallbacks (end of chain)
  // 'WELCOME_MULTI_AGENT': null,
  // 'ERROR_FALLBACK': null
};

/**
 * Default fallback variables for each template type
 */
const FALLBACK_VARIABLES: Record<string, TemplateVariable> = {
  'WELCOME_MULTI_AGENT': {
    '1': 'Usuario',
    '2': 'Tu Tienda'
  },
  'ERROR_FALLBACK': {
    '1': 'Servicio temporalmente no disponible',
    '2': 'Intentar nuevamente más tarde'
  },
  'DAILY_SUMMARY': {
    '1': 'Tu Tienda',
    '2': '$0',
    '3': '0',
    '4': 'Sin datos'
  },
  'STOCK_CRITICAL_ALERT': {
    '1': 'Producto',
    '2': '0',
    '3': 'N/A'
  }
};

/**
 * Mapping from template keys to their environment variable names for ContentSIDs
 */
const CONTENT_SID_ENV_MAPPING: Record<string, string> = {
  'OTP_VERIFICATION': 'TWILIO_OTP_VERIFICATION_CONTENTSID',
  'ANALYTICS_PROACTIVE': 'TWILIO_ANALYTICS_PROACTIVE_CONTENTSID',
  'ANALYTICS_NOTIFICATION': 'TWILIO_ANALYTICS_NOTIFICATION_CONTENTSID',
  'CUSTOMER_SERVICE_PROACTIVE': 'TWILIO_CUSTOMER_SERVICE_PROACTIVE_CONTENTSID',
  'CUSTOMER_SERVICE_NOTIFICATION': 'TWILIO_CUSTOMER_SERVICE_NOTIFICATION_CONTENTSID',
  'MARKETING_PROACTIVE': 'TWILIO_MARKETING_PROACTIVE_CONTENTSID',
  'MARKETING_NOTIFICATION': 'TWILIO_MARKETING_NOTIFICATION_CONTENTSID',
  'STOCK_MANAGER_PROACTIVE': 'TWILIO_STOCK_MANAGER_PROACTIVE_CONTENTSID',
  'STOCK_CRITICAL_ALERT': 'TWILIO_STOCK_CRITICAL_ALERT_CONTENTSID',
  'FINANCIAL_ADVISOR_PROACTIVE': 'TWILIO_FINANCIAL_ADVISOR_PROACTIVE_CONTENTSID',
  'FINANCIAL_ADVISOR_NOTIFICATION': 'TWILIO_FINANCIAL_ADVISOR_NOTIFICATION_CONTENTSID',
  'BUSINESS_CONSULTANT_PROACTIVE': 'TWILIO_BUSINESS_CONSULTANT_PROACTIVE_CONTENTSID',
  'BUSINESS_CONSULTANT_NOTIFICATION': 'TWILIO_BUSINESS_CONSULTANT_NOTIFICATION_CONTENTSID',
  'PRODUCT_MANAGER_PROACTIVE': 'TWILIO_PRODUCT_MANAGER_PROACTIVE_CONTENTSID',
  'PRODUCT_MANAGER_NOTIFICATION': 'TWILIO_PRODUCT_MANAGER_NOTIFICATION_CONTENTSID',
  'OPERATIONS_MANAGER_PROACTIVE': 'TWILIO_OPERATIONS_MANAGER_PROACTIVE_CONTENTSID',
  'OPERATIONS_MANAGER_NOTIFICATION': 'TWILIO_OPERATIONS_MANAGER_NOTIFICATION_CONTENTSID',
  'SALES_COACH_PROACTIVE': 'TWILIO_SALES_COACH_PROACTIVE_CONTENTSID',
  'SALES_COACH_NOTIFICATION': 'TWILIO_SALES_COACH_NOTIFICATION_CONTENTSID',
  'CONTEXT_SWITCH': 'TWILIO_CONTEXT_SWITCH_CONTENTSID',
  'MULTI_AGENT_QUERY': 'TWILIO_MULTI_AGENT_QUERY_CONTENTSID',
  'WELCOME_MULTI_AGENT': 'TWILIO_WELCOME_MULTI_AGENT_CONTENTSID',
  'ERROR_FALLBACK': 'TWILIO_ERROR_FALLBACK_CONTENTSID',
  'DAILY_SUMMARY': 'TWILIO_DAILY_SUMMARY_CONTENTSID'
};

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
   * Envía template específico del agente usando Twilio directamente con fallback automático
   */
  private async sendAgentTemplate(
    context: ConversationContext,
    agentType: AgentType,
    messageType: MessageType,
    variables: TemplateVariable,
    isRetry = false
  ): Promise<{ success: boolean; messageSid?: string; usedTemplate: boolean; error?: string; fallbackUsed?: string }> {
    
    try {
      // Obtener el template correcto
      const templateKey = this.getTemplateKey(agentType, messageType);
      
      if (!templateKey) {
        throw new Error(`No template found for agent ${agentType} and type ${messageType}`);
      }

      // Intentar enviar el template primario
      const result = await this.sendPrimaryTemplate(context.phoneNumber, templateKey, variables);
      
      if (result.success) {
        return {
          success: true,
          messageSid: result.messageSid,
          usedTemplate: true
        };
      }

      // Si falla y no es un retry, intentar fallback
      if (!isRetry) {
        this.logger.warn(`Primary template ${templateKey} failed, trying fallback`, { 
          agentType, 
          messageType,
          error: result.error 
        });
        
        return await this.sendTemplateFallback(context, templateKey, variables);
      }

      // Si es retry y aún falla, devolver error
      return {
        success: false,
        usedTemplate: true,
        error: result.error || 'Template send failed after fallback attempt'
      };

    } catch (error) {
      this.logger.error('Template sending failed completely', { 
        error: error instanceof Error ? error.message : error,
        agentType,
        messageType
      });
      
      return {
        success: false,
        usedTemplate: true,
        error: error instanceof Error ? error.message : 'Template send failed'
      };
    }
  }

  /**
   * Envía template primario
   */
  private async sendPrimaryTemplate(
    phoneNumber: string,
    templateKey: string,
    variables: TemplateVariable
  ): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    
    // Obtener ContentSID desde variables de entorno
    const envVarName = CONTENT_SID_ENV_MAPPING[templateKey];
    
    if (!envVarName) {
      return {
        success: false,
        error: `No environment variable mapping found for template key: ${templateKey}`
      };
    }

    const contentSid = process.env[envVarName];
    
    if (!contentSid) {
      return {
        success: false,
        error: `ContentSID not found in environment variable: ${envVarName}`
      };
    }

    // Obtener configuración para validar variables esperadas
    const templateConfig = FINI_TEMPLATE_CONFIGS[templateKey as keyof typeof FINI_TEMPLATE_CONFIGS];
    
    // Crear el mensaje con template usando variables del templateConfig
    let contentVariables: Record<string, string> = {};
    
    if (templateConfig?.variables) {
      // Mapear variables basándose en la configuración del template
      Object.keys(templateConfig.variables).forEach((key, index) => {
        const variableKey = String(index + 1);
        contentVariables[variableKey] = variables[variableKey] || variables[key] || '';
      });
    } else {
      // Para templates sin configuración específica, usar variables directamente
      contentVariables = { ...variables };
    }

    this.logger.info('Sending template with ContentSID from env var', {
      templateKey,
      envVarName,
      contentSid,
      variableCount: Object.keys(contentVariables).length
    });

    // Enviar usando Twilio API directamente con ContentSID real
    return await this.sendTemplateViaAPI(phoneNumber, contentSid, contentVariables);
  }

  /**
   * Maneja fallback cuando el template primario falla
   */
  private async sendTemplateFallback(
    context: ConversationContext,
    primaryTemplateKey: string,
    originalVariables: TemplateVariable
  ): Promise<{ success: boolean; messageSid?: string; usedTemplate: boolean; error?: string; fallbackUsed?: string }> {
    
    // Buscar template de fallback
    const fallbackTemplateKey = TEMPLATE_FALLBACK_CHAIN[primaryTemplateKey];
    
    if (!fallbackTemplateKey) {
      this.logger.warn(`No fallback template configured for ${primaryTemplateKey}`);
      return {
        success: false,
        usedTemplate: true,
        error: `No fallback available for ${primaryTemplateKey}`
      };
    }

    this.logger.info(`Using fallback template: ${fallbackTemplateKey}`, { 
      primary: primaryTemplateKey,
      fallback: fallbackTemplateKey 
    });

    // Preparar variables para el fallback
    const fallbackVariables = this.prepareFallbackVariables(
      fallbackTemplateKey, 
      originalVariables, 
      context
    );

    // Intentar enviar el template de fallback
    const result = await this.sendPrimaryTemplate(context.phoneNumber, fallbackTemplateKey, fallbackVariables);
    
    if (result.success) {
      return {
        success: true,
        messageSid: result.messageSid,
        usedTemplate: true,
        fallbackUsed: fallbackTemplateKey
      };
    }

    // Si el fallback también falla, intentar el ultimo recurso (ERROR_FALLBACK)
    if (fallbackTemplateKey !== 'ERROR_FALLBACK') {
      this.logger.warn(`Fallback ${fallbackTemplateKey} also failed, trying ERROR_FALLBACK`);
      
      const errorFallbackVars = FALLBACK_VARIABLES['ERROR_FALLBACK'] || {
        '1': 'Error del sistema',
        '2': 'Contactar soporte'
      };

      const finalResult = await this.sendPrimaryTemplate(context.phoneNumber, 'ERROR_FALLBACK', errorFallbackVars);
      
      return {
        success: finalResult.success,
        messageSid: finalResult.messageSid,
        usedTemplate: true,
        fallbackUsed: 'ERROR_FALLBACK',
        error: finalResult.success ? undefined : 'All templates failed including error fallback'
      };
    }

    return {
      success: false,
      usedTemplate: true,
      error: `Fallback template ${fallbackTemplateKey} also failed`
    };
  }

  /**
   * Prepara variables apropiadas para el template de fallback
   */
  private prepareFallbackVariables(
    fallbackTemplateKey: string,
    originalVariables: TemplateVariable,
    context: ConversationContext
  ): TemplateVariable {
    
    // Usar variables predefinidas como base
    const baseVariables = FALLBACK_VARIABLES[fallbackTemplateKey] || {};
    
    // Personalizar según el tipo de fallback
    switch (fallbackTemplateKey) {
      case 'WELCOME_MULTI_AGENT':
        return {
          '1': originalVariables['1'] || 'Usuario',
          '2': originalVariables['storeId'] || context.storeId || 'Tu Tienda'
        };
        
      case 'DAILY_SUMMARY':
        return {
          '1': originalVariables['1'] || context.storeId || 'Tu Tienda',
          '2': originalVariables['2'] || '$0',
          '3': originalVariables['3'] || '0',
          '4': originalVariables['4'] || 'Sin datos disponibles'
        };
        
      case 'ERROR_FALLBACK':
        return {
          '1': 'Sistema temporalmente no disponible',
          '2': 'Intentar nuevamente o contactar soporte'
        };
        
      case 'STOCK_CRITICAL_ALERT':
        return {
          '1': originalVariables['1'] || 'Producto sin especificar',
          '2': originalVariables['2'] || '0',
          '3': originalVariables['3'] || 'Verificar inmediatamente'
        };
        
      default:
        // Para otros fallbacks, intentar reutilizar variables originales
        return { ...baseVariables, ...originalVariables };
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
    fallbackChainLength: number;
    missingContentSids: string[];
  }> {
    // Verificar ContentSIDs faltantes
    const missingContentSids: string[] = [];
    Object.entries(CONTENT_SID_ENV_MAPPING).forEach(([templateKey, envVar]) => {
      if (!process.env[envVar]) {
        missingContentSids.push(envVar);
      }
    });

    return {
      templatesAvailable: Object.keys(FINI_TEMPLATE_CONFIGS).length,
      agentsSupported: Object.keys(AGENT_TEMPLATE_MAPPING).length,
      messageTypeSupported: ['proactive', 'notification', 'welcome', 'contextSwitch', 'error', 'multiAgent'],
      fallbackChainLength: Object.keys(TEMPLATE_FALLBACK_CHAIN).length,
      missingContentSids
    };
  }

  /**
   * Método de testing para verificar que el sistema de fallbacks funciona
   */
  async testFallbackSystem(
    phoneNumber: string,
    storeId: string
  ): Promise<{
    success: boolean;
    results: Array<{
      templateKey: string;
      primaryResult: boolean;
      fallbackUsed?: string;
      error?: string;
    }>;
  }> {
    
    const context: ConversationContext = {
      phoneNumber,
      storeId,
      userId: 'test-user',
      lastMessageAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago to force template usage
    };

    const results: Array<{
      templateKey: string;
      primaryResult: boolean;
      fallbackUsed?: string;
      error?: string;
    }> = [];

    // Test algunos templates clave
    const testTemplates = [
      { agent: 'analytics' as AgentType, type: 'proactive' as MessageType },
      { agent: 'stock_manager' as AgentType, type: 'notification' as MessageType },
      { agent: 'marketing' as AgentType, type: 'proactive' as MessageType }
    ];

    for (const test of testTemplates) {
      const templateKey = this.getTemplateKey(test.agent, test.type);
      
      if (!templateKey) {
        results.push({
          templateKey: `${test.agent}_${test.type}`,
          primaryResult: false,
          error: 'Template key not found'
        });
        continue;
      }

      // Variables de prueba
      const testVariables: TemplateVariable = {
        '1': 'Test Store',
        '2': 'Test Data',
        '3': 'Test Value'
      };

      try {
        const result = await this.sendAgentTemplate(context, test.agent, test.type, testVariables);
        
        results.push({
          templateKey,
          primaryResult: result.success,
          fallbackUsed: result.fallbackUsed,
          error: result.error
        });
      } catch (error) {
        results.push({
          templateKey,
          primaryResult: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const allSuccessful = results.every(r => r.primaryResult);

    return {
      success: allSuccessful,
      results
    };
  }

  /**
   * Obtiene información de debugging sobre templates disponibles
   */
  async getTemplateDebugInfo(): Promise<{
    templateMappings: Record<string, string>;
    fallbackChain: Record<string, string>;
    environmentVariables: Record<string, boolean>;
  }> {
    const environmentVariables: Record<string, boolean> = {};
    
    Object.entries(CONTENT_SID_ENV_MAPPING).forEach(([templateKey, envVar]) => {
      environmentVariables[envVar] = !!process.env[envVar];
    });

    return {
      templateMappings: CONTENT_SID_ENV_MAPPING,
      fallbackChain: TEMPLATE_FALLBACK_CHAIN,
      environmentVariables
    };
  }
}

// Export singleton instance
export const smartTemplateService = new SmartTemplateService();

// Export types for use in other modules
export type { ConversationContext, TemplateVariable, MessageType }; 