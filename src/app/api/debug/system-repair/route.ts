import { NextRequest, NextResponse } from 'next/server';
import { ConnectionHealthChecker } from '@/lib/diagnostics/connection-health-checker';
import { CircuitBreakerManager } from '@/lib/resilience/circuit-breaker';
import { RetryManager } from '@/lib/resilience/retry-manager';
import { segment, SegmentEvents } from '@/lib/analytics/segment-integration';
import { getConnectionPoolMetrics } from '@/lib/supabase/server';

/**
 * System Repair API Endpoint
 * Diagnóstica y repara automáticamente problemas del sistema
 */
export async function POST(request: NextRequest) {
  try {
    const { action, services } = await request.json();
    
    console.log('[SYSTEM-REPAIR] Starting system repair operation:', { action, services });
    
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      action,
      services: services || ['all'],
      diagnostics: {},
      repairs: {},
      summary: {
        totalIssues: 0,
        repairedIssues: 0,
        remainingIssues: 0
      }
    };

    // 1. Ejecutar diagnóstico completo
    console.log('[SYSTEM-REPAIR] Running full health check...');
    const healthChecker = ConnectionHealthChecker.getInstance();
    const healthReport = await healthChecker.runFullHealthCheck();
    results.diagnostics = healthReport;

    // 2. Obtener métricas de resilience
    console.log('[SYSTEM-REPAIR] Collecting resilience metrics...');
    const circuitBreakerManager = CircuitBreakerManager.getInstance();
    const retryManager = RetryManager.getInstance();
    
    results.resilience = {
      circuitBreakers: circuitBreakerManager.getAllMetrics(),
      retryStats: retryManager.getGlobalStats(),
      connectionPool: getConnectionPoolMetrics(),
      systemHealth: circuitBreakerManager.getSystemHealth()
    };

    // 3. Identificar problemas
    const issues = identifyIssues(healthReport, results.resilience);
    results.summary.totalIssues = issues.length;
    results.issues = issues;

    // 4. Aplicar reparaciones según la acción
    switch (action) {
      case 'diagnose':
        // Solo diagnóstico, no reparación
        break;
        
      case 'repair':
        console.log('[SYSTEM-REPAIR] Applying automatic repairs...');
        const repairResults = await applyRepairs(issues);
        results.repairs = repairResults;
        results.summary.repairedIssues = repairResults.successful.length;
        results.summary.remainingIssues = repairResults.failed.length;
        break;
        
      case 'reset':
        console.log('[SYSTEM-REPAIR] Resetting all circuit breakers...');
        circuitBreakerManager.resetAll();
        retryManager.clearHistory();
        results.repairs.reset = 'All circuit breakers and retry history cleared';
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: diagnose, repair, or reset' },
          { status: 400 }
        );
    }

    // 5. Ejecutar diagnóstico post-reparación
    if (action === 'repair') {
      console.log('[SYSTEM-REPAIR] Running post-repair health check...');
      const postRepairHealth = await healthChecker.runFullHealthCheck();
      results.postRepairDiagnostics = postRepairHealth;
    }

    // 6. Trackear evento en Segment
    await segment.track({
      event: SegmentEvents.SYSTEM_REPAIR_COMPLETED,
      properties: {
        action,
        totalIssues: results.summary.totalIssues,
        repairedIssues: results.summary.repairedIssues,
        remainingIssues: results.summary.remainingIssues,
        services: services || ['all'],
        overallHealth: healthReport.overall
      }
    });

    console.log('[SYSTEM-REPAIR] System repair completed:', results.summary);
    
    return NextResponse.json(results);

  } catch (error) {
    console.error('[SYSTEM-REPAIR] Error:', error);
    
    // Trackear error en Segment
    await segment.track({
      event: 'System Repair Failed',
      properties: {
        error: error instanceof Error ? error.message : 'Unknown error',
        action: request.url
      }
    });

    return NextResponse.json(
      { 
        error: 'System repair failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint para diagnóstico rápido
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'detailed';
    
    const healthChecker = ConnectionHealthChecker.getInstance();
    const healthReport = await healthChecker.runFullHealthCheck();
    
    if (format === 'simple') {
      return NextResponse.json({
        status: healthReport.overall,
        timestamp: healthReport.timestamp,
        services: healthReport.services.map(s => ({
          name: s.service,
          status: s.status,
          latency: s.latency
        }))
      });
    }
    
    // Formato detallado con métricas de resilience
    const circuitBreakerManager = CircuitBreakerManager.getInstance();
    const retryManager = RetryManager.getInstance();
    
    return NextResponse.json({
      ...healthReport,
      resilience: {
        circuitBreakers: circuitBreakerManager.getAllMetrics(),
        retryStats: retryManager.getGlobalStats(),
        connectionPool: getConnectionPoolMetrics(),
        systemHealth: circuitBreakerManager.getSystemHealth()
      },
      issues: identifyIssues(healthReport, {
        circuitBreakers: circuitBreakerManager.getAllMetrics(),
        systemHealth: circuitBreakerManager.getSystemHealth()
      })
    });
    
  } catch (error) {
    console.error('[SYSTEM-REPAIR] Diagnostic error:', error);
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Identifica problemas en el sistema
 */
function identifyIssues(healthReport: any, resilienceMetrics: any): Array<{
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  description: string;
  solution: string;
}> {
  const issues = [];

  // Verificar servicios unhealthy
  for (const service of healthReport.services) {
    if (service.status === 'unhealthy') {
      issues.push({
        type: 'service_unhealthy',
        severity: 'critical' as const,
        service: service.service,
        description: `${service.service} is unhealthy: ${service.error}`,
        solution: 'Check service configuration and network connectivity'
      });
    } else if (service.status === 'degraded') {
      issues.push({
        type: 'service_degraded',
        severity: 'medium' as const,
        service: service.service,
        description: `${service.service} is degraded`,
        solution: 'Monitor service performance and consider scaling'
      });
    }
  }

  // Verificar circuit breakers abiertos
  if (resilienceMetrics.circuitBreakers) {
    for (const [name, metrics] of Object.entries(resilienceMetrics.circuitBreakers)) {
      const cbMetrics = metrics as any;
      if (cbMetrics.state === 'OPEN') {
        issues.push({
          type: 'circuit_breaker_open',
          severity: 'high' as const,
          service: name,
          description: `Circuit breaker ${name} is OPEN (${cbMetrics.failureCount} failures)`,
          solution: 'Wait for automatic reset or manually reset circuit breaker'
        });
      }
    }
  }

  // Verificar alta latencia
  for (const service of healthReport.services) {
    if (service.latency > 10000) { // > 10 segundos
      issues.push({
        type: 'high_latency',
        severity: 'medium' as const,
        service: service.service,
        description: `${service.service} has high latency: ${service.latency}ms`,
        solution: 'Optimize service performance or increase timeout limits'
      });
    }
  }

  // Verificar pool de conexiones
  if (resilienceMetrics.connectionPool) {
    const pool = resilienceMetrics.connectionPool;
    if (pool.activeConnections >= pool.maxConnections * 0.8) {
      issues.push({
        type: 'connection_pool_exhaustion',
        severity: 'high' as const,
        service: 'Supabase Connection Pool',
        description: `Connection pool near exhaustion: ${pool.activeConnections}/${pool.maxConnections}`,
        solution: 'Increase connection pool size or optimize connection usage'
      });
    }
  }

  return issues;
}

/**
 * Aplica reparaciones automáticas
 */
async function applyRepairs(issues: Array<any>): Promise<{
  successful: Array<any>;
  failed: Array<any>;
}> {
  const successful = [];
  const failed = [];
  
  const circuitBreakerManager = CircuitBreakerManager.getInstance();
  const retryManager = RetryManager.getInstance();

  for (const issue of issues) {
    try {
      switch (issue.type) {
        case 'circuit_breaker_open':
          // Resetear circuit breaker
          const breaker = circuitBreakerManager.getBreaker(issue.service);
          breaker.reset();
          successful.push({
            issue: issue.description,
            action: 'Reset circuit breaker',
            result: 'Success'
          });
          break;
          
        case 'service_unhealthy':
          // Limpiar historial de retry para permitir nuevos intentos
          retryManager.clearHistory(issue.service);
          successful.push({
            issue: issue.description,
            action: 'Cleared retry history',
            result: 'Success'
          });
          break;
          
        case 'high_latency':
          // No hay reparación automática, solo log
          successful.push({
            issue: issue.description,
            action: 'Logged for monitoring',
            result: 'Acknowledged'
          });
          break;
          
        default:
          failed.push({
            issue: issue.description,
            action: 'No automatic repair available',
            result: 'Manual intervention required'
          });
      }
    } catch (error) {
      failed.push({
        issue: issue.description,
        action: 'Repair attempt failed',
        result: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { successful, failed };
} 