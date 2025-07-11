/**
 * Sistema de Code Splitting Estratégico para Fini AI
 * Optimizado para reducir bundle size inicial y mejorar performance
 */

import { logger } from '../logger';
import { lazyLoadingSystem } from './lazy-loading-system';

// Tipos para el sistema de code splitting
export interface ChunkInfo {
  name: string;
  size: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  route?: string;
  dependencies?: string[];
  preload?: boolean;
}

export interface LoadingStrategy {
  immediate: string[];
  preload: string[];
  lazy: string[];
  onDemand: string[];
}

/**
 * Sistema de Code Splitting con estrategias inteligentes
 */
export class CodeSplittingSystem {
  private static instance: CodeSplittingSystem;
  private loadedChunks = new Set<string>();
  private loadingChunks = new Map<string, Promise<any>>();
  private preloadQueue = new Set<string>();
  private chunkRegistry = new Map<string, ChunkInfo>();
  private loadingStrategy: LoadingStrategy;

  private constructor() {
    this.initializeChunkRegistry();
    this.loadingStrategy = this.determineLoadingStrategy();
    this.setupPreloading();
  }

  static getInstance(): CodeSplittingSystem {
    if (!CodeSplittingSystem.instance) {
      CodeSplittingSystem.instance = new CodeSplittingSystem();
    }
    return CodeSplittingSystem.instance;
  }

  /**
   * Inicializa el registro de chunks
   */
  private initializeChunkRegistry(): void {
    // Chunks críticos (siempre cargados)
    this.registerChunk({
      name: 'core',
      size: 150, // KB estimado
      priority: 'critical',
      preload: true
    });

    this.registerChunk({
      name: 'auth',
      size: 80,
      priority: 'critical',
      preload: true
    });

    // Chunks de alta prioridad (preload)
    this.registerChunk({
      name: 'dashboard',
      size: 200,
      priority: 'high',
      route: '/dashboard',
      preload: true
    });

    this.registerChunk({
      name: 'chat',
      size: 180,
      priority: 'high',
      route: '/dashboard',
      dependencies: ['dashboard'],
      preload: true
    });

    // Chunks de prioridad media (lazy load)
    this.registerChunk({
      name: 'analytics',
      size: 150,
      priority: 'medium',
      route: '/dashboard',
      dependencies: ['dashboard']
    });

    this.registerChunk({
      name: 'settings',
      size: 120,
      priority: 'medium',
      route: '/dashboard',
      dependencies: ['dashboard']
    });

    this.registerChunk({
      name: 'onboarding',
      size: 100,
      priority: 'medium',
      route: '/onboarding'
    });

    // Chunks de baja prioridad (on-demand)
    this.registerChunk({
      name: 'admin',
      size: 90,
      priority: 'low',
      route: '/admin'
    });

    this.registerChunk({
      name: 'debug',
      size: 60,
      priority: 'low',
      route: '/debug'
    });

    this.registerChunk({
      name: 'reports',
      size: 130,
      priority: 'low',
      route: '/reports',
      dependencies: ['analytics']
    });

    // Chunks de funcionalidades específicas
    this.registerChunk({
      name: 'viral-features',
      size: 70,
      priority: 'medium',
      dependencies: ['dashboard']
    });

    this.registerChunk({
      name: 'gamification',
      size: 85,
      priority: 'medium',
      dependencies: ['dashboard']
    });

    this.registerChunk({
      name: 'ai-agents',
      size: 250,
      priority: 'high',
      dependencies: ['chat'],
      preload: true
    });
  }

  /**
   * Registra un chunk en el sistema
   */
  private registerChunk(chunk: ChunkInfo): void {
    this.chunkRegistry.set(chunk.name, chunk);
  }

  /**
   * Determina la estrategia de carga basada en la conexión
   */
  private determineLoadingStrategy(): LoadingStrategy {
    const networkInfo = lazyLoadingSystem.getNetworkInfo();
    const isSlowConnection = lazyLoadingSystem.isSlowConnection();

    const strategy: LoadingStrategy = {
      immediate: [],
      preload: [],
      lazy: [],
      onDemand: []
    };

    for (const [name, chunk] of this.chunkRegistry) {
      switch (chunk.priority) {
        case 'critical':
          strategy.immediate.push(name);
          break;
        case 'high':
          if (isSlowConnection) {
            strategy.lazy.push(name);
          } else {
            strategy.preload.push(name);
          }
          break;
        case 'medium':
          if (isSlowConnection) {
            strategy.onDemand.push(name);
          } else {
            strategy.lazy.push(name);
          }
          break;
        case 'low':
          strategy.onDemand.push(name);
          break;
      }
    }

    logger.info('[CODE-SPLITTING] Loading strategy determined', {
      immediate: strategy.immediate.length,
      preload: strategy.preload.length,
      lazy: strategy.lazy.length,
      onDemand: strategy.onDemand.length,
      isSlowConnection
    });

    return strategy;
  }

  /**
   * Configura preloading de chunks
   */
  private setupPreloading(): void {
    if (typeof window === 'undefined') return;

    // Preload chunks después de que la página esté cargada
    window.addEventListener('load', () => {
      // Delay para no interferir con el initial load
      setTimeout(() => {
        this.preloadChunks(this.loadingStrategy.preload);
      }, 1000);
    });

    // Preload chunks en idle time
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        this.preloadChunks(this.loadingStrategy.lazy);
      });
    }
  }

  /**
   * Preload de chunks específicos
   */
  private async preloadChunks(chunkNames: string[]): Promise<void> {
    for (const chunkName of chunkNames) {
      if (!this.loadedChunks.has(chunkName) && !this.preloadQueue.has(chunkName)) {
        this.preloadQueue.add(chunkName);
        
        try {
          await this.preloadChunk(chunkName);
          logger.info(`[CODE-SPLITTING] Chunk preloaded: ${chunkName}`);
        } catch (error) {
          logger.error(`[CODE-SPLITTING] Failed to preload chunk: ${chunkName}`, error);
        }
      }
    }
  }

  /**
   * Preload de un chunk específico
   */
  private async preloadChunk(chunkName: string): Promise<void> {
    const chunk = this.chunkRegistry.get(chunkName);
    if (!chunk) return;

    // Crear link de preload
    const link = document.createElement('link');
    link.rel = 'prefetch'; // Usar prefetch para chunks no críticos
    link.href = this.getChunkUrl(chunkName);
    document.head.appendChild(link);

    // Marcar como en cola de preload
    this.preloadQueue.add(chunkName);
  }

  /**
   * Obtiene la URL de un chunk
   */
  private getChunkUrl(chunkName: string): string {
    // En producción, esto sería la URL real del chunk
    // Por ahora, usar una URL de ejemplo
    return `/_next/static/chunks/${chunkName}.js`;
  }

  /**
   * Carga un chunk de forma dinámica
   */
  async loadChunk(chunkName: string): Promise<any> {
    if (this.loadedChunks.has(chunkName)) {
      return Promise.resolve();
    }

    if (this.loadingChunks.has(chunkName)) {
      return this.loadingChunks.get(chunkName)!;
    }

    const chunk = this.chunkRegistry.get(chunkName);
    if (!chunk) {
      throw new Error(`Chunk not found: ${chunkName}`);
    }

    // Verificar dependencias
    if (chunk.dependencies) {
      await this.loadDependencies(chunk.dependencies);
    }

    const loadPromise = this.loadChunkImplementation(chunkName);
    this.loadingChunks.set(chunkName, loadPromise);

    try {
      const result = await loadPromise;
      this.loadedChunks.add(chunkName);
      this.loadingChunks.delete(chunkName);
      
      logger.info(`[CODE-SPLITTING] Chunk loaded: ${chunkName}`);
      return result;
    } catch (error) {
      this.loadingChunks.delete(chunkName);
      logger.error(`[CODE-SPLITTING] Failed to load chunk: ${chunkName}`, error);
      throw error;
    }
  }

  /**
   * Implementación específica de carga de chunk
   */
  private async loadChunkImplementation(chunkName: string): Promise<any> {
         // Mapeo de chunks a sus imports dinámicos
     const chunkImports: Record<string, () => Promise<any>> = {
       'dashboard': () => import('../../app/dashboard/page'),
       'chat': () => import('../../components/chat/fini-chat-interface'),
       'analytics': () => import('../../components/dashboard/analytics-overview'),
       'settings': () => import('../../components/dashboard/configuration-management'),
       'onboarding': () => import('../../app/onboarding/page'),
       'admin': () => Promise.resolve({ default: () => 'Admin Panel' }),
       'debug': () => Promise.resolve({ default: () => 'Debug Panel' }),
       'reports': () => Promise.resolve({ default: () => 'Reports Dashboard' }),
       'viral-features': () => import('../../lib/features/viral-sharing'),
       'gamification': () => import('../../lib/features/gamification-system'),
       'ai-agents': () => import('../../lib/agents/multi-agent-system'),
       'auth': () => Promise.resolve({ default: () => 'Auth Service' }),
       'core': () => Promise.resolve({ default: () => 'Core System' })
     };

    const importFn = chunkImports[chunkName];
    if (!importFn) {
      throw new Error(`No import function defined for chunk: ${chunkName}`);
    }

    return await importFn();
  }

  /**
   * Carga dependencias de un chunk
   */
  private async loadDependencies(dependencies: string[]): Promise<void> {
    const loadPromises = dependencies.map(dep => this.loadChunk(dep));
    await Promise.all(loadPromises);
  }

  /**
   * Carga chunks basado en la ruta actual
   */
  async loadChunksForRoute(route: string): Promise<void> {
    const relevantChunks = Array.from(this.chunkRegistry.entries())
      .filter(([_, chunk]) => chunk.route === route)
      .map(([name, _]) => name);

    const loadPromises = relevantChunks.map(chunkName => this.loadChunk(chunkName));
    await Promise.all(loadPromises);
  }

  /**
   * Optimiza la carga basada en el uso
   */
  optimizeForUsage(usageData: Record<string, number>): void {
    // Reordena la estrategia basada en datos de uso
    const sortedChunks = Object.entries(usageData)
      .sort(([, a], [, b]) => b - a)
      .map(([chunkName]) => chunkName);

    // Actualiza prioridades basado en uso
    sortedChunks.forEach((chunkName, index) => {
      const chunk = this.chunkRegistry.get(chunkName);
      if (chunk) {
        if (index < 3) {
          chunk.priority = 'high';
          chunk.preload = true;
        } else if (index < 7) {
          chunk.priority = 'medium';
        } else {
          chunk.priority = 'low';
        }
      }
    });

    // Recalcula estrategia
    this.loadingStrategy = this.determineLoadingStrategy();
    
    logger.info('[CODE-SPLITTING] Strategy optimized based on usage', {
      topChunks: sortedChunks.slice(0, 5)
    });
  }

  /**
   * Obtiene métricas de performance
   */
  getPerformanceMetrics(): {
    loadedChunks: number;
    totalChunks: number;
    loadingChunks: number;
    preloadedChunks: number;
    totalSize: number;
    loadedSize: number;
  } {
    const totalSize = Array.from(this.chunkRegistry.values())
      .reduce((sum, chunk) => sum + chunk.size, 0);
    
    const loadedSize = Array.from(this.loadedChunks)
      .map(name => this.chunkRegistry.get(name)?.size || 0)
      .reduce((sum, size) => sum + size, 0);

    return {
      loadedChunks: this.loadedChunks.size,
      totalChunks: this.chunkRegistry.size,
      loadingChunks: this.loadingChunks.size,
      preloadedChunks: this.preloadQueue.size,
      totalSize,
      loadedSize
    };
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    this.loadingChunks.clear();
    this.preloadQueue.clear();
    
    // Remover links de preload
    const preloadLinks = document.querySelectorAll('link[rel="prefetch"]');
    preloadLinks.forEach(link => link.remove());
  }

  /**
   * Obtiene información de un chunk
   */
  getChunkInfo(chunkName: string): ChunkInfo | null {
    return this.chunkRegistry.get(chunkName) || null;
  }

  /**
   * Obtiene la estrategia de carga actual
   */
  getLoadingStrategy(): LoadingStrategy {
    return { ...this.loadingStrategy };
  }
}

// Instancia singleton
export const codeSplittingSystem = CodeSplittingSystem.getInstance();

// Funciones de utilidad
export const loadChunk = (chunkName: string) => {
  return codeSplittingSystem.loadChunk(chunkName);
};

export const loadChunksForRoute = (route: string) => {
  return codeSplittingSystem.loadChunksForRoute(route);
};

export const getPerformanceMetrics = () => {
  return codeSplittingSystem.getPerformanceMetrics();
};

export const optimizeForUsage = (usageData: Record<string, number>) => {
  return codeSplittingSystem.optimizeForUsage(usageData);
};

export const getChunkInfo = (chunkName: string) => {
  return codeSplittingSystem.getChunkInfo(chunkName);
};

export const getLoadingStrategy = () => {
  return codeSplittingSystem.getLoadingStrategy();
};

export default codeSplittingSystem; 