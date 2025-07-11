/**
 * Sistema de Caching Estratégico para Fini AI
 * Optimizado para conexiones lentas de LATAM con múltiples estrategias
 */

import { logger } from '../logger';
import { lazyLoadingSystem } from './lazy-loading-system';

// Tipos para el sistema de caching
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
}

export interface CacheConfig {
  maxSize: number; // MB
  maxAge: number; // milliseconds
  maxEntries: number;
  strategy: 'lru' | 'lfu' | 'ttl' | 'adaptive';
  compressionEnabled: boolean;
  persistToDisk: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  entries: number;
  hitRate: number;
  memoryUsage: number;
}

/**
 * Sistema de Cache Multi-Nivel con estrategias adaptativas
 */
export class CachingSystem {
  private static instance: CachingSystem;
  private memoryCache = new Map<string, CacheEntry>();
  private persistentCache: IDBDatabase | null = null;
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = this.determineOptimalConfig();
    this.stats = this.initializeStats();
    this.initializePersistentCache();
    this.startCleanupScheduler();
  }

  static getInstance(): CachingSystem {
    if (!CachingSystem.instance) {
      CachingSystem.instance = new CachingSystem();
    }
    return CachingSystem.instance;
  }

  /**
   * Determina configuración óptima basada en la conexión
   */
  private determineOptimalConfig(): CacheConfig {
    const isSlowConnection = lazyLoadingSystem.isSlowConnection();
    const networkInfo = lazyLoadingSystem.getNetworkInfo();
    
    // Configuración más agresiva para conexiones lentas
    if (isSlowConnection) {
      return {
        maxSize: 100, // MB - más cache para conexiones lentas
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        maxEntries: 2000,
        strategy: 'adaptive',
        compressionEnabled: true,
        persistToDisk: true
      };
    }

    // Configuración estándar para conexiones normales
    return {
      maxSize: 50, // MB
      maxAge: 6 * 60 * 60 * 1000, // 6 horas
      maxEntries: 1000,
      strategy: 'lru',
      compressionEnabled: false,
      persistToDisk: false
    };
  }

  /**
   * Inicializa estadísticas
   */
  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      entries: 0,
      hitRate: 0,
      memoryUsage: 0
    };
  }

  /**
   * Inicializa cache persistente con IndexedDB
   */
  private async initializePersistentCache(): Promise<void> {
    if (!this.config.persistToDisk || typeof window === 'undefined') return;

    try {
      const request = indexedDB.open('FiniAICache', 1);
      
      request.onerror = () => {
        logger.error('[CACHE] Failed to open IndexedDB');
      };

      request.onsuccess = (event) => {
        this.persistentCache = (event.target as IDBOpenDBRequest).result;
        logger.info('[CACHE] Persistent cache initialized');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const objectStore = db.createObjectStore('cache', { keyPath: 'key' });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('expiresAt', 'expiresAt', { unique: false });
      };
    } catch (error) {
      logger.error('[CACHE] Failed to initialize persistent cache', error);
    }
  }

  /**
   * Inicia el scheduler de limpieza
   */
  private startCleanupScheduler(): void {
    // Limpiar cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Obtiene un valor del cache
   */
  async get<T>(key: string): Promise<T | null> {
    // Intentar memory cache primero
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      this.updateAccessStats(memoryEntry);
      this.stats.hits++;
      return memoryEntry.data as T;
    }

    // Intentar persistent cache si está disponible
    if (this.persistentCache) {
      const persistentEntry = await this.getFromPersistentCache<T>(key);
      if (persistentEntry && !this.isExpired(persistentEntry)) {
        // Promover a memory cache
        this.memoryCache.set(key, persistentEntry);
        this.updateAccessStats(persistentEntry);
        this.stats.hits++;
        return persistentEntry.data as T;
      }
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Almacena un valor en el cache
   */
  async set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
      tags?: string[];
      compress?: boolean;
    } = {}
  ): Promise<void> {
    const {
      ttl = this.config.maxAge,
      priority = 'medium',
      tags = [],
      compress = this.config.compressionEnabled
    } = options;

    const now = Date.now();
    const size = this.calculateSize(data);
    
    // Comprimir si está habilitado
    const processedData = compress ? await this.compress(data) : data;

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      expiresAt: now + ttl,
      accessCount: 1,
      lastAccessed: now,
      size,
      priority,
      tags
    };

    // Verificar si necesitamos espacio
    if (this.needsEviction(size)) {
      await this.evictEntries(size);
    }

    // Almacenar en memory cache
    this.memoryCache.set(key, entry);

    // Almacenar en persistent cache si está habilitado
    if (this.config.persistToDisk && this.persistentCache) {
      await this.saveToPersistentCache(key, entry);
    }

    this.updateCacheStats();
  }

  /**
   * Elimina una entrada del cache
   */
  async delete(key: string): Promise<boolean> {
    const deleted = this.memoryCache.delete(key);
    
    if (this.persistentCache) {
      await this.deleteFromPersistentCache(key);
    }

    this.updateCacheStats();
    return deleted;
  }

  /**
   * Limpia entradas por tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let invalidated = 0;
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        await this.delete(key);
        invalidated++;
      }
    }

    logger.info(`[CACHE] Invalidated ${invalidated} entries by tags`, { tags });
    return invalidated;
  }

  /**
   * Limpia cache expirado
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.memoryCache) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.delete(key);
      this.stats.evictions++;
    }

    // Limpiar persistent cache también
    if (this.persistentCache) {
      await this.cleanupPersistentCache();
    }

    this.updateCacheStats();
    
    if (expiredKeys.length > 0) {
      logger.info(`[CACHE] Cleaned up ${expiredKeys.length} expired entries`);
    }
  }

  /**
   * Obtiene desde persistent cache
   */
  private async getFromPersistentCache<T>(key: string): Promise<CacheEntry<T> | null> {
    if (!this.persistentCache) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.persistentCache!.transaction(['cache'], 'readonly');
      const objectStore = transaction.objectStore('cache');
      const request = objectStore.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? { ...result, key: undefined } : null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Guarda en persistent cache
   */
  private async saveToPersistentCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    if (!this.persistentCache) return;

    return new Promise((resolve, reject) => {
      const transaction = this.persistentCache!.transaction(['cache'], 'readwrite');
      const objectStore = transaction.objectStore('cache');
      const request = objectStore.put({ ...entry, key });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Elimina del persistent cache
   */
  private async deleteFromPersistentCache(key: string): Promise<void> {
    if (!this.persistentCache) return;

    return new Promise((resolve, reject) => {
      const transaction = this.persistentCache!.transaction(['cache'], 'readwrite');
      const objectStore = transaction.objectStore('cache');
      const request = objectStore.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpia persistent cache expirado
   */
  private async cleanupPersistentCache(): Promise<void> {
    if (!this.persistentCache) return;

    const now = Date.now();
    
    return new Promise((resolve, reject) => {
      const transaction = this.persistentCache!.transaction(['cache'], 'readwrite');
      const objectStore = transaction.objectStore('cache');
      const index = objectStore.index('expiresAt');
      const request = index.openCursor(IDBKeyRange.upperBound(now));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Verifica si una entrada está expirada
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Actualiza estadísticas de acceso
   */
  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }

  /**
   * Calcula el tamaño de los datos
   */
  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Comprime datos
   */
  private async compress(data: any): Promise<any> {
    // Implementación simple de compresión
    // En un caso real, usarías una librería como pako
    try {
      const jsonString = JSON.stringify(data);
      // Simulación de compresión
      return { compressed: true, data: jsonString };
    } catch {
      return data;
    }
  }

  /**
   * Descomprime datos
   */
  private async decompress(compressedData: any): Promise<any> {
    if (compressedData.compressed) {
      return JSON.parse(compressedData.data);
    }
    return compressedData;
  }

  /**
   * Verifica si necesita evicción
   */
  private needsEviction(newEntrySize: number): boolean {
    const currentSize = this.getCurrentSize();
    const maxSizeBytes = this.config.maxSize * 1024 * 1024; // MB to bytes
    
    return (
      currentSize + newEntrySize > maxSizeBytes ||
      this.memoryCache.size >= this.config.maxEntries
    );
  }

  /**
   * Evicta entradas basado en la estrategia
   */
  private async evictEntries(requiredSpace: number): Promise<void> {
    const entries = Array.from(this.memoryCache.entries());
    let freedSpace = 0;

    // Ordenar según estrategia
    entries.sort(([, a], [, b]) => {
      switch (this.config.strategy) {
        case 'lru':
          return a.lastAccessed - b.lastAccessed;
        case 'lfu':
          return a.accessCount - b.accessCount;
        case 'ttl':
          return a.expiresAt - b.expiresAt;
        case 'adaptive':
          return this.calculateEvictionScore(a) - this.calculateEvictionScore(b);
        default:
          return 0;
      }
    });

    // Evictar entradas hasta liberar espacio suficiente
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      await this.delete(key);
      freedSpace += entry.size;
      this.stats.evictions++;
    }
  }

  /**
   * Calcula score de evicción para estrategia adaptativa
   */
  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const timeToExpiry = entry.expiresAt - now;
    
    // Score más bajo = más probable de ser evictado
    let score = 0;
    
    // Prioridad (más alta = menos probable de evicción)
    switch (entry.priority) {
      case 'high':
        score += 1000;
        break;
      case 'medium':
        score += 500;
        break;
      case 'low':
        score += 100;
        break;
    }
    
    // Frecuencia de acceso
    score += entry.accessCount * 10;
    
    // Recencia
    score -= timeSinceAccess / 1000;
    
    // Tiempo hasta expiración
    score += timeToExpiry / 1000;
    
    return score;
  }

  /**
   * Obtiene el tamaño actual del cache
   */
  private getCurrentSize(): number {
    let size = 0;
    for (const entry of this.memoryCache.values()) {
      size += entry.size;
    }
    return size;
  }

  /**
   * Actualiza estadísticas del cache
   */
  private updateCacheStats(): void {
    this.stats.size = this.getCurrentSize();
    this.stats.entries = this.memoryCache.size;
    this.stats.memoryUsage = (this.stats.size / (1024 * 1024)); // MB
    this.updateHitRate();
  }

  /**
   * Actualiza tasa de aciertos
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Obtiene estadísticas del cache
   */
  getStats(): CacheStats {
    this.updateCacheStats();
    return { ...this.stats };
  }

  /**
   * Obtiene configuración actual
   */
  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Actualiza configuración
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('[CACHE] Configuration updated', this.config);
  }

  /**
   * Limpia todo el cache
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.persistentCache) {
      const transaction = this.persistentCache.transaction(['cache'], 'readwrite');
      const objectStore = transaction.objectStore('cache');
      await objectStore.clear();
    }
    
    this.stats = this.initializeStats();
    logger.info('[CACHE] Cache cleared');
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    if (this.persistentCache) {
      this.persistentCache.close();
    }
  }
}

// Instancia singleton
export const cachingSystem = CachingSystem.getInstance();

// Funciones de utilidad
export const cacheGet = <T>(key: string): Promise<T | null> => {
  return cachingSystem.get<T>(key);
};

export const cacheSet = <T>(
  key: string,
  data: T,
  options?: {
    ttl?: number;
    priority?: 'high' | 'medium' | 'low';
    tags?: string[];
    compress?: boolean;
  }
): Promise<void> => {
  return cachingSystem.set(key, data, options);
};

export const cacheDelete = (key: string): Promise<boolean> => {
  return cachingSystem.delete(key);
};

export const cacheInvalidateByTags = (tags: string[]): Promise<number> => {
  return cachingSystem.invalidateByTags(tags);
};

export const getCacheStats = (): CacheStats => {
  return cachingSystem.getStats();
};

export const getCacheConfig = (): CacheConfig => {
  return cachingSystem.getConfig();
};

export const updateCacheConfig = (config: Partial<CacheConfig>): void => {
  return cachingSystem.updateConfig(config);
};

export const clearCache = (): Promise<void> => {
  return cachingSystem.clear();
};

export default cachingSystem; 