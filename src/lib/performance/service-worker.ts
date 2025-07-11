/**
 * Service Worker para Fini AI
 * Optimizado para PWA y conexiones lentas de LATAM
 */

import { logger } from '../logger';

// Tipos para el Service Worker
export interface CacheStrategy {
  name: string;
  pattern: RegExp;
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'network-only' | 'cache-only';
  maxAge?: number;
  maxEntries?: number;
  networkTimeout?: number;
}

export interface ServiceWorkerConfig {
  version: string;
  cacheStrategies: CacheStrategy[];
  offlinePages: string[];
  backgroundSync: boolean;
  pushNotifications: boolean;
  updateCheckInterval: number;
}

/**
 * Gestor de Service Worker
 */
export class ServiceWorkerManager {
  private static instance: ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private isOnline = true;
  private updateAvailable = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.initializeOnlineStatus();
  }

  static getInstance(): ServiceWorkerManager {
    if (!ServiceWorkerManager.instance) {
      ServiceWorkerManager.instance = new ServiceWorkerManager();
    }
    return ServiceWorkerManager.instance;
  }

  /**
   * Configuración por defecto
   */
  private getDefaultConfig(): ServiceWorkerConfig {
    return {
      version: '1.0.0',
      cacheStrategies: [
        {
          name: 'static-assets',
          pattern: /\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/,
          strategy: 'cache-first',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
          maxEntries: 100
        },
        {
          name: 'api-data',
          pattern: /\/api\/(stores|analytics|dashboard)/,
          strategy: 'stale-while-revalidate',
          maxAge: 30 * 60 * 1000, // 30 minutos
          maxEntries: 50,
          networkTimeout: 5000
        },
        {
          name: 'chat-data',
          pattern: /\/api\/chat/,
          strategy: 'network-first',
          maxAge: 5 * 60 * 1000, // 5 minutos
          maxEntries: 100,
          networkTimeout: 3000
        },
        {
          name: 'images',
          pattern: /\.(png|jpg|jpeg|webp|gif)$/,
          strategy: 'cache-first',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
          maxEntries: 200
        },
        {
          name: 'pages',
          pattern: /\/(dashboard|chat|settings|profile)/,
          strategy: 'stale-while-revalidate',
          maxAge: 24 * 60 * 60 * 1000, // 24 horas
          maxEntries: 20
        }
      ],
      offlinePages: [
        '/offline',
        '/dashboard',
        '/chat'
      ],
      backgroundSync: true,
      pushNotifications: true,
      updateCheckInterval: 60 * 60 * 1000 // 1 hora
    };
  }

  /**
   * Inicializa el monitoreo de estado online/offline
   */
  private initializeOnlineStatus(): void {
    if (typeof window === 'undefined') return;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      this.isOnline = true;
      logger.info('[SW] Connection restored');
      this.syncPendingRequests();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      logger.info('[SW] Connection lost');
    });
  }

  /**
   * Registra el Service Worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      logger.warn('[SW] Service Worker not supported');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      this.registration = registration;
      this.setupUpdateHandling(registration);
      this.setupMessageHandling();

      logger.info('[SW] Service Worker registered successfully');
      return registration;
    } catch (error) {
      logger.error('[SW] Service Worker registration failed', error);
      return null;
    }
  }

  /**
   * Configura el manejo de actualizaciones
   */
  private setupUpdateHandling(registration: ServiceWorkerRegistration): void {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          this.updateAvailable = true;
          this.notifyUpdateAvailable();
        }
      });
    });

    // Verificar actualizaciones periódicamente
    setInterval(() => {
      registration.update();
    }, this.config.updateCheckInterval);
  }

  /**
   * Configura el manejo de mensajes
   */
  private setupMessageHandling(): void {
    if (!navigator.serviceWorker) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'CACHE_UPDATED':
          logger.info('[SW] Cache updated', data);
          break;
        case 'OFFLINE_READY':
          logger.info('[SW] Offline functionality ready');
          break;
        case 'SYNC_COMPLETED':
          logger.info('[SW] Background sync completed', data);
          break;
        default:
          logger.debug('[SW] Unknown message type', type);
      }
    });
  }

  /**
   * Notifica que hay una actualización disponible
   */
  private notifyUpdateAvailable(): void {
    // Emitir evento personalizado
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    }

    logger.info('[SW] Update available - user can refresh to get latest version');
  }

  /**
   * Aplica la actualización del Service Worker
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.updateAvailable) return;

    const newWorker = this.registration.waiting;
    if (!newWorker) return;

    // Enviar mensaje al SW para que se active
    newWorker.postMessage({ type: 'SKIP_WAITING' });

    // Recargar la página cuando el nuevo SW tome control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }

  /**
   * Genera el código del Service Worker
   */
  generateServiceWorkerCode(): string {
    return `
// Service Worker para Fini AI
// Versión: ${this.config.version}

const CACHE_VERSION = '${this.config.version}';
const CACHE_PREFIX = 'fini-ai';
const OFFLINE_PAGE = '/offline';

// Nombres de cache
const CACHE_NAMES = {
  static: \`\${CACHE_PREFIX}-static-\${CACHE_VERSION}\`,
  dynamic: \`\${CACHE_PREFIX}-dynamic-\${CACHE_VERSION}\`,
  images: \`\${CACHE_PREFIX}-images-\${CACHE_VERSION}\`,
  api: \`\${CACHE_PREFIX}-api-\${CACHE_VERSION}\`
};

// Recursos críticos para precache
const PRECACHE_RESOURCES = [
  '/',
  '/dashboard',
  '/chat',
  '/offline',
  '/manifest.json',
  '/static/css/main.css',
  '/static/js/main.js'
];

// Estrategias de cache
const CACHE_STRATEGIES = ${JSON.stringify(this.config.cacheStrategies, null, 2)};

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then((cache) => {
        return cache.addAll(PRECACHE_RESOURCES);
      })
      .then(() => {
        console.log('[SW] Precache completed');
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName.startsWith(CACHE_PREFIX) && 
                !Object.values(CACHE_NAMES).includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activation completed');
        return self.clients.claim();
      })
  );
});

// Interceptación de requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests que no sean GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Aplicar estrategia de cache apropiada
  const strategy = getStrategyForRequest(request);
  
  if (strategy) {
    event.respondWith(handleRequestWithStrategy(request, strategy));
  }
});

// Determina la estrategia de cache para un request
function getStrategyForRequest(request) {
  const url = request.url;
  
  for (const strategy of CACHE_STRATEGIES) {
    if (strategy.pattern.test(url)) {
      return strategy;
    }
  }
  
  return null;
}

// Maneja request con estrategia específica
async function handleRequestWithStrategy(request, strategy) {
  const cacheName = getCacheNameForStrategy(strategy);
  
  switch (strategy.strategy) {
    case 'cache-first':
      return cacheFirst(request, cacheName, strategy);
    case 'network-first':
      return networkFirst(request, cacheName, strategy);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request, cacheName, strategy);
    case 'network-only':
      return fetch(request);
    case 'cache-only':
      return caches.match(request);
    default:
      return fetch(request);
  }
}

// Obtiene nombre de cache para estrategia
function getCacheNameForStrategy(strategy) {
  switch (strategy.name) {
    case 'static-assets':
      return CACHE_NAMES.static;
    case 'images':
      return CACHE_NAMES.images;
    case 'api-data':
    case 'chat-data':
      return CACHE_NAMES.api;
    default:
      return CACHE_NAMES.dynamic;
  }
}

// Estrategia Cache First
async function cacheFirst(request, cacheName, strategy) {
  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Verificar si no ha expirado
      const cachedTime = cachedResponse.headers.get('sw-cached-time');
      if (cachedTime && strategy.maxAge) {
        const age = Date.now() - parseInt(cachedTime);
        if (age > strategy.maxAge) {
          // Expirado, intentar actualizar en background
          updateCacheInBackground(request, cacheName);
        }
      }
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    await cacheResponse(request, networkResponse.clone(), cacheName);
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    return getOfflineResponse(request);
  }
}

// Estrategia Network First
async function networkFirst(request, cacheName, strategy) {
  try {
    const networkResponse = await Promise.race([
      fetch(request),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 
                   strategy.networkTimeout || 5000);
      })
    ]);
    
    await cacheResponse(request, networkResponse.clone(), cacheName);
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network first fallback to cache:', error.message);
    const cachedResponse = await caches.match(request);
    return cachedResponse || getOfflineResponse(request);
  }
}

// Estrategia Stale While Revalidate
async function staleWhileRevalidate(request, cacheName, strategy) {
  const cachedResponse = await caches.match(request);
  
  const fetchPromise = fetch(request)
    .then(response => {
      cacheResponse(request, response.clone(), cacheName);
      return response;
    })
    .catch(error => {
      console.error('[SW] Revalidation failed:', error);
      return null;
    });
  
  return cachedResponse || await fetchPromise || getOfflineResponse(request);
}

// Cachea una respuesta
async function cacheResponse(request, response, cacheName) {
  if (!response || response.status !== 200) {
    return;
  }
  
  const cache = await caches.open(cacheName);
  
  // Agregar timestamp para control de expiración
  const responseWithTimestamp = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      ...response.headers,
      'sw-cached-time': Date.now().toString()
    }
  });
  
  await cache.put(request, responseWithTimestamp);
}

// Actualiza cache en background
function updateCacheInBackground(request, cacheName) {
  fetch(request)
    .then(response => {
      if (response.status === 200) {
        cacheResponse(request, response, cacheName);
      }
    })
    .catch(error => {
      console.error('[SW] Background update failed:', error);
    });
}

// Respuesta offline
function getOfflineResponse(request) {
  const url = new URL(request.url);
  
  // Para navegación, devolver página offline
  if (request.mode === 'navigate') {
    return caches.match(OFFLINE_PAGE);
  }
  
  // Para imágenes, devolver placeholder
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="16" fill="#999">Imagen no disponible</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  // Para API, devolver respuesta de error
  if (url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Sin conexión a internet' }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
  
  return new Response('Offline', { status: 503 });
}

// Background Sync
${this.config.backgroundSync ? `
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Background sync started');
  
  try {
    // Sincronizar datos pendientes
    const pendingRequests = await getPendingRequests();
    
    for (const request of pendingRequests) {
      try {
        await fetch(request);
        await removePendingRequest(request);
      } catch (error) {
        console.error('[SW] Failed to sync request:', error);
      }
    }
    
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETED' });
      });
    });
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

async function getPendingRequests() {
  // Implementar lógica para obtener requests pendientes
  return [];
}

async function removePendingRequest(request) {
  // Implementar lógica para remover request pendiente
}
` : ''}

// Push Notifications
${this.config.pushNotifications ? `
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icon-192x192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Fini AI', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
});
` : ''}

// Manejo de mensajes
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
  }
});

// Limpia todos los caches
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

console.log('[SW] Service Worker loaded, version:', CACHE_VERSION);
`;
  }

  /**
   * Sincroniza requests pendientes
   */
  private async syncPendingRequests(): Promise<void> {
    if (!this.registration) return;

    try {
      // Verificar si background sync está disponible
      if ('sync' in this.registration) {
        await (this.registration as any).sync.register('background-sync');
        logger.info('[SW] Background sync registered');
      } else {
        logger.warn('[SW] Background sync not supported');
      }
    } catch (error) {
      logger.error('[SW] Background sync registration failed', error);
    }
  }

  /**
   * Verifica si está offline
   */
  isOffline(): boolean {
    return !this.isOnline;
  }

  /**
   * Verifica si hay actualización disponible
   */
  hasUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Obtiene el estado del Service Worker
   */
  getStatus(): {
    registered: boolean;
    active: boolean;
    updateAvailable: boolean;
    online: boolean;
    version: string;
  } {
    return {
      registered: !!this.registration,
      active: !!this.registration?.active,
      updateAvailable: this.updateAvailable,
      online: this.isOnline,
      version: this.config.version
    };
  }

  /**
   * Actualiza configuración
   */
  updateConfig(newConfig: Partial<ServiceWorkerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('[SW] Configuration updated');
  }

  /**
   * Desregistra el Service Worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      logger.info('[SW] Service Worker unregistered');
      return result;
    } catch (error) {
      logger.error('[SW] Failed to unregister Service Worker', error);
      return false;
    }
  }
}

// Instancia singleton
export const serviceWorkerManager = ServiceWorkerManager.getInstance();

// Funciones de utilidad
export const registerServiceWorker = () => {
  return serviceWorkerManager.register();
};

export const applyServiceWorkerUpdate = () => {
  return serviceWorkerManager.applyUpdate();
};

export const getServiceWorkerStatus = () => {
  return serviceWorkerManager.getStatus();
};

export const isOffline = () => {
  return serviceWorkerManager.isOffline();
};

export const hasServiceWorkerUpdate = () => {
  return serviceWorkerManager.hasUpdateAvailable();
};

export const generateServiceWorkerCode = () => {
  return serviceWorkerManager.generateServiceWorkerCode();
};

export default serviceWorkerManager; 