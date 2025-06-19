import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Función para verificar conexión a Supabase
async function checkSupabaseConnection(): Promise<{ status: 'healthy' | 'unhealthy'; details?: string }> {
  if (!supabaseUrl || !supabaseServiceKey) {
    return { status: 'unhealthy', details: 'Missing Supabase credentials' };
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verificar conexión con una query simple
    const { error } = await supabase
      .from('_supabase_migrations')
      .select('version')
      .limit(1);
    
    if (error) {
      return { status: 'unhealthy', details: `Database error: ${error.message}` };
    }
    
    return { status: 'healthy' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      details: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

// Función para verificar variables de entorno críticas
function checkEnvironmentVariables(): { status: 'healthy' | 'unhealthy'; details?: string } {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    return { 
      status: 'unhealthy', 
      details: `Missing environment variables: ${missingVars.join(', ')}` 
    };
  }
  
  return { status: 'healthy' };
}

// Función para verificar memoria del sistema
function checkSystemResources(): { status: 'healthy' | 'unhealthy'; details?: string } {
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  // Considerar unhealthy si usa más del 90% de memoria
  if (memUsagePercent > 90) {
    return { 
      status: 'unhealthy', 
      details: `High memory usage: ${memUsagePercent.toFixed(2)}%` 
    };
  }
  
  return { status: 'healthy' };
}

// Función para verificar uptime
function getUptime(): number {
  return process.uptime();
}

// Función para verificar versión de Node.js
function getNodeVersion(): string {
  return process.version;
}

// Función para verificar variables de entorno opcionales
function checkOptionalServices(): Record<string, { status: 'configured' | 'not_configured' }> {
  const optionalServices = {
    tiendanube: {
      clientId: process.env.TIENDANUBE_CLIENT_ID,
      clientSecret: process.env.TIENDANUBE_CLIENT_SECRET,
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    pinecone: {
      apiKey: process.env.PINECONE_API_KEY,
      environment: process.env.PINECONE_ENVIRONMENT,
      indexName: process.env.PINECONE_INDEX_NAME,
    },
  };

  const status: Record<string, { status: 'configured' | 'not_configured' }> = {};

  Object.entries(optionalServices).forEach(([service, config]) => {
    const hasAllRequired = Object.values(config).every(value => value);
    status[service] = {
      status: hasAllRequired ? 'configured' : 'not_configured',
    };
  });

  return status;
}

export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Verificaciones en paralelo para mejor performance
    const [
      envCheck,
      supabaseCheck,
      systemCheck,
    ] = await Promise.all([
      Promise.resolve(checkEnvironmentVariables()),
      checkSupabaseConnection(),
      Promise.resolve(checkSystemResources()),
    ]);

    const responseTime = Date.now() - startTime;
    
    // Determinar estado general
    const checks = [envCheck, supabaseCheck, systemCheck];
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const overallStatus = hasUnhealthy ? 'unhealthy' : 'healthy';
    
    // Construir respuesta
    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: getUptime(),
      responseTime: `${responseTime}ms`,
      version: {
        node: getNodeVersion(),
        app: process.env.npm_package_version || '0.1.0',
      },
      environment: process.env.NODE_ENV || 'development',
      checks: {
        environment: envCheck,
        database: supabaseCheck,
        system: systemCheck,
      },
      services: checkOptionalServices(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    };

    // Headers de cache para health checks
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Type': 'application/json',
    };

    // Status code basado en salud general
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return NextResponse.json(healthData, {
      status: statusCode,
      headers,
    });

  } catch (error) {
    console.error('[ERROR] Health check failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json',
      },
    });
  }
}

// Endpoint específico para load balancers (más simple)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
} 