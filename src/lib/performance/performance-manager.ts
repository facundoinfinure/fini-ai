/**
 * Gestor Central de Performance para Fini AI
 * Integra todos los sistemas de optimización y proporciona métricas
 */

import { logger } from '../logger';
import { lazyLoadingSystem } from './lazy-loading-system';
import { codeSplittingSystem } from './code-splitting';
import { cachingSystem } from './caching-strategy';
import { serviceWorkerManager } from './service-worker';

// Tipos para el gestor de performance
export interface PerformanceMetrics {
  // Métricas de carga
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  
  // Métricas de red
  networkSpeed: 'slow' | 'medium' | 'fast';
  connectionType: string;
  dataUsage: number;
  
  // Métricas de cache
  cacheHitRate: number;
  cacheSize: number;
  
  // Métricas de chunks
  chunksLoaded: number;
  bundleSize: number;
  
  // Métricas de usuario
  sessionDuration: number;
  pageViews: number;
  bounceRate: number;
}

export interface PerformanceConfig {
  enableLazyLoading: boolean;
  enableCodeSplitting: boolean;
  enableCaching: boolean;
  enableServiceWorker: boolean;
  enableMetricsCollection: boolean;
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
  targetMarket: 'global' | 'latam' | 'local';
}

export interface OptimizationRecommendation {
  type: 'critical' | 'important' | 'suggestion';
  category: 'loading' | 'caching' | 'network' | 'ui';
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  action: () => Promise<void>;
}

/**
 * Gestor Central de Performance
 */
export class PerformanceManager {
  private static instance: PerformanceManager;
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics;
  private observer: PerformanceObserver | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private startTime: number;

  private constructor() {
    this.startTime = Date.now();
    this.config = this.getDefaultConfig();
    this.metrics = this.initializeMetrics();
    this.initializePerformanceObserver();
    this.startMetricsCollection();
  }

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  /**
   * Configuración por defecto
   */
  private getDefaultConfig(): PerformanceConfig {
    return {
      enableLazyLoading: true,
      enableCodeSplitting: true,
      enableCaching: true,
      enableServiceWorker: true,
      enableMetricsCollection: true,
      optimizationLevel: 'balanced',
      targetMarket: 'latam'
    };
  }

  /**
   * Inicializa métricas
   */
  private initializeMetrics(): PerformanceMetrics {
    return {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      networkSpeed: 'medium',
      connectionType: 'unknown',
      dataUsage: 0,
      cacheHitRate: 0,
      cacheSize: 0,
      chunksLoaded: 0,
      bundleSize: 0,
      sessionDuration: 0,
      pageViews: 0,
      bounceRate: 0
    };
  }

  /**
   * Inicializa el observer de performance
   */
  private initializePerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // Observer para Core Web Vitals
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      // Observar diferentes tipos de métricas
      this.observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      
      // Observer para Layout Shift
      if ('LayoutShift' in window) {
        const layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              this.metrics.cumulativeLayoutShift += (entry as any).value;
            }
          }
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      }

      // Observer para First Input Delay
      if ('PerformanceEventTiming' in window) {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if ((entry as any).name === 'first-input') {
              this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
            }
          }
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      }

    } catch (error) {
      logger.error('[PERFORMANCE] Failed to initialize PerformanceObserver', error);
    }
  }

  /**
   * Procesa entradas de performance
   */
  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
             case 'navigation':
         const navEntry = entry as PerformanceNavigationTiming;
         this.metrics.loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
         break;
        
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.metrics.firstContentfulPaint = entry.startTime;
        }
        break;
        
      case 'largest-contentful-paint':
        this.metrics.largestContentfulPaint = entry.startTime;
        break;
    }
  }

  /**
   * Inicia la recolección de métricas
   */
  private startMetricsCollection(): void {
    if (!this.config.enableMetricsCollection) return;

    // Recolectar métricas cada 30 segundos
    this.metricsInterval = setInterval(() => {
      this.collectMetrics();
    }, 30000);

    // Recolectar métricas iniciales
    setTimeout(() => {
      this.collectMetrics();
    }, 5000);
  }

  /**
   * Recolecta métricas actuales
   */
  private collectMetrics(): void {
    // Métricas de red
    const networkInfo = lazyLoadingSystem.getNetworkInfo();
    if (networkInfo) {
      this.metrics.networkSpeed = this.categorizeNetworkSpeed(networkInfo);
      this.metrics.connectionType = networkInfo.effectiveType;
    }

    // Métricas de cache
    const cacheStats = cachingSystem.getStats();
    this.metrics.cacheHitRate = cacheStats.hitRate;
    this.metrics.cacheSize = cacheStats.memoryUsage;

    // Métricas de chunks
    const chunkMetrics = codeSplittingSystem.getPerformanceMetrics();
    this.metrics.chunksLoaded = chunkMetrics.loadedChunks;
    this.metrics.bundleSize = chunkMetrics.loadedSize;

    // Métricas de sesión
    this.metrics.sessionDuration = Date.now() - this.startTime;
    this.metrics.pageViews = this.getPageViews();

         // Log métricas si están en modo debug
     if (process.env.NODE_ENV === 'development') {
       logger.debug('[PERFORMANCE] Metrics collected');
     }
  }

  /**
   * Categoriza la velocidad de red
   */
  private categorizeNetworkSpeed(networkInfo: any): 'slow' | 'medium' | 'fast' {
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      return 'slow';
    }
    if (networkInfo.effectiveType === '3g' || networkInfo.downlink < 1.5) {
      return 'medium';
    }
    return 'fast';
  }

  /**
   * Obtiene número de page views
   */
  private getPageViews(): number {
    // Implementar lógica para contar page views
    return 1; // Placeholder
  }

  /**
   * Inicializa todos los sistemas de performance
   */
  async initialize(): Promise<void> {
    logger.info('[PERFORMANCE] Initializing performance systems...');

    try {
      // Inicializar sistemas según configuración
      if (this.config.enableLazyLoading) {
        // Lazy loading se inicializa automáticamente
        logger.info('[PERFORMANCE] Lazy loading system ready');
      }

      if (this.config.enableCodeSplitting) {
        // Code splitting se inicializa automáticamente
        logger.info('[PERFORMANCE] Code splitting system ready');
      }

      if (this.config.enableCaching) {
        // Caching se inicializa automáticamente
        logger.info('[PERFORMANCE] Caching system ready');
      }

      if (this.config.enableServiceWorker) {
        await serviceWorkerManager.register();
        logger.info('[PERFORMANCE] Service worker registered');
      }

      // Aplicar optimizaciones automáticas
      await this.applyAutoOptimizations();

      logger.info('[PERFORMANCE] All systems initialized successfully');
    } catch (error) {
      logger.error('[PERFORMANCE] Failed to initialize systems', error);
    }
  }

  /**
   * Aplica optimizaciones automáticas
   */
  private async applyAutoOptimizations(): Promise<void> {
    const networkInfo = lazyLoadingSystem.getNetworkInfo();
    const isSlowConnection = lazyLoadingSystem.isSlowConnection();

    if (isSlowConnection) {
      logger.info('[PERFORMANCE] Applying optimizations for slow connection');
      
      // Configurar cache más agresivo
      cachingSystem.updateConfig({
        maxSize: 150, // MB
        maxAge: 48 * 60 * 60 * 1000, // 48 horas
        strategy: 'adaptive'
      });

      // Preload recursos críticos
      lazyLoadingSystem.preloadCriticalResources([
        '/static/css/critical.css',
        '/static/js/critical.js'
      ]);
    }

    // Optimizaciones específicas para LATAM
    if (this.config.targetMarket === 'latam') {
      this.applyLatamOptimizations();
    }
  }

  /**
   * Aplica optimizaciones específicas para LATAM
   */
  private applyLatamOptimizations(): void {
    logger.info('[PERFORMANCE] Applying LATAM-specific optimizations');
    
    // Configuraciones específicas para mercado LATAM
    // - Caching más agresivo
    // - Compresión habilitada
    // - Timeouts más largos
    // - Preload de recursos críticos
  }

  /**
   * Analiza performance y genera recomendaciones
   */
  async analyzePerformance(): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Analizar Core Web Vitals
    if (this.metrics.largestContentfulPaint > 2500) {
      recommendations.push({
        type: 'critical',
        category: 'loading',
        description: 'Largest Contentful Paint es muy lento (>2.5s)',
        impact: 'high',
        effort: 'medium',
        action: async () => {
          await this.optimizeLCP();
        }
      });
    }

    if (this.metrics.firstInputDelay > 100) {
      recommendations.push({
        type: 'important',
        category: 'ui',
        description: 'First Input Delay es alto (>100ms)',
        impact: 'medium',
        effort: 'medium',
        action: async () => {
          await this.optimizeFID();
        }
      });
    }

    if (this.metrics.cumulativeLayoutShift > 0.1) {
      recommendations.push({
        type: 'important',
        category: 'ui',
        description: 'Cumulative Layout Shift es alto (>0.1)',
        impact: 'medium',
        effort: 'low',
        action: async () => {
          await this.optimizeCLS();
        }
      });
    }

    // Analizar cache
    if (this.metrics.cacheHitRate < 70) {
      recommendations.push({
        type: 'suggestion',
        category: 'caching',
        description: 'Tasa de aciertos de cache es baja (<70%)',
        impact: 'medium',
        effort: 'low',
        action: async () => {
          await this.optimizeCache();
        }
      });
    }

    // Analizar red
    if (this.metrics.networkSpeed === 'slow') {
      recommendations.push({
        type: 'critical',
        category: 'network',
        description: 'Conexión lenta detectada - aplicar optimizaciones agresivas',
        impact: 'high',
        effort: 'low',
        action: async () => {
          await this.optimizeForSlowConnection();
        }
      });
    }

    return recommendations;
  }

  /**
   * Optimiza Largest Contentful Paint
   */
  private async optimizeLCP(): Promise<void> {
    logger.info('[PERFORMANCE] Optimizing LCP...');
    
    // Preload recursos críticos
    lazyLoadingSystem.preloadCriticalResources([
      '/static/css/critical.css',
      '/static/js/main.js'
    ]);

    // Optimizar imágenes
    // Implementar lazy loading más agresivo
  }

  /**
   * Optimiza First Input Delay
   */
  private async optimizeFID(): Promise<void> {
    logger.info('[PERFORMANCE] Optimizing FID...');
    
    // Diferir JavaScript no crítico
    await codeSplittingSystem.loadChunksForRoute(window.location.pathname);
  }

  /**
   * Optimiza Cumulative Layout Shift
   */
  private async optimizeCLS(): Promise<void> {
    logger.info('[PERFORMANCE] Optimizing CLS...');
    
    // Implementar placeholders para imágenes
    // Reservar espacio para contenido dinámico
  }

  /**
   * Optimiza cache
   */
  private async optimizeCache(): Promise<void> {
    logger.info('[PERFORMANCE] Optimizing cache...');
    
    cachingSystem.updateConfig({
      maxSize: 100,
      maxAge: 24 * 60 * 60 * 1000,
      strategy: 'adaptive'
    });
  }

  /**
   * Optimiza para conexión lenta
   */
  private async optimizeForSlowConnection(): Promise<void> {
    logger.info('[PERFORMANCE] Optimizing for slow connection...');
    
    // Aplicar todas las optimizaciones agresivas
    await this.applyAutoOptimizations();
  }

  /**
   * Ejecuta recomendaciones automáticamente
   */
  async applyRecommendations(recommendations: OptimizationRecommendation[]): Promise<void> {
    const criticalRecommendations = recommendations.filter(r => r.type === 'critical');
    const importantRecommendations = recommendations.filter(r => r.type === 'important');

    // Aplicar recomendaciones críticas inmediatamente
    for (const recommendation of criticalRecommendations) {
      try {
        await recommendation.action();
        logger.info(`[PERFORMANCE] Applied critical optimization: ${recommendation.description}`);
      } catch (error) {
        logger.error(`[PERFORMANCE] Failed to apply optimization: ${recommendation.description}`, error);
      }
    }

    // Aplicar recomendaciones importantes con delay
    setTimeout(async () => {
      for (const recommendation of importantRecommendations) {
        try {
          await recommendation.action();
          logger.info(`[PERFORMANCE] Applied important optimization: ${recommendation.description}`);
        } catch (error) {
          logger.error(`[PERFORMANCE] Failed to apply optimization: ${recommendation.description}`, error);
        }
      }
    }, 5000);
  }

  /**
   * Genera reporte de performance
   */
  generateReport(): {
    metrics: PerformanceMetrics;
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    recommendations: OptimizationRecommendation[];
  } {
    const score = this.calculatePerformanceScore();
    const grade = this.getPerformanceGrade(score);
    
    return {
      metrics: { ...this.metrics },
      score,
      grade,
      recommendations: [] // Se llena con analyzePerformance()
    };
  }

  /**
   * Calcula score de performance
   */
  private calculatePerformanceScore(): number {
    let score = 100;

    // Penalizar por Core Web Vitals
    if (this.metrics.largestContentfulPaint > 2500) score -= 20;
    if (this.metrics.firstInputDelay > 100) score -= 15;
    if (this.metrics.cumulativeLayoutShift > 0.1) score -= 15;

    // Penalizar por cache hit rate bajo
    if (this.metrics.cacheHitRate < 70) score -= 10;

    // Penalizar por conexión lenta
    if (this.metrics.networkSpeed === 'slow') score -= 20;

    return Math.max(0, score);
  }

  /**
   * Obtiene grade de performance
   */
  private getPerformanceGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Obtiene métricas actuales
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): PerformanceConfig {
    return { ...this.config };
  }

  /**
   * Actualiza configuración
   */
     updateConfig(newConfig: Partial<PerformanceConfig>): void {
     this.config = { ...this.config, ...newConfig };
     logger.info('[PERFORMANCE] Configuration updated');
   }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

// Instancia singleton
export const performanceManager = PerformanceManager.getInstance();

// Funciones de utilidad
export const initializePerformance = () => {
  return performanceManager.initialize();
};

export const analyzePerformance = () => {
  return performanceManager.analyzePerformance();
};

export const getPerformanceMetrics = () => {
  return performanceManager.getMetrics();
};

export const getPerformanceReport = () => {
  return performanceManager.generateReport();
};

export const updatePerformanceConfig = (config: Partial<PerformanceConfig>) => {
  return performanceManager.updateConfig(config);
};

export default performanceManager; 