import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CircuitBreakerManager } from '@/lib/resilience/circuit-breaker'
import { RetryManager, RetryConfigs } from '@/lib/resilience/retry-manager'

export function createClient() {
  const cookieStore = cookies()

  // Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[DEBUG] Supabase config check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length,
    keyLength: supabaseAnonKey?.length,
    urlPrefix: supabaseUrl?.substring(0, 20),
    keyPrefix: supabaseAnonKey?.substring(0, 20)
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[ERROR] Missing Supabase environment variables:', {
      url: supabaseUrl ? 'SET' : 'MISSING',
      key: supabaseAnonKey ? 'SET' : 'MISSING'
    })
    throw new Error('Supabase configuration is incomplete')
  }

  try {
    const client = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    console.log('[DEBUG] Supabase client created successfully')
    return client
  } catch (error) {
    console.error('[ERROR] Failed to create Supabase client:', error)
    throw error
  }
}

/**
 * Connection Pool para Supabase
 * Gestiona conexiones reutilizables con circuit breaker y retry logic
 */
class SupabaseConnectionPool {
  private static instance: SupabaseConnectionPool;
  private serviceClient: any;
  private circuitBreaker: any;
  private retryManager: RetryManager;
  private connectionCount: number = 0;
  private maxConnections: number = 10;

  private constructor() {
    this.retryManager = RetryManager.getInstance();
    this.circuitBreaker = CircuitBreakerManager.getInstance().getBreaker('supabase-connection', {
      failureThreshold: 5,
      resetTimeout: 30000,
      monitoringPeriod: 15000,
      expectedErrors: ['timeout', 'connection', 'network', 'ECONNRESET']
    });

    this.initializeServiceClient();
  }

  static getInstance(): SupabaseConnectionPool {
    if (!SupabaseConnectionPool.instance) {
      SupabaseConnectionPool.instance = new SupabaseConnectionPool();
    }
    return SupabaseConnectionPool.instance;
  }

  private initializeServiceClient(): void {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase service configuration');
    }

    this.serviceClient = createServerClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    );
  }

  /**
   * Obtiene una conexión service con circuit breaker
   */
  async getServiceConnection(): Promise<any> {
    if (this.connectionCount >= this.maxConnections) {
      throw new Error('Connection pool exhausted');
    }

    try {
      this.connectionCount++;
      
      const result = await this.circuitBreaker.execute(async () => {
        return await this.retryManager.executeWithRetry(
          async () => {
            // Test de conexión básico
            const { data, error } = await this.serviceClient
              .from('users')
              .select('count')
              .limit(1);

            if (error) {
              throw new Error(`Connection test failed: ${error.message}`);
            }

            return this.serviceClient;
          },
          RetryConfigs.DATABASE,
          'supabase-connection-test'
        );
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(`Connection failed: ${result.error?.message}`);
      }

    } catch (error) {
      this.connectionCount--;
      throw error;
    }
  }

  /**
   * Libera una conexión
   */
  releaseConnection(): void {
    if (this.connectionCount > 0) {
      this.connectionCount--;
    }
  }

  /**
   * Obtiene métricas del pool
   */
  getMetrics(): {
    activeConnections: number;
    maxConnections: number;
    circuitBreakerState: any;
    retryStats: any;
  } {
    return {
      activeConnections: this.connectionCount,
      maxConnections: this.maxConnections,
      circuitBreakerState: this.circuitBreaker.getMetrics(),
      retryStats: this.retryManager.getRetryStats('supabase-connection-test')
    };
  }
}

// Service client for admin operations (bypasses RLS)
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service configuration')
  }

  try {
    const client = createServerClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )
    
    console.log('[DEBUG] Supabase service client created successfully')
    return client
  } catch (error) {
    console.error('[ERROR] Failed to create Supabase service client:', error)
    throw error
  }
}

/**
 * Obtiene una conexión service con connection pooling
 */
export async function getPooledServiceClient(): Promise<any> {
  const pool = SupabaseConnectionPool.getInstance();
  return await pool.getServiceConnection();
}

/**
 * Libera una conexión del pool
 */
export function releasePooledConnection(): void {
  const pool = SupabaseConnectionPool.getInstance();
  pool.releaseConnection();
}

/**
 * Obtiene métricas del connection pool
 */
export function getConnectionPoolMetrics(): any {
  const pool = SupabaseConnectionPool.getInstance();
  return pool.getMetrics();
} 