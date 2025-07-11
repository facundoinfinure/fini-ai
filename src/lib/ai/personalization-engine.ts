/**
 * Motor de Personalización Avanzada para Fini AI
 * Combina recomendaciones, contenido personalizado y auto-optimización
 */

import { logger } from '../logger';
import { recommendationEngine, UserProfile } from './recommendation-engine';
import { predictiveAnalytics } from './predictive-analytics';
import { performanceManager } from '../performance/performance-manager';

// Tipos para personalización
export interface PersonalizationConfig {
  userId: string;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    currency: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
      frequency: 'immediate' | 'daily' | 'weekly';
    };
  };
  dashboard: {
    layout: 'compact' | 'detailed' | 'minimal';
    widgets: string[];
    primaryMetrics: string[];
    refreshInterval: number;
  };
  ai: {
    recommendationsEnabled: boolean;
    autoOptimization: boolean;
    learningMode: 'conservative' | 'balanced' | 'aggressive';
    privacyLevel: 'strict' | 'balanced' | 'open';
  };
}

export interface PersonalizedDashboard {
  userId: string;
  layout: DashboardLayout;
  widgets: DashboardWidget[];
  insights: PersonalizedInsight[];
  notifications: SmartNotification[];
  quickActions: QuickAction[];
  timestamp: number;
}

export interface DashboardLayout {
  type: 'grid' | 'masonry' | 'list';
  columns: number;
  sections: {
    id: string;
    title: string;
    priority: number;
    widgets: string[];
    collapsed: boolean;
  }[];
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'list' | 'recommendation' | 'insight' | 'action';
  title: string;
  data: any;
  config: {
    size: 'small' | 'medium' | 'large';
    refreshInterval: number;
    interactive: boolean;
    drillDown: boolean;
  };
  personalization: {
    relevanceScore: number;
    userEngagement: number;
    lastInteraction: number;
  };
}

export interface PersonalizedInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'achievement' | 'trend' | 'recommendation';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  actionable: boolean;
  actions: {
    primary: string;
    secondary?: string;
    url?: string;
  };
  metadata: {
    source: string;
    algorithm: string;
    dataPoints: number;
    freshness: number;
  };
}

export interface SmartNotification {
  id: string;
  type: 'alert' | 'reminder' | 'insight' | 'promotion' | 'update';
  title: string;
  message: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  timing: {
    optimal: Date;
    window: { start: Date; end: Date };
    timezone: string;
  };
  personalization: {
    relevanceScore: number;
    deliveryChannel: 'push' | 'email' | 'sms' | 'in-app';
    frequency: number;
  };
  actions: {
    label: string;
    action: string;
    url?: string;
  }[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  category: 'analytics' | 'inventory' | 'marketing' | 'support' | 'settings';
  priority: number;
  usage: {
    count: number;
    lastUsed: number;
    averageTime: number;
  };
}

export interface AutoOptimization {
  type: 'performance' | 'ui' | 'content' | 'notifications' | 'recommendations';
  description: string;
  impact: string;
  confidence: number;
  applied: boolean;
  timestamp: number;
  results?: {
    before: any;
    after: any;
    improvement: number;
  };
}

/**
 * Motor de Personalización Avanzada
 */
export class PersonalizationEngine {
  private static instance: PersonalizationEngine;
  private configs: Map<string, PersonalizationConfig> = new Map();
  private dashboards: Map<string, PersonalizedDashboard> = new Map();
  private optimizations: Map<string, AutoOptimization[]> = new Map();
  private userBehavior: Map<string, any> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PersonalizationEngine {
    if (!PersonalizationEngine.instance) {
      PersonalizationEngine.instance = new PersonalizationEngine();
    }
    return PersonalizationEngine.instance;
  }

  /**
   * Inicializa el motor de personalización
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.info('[PERSONALIZATION] Initializing personalization engine...');
      
      // Inicializar sistemas dependientes
      await recommendationEngine.initialize();
      await predictiveAnalytics.initialize();
      
      // Cargar configuraciones de usuario
      await this.loadUserConfigurations();
      
      // Inicializar dashboards personalizados
      await this.initializePersonalizedDashboards();
      
      // Configurar auto-optimización
      this.setupAutoOptimization();
      
      this.isInitialized = true;
      logger.info('[PERSONALIZATION] Engine initialized successfully');
    } catch (error) {
      logger.error('[PERSONALIZATION] Failed to initialize engine', error);
      throw error;
    }
  }

  /**
   * Carga configuraciones de usuario
   */
  private async loadUserConfigurations(): Promise<void> {
    // Simular carga de configuraciones
    const sampleConfigs = [
      {
        userId: 'user_1',
        preferences: {
          theme: 'dark' as const,
          language: 'es',
          timezone: 'America/Argentina/Buenos_Aires',
          currency: 'ARS',
          notifications: {
            email: true,
            push: true,
            sms: false,
            frequency: 'daily' as const
          }
        },
        dashboard: {
          layout: 'detailed' as const,
          widgets: ['sales-overview', 'top-products', 'recent-orders', 'analytics-summary'],
          primaryMetrics: ['revenue', 'orders', 'conversion-rate'],
          refreshInterval: 300000 // 5 minutos
        },
        ai: {
          recommendationsEnabled: true,
          autoOptimization: true,
          learningMode: 'balanced' as const,
          privacyLevel: 'balanced' as const
        }
      }
    ];

    for (const config of sampleConfigs) {
      this.configs.set(config.userId, config);
    }
  }

  /**
   * Inicializa dashboards personalizados
   */
  private async initializePersonalizedDashboards(): Promise<void> {
    for (const [userId, config] of this.configs) {
      const dashboard = await this.generatePersonalizedDashboard(userId);
      this.dashboards.set(userId, dashboard);
    }
  }

  /**
   * Configura auto-optimización
   */
  private setupAutoOptimization(): void {
    // Ejecutar optimizaciones cada hora
    setInterval(() => {
      this.runAutoOptimizations();
    }, 60 * 60 * 1000);

    // Ejecutar optimización inicial
    setTimeout(() => {
      this.runAutoOptimizations();
    }, 30000);
  }

  /**
   * Genera dashboard personalizado para un usuario
   */
  async generatePersonalizedDashboard(userId: string): Promise<PersonalizedDashboard> {
    const config = this.configs.get(userId);
    if (!config) {
      throw new Error(`User configuration not found: ${userId}`);
    }

    // Generar layout basado en preferencias
    const layout = this.generateDashboardLayout(config);
    
    // Generar widgets personalizados
    const widgets = await this.generatePersonalizedWidgets(userId, config);
    
    // Generar insights personalizados
    const insights = await this.generatePersonalizedInsights(userId);
    
    // Generar notificaciones inteligentes
    const notifications = await this.generateSmartNotifications(userId);
    
    // Generar acciones rápidas
    const quickActions = this.generateQuickActions(userId);

    const dashboard: PersonalizedDashboard = {
      userId,
      layout,
      widgets,
      insights,
      notifications,
      quickActions,
      timestamp: Date.now()
    };

    // Log analytics
    logger.info('[PERSONALIZATION] Dashboard generated', {
      event: 'Personalized Dashboard Generated',
      userId,
      properties: {
        widgetCount: widgets.length,
        insightCount: insights.length,
        notificationCount: notifications.length,
        layout: layout.type
      }
    });

    return dashboard;
  }

  /**
   * Genera layout del dashboard
   */
  private generateDashboardLayout(config: PersonalizationConfig): DashboardLayout {
    const layoutConfigs = {
      compact: { columns: 2, type: 'grid' as const },
      detailed: { columns: 3, type: 'masonry' as const },
      minimal: { columns: 1, type: 'list' as const }
    };

    const layoutConfig = layoutConfigs[config.dashboard.layout];

    return {
      type: layoutConfig.type,
      columns: layoutConfig.columns,
      sections: [
        {
          id: 'overview',
          title: 'Resumen General',
          priority: 1,
          widgets: ['sales-overview', 'key-metrics'],
          collapsed: false
        },
        {
          id: 'analytics',
          title: 'Analytics',
          priority: 2,
          widgets: ['traffic-chart', 'conversion-funnel'],
          collapsed: false
        },
        {
          id: 'recommendations',
          title: 'Recomendaciones',
          priority: 3,
          widgets: ['ai-insights', 'optimization-suggestions'],
          collapsed: config.dashboard.layout === 'minimal'
        },
        {
          id: 'actions',
          title: 'Acciones Rápidas',
          priority: 4,
          widgets: ['quick-actions', 'recent-activity'],
          collapsed: config.dashboard.layout === 'compact'
        }
      ]
    };
  }

  /**
   * Genera widgets personalizados
   */
  private async generatePersonalizedWidgets(userId: string, config: PersonalizationConfig): Promise<DashboardWidget[]> {
    const widgets: DashboardWidget[] = [];

    // Widget de ventas personalizado
    widgets.push({
      id: 'sales-overview',
      type: 'metric',
      title: 'Resumen de Ventas',
      data: {
        current: 15420,
        previous: 12350,
        change: 24.8,
        trend: 'up',
        currency: config.preferences.currency
      },
      config: {
        size: 'large',
        refreshInterval: config.dashboard.refreshInterval,
        interactive: true,
        drillDown: true
      },
      personalization: {
        relevanceScore: 0.95,
        userEngagement: 0.8,
        lastInteraction: Date.now() - 3600000
      }
    });

    // Widget de productos top
    widgets.push({
      id: 'top-products',
      type: 'list',
      title: 'Productos Más Vendidos',
      data: {
        products: [
          { name: 'Producto A', sales: 150, revenue: 4500 },
          { name: 'Producto B', sales: 120, revenue: 3600 },
          { name: 'Producto C', sales: 95, revenue: 2850 }
        ]
      },
      config: {
        size: 'medium',
        refreshInterval: config.dashboard.refreshInterval,
        interactive: true,
        drillDown: true
      },
      personalization: {
        relevanceScore: 0.9,
        userEngagement: 0.7,
        lastInteraction: Date.now() - 7200000
      }
    });

    // Widget de recomendaciones AI
    if (config.ai.recommendationsEnabled) {
      const recommendations = await recommendationEngine.generateRecommendations(userId, 'homepage', 5);
      
      widgets.push({
        id: 'ai-recommendations',
        type: 'recommendation',
        title: 'Recomendaciones IA',
        data: {
          recommendations: recommendations.recommendations.slice(0, 3),
          confidence: recommendations.recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.recommendations.length
        },
        config: {
          size: 'medium',
          refreshInterval: config.dashboard.refreshInterval * 2,
          interactive: true,
          drillDown: false
        },
        personalization: {
          relevanceScore: 0.85,
          userEngagement: 0.6,
          lastInteraction: Date.now() - 1800000
        }
      });
    }

    // Widget de análisis predictivo
    const salesForecast = await predictiveAnalytics.generateSalesForecasting(userId, 7);
    
    widgets.push({
      id: 'sales-forecast',
      type: 'chart',
      title: 'Pronóstico de Ventas (7 días)',
      data: {
        forecast: salesForecast.daily.slice(0, 7),
        confidence: salesForecast.daily.reduce((sum, d) => sum + d.confidence, 0) / salesForecast.daily.length
      },
      config: {
        size: 'large',
        refreshInterval: config.dashboard.refreshInterval * 4,
        interactive: true,
        drillDown: true
      },
      personalization: {
        relevanceScore: 0.8,
        userEngagement: 0.5,
        lastInteraction: Date.now() - 10800000
      }
    });

    return widgets.sort((a, b) => b.personalization.relevanceScore - a.personalization.relevanceScore);
  }

  /**
   * Genera insights personalizados
   */
  private async generatePersonalizedInsights(userId: string): Promise<PersonalizedInsight[]> {
    const insights: PersonalizedInsight[] = [];

    // Insight de oportunidad de ventas
    insights.push({
      id: 'sales-opportunity',
      type: 'opportunity',
      title: 'Oportunidad de Crecimiento Detectada',
      description: 'Tus ventas en la categoría "Electronics" han aumentado 35% esta semana. Considera aumentar el inventario.',
      impact: 'high',
      confidence: 0.87,
      actionable: true,
      actions: {
        primary: 'Ver Análisis Completo',
        secondary: 'Ajustar Inventario',
        url: '/analytics/category/electronics'
      },
      metadata: {
        source: 'predictive_analytics',
        algorithm: 'trend_analysis',
        dataPoints: 150,
        freshness: 0.95
      }
    });

    // Insight de comportamiento de usuario
    const userBehavior = await predictiveAnalytics.predictUserBehavior(userId);
    
    if (userBehavior.churnRisk > 0.7) {
      insights.push({
        id: 'churn-warning',
        type: 'warning',
        title: 'Riesgo de Abandono de Cliente',
        description: `Cliente con ${Math.round(userBehavior.churnRisk * 100)}% de probabilidad de abandono. Considera una oferta personalizada.`,
        impact: 'high',
        confidence: userBehavior.churnRisk,
        actionable: true,
        actions: {
          primary: 'Crear Campaña de Retención',
          secondary: 'Ver Perfil del Cliente',
          url: `/customers/${userId}/retention`
        },
        metadata: {
          source: 'churn_prediction',
          algorithm: 'logistic_regression',
          dataPoints: 50,
          freshness: 0.9
        }
      });
    }

    // Insight de tendencias de mercado
    const marketTrends = await predictiveAnalytics.analyzeMarketTrends(userId);
    
    if (marketTrends.trending.products.length > 0) {
      insights.push({
        id: 'market-trend',
        type: 'trend',
        title: 'Nuevas Tendencias de Mercado',
        description: `${marketTrends.trending.categories.length} categorías están en tendencia. Aprovecha el momento para expandir.`,
        impact: 'medium',
        confidence: 0.75,
        actionable: true,
        actions: {
          primary: 'Ver Tendencias',
          secondary: 'Planificar Inventario',
          url: '/analytics/market-trends'
        },
        metadata: {
          source: 'market_analysis',
          algorithm: 'trend_detection',
          dataPoints: 200,
          freshness: 0.8
        }
      });
    }

    // Insight de logro
    insights.push({
      id: 'achievement',
      type: 'achievement',
      title: '¡Meta Mensual Alcanzada!',
      description: 'Has superado tu meta de ventas mensuales en un 12%. ¡Excelente trabajo!',
      impact: 'medium',
      confidence: 1.0,
      actionable: false,
      actions: {
        primary: 'Ver Detalles',
        url: '/analytics/monthly-report'
      },
      metadata: {
        source: 'goal_tracking',
        algorithm: 'threshold_detection',
        dataPoints: 30,
        freshness: 1.0
      }
    });

    return insights.sort((a, b) => {
      const scoreA = a.confidence * (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1);
      const scoreB = b.confidence * (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1);
      return scoreB - scoreA;
    });
  }

  /**
   * Genera notificaciones inteligentes
   */
  private async generateSmartNotifications(userId: string): Promise<SmartNotification[]> {
    const notifications: SmartNotification[] = [];
    const config = this.configs.get(userId);
    
    if (!config?.preferences.notifications.push) {
      return notifications;
    }

    // Notificación de stock bajo
    notifications.push({
      id: 'low-stock-alert',
      type: 'alert',
      title: 'Stock Bajo Detectado',
      message: '3 productos tienen stock crítico. Revisa tu inventario para evitar pérdida de ventas.',
      priority: 'high',
      timing: {
        optimal: new Date(Date.now() + 1800000), // 30 minutos
        window: {
          start: new Date(Date.now() + 900000), // 15 minutos
          end: new Date(Date.now() + 3600000) // 1 hora
        },
        timezone: config.preferences.timezone
      },
      personalization: {
        relevanceScore: 0.9,
        deliveryChannel: 'push',
        frequency: 1
      },
      actions: [
        { label: 'Ver Inventario', action: 'navigate', url: '/inventory' },
        { label: 'Reabastecer', action: 'quick_restock' }
      ]
    });

    // Notificación de oportunidad de venta
    notifications.push({
      id: 'sales-opportunity',
      type: 'insight',
      title: 'Momento Ideal para Promoción',
      message: 'Tus clientes están más activos ahora. Es el momento perfecto para lanzar una promoción.',
      priority: 'medium',
      timing: {
        optimal: new Date(Date.now() + 7200000), // 2 horas
        window: {
          start: new Date(Date.now() + 3600000), // 1 hora
          end: new Date(Date.now() + 14400000) // 4 horas
        },
        timezone: config.preferences.timezone
      },
      personalization: {
        relevanceScore: 0.75,
        deliveryChannel: 'push',
        frequency: 2
      },
      actions: [
        { label: 'Crear Promoción', action: 'create_promotion' },
        { label: 'Ver Analytics', action: 'navigate', url: '/analytics' }
      ]
    });

    return notifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Genera acciones rápidas personalizadas
   */
  private generateQuickActions(userId: string): QuickAction[] {
    const behavior = this.userBehavior.get(userId) || {};
    
    const actions: QuickAction[] = [
      {
        id: 'view-sales',
        label: 'Ver Ventas',
        icon: 'chart-line',
        action: 'navigate:/analytics/sales',
        category: 'analytics',
        priority: 1,
        usage: {
          count: behavior.salesViewCount || 45,
          lastUsed: Date.now() - 3600000,
          averageTime: 180000
        }
      },
      {
        id: 'add-product',
        label: 'Agregar Producto',
        icon: 'plus',
        action: 'navigate:/products/new',
        category: 'inventory',
        priority: 2,
        usage: {
          count: behavior.addProductCount || 12,
          lastUsed: Date.now() - 86400000,
          averageTime: 300000
        }
      },
      {
        id: 'check-orders',
        label: 'Pedidos Recientes',
        icon: 'shopping-bag',
        action: 'navigate:/orders',
        category: 'analytics',
        priority: 3,
        usage: {
          count: behavior.orderCheckCount || 28,
          lastUsed: Date.now() - 7200000,
          averageTime: 120000
        }
      },
      {
        id: 'customer-support',
        label: 'Soporte a Clientes',
        icon: 'headset',
        action: 'navigate:/support',
        category: 'support',
        priority: 4,
        usage: {
          count: behavior.supportCount || 8,
          lastUsed: Date.now() - 172800000,
          averageTime: 600000
        }
      },
      {
        id: 'marketing-campaign',
        label: 'Nueva Campaña',
        icon: 'megaphone',
        action: 'navigate:/marketing/campaigns/new',
        category: 'marketing',
        priority: 5,
        usage: {
          count: behavior.campaignCount || 5,
          lastUsed: Date.now() - 259200000,
          averageTime: 900000
        }
      }
    ];

    // Ordenar por uso y prioridad
    return actions.sort((a, b) => {
      const scoreA = (a.usage.count * 0.6) + ((6 - a.priority) * 0.4);
      const scoreB = (b.usage.count * 0.6) + ((6 - b.priority) * 0.4);
      return scoreB - scoreA;
    }).slice(0, 4);
  }

  /**
   * Ejecuta optimizaciones automáticas
   */
  private async runAutoOptimizations(): Promise<void> {
    logger.info('[PERSONALIZATION] Running auto-optimizations...');

    for (const [userId, config] of this.configs) {
      if (!config.ai.autoOptimization) continue;

      const optimizations: AutoOptimization[] = [];

      // Optimización de performance
      const performanceMetrics = performanceManager.getMetrics();
      if (performanceMetrics.loadTime > 3000) {
        optimizations.push({
          type: 'performance',
          description: 'Optimizar tiempo de carga del dashboard',
          impact: 'Reducir tiempo de carga en ~40%',
          confidence: 0.8,
          applied: false,
          timestamp: Date.now()
        });
      }

      // Optimización de UI
      const dashboard = this.dashboards.get(userId);
      if (dashboard) {
        const lowEngagementWidgets = dashboard.widgets.filter(w => w.personalization.userEngagement < 0.3);
        if (lowEngagementWidgets.length > 0) {
          optimizations.push({
            type: 'ui',
            description: `Reorganizar ${lowEngagementWidgets.length} widgets con baja interacción`,
            impact: 'Mejorar engagement del dashboard en ~25%',
            confidence: 0.7,
            applied: false,
            timestamp: Date.now()
          });
        }
      }

      // Optimización de notificaciones
      const userNotifications = await this.generateSmartNotifications(userId);
      const highPriorityCount = userNotifications.filter(n => n.priority === 'high' || n.priority === 'urgent').length;
      
      if (highPriorityCount > 3) {
        optimizations.push({
          type: 'notifications',
          description: 'Reducir frecuencia de notificaciones de alta prioridad',
          impact: 'Mejorar experiencia de usuario sin perder información crítica',
          confidence: 0.9,
          applied: false,
          timestamp: Date.now()
        });
      }

      // Aplicar optimizaciones automáticamente si es modo agresivo
      if (config.ai.learningMode === 'aggressive') {
        for (const optimization of optimizations) {
          await this.applyOptimization(userId, optimization);
        }
      }

      this.optimizations.set(userId, optimizations);
    }

    logger.info('[PERSONALIZATION] Auto-optimizations completed');
  }

  /**
   * Aplica una optimización específica
   */
  private async applyOptimization(userId: string, optimization: AutoOptimization): Promise<void> {
    const before = Date.now();

    try {
      switch (optimization.type) {
        case 'performance':
          await this.optimizePerformance(userId);
          break;
        case 'ui':
          await this.optimizeUI(userId);
          break;
        case 'notifications':
          await this.optimizeNotifications(userId);
          break;
      }

      optimization.applied = true;
      optimization.results = {
        before: before,
        after: Date.now(),
        improvement: Math.random() * 0.4 + 0.1 // Simulado
      };

      // Log analytics
      logger.info('[PERSONALIZATION] Auto optimization applied', {
        event: 'Auto Optimization Applied',
        userId,
        properties: {
          type: optimization.type,
          confidence: optimization.confidence,
          improvement: optimization.results.improvement
        }
      });

      logger.info(`[PERSONALIZATION] Applied ${optimization.type} optimization for user ${userId}`);
    } catch (error) {
      logger.error(`[PERSONALIZATION] Failed to apply optimization for user ${userId}`, error);
    }
  }

  /**
   * Optimiza performance para un usuario
   */
  private async optimizePerformance(userId: string): Promise<void> {
    const config = this.configs.get(userId);
    if (!config) return;

    // Aumentar intervalo de refresh para widgets menos importantes
    config.dashboard.refreshInterval = Math.max(config.dashboard.refreshInterval * 1.5, 60000);
    
    // Actualizar configuración
    this.configs.set(userId, config);
  }

  /**
   * Optimiza UI para un usuario
   */
  private async optimizeUI(userId: string): Promise<void> {
    const dashboard = this.dashboards.get(userId);
    if (!dashboard) return;

    // Reorganizar widgets por engagement
    dashboard.widgets.sort((a, b) => b.personalization.userEngagement - a.personalization.userEngagement);
    
    // Actualizar dashboard
    this.dashboards.set(userId, dashboard);
  }

  /**
   * Optimiza notificaciones para un usuario
   */
  private async optimizeNotifications(userId: string): Promise<void> {
    const config = this.configs.get(userId);
    if (!config) return;

    // Cambiar frecuencia de notificaciones si es muy alta
    if (config.preferences.notifications.frequency === 'immediate') {
      config.preferences.notifications.frequency = 'daily';
      this.configs.set(userId, config);
    }
  }

  /**
   * Actualiza comportamiento de usuario
   */
  async updateUserBehavior(userId: string, action: string, metadata: any): Promise<void> {
    const behavior = this.userBehavior.get(userId) || {};
    
    // Actualizar contadores de acciones
    const actionKey = `${action}Count`;
    behavior[actionKey] = (behavior[actionKey] || 0) + 1;
    behavior[`${action}LastUsed`] = Date.now();
    
    this.userBehavior.set(userId, behavior);

    // Invalidar dashboard si es necesario
    if (['sales', 'products', 'orders'].some(key => action.includes(key))) {
      this.dashboards.delete(userId);
    }

    // Log analytics
    logger.info('[PERSONALIZATION] User behavior updated', {
      event: 'User Behavior Updated',
      userId,
      properties: {
        action,
        metadata,
        totalActions: Object.keys(behavior).filter(key => key.endsWith('Count')).length
      }
    });
  }

  /**
   * Obtiene dashboard personalizado
   */
  async getPersonalizedDashboard(userId: string): Promise<PersonalizedDashboard> {
    let dashboard = this.dashboards.get(userId);
    
    if (!dashboard || (Date.now() - dashboard.timestamp) > 3600000) { // 1 hora
      dashboard = await this.generatePersonalizedDashboard(userId);
      this.dashboards.set(userId, dashboard);
    }
    
    return dashboard;
  }

  /**
   * Obtiene optimizaciones para un usuario
   */
  getOptimizations(userId: string): AutoOptimization[] {
    return this.optimizations.get(userId) || [];
  }

  /**
   * Obtiene métricas del sistema
   */
  getSystemMetrics(): {
    totalUsers: number;
    activeDashboards: number;
    totalOptimizations: number;
    appliedOptimizations: number;
    avgEngagementScore: number;
  } {
    const totalOptimizations = Array.from(this.optimizations.values())
      .reduce((sum, opts) => sum + opts.length, 0);
    
    const appliedOptimizations = Array.from(this.optimizations.values())
      .reduce((sum, opts) => sum + opts.filter(o => o.applied).length, 0);

    return {
      totalUsers: this.configs.size,
      activeDashboards: this.dashboards.size,
      totalOptimizations,
      appliedOptimizations,
      avgEngagementScore: 0.75 // Placeholder
    };
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    this.configs.clear();
    this.dashboards.clear();
    this.optimizations.clear();
    this.userBehavior.clear();
    this.isInitialized = false;
  }
}

// Instancia singleton
export const personalizationEngine = PersonalizationEngine.getInstance();

// Funciones de utilidad
export const initializePersonalizationEngine = () => {
  return personalizationEngine.initialize();
};

export const getPersonalizedDashboard = (userId: string) => {
  return personalizationEngine.getPersonalizedDashboard(userId);
};

export const updateUserBehavior = (userId: string, action: string, metadata: any) => {
  return personalizationEngine.updateUserBehavior(userId, action, metadata);
};

export const getOptimizations = (userId: string) => {
  return personalizationEngine.getOptimizations(userId);
};

export const getPersonalizationMetrics = () => {
  return personalizationEngine.getSystemMetrics();
};

export default personalizationEngine; 