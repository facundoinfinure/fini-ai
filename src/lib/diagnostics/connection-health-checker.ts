/**
 * Connection Health Checker - Sistema de diagnóstico robusto para conexiones externas
 * Verifica Tienda Nube, Supabase, Pinecone y otros servicios críticos
 */

import { createServiceClient } from '@/lib/supabase/server';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { FiniRAGEngine } from '@/lib/rag/rag-engine';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  error?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  recommendations: string[];
  timestamp: Date;
}

export class ConnectionHealthChecker {
  private static instance: ConnectionHealthChecker;
  private healthHistory: Map<string, HealthCheckResult[]> = new Map();
  
  static getInstance(): ConnectionHealthChecker {
    if (!ConnectionHealthChecker.instance) {
      ConnectionHealthChecker.instance = new ConnectionHealthChecker();
    }
    return ConnectionHealthChecker.instance;
  }

  /**
   * Ejecuta health check completo del sistema
   */
  async runFullHealthCheck(): Promise<SystemHealthReport> {
    console.log('[HEALTH-CHECK] Iniciando diagnóstico completo del sistema...');
    
    const checks = await Promise.allSettled([
      this.checkSupabase(),
      this.checkTiendaNube(),
      this.checkPinecone(),
      this.checkSegment(),
      this.checkEnvironmentVariables()
    ]);

    const services: HealthCheckResult[] = checks.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        const serviceNames = ['Supabase', 'Tienda Nube', 'Pinecone', 'Segment', 'Environment'];
        return {
          service: serviceNames[index],
          status: 'unhealthy' as const,
          latency: 0,
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date()
        };
      }
    });

    // Determinar estado general del sistema
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount > 0) {
      overall = 'unhealthy';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    // Generar recomendaciones
    const recommendations = this.generateRecommendations(services);

    // Guardar en historial
    services.forEach(service => {
      const history = this.healthHistory.get(service.service) || [];
      history.push(service);
      // Mantener solo los últimos 50 checks
      if (history.length > 50) {
        history.shift();
      }
      this.healthHistory.set(service.service, history);
    });

    const report: SystemHealthReport = {
      overall,
      services,
      recommendations,
      timestamp: new Date()
    };

    console.log('[HEALTH-CHECK] Diagnóstico completado:', {
      overall,
      healthy: healthyCount,
      degraded: degradedCount,
      unhealthy: unhealthyCount
    });

    return report;
  }

  /**
   * Verifica conexión y estado de Supabase
   */
  private async checkSupabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const supabase = createServiceClient();
      
      // Test 1: Conexión básica
      const { data: connectionTest, error: connectionError } = await supabase
        .from('users')
        .select('count')
        .limit(1)
        .single();

      if (connectionError) {
        throw new Error(`Connection failed: ${connectionError.message}`);
      }

      // Test 2: Verificar RLS policies
      const { data: rlsTest, error: rlsError } = await supabase
        .rpc('check_rls_policies');

      // Test 3: Verificar schema
      const { data: schemaTest, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(5);

      const latency = Date.now() - startTime;
      
      return {
        service: 'Supabase',
        status: 'healthy',
        latency,
        details: {
          connection: 'OK',
          rls: rlsError ? 'WARNING' : 'OK',
          schema: schemaError ? 'WARNING' : 'OK',
          tables: schemaTest?.length || 0
        },
        timestamp: new Date()
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Supabase',
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Verifica conexión y autenticación con Tienda Nube
   */
  private async checkTiendaNube(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Verificar variables de entorno
      const clientId = process.env.TIENDANUBE_CLIENT_ID;
      const clientSecret = process.env.TIENDANUBE_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Missing Tienda Nube credentials');
      }

      // Obtener tienda de prueba (si existe)
      const supabase = createServiceClient();
      const { data: testStore } = await supabase
        .from('stores')
        .select('id, tiendanube_store_id')
        .eq('status', 'active')
        .limit(1)
        .single();

      let tokenTest = 'NO_STORE_TO_TEST';
      if (testStore) {
        try {
          const token = await TiendaNubeTokenManager.getValidToken(testStore.id);
          tokenTest = token ? 'VALID' : 'INVALID';
        } catch (error) {
          tokenTest = 'ERROR';
        }
      }

      const latency = Date.now() - startTime;
      
      return {
        service: 'Tienda Nube',
        status: tokenTest === 'ERROR' ? 'degraded' : 'healthy',
        latency,
        details: {
          credentials: 'OK',
          tokenTest,
          testStoreId: testStore?.tiendanube_store_id || 'none'
        },
        timestamp: new Date()
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Tienda Nube',
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Verifica conexión y estado de Pinecone
   */
  private async checkPinecone(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Verificar variables de entorno
      const apiKey = process.env.PINECONE_API_KEY;
      const environment = process.env.PINECONE_ENVIRONMENT;
      const indexName = process.env.PINECONE_INDEX_NAME;
      
      if (!apiKey || !environment || !indexName) {
        throw new Error('Missing Pinecone configuration');
      }

      // Test con RAG engine
      const ragEngine = new FiniRAGEngine();
      
      // Test básico de conexión usando getStats()
      let connectionTest = false;
      try {
        const stats = await ragEngine.getStats();
        connectionTest = stats.isConfigured && stats.errors.length === 0;
      } catch (error) {
        connectionTest = false;
      }
      
      // Test de namespace (si existe alguno)
      const supabase = createServiceClient();
      const { data: testStore } = await supabase
        .from('stores')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single();

      let namespaceTest = 'NO_STORE_TO_TEST';
      if (testStore) {
        try {
          // Usar search para verificar si el namespace existe
          const searchResult = await ragEngine.search({
            query: 'test connection',
            context: { storeId: testStore.id, userId: 'health-check' },
            options: { topK: 1 }
          });
          namespaceTest = 'OK';
        } catch (error) {
          namespaceTest = 'ERROR';
        }
      }

      const latency = Date.now() - startTime;
      
      return {
        service: 'Pinecone',
        status: connectionTest ? 'healthy' : 'degraded',
        latency,
        details: {
          connection: connectionTest ? 'OK' : 'FAILED',
          environment,
          indexName,
          namespaceTest
        },
        timestamp: new Date()
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Pinecone',
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Verifica configuración de Segment CDP
   */
  private async checkSegment(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const writeKey = process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY;
      
      if (!writeKey) {
        throw new Error('Missing Segment write key');
      }

      // Test básico de configuración
      const latency = Date.now() - startTime;
      
      return {
        service: 'Segment',
        status: 'healthy',
        latency,
        details: {
          writeKey: writeKey.substring(0, 10) + '...',
          configured: true
        },
        timestamp: new Date()
      };

    } catch (error) {
      const latency = Date.now() - startTime;
      return {
        service: 'Segment',
        status: 'unhealthy',
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  }

  /**
   * Verifica variables de entorno críticas
   */
  private async checkEnvironmentVariables(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'TIENDANUBE_CLIENT_ID',
      'TIENDANUBE_CLIENT_SECRET',
      'PINECONE_API_KEY',
      'PINECONE_ENVIRONMENT',
      'PINECONE_INDEX_NAME',
      'OPENAI_API_KEY',
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN'
    ];

    const missing: string[] = [];
    const present: string[] = [];

    requiredVars.forEach(varName => {
      if (process.env[varName]) {
        present.push(varName);
      } else {
        missing.push(varName);
      }
    });

    const latency = Date.now() - startTime;
    const status = missing.length === 0 ? 'healthy' : 'unhealthy';

    return {
      service: 'Environment',
      status,
      latency,
      error: missing.length > 0 ? `Missing variables: ${missing.join(', ')}` : undefined,
      details: {
        total: requiredVars.length,
        present: present.length,
        missing: missing.length,
        missingVars: missing
      },
      timestamp: new Date()
    };
  }

  /**
   * Genera recomendaciones basadas en los resultados de health check
   */
  private generateRecommendations(services: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    services.forEach(service => {
      if (service.status === 'unhealthy') {
        switch (service.service) {
          case 'Supabase':
            recommendations.push('🔴 Supabase: Verificar conexión a base de datos y políticas RLS');
            break;
          case 'Tienda Nube':
            recommendations.push('🔴 Tienda Nube: Verificar credenciales OAuth y tokens de acceso');
            break;
          case 'Pinecone':
            recommendations.push('🔴 Pinecone: Verificar API key y configuración del índice');
            break;
          case 'Segment':
            recommendations.push('🔴 Segment: Configurar write key para tracking de eventos');
            break;
          case 'Environment':
            recommendations.push('🔴 Environment: Configurar variables de entorno faltantes');
            break;
        }
      } else if (service.status === 'degraded') {
        recommendations.push(`🟡 ${service.service}: Servicio funcionando con limitaciones`);
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('✅ Todos los servicios están funcionando correctamente');
    }

    // Recomendaciones generales
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    if (unhealthyServices > 2) {
      recommendations.push('⚠️ Múltiples servicios afectados - revisar configuración general');
    }

    return recommendations;
  }

  /**
   * Obtiene historial de health checks para un servicio
   */
  getHealthHistory(service: string): HealthCheckResult[] {
    return this.healthHistory.get(service) || [];
  }

  /**
   * Obtiene métricas de uptime para un servicio
   */
  getUptimeMetrics(service: string): { uptime: number; avgLatency: number } {
    const history = this.getHealthHistory(service);
    if (history.length === 0) {
      return { uptime: 0, avgLatency: 0 };
    }

    const healthyCount = history.filter(h => h.status === 'healthy').length;
    const uptime = (healthyCount / history.length) * 100;
    const avgLatency = history.reduce((sum, h) => sum + h.latency, 0) / history.length;

    return { uptime, avgLatency };
  }
} 