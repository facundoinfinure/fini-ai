/**
 * Agent Configuration
 * Central configuration for the multi-agent system
 */

import type { AgentConfig, AgentTypeConfig } from './types';

export const AGENT_CONFIG: AgentConfig = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  enableRAG: true,
  ragThreshold: 0.7,
  fallbackEnabled: true,
  debugMode: process.env.NODE_ENV === 'development',
};

export const ORCHESTRATOR_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 10,
  prompts: {
    systemPrompt: `Eres el Orchestrador de Fini AI, un sistema multi-agente para analytics de Tienda Nube por WhatsApp.

Tu trabajo es:
1. Analizar el mensaje del usuario
2. Determinar qué agente especializado debe manejar la consulta
3. Enrutar al agente apropiado
4. Proporcionar respuestas de fallback si es necesario

Agentes disponibles:
- Analytics Agent: Datos de ventas, productos, estadísticas, reportes, métricas
- Customer Service Agent: Atención al cliente, consultas generales, soporte
- Marketing Agent: Estrategias, ideas de marketing, análisis de competencia

Responde SIEMPRE en español de manera profesional y amigable.`,
    userPrompt: `Analiza este mensaje del usuario: "{userMessage}"

Contexto de la tienda: {context}

Determina cuál agente debe manejar esta consulta y por qué.`,
    contextPrompt: `Información relevante de la tienda: {ragContext}`,
    fallbackPrompt: `No pude determinar el agente apropiado. Proporcionaré una respuesta general útil.`,
    examples: [
      {
        userInput: "¿Cuánto vendí ayer?",
        expectedResponse: "Analytics Agent - consulta de datos de ventas",
        reasoning: "Pregunta directa sobre métricas de ventas"
      },
      {
        userInput: "Un cliente se queja del producto",
        expectedResponse: "Customer Service Agent - atención al cliente",
        reasoning: "Problema de servicio al cliente que requiere atención personalizada"
      },
      {
        userInput: "Ideas para aumentar ventas",
        expectedResponse: "Marketing Agent - estrategias de marketing",
        reasoning: "Solicita estrategias y ideas de marketing"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.7,
    maxResults: 5
  },
  responseConfig: {
    maxLength: 500,
    tone: 'professional',
    language: 'es'
  }
};

export const ANALYTICS_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 8,
  prompts: {
    systemPrompt: `Eres el Analytics Agent de Fini AI, especialista en datos y análisis de Tienda Nube.

Tus especialidades:
- Análisis de ventas y conversiones
- Métricas de productos y inventario
- Reportes de performance
- Tendencias y forecasting
- KPIs del negocio
- Análisis de clientes y segmentación

Siempre:
- Usa datos específicos cuando estén disponibles
- Proporciona insights accionables
- Incluye comparaciones y contexto
- Sugiere próximos pasos
- Responde en español de manera clara y profesional`,
    userPrompt: `El usuario pregunta: "{userMessage}"

Datos disponibles de la tienda: {context}

Proporciona un análisis detallado y insights valiosos.`,
    contextPrompt: `Datos relevantes: {ragContext}`,
    fallbackPrompt: `No tengo suficientes datos para esta consulta específica, pero puedo ayudarte con información general sobre analytics.`,
    examples: [
      {
        userInput: "¿Cuáles son mis productos más vendidos?",
        expectedResponse: "Te muestro tus top productos con datos de ventas y recomendaciones",
        reasoning: "Análisis de productos con datos específicos"
      },
      {
        userInput: "¿Cómo van las ventas este mes?",
        expectedResponse: "Análisis completo de ventas mensuales con comparaciones",
        reasoning: "Reporte de performance con contexto temporal"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.7,
    maxResults: 10
  },
  responseConfig: {
    maxLength: 800,
    tone: 'professional',
    language: 'es'
  }
};

export const CUSTOMER_SERVICE_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 9,
  prompts: {
    systemPrompt: `Eres el Customer Service Agent de Fini AI, especialista en atención al cliente para Tienda Nube.

Tus especialidades:
- Resolver consultas y problemas de clientes
- Información sobre pedidos y envíos
- Políticas de devolución y cambios
- Soporte técnico básico
- Escalamiento de problemas complejos
- Atención personalizada y empática

Siempre:
- Sé empático y comprensivo
- Busca soluciones prácticas
- Proporciona información clara
- Escalas cuando sea necesario
- Mantén un tono amigable y profesional
- Responde en español`,
    userPrompt: `El usuario tiene esta consulta: "{userMessage}"

Información del cliente/pedido: {context}

Proporciona atención personalizada y resuelve la consulta.`,
    contextPrompt: `Información relevante: {ragContext}`,
    fallbackPrompt: `Entiendo tu consulta. Aunque no tengo todos los detalles específicos, te ayudaré de la mejor manera posible.`,
    examples: [
      {
        userInput: "Un cliente no recibió su pedido",
        expectedResponse: "Investigaré el estado del envío y encontraré una solución",
        reasoning: "Problema de envío que requiere investigación y solución"
      },
      {
        userInput: "¿Cómo funciona la garantía?",
        expectedResponse: "Te explico nuestra política de garantía paso a paso",
        reasoning: "Consulta sobre políticas que requiere información clara"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.6,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 600,
    tone: 'friendly',
    language: 'es'
  }
};

export const MARKETING_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 7,
  prompts: {
    systemPrompt: `Eres el Marketing Agent de Fini AI, especialista en estrategias de marketing para Tienda Nube.

Tus especialidades:
- Estrategias de marketing digital
- Análisis de competencia
- Ideas para campañas promocionales
- Optimización de conversiones
- Marketing de contenidos
- Segmentación de audiencias
- Tendencias del mercado

Siempre:
- Propón estrategias específicas y accionables
- Usa datos del negocio para personalizar recomendaciones
- Incluye ejemplos prácticos
- Considera el presupuesto y recursos
- Mantén un enfoque en ROI
- Responde en español de manera creativa pero profesional`,
    userPrompt: `El usuario solicita: "{userMessage}"

Datos del negocio: {context}

Proporciona estrategias de marketing personalizadas y accionables.`,
    contextPrompt: `Contexto del negocio: {ragContext}`,
    fallbackPrompt: `Te ayudo con estrategias de marketing generales que puedes adaptar a tu negocio.`,
    examples: [
      {
        userInput: "¿Cómo aumentar las ventas en Navidad?",
        expectedResponse: "Plan completo de marketing navideño con estrategias específicas",
        reasoning: "Estrategia estacional que requiere planificación integral"
      },
      {
        userInput: "Ideas para promocionar productos nuevos",
        expectedResponse: "Estrategias de lanzamiento con tácticas específicas",
        reasoning: "Campaña de producto que necesita enfoque personalizado"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.6,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 700,
    tone: 'professional',
    language: 'es'
  }
};

// Routing keywords for agent selection
export const ROUTING_KEYWORDS = {
  analytics: [
    // Ventas y facturación
    'ventas', 'vendido', 'vendí', 'vendimos', 'vender', 'venta', 'vendió',
    'gané', 'ganamos', 'ganancia', 'ganancias', 'ingresos', 'facturación', 'facturé',
    'recaudé', 'cobramos', 'dinero', 'plata', 'pesos', 'dólares', 'revenue',
    
    // Datos y métricas  
    'datos', 'estadísticas', 'métricas', 'números', 'cifras', 'stats',
    'reporte', 'reportes', 'report', 'análisis', 'analítica', 'analytics',
    'dashboard', 'informe', 'informes', 'kpi', 'indicadores',
    
    // Productos y performance
    'productos', 'producto', 'artículo', 'más vendidos', 'top productos', 'populares',
    'mejor', 'mejores', 'éxito', 'exitoso', 'stock', 'inventario', 'cantidad',
    'conversión', 'conversiones', 'ROI', 'rendimiento', 'performance',
    
    // Preguntas cuantitativas
    'cuánto', 'cuántos', 'cuántas', 'qué cantidad', 'total', 'suma',
    'porcentaje', 'tasa', 'ratio', 'número de', 'cantidad de',
    
    // Tiempo y comparaciones
    'ayer', 'hoy', 'mes', 'semana', 'día', 'período', 'último', 'anterior',
    'comparar', 'comparación', 'vs', 'contra', 'diferencia',
    'tendencia', 'evolución', 'histórico', 'forecasting', 'predicción',
    
    // Clientes y tráfico
    'clientes', 'usuarios', 'visitantes', 'tráfico', 'compradores',
    'nuevos clientes', 'recurrentes', 'visitas', 'sesiones'
  ],
  
  customer_service: [
    // Atención al cliente
    'cliente', 'clientes', 'usuario', 'usuarios', 'comprador', 'compradores',
    'atención', 'servicio', 'soporte', 'ayuda', 'asistencia', 'support',
    
    // Problemas y quejas
    'problema', 'problemas', 'queja', 'quejas', 'reclamo', 'reclamos',
    'inconveniente', 'dificultad', 'error', 'falla', 'defecto', 'defectuoso',
    'no funciona', 'no sirve', 'no anda', 'roto', 'dañado', 'mal estado',
    
    // Pedidos y órdenes
    'pedido', 'pedidos', 'orden', 'órdenes', 'compra', 'compras', 'order',
    'estado del pedido', 'seguimiento', 'tracking', 'dónde está', 'cuándo llega',
    
    // Envíos y entregas
    'envío', 'envíos', 'entrega', 'entregas', 'shipping', 'delivery',
    'no llegó', 'no recibió', 'no recibí', 'llegó tarde', 'retraso', 'demora',
    'correo', 'transportista', 'paquete', 'encomienda',
    
    // Devoluciones y cambios
    'devolución', 'devolver', 'cambio', 'cambiar', 'reembolso', 'reintegro',
    'cancelar', 'anular', 'modificar', 'alterar', 'devuelve',
    
    // Pagos y facturación
    'pago', 'pagos', 'cobro', 'cobraron', 'factura', 'recibo', 'comprobante',
    'tarjeta', 'débito', 'crédito', 'transferencia', 'efectivo', 'billing',
    
    // Políticas y garantías
    'política', 'políticas', 'garantía', 'warranty', 'términos', 'condiciones',
    'reglas', 'normas', 'procedimiento',
    
    // Estados emocionales
    'molesto', 'enojado', 'frustrado', 'insatisfecho', 'contento', 'feliz',
    'confundido', 'preocupado', 'urgente', 'importante'
  ],
  
  marketing: [
    // Marketing general
    'marketing', 'promoción', 'promocionar', 'promover', 'campaña', 'campañas',
    'publicidad', 'publicitar', 'anuncio', 'anuncios', 'ads', 'advertising',
    
    // Estrategias y planificación
    'estrategia', 'estrategias', 'plan', 'planes', 'planning', 'planificar',
    'táctica', 'tácticas', 'método', 'métodos', 'técnica', 'técnicas',
    'approach', 'concepto', 'propuesta', 'idea', 'ideas',
    
    // Crecimiento y objetivos
    'aumentar', 'incrementar', 'crecer', 'crecimiento', 'subir', 'mejorar',
    'optimizar', 'potenciar', 'impulsar', 'boost', 'expandir', 'escalar',
    'maximizar', 'más ventas', 'vender más', 'ganar más',
    
    // Competencia y mercado
    'competencia', 'competidor', 'competidores', 'rival', 'rivales',
    'mercado', 'market', 'nicho', 'segmento', 'target', 'audiencia',
    'público', 'benchmarking', 'análisis competitivo', 'posicionamiento',
    
    // Digital y redes sociales
    'redes sociales', 'social media', 'facebook', 'instagram', 'whatsapp',
    'twitter', 'tiktok', 'youtube', 'linkedin', 'digital', 'online',
    'contenido', 'content', 'posts', 'stories', 'viral', 'engagement',
    'SEO', 'SEM', 'Google Ads', 'Facebook Ads', 'email marketing',
    
    // Promociones y ofertas
    'descuento', 'descuentos', 'oferta', 'ofertas', 'rebaja', 'rebajas',
    'cupón', 'cupones', 'promo', 'promocional', 'especial', 'liquidación',
    '2x1', 'gratis', 'free', 'bonus', 'regalo', 'Black Friday', 'Cyber Monday',
    
    // Branding y comunicación
    'marca', 'brand', 'branding', 'imagen', 'identidad', 'reconocimiento',
    'awareness', 'visibilidad', 'presencia', 'mensaje', 'comunicar',
    'narrativa', 'storytelling', 'copy', 'copywriting', 'slogan',
    
    // Conversión y resultados
    'convertir', 'conversión', 'leads', 'clientes potenciales', 'prospectos',
    'roi', 'retorno', 'beneficio', 'resultado', 'impacto', 'efectividad',
    'funnel', 'embudo', 'captación', 'fidelización', 'retención',
    
    // Eventos y temporadas
    'temporada', 'estacional', 'navidad', 'año nuevo', 'san valentín',
    'día de la madre', 'día del padre', 'verano', 'invierno', 'trending'
  ]
};

// Confidence thresholds for routing decisions
export const ROUTING_THRESHOLDS = {
  high_confidence: 0.8,
  medium_confidence: 0.6,
  low_confidence: 0.4,
  fallback_threshold: 0.3
};

// Agent priorities (higher number = higher priority)
export const AGENT_PRIORITIES = {
  orchestrator: 10,
  customer_service: 9,
  analytics: 8,
  marketing: 7
} as const; 