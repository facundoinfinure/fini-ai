/**
 * Template Configurations for Multi-Agent System (JavaScript version)
 * Usado por scripts de Node.js para gestión de templates
 */

const FINI_TEMPLATE_CONFIGS = {
  // ============= AUTENTICACIÓN =============
  OTP_VERIFICATION: {
    friendlyName: 'fini_otp_verification_v4',
    language: 'es',
    category: 'AUTHENTICATION',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'MARKETING',
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
    category: 'MARKETING',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
    category: 'MARKETING',
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
    category: 'UTILITY',
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
    category: 'UTILITY',
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
};

module.exports = {
  FINI_TEMPLATE_CONFIGS
}; 