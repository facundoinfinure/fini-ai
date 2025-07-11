/**
 * Sistema de Lazy Loading Inteligente para Fini AI
 * Optimizado para conexiones lentas de LATAM
 */

import { logger } from '../logger';

// Tipos para el sistema de lazy loading
export interface LazyLoadOptions {
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  retryAttempts?: number;
  networkAware?: boolean;
}

export interface ImageLazyLoadOptions {
  placeholder?: string;
  blurDataURL?: string;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
}

export interface NetworkInfo {
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

/**
 * Sistema de Lazy Loading con consciencia de red
 */
export class LazyLoadingSystem {
  private static instance: LazyLoadingSystem;
  private networkInfo: NetworkInfo | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private preloadQueue = new Set<string>();
  private loadedImages = new Set<string>();

  private constructor() {
    this.initializeNetworkMonitoring();
    this.initializeIntersectionObserver();
  }

  static getInstance(): LazyLoadingSystem {
    if (!LazyLoadingSystem.instance) {
      LazyLoadingSystem.instance = new LazyLoadingSystem();
    }
    return LazyLoadingSystem.instance;
  }

  /**
   * Inicializa monitoreo de red
   */
  private initializeNetworkMonitoring(): void {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      this.networkInfo = {
        effectiveType: connection.effectiveType || '4g',
        downlink: connection.downlink || 10,
        rtt: connection.rtt || 100,
        saveData: connection.saveData || false
      };

      connection.addEventListener('change', () => {
        this.networkInfo = {
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false
        };
        
        logger.info('[PERFORMANCE] Network changed', { 
          effectiveType: this.networkInfo.effectiveType,
          downlink: this.networkInfo.downlink,
          saveData: this.networkInfo.saveData
        });
      });
    }
  }

  /**
   * Inicializa Intersection Observer para lazy loading
   */
  private initializeIntersectionObserver(): void {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const element = entry.target as HTMLElement;
              const imageSrc = element.dataset.lazySrc;
              
              if (imageSrc) {
                this.loadImage(element as HTMLImageElement, imageSrc);
                this.intersectionObserver?.unobserve(element);
              }
            }
          });
        },
        {
          rootMargin: this.getPreloadMargin(),
          threshold: 0.1
        }
      );
    }
  }

  /**
   * Obtiene margen de preload basado en la conexión
   */
  private getPreloadMargin(): string {
    if (!this.networkInfo) return '50px';
    
    switch (this.networkInfo.effectiveType) {
      case 'slow-2g':
      case '2g':
        return '200px'; // Preload más temprano para conexiones lentas
      case '3g':
        return '100px';
      case '4g':
      default:
        return '50px';
    }
  }

  /**
   * Carga una imagen de forma lazy
   */
  private loadImage(imgElement: HTMLImageElement, src: string): void {
    if (this.loadedImages.has(src)) return;

    const optimizedSrc = this.optimizeImageSrc(src, this.getImageQuality());
    
    const img = new Image();
    img.onload = () => {
      imgElement.src = optimizedSrc;
      imgElement.classList.add('loaded');
      this.loadedImages.add(src);
      
      logger.info('[PERFORMANCE] Image loaded', { src: optimizedSrc });
    };
    
    img.onerror = () => {
      logger.error('[PERFORMANCE] Image load failed', { src: optimizedSrc });
      // Fallback a placeholder
      imgElement.src = this.getPlaceholder();
    };
    
    img.src = optimizedSrc;
  }

  /**
   * Optimiza URL de imagen basado en la conexión
   */
  private optimizeImageSrc(src: string, quality: number): string {
    if (!this.networkInfo) return src;
    
    let optimizedQuality = quality;
    
    // Reducir calidad en conexiones lentas
    switch (this.networkInfo.effectiveType) {
      case 'slow-2g':
        optimizedQuality = Math.min(quality, 30);
        break;
      case '2g':
        optimizedQuality = Math.min(quality, 50);
        break;
      case '3g':
        optimizedQuality = Math.min(quality, 70);
        break;
    }

    // Si saveData está activado, reducir más la calidad
    if (this.networkInfo.saveData) {
      optimizedQuality = Math.min(optimizedQuality, 40);
    }

    // Agregar parámetros de optimización si es una URL externa
    if (src.startsWith('http')) {
      try {
        const url = new URL(src);
        url.searchParams.set('q', optimizedQuality.toString());
        url.searchParams.set('w', '800'); // Ancho máximo
        url.searchParams.set('f', 'webp'); // Formato WebP
        return url.toString();
      } catch (e) {
        return src;
      }
    }

    return src;
  }

  /**
   * Obtiene calidad de imagen basada en la conexión
   */
  private getImageQuality(): number {
    if (!this.networkInfo) return 80;
    
    switch (this.networkInfo.effectiveType) {
      case 'slow-2g':
        return 30;
      case '2g':
        return 50;
      case '3g':
        return 70;
      case '4g':
      default:
        return 80;
    }
  }

  /**
   * Obtiene placeholder por defecto
   */
  private getPlaceholder(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZjdmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iI2FhYSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=';
  }

  /**
   * Configura lazy loading para un elemento imagen
   */
  setupLazyImage(imgElement: HTMLImageElement, src: string, options: ImageLazyLoadOptions = {}): void {
    const {
      placeholder = this.getPlaceholder(),
      priority = false,
      loading = 'lazy'
    } = options;

    // Configurar placeholder inicial
    imgElement.src = placeholder;
    imgElement.dataset.lazySrc = src;

    // Si es prioridad alta, cargar inmediatamente
    if (priority) {
      this.loadImage(imgElement, src);
      return;
    }

    // Si el navegador soporta loading="lazy" nativo y la conexión es buena
    if ('loading' in HTMLImageElement.prototype && !this.isSlowConnection()) {
      imgElement.loading = loading;
      imgElement.src = this.optimizeImageSrc(src, this.getImageQuality());
      return;
    }

    // Usar Intersection Observer para lazy loading manual
    if (this.intersectionObserver) {
      this.intersectionObserver.observe(imgElement);
    } else {
      // Fallback: cargar inmediatamente si no hay soporte
      this.loadImage(imgElement, src);
    }
  }

  /**
   * Preload crítico de recursos
   */
  preloadCriticalResources(resources: string[]): void {
    if (typeof document === 'undefined') return;

    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      
      if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        link.as = 'image';
      } else {
        link.as = 'fetch';
        link.crossOrigin = 'anonymous';
      }
      
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  /**
   * Obtiene información de red actual
   */
  getNetworkInfo(): NetworkInfo | null {
    return this.networkInfo;
  }

  /**
   * Determina si la conexión es lenta
   */
  isSlowConnection(): boolean {
    if (!this.networkInfo) return false;
    
    return (
      this.networkInfo.effectiveType === 'slow-2g' ||
      this.networkInfo.effectiveType === '2g' ||
      this.networkInfo.saveData ||
      this.networkInfo.downlink < 1.5
    );
  }

  /**
   * Obtiene configuración de carga basada en la red
   */
  getLoadingStrategy(): {
    shouldLazyLoad: boolean;
    imageQuality: number;
    preloadMargin: string;
    timeout: number;
  } {
    const isSlowConnection = this.isSlowConnection();
    
    return {
      shouldLazyLoad: isSlowConnection,
      imageQuality: this.getImageQuality(),
      preloadMargin: this.getPreloadMargin(),
      timeout: isSlowConnection ? 15000 : 8000
    };
  }

  /**
   * Limpia recursos y observers
   */
  cleanup(): void {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    this.preloadQueue.clear();
    this.loadedImages.clear();
  }
}

// Instancia singleton
export const lazyLoadingSystem = LazyLoadingSystem.getInstance();

// Funciones de utilidad
export const setupLazyImage = (
  imgElement: HTMLImageElement,
  src: string,
  options?: ImageLazyLoadOptions
) => {
  return lazyLoadingSystem.setupLazyImage(imgElement, src, options);
};

export const preloadCriticalResources = (resources: string[]) => {
  return lazyLoadingSystem.preloadCriticalResources(resources);
};

export const getNetworkInfo = () => {
  return lazyLoadingSystem.getNetworkInfo();
};

export const isSlowConnection = () => {
  return lazyLoadingSystem.isSlowConnection();
};

export const getLoadingStrategy = () => {
  return lazyLoadingSystem.getLoadingStrategy();
};

export default lazyLoadingSystem; 