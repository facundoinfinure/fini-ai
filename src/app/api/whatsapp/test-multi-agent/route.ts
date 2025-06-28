import { NextRequest, NextResponse } from 'next/server';
import { smartTemplateService } from '@/lib/integrations/whatsapp/smart-template-service';
import type { AgentType } from '@/lib/agents/types';
import type { ConversationContext, MessageType } from '@/lib/integrations/whatsapp/smart-template-service';

interface TestRequest {
  phoneNumber: string;
  storeId: string;
  userId: string;
  agentType: AgentType;
  messageType: MessageType;
  testData?: {
    title?: string;
    details?: string;
    action?: string;
    storeName?: string;
    userName?: string;
  };
  simulateOutsideWindow?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as TestRequest;
    const { 
      phoneNumber, 
      storeId, 
      userId, 
      agentType, 
      messageType, 
      testData = {},
      simulateOutsideWindow = false
    } = body;

    // Validar datos requeridos
    if (!phoneNumber || !storeId || !userId || !agentType || !messageType) {
      return NextResponse.json({
        success: false,
        error: 'Faltan datos requeridos: phoneNumber, storeId, userId, agentType, messageType'
      }, { status: 400 });
    }

    // Crear contexto de conversación
    const context: ConversationContext = {
      phoneNumber,
      storeId, 
      userId,
      currentAgent: agentType,
      // Simular si está fuera de ventana de 24hrs
      lastMessageAt: simulateOutsideWindow 
        ? new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 horas atrás
        : new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutos atrás
      conversationHistory: []
    };

    // Generar variables según el tipo de mensaje y agente
    const variables = generateTestVariables(agentType, messageType, testData);
    const fallbackMessage = generateFallbackMessage(agentType, messageType, testData);

    console.log('[MULTI-AGENT-TEST] Enviando mensaje de prueba:', {
      agentType,
      messageType,
      phoneNumber,
      simulateOutsideWindow,
      variables
    });

    // Enviar mensaje usando el servicio inteligente
    const result = await smartTemplateService.sendSmartAgentMessage(
      context,
      agentType,
      messageType,
      variables,
      fallbackMessage
    );

    return NextResponse.json({
      success: result.success,
      messageSid: result.messageSid,
      usedTemplate: result.usedTemplate,
      agentType,
      messageType,
      isOutsideWindow: simulateOutsideWindow,
      variables,
      error: result.error
    });

  } catch (error) {
    console.error('[ERROR] Multi-agent test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido en test multi-agente'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Obtener estadísticas del servicio
    const stats = await smartTemplateService.getServiceStats();
    
    // Ejemplos de uso
    const examples = {
      analytics_proactive: {
        agentType: 'analytics',
        messageType: 'proactive',
        testData: {
          storeName: 'Mi Tienda Demo',
          title: '$15,000',
          details: '45',
          action: '↗️'
        }
      },
      stock_critical: {
        agentType: 'stock_manager',
        messageType: 'notification',
        testData: {
          title: 'iPhone 15 Pro',
          details: '2',
          action: '1'
        }
      },
      financial_alert: {
        agentType: 'financial_advisor',
        messageType: 'notification',
        testData: {
          title: 'Margen de ganancia',
          details: '↘️ -5%',
          action: 'Revisar precios'
        }
      },
      context_switch: {
        agentType: 'marketing',
        messageType: 'contextSwitch',
        testData: {
          title: 'Análisis de ventas',
          details: 'El usuario quiere estrategias de marketing',
          action: 'Desarrollar campaña promocional'
        }
      }
    };

    return NextResponse.json({
      success: true,
      stats,
      examples,
      availableAgents: [
        'analytics', 'customer_service', 'marketing',
        'stock_manager', 'financial_advisor', 'business_consultant',
        'product_manager', 'operations_manager', 'sales_coach'
      ],
      availableMessageTypes: [
        'proactive', 'notification', 'welcome', 'contextSwitch', 'error', 'multiAgent'
      ],
      testInstructions: {
        basicTest: 'POST con phoneNumber, storeId, userId, agentType, messageType',
        templateTest: 'Agregar simulateOutsideWindow: true para forzar uso de template',
        customData: 'Usar testData para personalizar variables del mensaje'
      }
    });

  } catch (error) {
    console.error('[ERROR] Get multi-agent test info failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo info de test'
    }, { status: 500 });
  }
}

/**
 * Genera variables de test según el tipo de agente y mensaje
 */
function generateTestVariables(
  agentType: AgentType, 
  messageType: MessageType, 
  testData: any
): Record<string, string> {
  
  const baseVariables = {
    '1': testData.title || 'Dato de prueba 1',
    '2': testData.details || 'Dato de prueba 2', 
    '3': testData.action || 'Acción de prueba'
  };

  switch (agentType) {
    case 'analytics':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.title || '$12,500',
        '3': testData.details || '38',
        '4': testData.action || '↗️'
      };

    case 'stock_manager':
      if (messageType === 'notification') {
        return {
          '1': testData.title || 'Producto Estrella',
          '2': testData.details || '3',
          '3': testData.action || '2'
        };
      }
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.details || '5',
        '3': testData.action || '12'
      };

    case 'financial_advisor':
      return {
        '1': testData.title || 'Margen promedio',
        '2': testData.details || '35%',
        '3': testData.action || 'Optimizar precios'
      };

    case 'marketing':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.title || 'Campaña de verano',
        '3': testData.details || '+25% ventas esperadas'
      };

    case 'customer_service':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.details || '8',
        '3': testData.action || '2.5 horas'
      };

    case 'business_consultant':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.title || 'Expansión a nueva categoría',
        '3': testData.action || 'Análisis de mercado'
      };

    case 'product_manager':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.title || 'Zapatillas deportivas',
        '3': testData.action || 'Optimizar descripción'
      };

    case 'operations_manager':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.title || 'Proceso de envíos',
        '3': testData.details || '$200/mes'
      };

    case 'sales_coach':
      return {
        '1': testData.storeName || 'Mi Tienda Demo',
        '2': testData.details || '3.2%',
        '3': testData.action || 'Mejorar producto descriptions'
      };

    default:
      return baseVariables;
  }
}

/**
 * Genera mensaje de fallback para freeform
 */
function generateFallbackMessage(
  agentType: AgentType, 
  messageType: MessageType, 
  testData: any
): string {
  
  const agentEmojis = {
    analytics: '📊',
    customer_service: '🎧',
    marketing: '🚀',
    stock_manager: '📦',
    financial_advisor: '💰',
    business_consultant: '🎯',
    product_manager: '🛍️',
    operations_manager: '⚙️',
    sales_coach: '🏆'
  };

  const emoji = agentEmojis[agentType] || '🤖';
  const storeName = testData.storeName || 'tu tienda';

  switch (messageType) {
    case 'proactive':
      return `${emoji} ¡Hola! Tengo información importante sobre ${storeName}. ${testData.title || 'Dato importante'}: ${testData.details || 'detalles aquí'}. ¿Te interesa que profundicemos?`;

    case 'notification':
      return `${emoji} 🔔 Alerta para ${storeName}: ${testData.title || 'Situación'} - ${testData.details || 'descripción'}. ${testData.action || '¿Revisamos juntos?'}`;

    case 'welcome':
      return `${emoji} ¡Hola ${testData.userName || 'Usuario'}! Soy tu especialista en ${agentType}. Estoy aquí para ayudarte con ${storeName}. ¿En qué puedo asistirte hoy?`;

    case 'contextSwitch':
      return `${emoji} 🔄 Perfecto, ahora voy a ayudarte como especialista en ${agentType}. ${testData.details || 'Cambiando enfoque'}. ¿Continuamos?`;

    case 'error':
      return `${emoji} ⚠️ Ups, algo no salió como esperaba: ${testData.title || 'Error temporal'}. ${testData.action || 'Probemos de otra manera'} o ¿preferís hablar con un humano?`;

    case 'multiAgent':
      return `${emoji} 🤝 Consulta colaborativa: necesitamos coordinar múltiples especialistas para ${testData.title || 'tu consulta'}. Plan: ${testData.action || 'análisis integral'}`;

    default:
      return `${emoji} Mensaje de prueba del sistema multi-agente. Agente: ${agentType}, Tipo: ${messageType}`;
  }
} 