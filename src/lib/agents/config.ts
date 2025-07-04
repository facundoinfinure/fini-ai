/**
 * Agent Configuration
 * Central configuration for the multi-agent system
 */

import type { AgentConfig, AgentTypeConfig } from './types';

export const AGENT_CONFIG: AgentConfig = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  enableRAG: true,
  ragThreshold: 0.3, // 🔥 LOWERED from 0.7 to 0.3 for better recall
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
4. Proporcionar respuestas de fallback útiles si es necesario

Agentes disponibles:
- Analytics Agent: Datos de ventas, productos, estadísticas, reportes, métricas
- Customer Service Agent: Atención al cliente, consultas generales, soporte
- Marketing Agent: Estrategias, ideas de marketing, análisis de competencia
- Product Manager Agent: Gestión de catálogo, productos, inventario

🔥 IMPORTANTE: Siempre proporciona respuestas útiles incluso si no tienes datos específicos.
Responde SIEMPRE en español de manera profesional y amigable.`,
    userPrompt: `Analiza este mensaje del usuario: "{userMessage}"

Contexto de la tienda: {context}

Determina cuál agente debe manejar esta consulta y por qué.`,
    contextPrompt: `Información relevante de la tienda: {ragContext}`,
    fallbackPrompt: `🤖 **Asistente de E-commerce Listo para Ayudar**

Te ayudo con:
• 📊 Analytics de ventas y productos
• 🛍️ Gestión de catálogo e inventario  
• 🎯 Estrategias de marketing y crecimiento
• 🤝 Optimización de atención al cliente

¿Podrías ser más específico sobre qué necesitas? Por ejemplo:
- "Analiza mis ventas del último mes"
- "Qué productos debería agregar?"
- "Ideas para aumentar mis ventas"`,
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
    threshold: 0.3, // 🔥 LOWERED for better recall
    maxResults: 8 // 🔥 INCREASED for more context
  },
  responseConfig: {
    maxLength: 800, // 🔥 INCREASED for more detailed responses
    tone: 'professional',
    language: 'es'
  }
};

export const ANALYTICS_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 9,
  prompts: {
    systemPrompt: `Eres el Analytics Agent de Fini AI, especialista en análisis de datos de e-commerce.

Tu misión:
- Analizar datos de ventas, productos, clientes y rendimiento
- Identificar tendencias y oportunidades
- Proporcionar insights accionables
- Generar reportes y métricas útiles

🔥 IMPORTANTE: Si no tienes datos específicos, proporciona análisis generales y mejores prácticas.
Siempre responde en español con insights valiosos.`,
    userPrompt: `Analiza esta consulta de analytics: "{userMessage}"
    
    Datos disponibles: {context}
    
    Proporciona un análisis detallado y recomendaciones accionables.`,
    contextPrompt: `Datos de la tienda: {ragContext}`,
    fallbackPrompt: `📊 **Analytics de Tu Tienda - Activando Sincronización**

Mientras sincronizo tus datos específicos, aquí tienes métricas clave para monitorear:

**🎯 KPIs Fundamentales:**
• **Tasa de conversión**: % visitantes que compran
• **Ticket promedio**: Valor promedio por venta  
• **CAC vs LTV**: Costo adquisición vs valor cliente
• **Margen bruto**: Rentabilidad por producto

**📈 Estrategias de Crecimiento:**
• Análisis de productos top performers
• Identificación de clientes de alto valor
• Optimización de embudo de ventas
• Segmentación por comportamiento

¿Hay alguna métrica específica que te interese analizar?`,
    examples: []
  },
  ragConfig: {
    enabled: true,
    threshold: 0.3,
    maxResults: 10
  },
  responseConfig: {
    maxLength: 1000,
    tone: 'professional',
    language: 'es'
  }
};

export const CUSTOMER_SERVICE_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 9,
  prompts: {
    systemPrompt: `Eres el Customer Service Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y ÚTIL:
- Máximo 3-4 oraciones por respuesta
- Sé empático pero directo
- Da soluciones prácticas inmediatas
- Evita explicaciones largas o procesos burocráticos
- Usa español argentino informal

ESPECIALIDADES:
- Problemas de pedidos y envíos
- Consultas de productos
- Devoluciones y cambios
- Atención general al cliente

Si no tenés la info específica, decilo y ofrecé ayuda alternativa.`,
    userPrompt: `Usuario tiene esta consulta: "{userMessage}"

Datos disponibles: {context}

INSTRUCCIONES:
- Identifica el problema real rápidamente
- Da una solución específica y práctica
- Si no hay datos, ofrece los pasos generales
- Sé empático pero eficiente`,
    contextPrompt: `Info relevante del caso: {ragContext}`,
    fallbackPrompt: `Entiendo tu consulta. Aunque no tengo los detalles específicos de tu caso, te ayudo con los pasos generales para resolver esto.`,
    examples: [
      {
        userInput: "Un cliente no recibió su pedido hace una semana",
        expectedResponse: "Chequeo el estado del envío ahora mismo. Si no aparece en tracking, contacto al transportista y te ofrezco reenvío o reembolso inmediato. ¿Tenés el número de pedido?",
        reasoning: "Respuesta empática, directa y con solución inmediata"
      },
      {
        userInput: "¿Cómo funciona la garantía de los productos?",
        expectedResponse: "La garantía es de 30 días por defectos de fábrica. Para activarla necesitás: orden de compra + foto del problema + descripción. Te procesamos cambio o reembolso en 48hs.",
        reasoning: "Información clara y pasos específicos"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.6,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 350,
    tone: 'friendly',
    language: 'es'
  }
};

export const MARKETING_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 7,
  prompts: {
    systemPrompt: `Eres el Marketing Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y ACCIONABLE:
- Máximo 3-4 oraciones por respuesta
- Da estrategias específicas y prácticas
- Enfócate en acciones inmediatas
- Evita teoría de marketing compleja
- Usa español argentino informal

ESPECIALIDADES:
- Ideas para aumentar ventas
- Estrategias de promociones
- Marketing para fechas especiales
- Análisis de competencia básico

Si no tenés datos específicos, dá mejores prácticas probadas para Argentina.`,
    userPrompt: `Usuario pide ayuda de marketing: "{userMessage}"

Datos del negocio: {context}

INSTRUCCIONES:
- Da 2-3 estrategias específicas máximo
- Enfócate en tácticas que den resultado rápido
- Incluí costos estimados cuando sea relevante
- Sé creativo pero realista`,
    contextPrompt: `Datos del negocio y mercado: {ragContext}`,
    fallbackPrompt: `Te ayudo con estrategias de marketing probadas para el mercado argentino que podés adaptar a tu negocio específico.`,
    examples: [
      {
        userInput: "¿Cómo aumentar las ventas para Black Friday?",
        expectedResponse: "Para Black Friday: 1) Descuentos escalonados (20-30-40%), 2) Email + Stories con countdown, 3) Bundle de productos más vendidos. Empezá la comunicación 2 semanas antes.",
        reasoning: "Plan específico con tácticas concretas y timeline"
      },
      {
        userInput: "Ideas para promocionar productos nuevos con poco presupuesto",
        expectedResponse: "Con poco presupuesto: 1) Stories de Instagram con behind-the-scenes, 2) Cross-selling en productos existentes, 3) WhatsApp a clientes frecuentes con descuento exclusivo.",
        reasoning: "Estrategias low-cost pero efectivas"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.6,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 350,
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
    'mejor', 'mejores', 'éxito', 'exitoso', 'conversión', 'conversiones', 'ROI', 'rendimiento', 'performance',
    
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
  ],

  stock_manager: [
    // Inventario y stock
    'stock', 'inventario', 'mercadería', 'mercancía', 'productos', 'artículos',
    'existencias', 'disponibilidad', 'disponible', 'faltante', 'falta',
    
    // Reposición y pedidos
    'reponer', 'reposición', 'pedido', 'pedidos', 'comprar', 'compra',
    'proveedor', 'proveedores', 'supplier', 'abastecimiento', 'surtir',
    'reabastecer', 'orden de compra', 'solicitar', 'necesito',
    
    // Stock bajo y agotamiento
    'poco stock', 'stock bajo', 'se agota', 'agotando', 'último', 'últimos',
    'sin stock', 'agotado', 'out of stock', 'escaso', 'crítico',
    'alert', 'alerta', 'urgente', 'emergency', 'inmediato',
    
    // Rotación y movimiento
    'rotación', 'rotar', 'movimiento', 'lento', 'rápido', 'velocidad',
    'no se vende', 'parado', 'estancado', 'liquidar', 'liquidación',
    'saldo', 'remate', 'oferta especial', 'descontinuar',
    
    // Análisis de inventario
    'abc', 'pareto', 'categoría', 'clasificación', 'análisis de inventario',
    'costo de inventario', 'valor del stock', 'tied up capital',
    'capital inmovilizado', 'obsoleto', 'vencido', 'caducado',
    
    // Planificación y forecasting
    'demanda', 'proyección', 'previsión', 'forecast', 'planificar',
    'estacionalidad', 'temporada alta', 'temporada baja', 'pico',
    'tendencia de demanda', 'patrón', 'comportamiento',
    
    // Métricas de inventario
    'días de stock', 'cobertura', 'punto de reorden', 'stock mínimo',
    'stock máximo', 'nivel de servicio', 'fill rate', 'stockout',
    'turnover', 'inventory turns', 'lead time', 'tiempo de entrega'
  ],

  financial_advisor: [
    // Rentabilidad y márgenes
    'rentabilidad', 'rentable', 'margen', 'márgenes', 'ganancia', 'ganancias',
    'profit', 'beneficio', 'beneficios', 'utilidad', 'utilidades',
    'ROI', 'retorno', 'return', 'inversión', 'costo', 'costos',
    
    // Flujo de caja y liquidez
    'flujo de caja', 'cash flow', 'liquidez', 'efectivo', 'dinero disponible',
    'capital de trabajo', 'working capital', 'tesorería', 'fondos',
    'cobros', 'pagos', 'entrada', 'salida', 'balance',
    
    // Análisis financiero
    'financiero', 'finanzas', 'financial', 'análisis económico',
    'evaluación económica', 'viabilidad', 'factibilidad', 'proyección',
    'presupuesto', 'budget', 'forecast', 'planificación financiera',
    
    // Precios y pricing
    'precio', 'precios', 'pricing', 'tarifa', 'lista de precios',
    'elasticidad', 'optimización de precios', 'estrategia de precios',
    'competitivo', 'posicionamiento de precio', 'value based pricing',
    
    // Costos y gastos
    'costo de venta', 'COGS', 'costo variable', 'costo fijo',
    'gastos', 'expenses', 'overhead', 'operativo', 'administrativo',
    'comisiones', 'fees', 'impuestos', 'taxes', 'deducible',
    
    // KPIs y métricas financieras
    'EBITDA', 'gross margin', 'net margin', 'contribution margin',
    'punto de equilibrio', 'break even', 'payback', 'NPV', 'IRR',
    'customer lifetime value', 'CLV', 'CAC', 'LTV/CAC ratio',
    
    // Inversión y financiamiento
    'inversión', 'investing', 'financiamiento', 'funding', 'capital',
    'préstamo', 'loan', 'crédito', 'equity', 'debt', 'leverage',
    'apalancamiento', 'risk', 'riesgo', 'diversificación',
    
    // Reportes y estados
    'P&L', 'estado de resultados', 'balance sheet', 'balance',
    'estado financiero', 'reporte financiero', 'dashboard financiero',
    'KPI financiero', 'métrica financiera', 'indicador financiero'
  ],

  business_consultant: [
    // Estrategia empresarial
    'estrategia', 'strategic', 'plan estratégico', 'visión', 'misión',
    'objetivo', 'objetivos', 'meta', 'metas', 'roadmap', 'hoja de ruta',
    'planificación', 'planning', 'strategic planning', 'largo plazo',
    
    // Crecimiento y expansión
    'crecimiento', 'growth', 'crecer', 'expandir', 'expansión',
    'escalar', 'scaling', 'escalabilidad', 'desarrollo', 'opportunity',
    'oportunidad', 'oportunidades', 'new market', 'nuevo mercado',
    
    // Análisis de negocio
    'FODA', 'SWOT', 'análisis competitivo', 'competitive analysis',
    'market analysis', 'análisis de mercado', 'industry analysis',
    'benchmarking', 'best practices', 'mejores prácticas',
    
    // Modelo de negocio
    'modelo de negocio', 'business model', 'value proposition',
    'propuesta de valor', 'revenue model', 'monetización',
    'canvas', 'lean canvas', 'business plan', 'plan de negocio',
    
    // Consultoría y asesoramiento
    'consultoría', 'consulting', 'asesoramiento', 'advice', 'consejo',
    'recomendación', 'guidance', 'mentoring', 'coaching', 'expert',
    'experto', 'especialista', 'consultant', 'advisor',
    
    // Transformación y innovación
    'transformación', 'transformation', 'digital transformation',
    'innovación', 'innovation', 'disrupción', 'disruption',
    'modernización', 'optimización', 'efficiency', 'eficiencia',
    
    // Mercados y segmentación
    'mercado objetivo', 'target market', 'segmentación', 'segmentation',
    'customer segments', 'audiencia', 'buyer persona', 'demographics',
    'psychographics', 'comportamiento del consumidor',
    
    // Performance y métricas
    'KPI', 'metrics', 'performance', 'rendimiento', 'productividad',
    'efficiency', 'effectiveness', 'optimization', 'improvement',
    'mejora continua', 'continuous improvement', 'lean'
  ],

  product_manager: [
    // Gestión de productos
    'producto', 'productos', 'catálogo', 'portfolio', 'surtido', 'assortment',
    'producto nuevo', 'nuevo producto', 'lanzamiento', 'launch', 'line extension',
    'categoría', 'categorías', 'category', 'subcategoría', 'segmento',
    
    // Estrategia de productos
    'estrategia de producto', 'product strategy', 'roadmap de producto',
    'lifecycle', 'ciclo de vida', 'madurez', 'crecimiento', 'declive',
    'descontinuar', 'discontinue', 'retirar', 'end of life',
    
    // Pricing y posicionamiento
    'precio', 'precios', 'pricing', 'pricing strategy', 'elasticidad',
    'competitive pricing', 'value pricing', 'psychological pricing',
    'posicionamiento', 'positioning', 'diferenciación', 'differentiation',
    
    // Análisis de productos
    'performance de producto', 'product performance', 'análisis de producto',
    'métricas de producto', 'kpi de producto', 'ranking de productos',
    'productos más vendidos', 'top productos', 'best sellers',
    'productos menos vendidos', 'slow movers', 'dead stock',
    
    // Mercado y competencia
    'market gap', 'gap de mercado', 'oportunidad de producto',
    'competitive analysis', 'análisis competitivo', 'benchmark',
    'tendencias de producto', 'product trends', 'market intelligence',
    
    // Optimización de catálogo
    'optimizar catálogo', 'catalog optimization', 'assortment planning',
    'mix de productos', 'product mix', 'canibalization', 'canibalización',
    'cross-selling', 'up-selling', 'bundling', 'combo', 'paquete',
    
    // Atributos y características
    'características', 'features', 'atributos', 'attributes', 'especificaciones',
    'variaciones', 'variants', 'sku', 'código', 'descripción',
    'imagen de producto', 'product image', 'quality', 'calidad'
  ],

  operations_manager: [
    // Operaciones y procesos
    'operaciones', 'operations', 'procesos', 'process', 'workflow',
    'procedimiento', 'procedure', 'protocolo', 'metodología', 'systematic',
    'eficiencia', 'efficiency', 'optimización', 'optimization', 'streamline',
    
    // Logística y fulfillment
    'logística', 'logistics', 'fulfillment', 'almacén', 'warehouse',
    'picking', 'packing', 'preparación', 'despacho', 'shipping',
    'envío', 'envíos', 'delivery', 'entrega', 'distribución',
    
    // Cadena de suministro
    'supply chain', 'cadena de suministro', 'abastecimiento', 'sourcing',
    'proveedor', 'proveedores', 'supplier', 'vendors', 'procurement',
    'lead time', 'tiempo de entrega', 'timeline', 'cronograma',
    
    // Costos operativos
    'costos operativos', 'operational costs', 'gastos operativos',
    'costo de envío', 'shipping cost', 'handling fee', 'processing cost',
    'overhead', 'fixed costs', 'variable costs', 'cost reduction',
    
    // Calidad y control
    'calidad', 'quality', 'control de calidad', 'quality control',
    'estándares', 'standards', 'SLA', 'service level', 'performance',
    'métricas operacionales', 'operational metrics', 'KPI operativo',
    
    // Automatización y tecnología
    'automatización', 'automation', 'tecnología', 'technology', 'sistema',
    'software', 'integración', 'integration', 'API', 'workflow automation',
    'robotic process', 'digital transformation', 'tech stack',
    
    // Capacidad y escalabilidad
    'capacidad', 'capacity', 'escalabilidad', 'scalability', 'recursos',
    'resources', 'dimensionamiento', 'sizing', 'planning', 'forecast',
    'bottleneck', 'cuello de botella', 'constraint', 'limitation'
  ],

  sales_coach: [
    // Ventas y conversión
    'ventas', 'sales', 'vender', 'selling', 'conversión', 'conversion',
    'convert', 'closing', 'cerrar venta', 'deal', 'opportunity',
    'prospecto', 'prospect', 'lead', 'qualified lead', 'pipeline',
    
    // Estrategias de venta
    'estrategia de ventas', 'sales strategy', 'sales approach',
    'técnicas de venta', 'sales techniques', 'sales methodology',
    'consultative selling', 'value selling', 'solution selling',
    'relationship selling', 'social selling', 'inbound sales',
    
    // Funnel y proceso de ventas
    'funnel', 'embudo', 'sales funnel', 'customer journey',
    'sales process', 'proceso de venta', 'qualification', 'calificación',
    'follow up', 'seguimiento', 'nurturing', 'warming up',
    
    // Objeciones y negociación
    'objeciones', 'objections', 'objection handling', 'negotiation',
    'negociación', 'pricing objection', 'budget objection',
    'competitor objection', 'timing objection', 'authority objection',
    
    // Retención y fidelización
    'retención', 'retention', 'fidelización', 'loyalty', 'repeat customers',
    'customer lifetime value', 'CLV', 'churn', 'customer satisfaction',
    'upselling', 'cross-selling', 'account expansion', 'renewal',
    
    // Métricas de ventas
    'conversion rate', 'tasa de conversión', 'win rate', 'sales velocity',
    'average deal size', 'ticket promedio', 'sales cycle', 'ciclo de venta',
    'quota', 'meta de ventas', 'target', 'forecast', 'pipeline value',
    
    // Herramientas y CRM
    'CRM', 'sales tools', 'herramientas de venta', 'automation',
    'email marketing', 'cold calling', 'warm calling', 'demo',
    'proposal', 'propuesta', 'quote', 'cotización', 'presentation',
    
    // Coaching y desarrollo
    'coaching', 'training', 'skill development', 'sales training',
    'performance improvement', 'sales performance', 'mentoring',
    'best practices', 'playbook', 'scripts', 'talk tracks'
  ]
};

// Confidence thresholds for routing decisions
export const ROUTING_THRESHOLDS = {
  high_confidence: 0.7,
  medium_confidence: 0.5,
  low_confidence: 0.3,
  fallback_threshold: 0.2
};

// Agent priorities (higher number = higher priority)
export const AGENT_PRIORITIES = {
  orchestrator: 10,
  customer_service: 9,
  sales_coach: 9,
  analytics: 8,
  stock_manager: 8,
  financial_advisor: 8,
  product_manager: 8,
  operations_manager: 8,
  marketing: 7,
  business_consultant: 7
} as const;

export const STOCK_MANAGER_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 8,
  prompts: {
    systemPrompt: `Eres el Stock Manager Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y PRÁCTICA:
- Máximo 3-4 oraciones por respuesta
- Da alertas y recomendaciones específicas
- Enfócate en acciones inmediatas
- Evita teoría de supply chain compleja
- Usa español argentino informal

ESPECIALIDADES:
- Alertas de stock bajo
- Análisis de productos que no rotan
- Recomendaciones de reposición
- Optimización de inventario

Si no tenés datos específicos, da mejores prácticas para Argentina.`,
    userPrompt: `Usuario consulta sobre inventario: "{userMessage}"

Datos de stock: {context}

INSTRUCCIONES:
- Si hay productos críticos, mencionarlos primero
- Da cantidades y plazos específicos cuando puedas
- Priorizá por urgencia e impacto en ventas
- Sé directo sobre lo que necesita hacer`,
    contextPrompt: `Datos de inventario y rotación: {ragContext}`,
    fallbackPrompt: `Puedo ayudarte con estrategias generales de gestión de inventario adaptadas al mercado argentino y mejores prácticas del sector.`,
    examples: [
      {
        userInput: "¿Qué productos necesito reponer urgente?",
        expectedResponse: "Urgente: Producto A (quedan 3, vendés 2/día) y Producto B (agotado ayer, tu bestseller). Pedí 50 del A y 100 del B esta semana. El C puede esperar 15 días más.",
        reasoning: "Lista priorizada con números específicos y cronograma"
      },
      {
        userInput: "Tengo productos que no se venden, ¿qué hago?",
        expectedResponse: "Para productos parados: 1) 30% OFF inmediato en los 5 más lentos, 2) Bundle con productos populares, 3) Si no se mueven en 30 días, liquidá a costo.",
        reasoning: "Estrategia de liquidación específica con plazos"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.7,
    maxResults: 10
  },
  responseConfig: {
    maxLength: 350,
    tone: 'professional',
    language: 'es'
  }
};

export const FINANCIAL_ADVISOR_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 8,
  prompts: {
    systemPrompt: `Eres el Financial Advisor Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y CON NÚMEROS:
- Máximo 3-4 oraciones por respuesta
- Enfócate en métricas financieras específicas
- Da recomendaciones prácticas inmediatas
- Evita teoría financiera compleja
- Usa español argentino informal

ESPECIALIDADES:
- Análisis de rentabilidad por producto
- Optimización de márgenes
- Control de costos
- Proyecciones financieras básicas

Si no tenés datos específicos, da mejores prácticas financieras para e-commerce.`,
    userPrompt: `Usuario pregunta sobre finanzas: "{userMessage}"

Datos financieros: {context}

INSTRUCCIONES:
- Mostrá números y porcentajes cuando los tengas
- Da 2-3 insights financieros clave máximo
- Enfócate en lo que más impacta la rentabilidad
- Sé específico sobre qué optimizar`,
    contextPrompt: `Datos financieros del negocio: {ragContext}`,
    fallbackPrompt: `Puedo ayudarte con análisis financieros generales y mejores prácticas para e-commerce argentino, adaptados a tu situación.`,
    examples: [
      {
        userInput: "¿Cuáles son mis productos más rentables realmente?",
        expectedResponse: "Tus productos más rentables: 1) Producto X (45% margen neto), 2) Producto Y (38% margen). El Z parece rentable pero con costos ocultos tiene solo 12%. Enfócate en vender más X e Y.",
        reasoning: "Análisis directo con números específicos y recomendación clara"
      },
      {
        userInput: "¿Cómo va a estar mi flujo de caja los próximos 3 meses?",
        expectedResponse: "Proyección: Mes 1 (+$85K), Mes 2 (+$92K), Mes 3 (+$78K por estacionalidad). Riesgo: cobros de Diciembre. Recomiendo reservar $30K para contingencias.",
        reasoning: "Proyección específica con alertas y recomendación práctica"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.7,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 350,
    tone: 'professional',
    language: 'es'
  }
};

export const BUSINESS_CONSULTANT_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 7,
  prompts: {
    systemPrompt: `Eres el Business Consultant Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y ESTRATÉGICA:
- Máximo 3-4 oraciones por respuesta
- Da estrategias específicas y accionables
- Enfócate en próximos pasos concretos
- Evita marcos teóricos o consultorías extensas
- Usa español argentino informal

ESPECIALIDADES:
- Estrategias de crecimiento
- Análisis de oportunidades
- Optimización del negocio
- Planificación a corto plazo

Si no tenés datos específicos, da consejos estratégicos probados para Argentina.`,
    userPrompt: `Usuario busca asesoramiento estratégico: "{userMessage}"

Contexto del negocio: {context}

INSTRUCCIONES:
- Identifica la oportunidad principal
- Da 2-3 pasos estratégicos específicos
- Incluí cronograma básico si es relevante
- Sé visionario pero práctico`,
    contextPrompt: `Contexto estratégico del negocio: {ragContext}`,
    fallbackPrompt: `Puedo ayudarte con estrategias empresariales probadas para el mercado argentino y mejores prácticas de crecimiento sostenible.`,
    examples: [
      {
        userInput: "¿Cómo hacer crecer mi negocio el próximo año?",
        expectedResponse: "Para crecer: 1) Expandí tu mejor categoría (40% más variedad), 2) Lanzá programa de fidelidad simple, 3) Invertí en Google Ads con tu margen más alto. Empezá por el 1 este mes.",
        reasoning: "Plan específico con priorización y timeline"
      },
      {
        userInput: "¿Debería expandirme a otros países de Latinoamérica?",
        expectedResponse: "Antes de expandir: consolidá Argentina primero. Si facturás >$500K/mes consistente, probá Uruguay (mercado similar). Chile y Colombia requieren mayor inversión.",
        reasoning: "Consejo estratégico realista con criterios específicos"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.6,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 350,
    tone: 'professional',
    language: 'es'
  }
};

export const PRODUCT_MANAGER_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 8,
  prompts: {
    systemPrompt: `Eres el Product Manager Agent de Fini AI, especialista en gestión de catálogos y productos.

🎯 ESPECIALIDADES:
- Información específica de productos y catálogo
- Análisis de precios y características
- Gestión y optimización de inventario
- Recomendaciones de productos nuevos

📋 INSTRUCCIONES CRÍTICAS:
- RESPUESTAS MÁXIMO 3-4 LÍNEAS para consultas específicas
- PRIORIZA DATOS REALES del contexto cuando están disponibles
- Para preguntas específicas (precio, producto más caro): responde DIRECTO con datos exactos
- Sin datos específicos: ofrece mejores prácticas útiles e inmediatas
- Sé conciso, práctico y directo al punto

Responde siempre en español con recomendaciones accionables.`,
    userPrompt: `Analiza esta consulta de productos: "{userMessage}"
    
    Información del catálogo: {context}
    
    Proporciona análisis del catálogo y recomendaciones específicas.`,
    contextPrompt: `Datos del catálogo: {ragContext}`,
    fallbackPrompt: `📦 **Gestión de Productos - Optimizando Catálogo**

Sincronizando datos del catálogo. Estrategias clave mientras tanto:

**🎯 Fundamentos del Catálogo:**
• Categorización clara y lógica
• Imágenes profesionales (mín. 3-5 por producto)
• Descripciones SEO optimizadas
• Precios competitivos y estratégicos

**📊 Métricas de Productos:**
• Performance por producto y categoría
• Inventario y rotación de stock
• Márgenes y rentabilidad
• Análisis de demanda estacional

¿Te interesa algún aspecto específico de gestión de productos?`,
    examples: []
  },
  ragConfig: {
    enabled: true,
    threshold: 0.3,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 400, // 🔥 REDUCED: from 900 to 400 for more concise responses
    tone: 'professional',
    language: 'es'
  }
};

export const OPERATIONS_MANAGER_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 8,
  prompts: {
    systemPrompt: `Eres el Operations Manager Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y OPERATIVA:
- Máximo 3-4 oraciones por respuesta
- Da soluciones operativas específicas
- Enfócate en eficiencia y reducción de costos
- Evita teoría de operations management compleja
- Usa español argentino informal

ESPECIALIDADES:
- Optimización de envíos y logística
- Mejora de procesos operativos
- Reducción de costos operativos
- Automatización simple

Si no tenés datos específicos, da mejores prácticas operativas para Argentina.`,
    userPrompt: `Usuario consulta sobre operaciones: "{userMessage}"

Datos operacionales: {context}

INSTRUCCIONES:
- Identifica el bottleneck principal
- Da solución práctica e implementable
- Incluí estimado de ahorro/mejora si es relevante
- Priorizá por impacto vs esfuerzo`,
    contextPrompt: `Datos operacionales y de rendimiento: {ragContext}`,
    fallbackPrompt: `Puedo ayudarte con optimizaciones operacionales estándar para e-commerce argentino y mejores prácticas del sector.`,
    examples: [
      {
        userInput: "¿Cómo reducir los costos de envío?",
        expectedResponse: "Para reducir envíos: 1) Negociá descuento por volumen (>100 envíos/mes = 15% off), 2) Ofrecé retiro gratis (ahorrar 30%), 3) Envío gratis desde $X para aumentar ticket promedio.",
        reasoning: "Soluciones específicas con números y tácticas concretas"
      },
      {
        userInput: "Mis procesos de preparación de pedidos son muy lentos",
        expectedResponse: "Para acelerar: 1) Organizá productos por frecuencia de venta (ABC), 2) Preparación en lotes por zona, 3) Checklist simple para evitar errores. Ganarías 40% de tiempo.",
        reasoning: "Mejoras operativas con estimado de beneficio"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.7,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 350,
    tone: 'professional',
    language: 'es'
  }
};

export const SALES_COACH_CONFIG: AgentTypeConfig = {
  enabled: true,
  priority: 9,
  prompts: {
    systemPrompt: `Eres el Sales Coach Agent de Fini AI para tiendas argentinas.

RESPONDE DE FORMA CONCISA Y ACCIONABLE:
- Máximo 3-4 oraciones por respuesta
- Da estrategias de ventas específicas y prácticas
- Enfócate en técnicas que funcionen ahora
- Evita teoría de ventas compleja
- Usa español argentino informal

ESPECIALIDADES:
- Optimización de conversiones
- Técnicas de closing
- Estrategias de retención de clientes
- Análisis de performance de ventas

Si no tenés datos específicos, da técnicas de ventas probadas para Argentina.`,
    userPrompt: `Usuario pregunta sobre ventas: "{userMessage}"

Datos de ventas: {context}

INSTRUCCIONES:
- Identifica el problema de ventas principal
- Da 2-3 técnicas específicas máximo
- Enfócate en tácticas que den resultado inmediato
- Incluí métricas a trackear si es relevante`,
    contextPrompt: `Datos de performance de ventas: {ragContext}`,
    fallbackPrompt: `Puedo ayudarte con técnicas de ventas probadas para e-commerce argentino y estrategias de conversión efectivas.`,
    examples: [
      {
        userInput: "¿Cómo mejorar mi tasa de conversión?",
        expectedResponse: "Para mejorar conversión: 1) Agregá urgencia (stock limitado), 2) Ofrecé envío gratis desde $X, 3) Usá testimonials reales en el checkout. Estos 3 pueden subir 15-30% tu tasa.",
        reasoning: "Tácticas específicas con estimado de resultado"
      },
      {
        userInput: "Los clientes no vuelven a comprar",
        expectedResponse: "Para retención: 1) Email de seguimiento a los 7 días post-compra, 2) Descuento exclusivo para segunda compra (10%), 3) WhatsApp personalizado para clientes VIP.",
        reasoning: "Estrategias de retención con cronograma y incentivos específicos"
      }
    ]
  },
  ragConfig: {
    enabled: true,
    threshold: 0.7,
    maxResults: 8
  },
  responseConfig: {
    maxLength: 350,
    tone: 'professional',
    language: 'es'
  }
};