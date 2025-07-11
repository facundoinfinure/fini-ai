import { NextRequest, NextResponse } from 'next/server';
import { ConnectionHealthChecker } from '@/lib/diagnostics/connection-health-checker';

/**
 * Health Check API Endpoint
 * GET /api/health - Retorna estado completo del sistema
 * GET /api/health?service=<name> - Retorna estado de un servicio específico
 * GET /api/health?format=simple - Retorna formato simplificado
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service');
    const format = searchParams.get('format');

    const healthChecker = ConnectionHealthChecker.getInstance();

    if (service) {
      // Retornar estado de un servicio específico
      const fullReport = await healthChecker.runFullHealthCheck();
      const serviceResult = fullReport.services.find(s => 
        s.service.toLowerCase() === service.toLowerCase()
      );

      if (!serviceResult) {
        return NextResponse.json(
          { error: 'Service not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(serviceResult);
    }

    // Retornar estado completo del sistema
    const report = await healthChecker.runFullHealthCheck();

    if (format === 'simple') {
      // Formato simplificado para monitoring externo
      return NextResponse.json({
        status: report.overall,
        timestamp: report.timestamp,
        services: report.services.map(s => ({
          name: s.service,
          status: s.status,
          latency: s.latency
        }))
      });
    }

    // Formato completo con métricas adicionales
    const servicesWithMetrics = report.services.map(service => {
      const metrics = healthChecker.getUptimeMetrics(service.service);
      return {
        ...service,
        metrics
      };
    });

    return NextResponse.json({
      ...report,
      services: servicesWithMetrics
    });

  } catch (error) {
    console.error('[HEALTH-API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Health check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Health Check Simple para Load Balancers
 * HEAD /api/health - Retorna solo status code
 */
export async function HEAD(request: NextRequest) {
  try {
    const healthChecker = ConnectionHealthChecker.getInstance();
    const report = await healthChecker.runFullHealthCheck();
    
    // Retornar 200 si el sistema está healthy o degraded
    // Retornar 503 si está unhealthy
    const statusCode = report.overall === 'unhealthy' ? 503 : 200;
    
    return new NextResponse(null, { status: statusCode });
  } catch (error) {
    return new NextResponse(null, { status: 503 });
  }
}