/**
 * Twilio Content Template Builder API Integration
 * Based on: https://www.twilio.com/docs/content
 */

import twilio from 'twilio';

export interface ContentTemplateConfig {
  friendlyName: string;
  language: string;
  variables?: Record<string, string>;
  types: {
    'twilio/text': {
      body: string;
    };
  };
}

export interface WhatsAppApprovalRequest {
  name: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  contentSid: string;
  allow_category_change?: boolean;
}

export interface TemplateStatus {
  sid: string;
  friendlyName: string;
  language: string;
  status: 'approved' | 'pending' | 'rejected' | 'draft';
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// CONFIGURACIÓN COMPLETA MULTI-AGENTE
// ==========================================
export const FINI_TEMPLATE_CONFIGS = {
  // ============= AUTENTICACIÓN =============
  OTP_VERIFICATION: {
    friendlyName: 'fini_otp_verification_v4',
    language: 'es',
    category: 'AUTHENTICATION' as const,
    variables: {
      '1': 'Código OTP (6 dígitos)',
      '2': 'Minutos de expiración'
    },
    content: {
      body: '🔐 *Código de Verificación Fini AI*\n\nTu código es: {{1}}\n\n⏰ Expira en {{2}} minutos.\n\n⚠️ No compartas este código.'
    }
  },

  // ============= ANALYTICS AGENT =============
  ANALYTICS_PROACTIVE: {
    friendlyName: 'fini_analytics_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Ventas del período',
      '3': 'Número de pedidos',
      '4': 'Tendencia (↗️ ↘️ ➡️)'
    },
    content: {
      body: '📊 *Reporte de Ventas - {{1}}*\n\n💰 Ventas: {{2}}\n🛒 Pedidos: {{3}}\n📈 Tendencia: {{4}}\n\n¿Querés un análisis más detallado de tu performance?'
    }
  },

  ANALYTICS_NOTIFICATION: {
    friendlyName: 'fini_analytics_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Métrica afectada',
      '2': 'Cambio detectado',
      '3': 'Recomendación'
    },
    content: {
      body: '📈 *Alerta de Performance*\n\n📊 {{1}}: {{2}}\n💡 Recomendación: {{3}}\n\n¿Analizamos juntos qué está pasando?'
    }
  },

  // ============= CUSTOMER SERVICE AGENT =============
  CUSTOMER_SERVICE_PROACTIVE: {
    friendlyName: 'fini_customer_service_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Consultas pendientes',
      '3': 'Tiempo promedio de respuesta'
    },
    content: {
      body: '🎧 *Centro de Atención - {{1}}*\n\n📋 Consultas pendientes: {{2}}\n⏱️ Tiempo promedio: {{3}}\n\n¿Te ayudo a revisar las consultas de tus clientes?'
    }
  },

  CUSTOMER_SERVICE_NOTIFICATION: {
    friendlyName: 'fini_customer_service_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre del cliente',
      '2': 'Tipo de consulta',
      '3': 'Prioridad (URGENTE/NORMAL)'
    },
    content: {
      body: '🚨 *Consulta {{3}}*\n\n👤 Cliente: {{1}}\n❓ Tipo: {{2}}\n\n¿La atendemos ahora para mantener la satisfacción?'
    }
  },

  // ============= MARKETING AGENT =============
  MARKETING_PROACTIVE: {
    friendlyName: 'fini_marketing_proactive_v4',
    language: 'es',
    category: 'MARKETING' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Oportunidad detectada',
      '3': 'Potencial de impacto'
    },
    content: {
      body: '🚀 *Oportunidad de Marketing - {{1}}*\n\n💡 Detecté: {{2}}\n📈 Impacto potencial: {{3}}\n\n¿Querés que te cuente cómo aprovechar esta oportunidad?'
    }
  },

  MARKETING_NOTIFICATION: {
    friendlyName: 'fini_marketing_notification_v4',
    language: 'es',
    category: 'MARKETING' as const,
    variables: {
      '1': 'Tendencia detectada',
      '2': 'Acción recomendada',
      '3': 'Ventana de tiempo'
    },
    content: {
      body: '💡 *Trend Alert*\n\n🔥 Tendencia: {{1}}\n🎯 Acción: {{2}}\n⏰ Ventana: {{3}}\n\n¿Aprovechamos esta tendencia YA?'
    }
  },

  // ============= STOCK MANAGER AGENT =============
  STOCK_MANAGER_PROACTIVE: {
    friendlyName: 'fini_stock_manager_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Productos con stock bajo',
      '3': 'Productos de alto movimiento'
    },
    content: {
      body: '📦 *Gestión de Inventario - {{1}}*\n\n⚠️ Stock bajo: {{2}} productos\n🔥 Alto movimiento: {{3}}\n\n¿Revisamos juntos tu estrategia de reposición?'
    }
  },

  STOCK_CRITICAL_ALERT: {
    friendlyName: 'fini_stock_critical_alert_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre del producto',
      '2': 'Stock restante',
      '3': 'Días hasta agotamiento'
    },
    content: {
      body: '🚨 *STOCK CRÍTICO*\n\n📦 Producto: {{1}}\n⚠️ Quedan: {{2}} unidades\n⏰ Se agota en: {{3}} días\n\n¿Hacemos el pedido AHORA para evitar quiebre?'
    }
  },

  // ============= FINANCIAL ADVISOR AGENT =============
  FINANCIAL_ADVISOR_PROACTIVE: {
    friendlyName: 'fini_financial_advisor_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Margen de ganancia actual',
      '3': 'Recomendación principal'
    },
    content: {
      body: '💰 *Análisis Financiero - {{1}}*\n\n📊 Margen actual: {{2}}\n💡 Recomendación: {{3}}\n\n¿Te ayudo a optimizar tu rentabilidad?'
    }
  },

  FINANCIAL_ADVISOR_NOTIFICATION: {
    friendlyName: 'fini_financial_advisor_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Métrica financiera',
      '2': 'Cambio porcentual',
      '3': 'Acción recomendada'
    },
    content: {
      body: '📊 *Alerta Financiera*\n\n💰 {{1}}: {{2}}\n🎯 Acción: {{3}}\n\n¿Revisamos tu estrategia financiera?'
    }
  },

  // ============= BUSINESS CONSULTANT AGENT =============
  BUSINESS_CONSULTANT_PROACTIVE: {
    friendlyName: 'fini_business_consultant_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Oportunidad estratégica',
      '3': 'Próximo paso sugerido'
    },
    content: {
      body: '🎯 *Consultoría Estratégica - {{1}}*\n\n🔍 Identificé: {{2}}\n📋 Siguiente paso: {{3}}\n\n¿Planificamos juntos tu crecimiento?'
    }
  },

  BUSINESS_CONSULTANT_NOTIFICATION: {
    friendlyName: 'fini_business_consultant_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Insight estratégico',
      '2': 'Impacto en el negocio',
      '3': 'Urgencia (ALTA/MEDIA/BAJA)'
    },
    content: {
      body: '💡 *Insight Estratégico*\n\n🎯 {{1}}\n📈 Impacto: {{2}}\n⚡ Urgencia: {{3}}\n\n¿Desarrollamos esta estrategia?'
    }
  },

  // ============= PRODUCT MANAGER AGENT =============
  PRODUCT_MANAGER_PROACTIVE: {
    friendlyName: 'fini_product_manager_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Producto destacado',
      '3': 'Oportunidad de optimización'
    },
    content: {
      body: '🛍️ *Gestión de Productos - {{1}}*\n\n⭐ Producto estrella: {{2}}\n🔧 Optimización: {{3}}\n\n¿Analizamos juntos tu catálogo completo?'
    }
  },

  PRODUCT_MANAGER_NOTIFICATION: {
    friendlyName: 'fini_product_manager_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Producto o categoría',
      '2': 'Cambio detectado',
      '3': 'Acción sugerida'
    },
    content: {
      body: '⭐ *Producto Destacado*\n\n🛍️ {{1}}: {{2}}\n💡 Sugerencia: {{3}}\n\n¿Optimizamos tu estrategia de productos?'
    }
  },

  // ============= OPERATIONS MANAGER AGENT =============
  OPERATIONS_MANAGER_PROACTIVE: {
    friendlyName: 'fini_operations_manager_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Proceso a optimizar',
      '3': 'Ahorro potencial estimado'
    },
    content: {
      body: '⚙️ *Optimización Operativa - {{1}}*\n\n🔧 Proceso: {{2}}\n💵 Ahorro potencial: {{3}}\n\n¿Mejoramos juntos tu eficiencia operativa?'
    }
  },

  OPERATIONS_MANAGER_NOTIFICATION: {
    friendlyName: 'fini_operations_manager_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Proceso ineficiente detectado',
      '2': 'Impacto en costos',
      '3': 'Solución propuesta'
    },
    content: {
      body: '🔧 *Proceso Ineficiente*\n\n⚠️ Detectado: {{1}}\n💰 Impacto: {{2}}\n✅ Solución: {{3}}\n\n¿Implementamos la mejora?'
    }
  },

  // ============= SALES COACH AGENT =============
  SALES_COACH_PROACTIVE: {
    friendlyName: 'fini_sales_coach_proactive_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Tasa de conversión actual',
      '3': 'Oportunidad de mejora'
    },
    content: {
      body: '🏆 *Coaching de Ventas - {{1}}*\n\n📈 Conversión actual: {{2}}\n🎯 Mejora sugerida: {{3}}\n\n¿Te ayudo a aumentar tus ventas?'
    }
  },

  SALES_COACH_NOTIFICATION: {
    friendlyName: 'fini_sales_coach_notification_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Oportunidad de venta detectada',
      '2': 'Potencial de ingresos',
      '3': 'Estrategia sugerida'
    },
    content: {
      body: '📈 *Oportunidad de Venta*\n\n💰 {{1}}\n💵 Potencial: {{2}}\n🎯 Estrategia: {{3}}\n\n¿Aprovechamos esta oportunidad?'
    }
  },

  // ============= TEMPLATES DE SISTEMA =============
  CONTEXT_SWITCH: {
    friendlyName: 'fini_context_switch_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Agente anterior',
      '2': 'Nuevo agente especialista',
      '3': 'Resumen de transición'
    },
    content: {
      body: '🔄 *Cambio de Especialista*\n\nDe: {{1}} → {{2}}\n📋 {{3}}\n\n¿Continuamos con el nuevo enfoque?'
    }
  },

  MULTI_AGENT_QUERY: {
    friendlyName: 'fini_multi_agent_query_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Especialistas involucrados',
      '2': 'Tema principal de consulta',
      '3': 'Plan de coordinación'
    },
    content: {
      body: '🤝 *Consulta Multi-Especialista*\n\nEquipo: {{1}}\n🎯 Tema: {{2}}\n📋 Plan: {{3}}\n\n¿Coordinamos la respuesta integral?'
    }
  },

  WELCOME_MULTI_AGENT: {
    friendlyName: 'fini_welcome_multi_agent_v4',
    language: 'es',
    category: 'MARKETING' as const,
    variables: {
      '1': 'Nombre del usuario',
      '2': 'Nombre de la tienda'
    },
    content: {
      body: '👋 ¡Hola {{1}}!\n\n🤖 Soy Fini AI, tu asistente inteligente para {{2}}.\n\n🚀 Tengo 9 especialistas para ayudarte:\n📊 Analytics y reportes\n💰 Asesoría financiera\n📦 Gestión de inventario\n🎯 Consultoría estratégica\n🛍️ Gestión de productos\n⚙️ Optimización operativa\n🏆 Coaching de ventas\n🎧 Atención al cliente\n🚀 Marketing inteligente\n\n¿En qué especialista necesitás ayuda hoy?'
    }
  },

  ERROR_FALLBACK: {
    friendlyName: 'fini_error_fallback_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Tipo de error o problema',
      '2': 'Alternativa sugerida'
    },
    content: {
      body: '⚠️ *Oops, algo no salió como esperaba*\n\n🔧 Problema: {{1}}\n💡 Alternativa: {{2}}\n\n¿Probamos de otra manera o preferís que te contacte un humano?'
    }
  },

  DAILY_SUMMARY: {
    friendlyName: 'fini_daily_summary_v4',
    language: 'es',
    category: 'UTILITY' as const,
    variables: {
      '1': 'Nombre de la tienda',
      '2': 'Ventas del día',
      '3': 'Pedidos del día',
      '4': 'Producto más vendido'
    },
    content: {
      body: '📋 *Resumen Diario - {{1}}*\n\n💰 Ventas: {{2}}\n🛒 Pedidos: {{3}}\n🏆 Top producto: {{4}}\n\n¿Querés el análisis completo del día o algún insight específico?'
    }
  }
} as const;

// Mapping de tipos de agente a templates
export const AGENT_TEMPLATE_MAPPING = {
  analytics: {
    proactive: 'ANALYTICS_PROACTIVE',
    notification: 'ANALYTICS_NOTIFICATION',
    welcome: 'WELCOME_MULTI_AGENT'
  },
  customer_service: {
    proactive: 'CUSTOMER_SERVICE_PROACTIVE', 
    notification: 'CUSTOMER_SERVICE_NOTIFICATION',
    welcome: 'WELCOME_MULTI_AGENT'
  },
  marketing: {
    proactive: 'MARKETING_PROACTIVE',
    notification: 'MARKETING_NOTIFICATION', 
    welcome: 'WELCOME_MULTI_AGENT'
  },
  stock_manager: {
    proactive: 'STOCK_MANAGER_PROACTIVE',
    notification: 'STOCK_CRITICAL_ALERT',
    welcome: 'WELCOME_MULTI_AGENT'
  },
  financial_advisor: {
    proactive: 'FINANCIAL_ADVISOR_PROACTIVE',
    notification: 'FINANCIAL_ADVISOR_NOTIFICATION',
    welcome: 'WELCOME_MULTI_AGENT'
  },
  business_consultant: {
    proactive: 'BUSINESS_CONSULTANT_PROACTIVE',
    notification: 'BUSINESS_CONSULTANT_NOTIFICATION',
    welcome: 'WELCOME_MULTI_AGENT'
  },
  product_manager: {
    proactive: 'PRODUCT_MANAGER_PROACTIVE',
    notification: 'PRODUCT_MANAGER_NOTIFICATION', 
    welcome: 'WELCOME_MULTI_AGENT'
  },
  operations_manager: {
    proactive: 'OPERATIONS_MANAGER_PROACTIVE',
    notification: 'OPERATIONS_MANAGER_NOTIFICATION',
    welcome: 'WELCOME_MULTI_AGENT'
  },
  sales_coach: {
    proactive: 'SALES_COACH_PROACTIVE',
    notification: 'SALES_COACH_NOTIFICATION',
    welcome: 'WELCOME_MULTI_AGENT'
  }
} as const;

export class TwilioContentTemplateService {
  private client: twilio.Twilio;

  constructor(accountSid: string, authToken: string) {
    this.client = twilio(accountSid, authToken);
  }

  async createContentTemplate(config: ContentTemplateConfig) {
    try {
      console.log(`[CONTENT_API] Creating template: ${config.friendlyName}`);

      // Note: Using HTTP API directly since SDK create method isn't available in current version
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const formData = new URLSearchParams({
        FriendlyName: config.friendlyName,
        Language: config.language,
        'Types[twilio/text][body]': config.types['twilio/text'].body
      });

      // Add variables if provided
      if (config.variables) {
        Object.entries(config.variables).forEach(([key, value]) => {
          formData.append(`Variables[${key}]`, value);
        });
      }

      const response = await fetch(`https://content.twilio.com/v1/Content`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const content = await response.json();

      return {
        success: true,
        contentSid: content.sid
      };
    } catch (error) {
      console.error('[ERROR] Failed to create content template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async submitForWhatsAppApproval(request: WhatsAppApprovalRequest) {
    try {
      console.log(`[CONTENT_API] Submitting for WhatsApp approval: ${request.name}`);

      // Note: Using HTTP API directly since SDK approval methods aren't available in current version
      const accountSid = process.env.TWILIO_ACCOUNT_SID!;
      const authToken = process.env.TWILIO_AUTH_TOKEN!;
      const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

      const formData = new URLSearchParams({
        Name: request.name,
        Category: request.category,
        AllowCategoryChange: (request.allow_category_change || false).toString()
      });

      const response = await fetch(`https://content.twilio.com/v1/Content/${request.contentSid}/ApprovalRequests`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const approvalRequest = await response.json();

      return {
        success: true,
        approvalRequestSid: approvalRequest.sid
      };
    } catch (error) {
      console.error('[ERROR] Failed to submit for approval:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async listContentTemplates() {
    try {
      console.log('[CONTENT_API] Fetching all content templates...');
      const contents = await this.client.content.v1.contents.list({ limit: 50 });
      
      const templates: TemplateStatus[] = contents.map(content => ({
        sid: content.sid,
        friendlyName: content.friendlyName || 'Unknown',
        language: content.language || 'unknown',
        status: this.getApprovalStatus(content),
        variables: content.variables || {},
        createdAt: content.dateCreated?.toISOString() || '',
        updatedAt: content.dateUpdated?.toISOString() || ''
      }));

      return { success: true, templates };
    } catch (error) {
      console.error('[ERROR] Failed to list templates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Delete a content template
   */
  async deleteTemplate(contentSid: string) {
    try {
      console.log(`[CONTENT_API] Deleting template: ${contentSid}`);

      await this.client.content.v1.contents(contentSid).remove();

      console.log(`[CONTENT_API] Template deleted successfully`);

      return { success: true };
    } catch (error) {
      console.error('[ERROR] Failed to delete template:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create all Fini AI templates at once
   */
  async createAllFiniTemplates() {
    console.log('[CONTENT_API] Creating all Fini AI templates...');

    const results: Record<string, { contentSid?: string; error?: string; approvalSid?: string }> = {};
    let created = 0;
    let failed = 0;
    let submitted = 0;

    for (const [templateKey, templateConfig] of Object.entries(FINI_TEMPLATE_CONFIGS)) {
      try {
        // Create content template
        const contentResult = await this.createContentTemplate({
          friendlyName: templateConfig.friendlyName,
          language: templateConfig.language,
          variables: templateConfig.variables,
          types: {
            'twilio/text': {
              body: templateConfig.content.body
            }
          }
        });

        if (contentResult.success && contentResult.contentSid) {
          results[templateKey] = { contentSid: contentResult.contentSid };
          created++;

          // Submit for WhatsApp approval
          const approvalResult = await this.submitForWhatsAppApproval({
            name: templateConfig.friendlyName,
            category: templateConfig.category,
            contentSid: contentResult.contentSid,
            allow_category_change: false
          });

          if (approvalResult.success && approvalResult.approvalRequestSid) {
            results[templateKey].approvalSid = approvalResult.approvalRequestSid;
            submitted++;
          }

          // Wait a bit between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));

        } else {
          results[templateKey] = { error: contentResult.error };
          failed++;
        }

      } catch (error) {
        results[templateKey] = { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        failed++;
      }
    }

    console.log(`[CONTENT_API] Template creation complete: ${created} created, ${failed} failed, ${submitted} submitted for approval`);

    return {
      success: failed === 0,
      results,
      summary: { created, failed, submitted }
    };
  }

  private getApprovalStatus(content: any): 'approved' | 'pending' | 'rejected' | 'draft' {
    if (!content.approvalRequests || content.approvalRequests.length === 0) {
      return 'draft';
    }
    const latestRequest = content.approvalRequests[content.approvalRequests.length - 1];
    return latestRequest.status || 'pending';
  }
}

export function createContentTemplateService(): TwilioContentTemplateService {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required');
  }

  return new TwilioContentTemplateService(accountSid, authToken);
}
