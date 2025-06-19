/**
 * API para probar la conexión con Tienda Nube
 * POST /api/tiendanube/test-connection
 * GET /api/tiendanube/test-connection
 */

import { NextRequest, NextResponse } from 'next/server';

interface TestConnectionRequest {
  storeId: string;
  accessToken: string;
  environment?: 'development' | 'staging' | 'production';
  endpoint?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.warn('[TIENDANUBE-TEST] Processing connection test request');
    
    const body = await request.json();
    const { storeId, accessToken, environment = 'development', endpoint = 'store' }: TestConnectionRequest = body;

    // Validate input
    if (!storeId) {
      return NextResponse.json({
        success: false,
        error: 'Store ID is required'
      }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Access token is required'
      }, { status: 400 });
    }

    // Configurar URLs según el entorno
    const config = {
      development: {
        apiBase: 'https://api.tiendanube.com/v1',
        name: 'Development'
      },
      staging: {
        apiBase: 'https://api-staging.tiendanube.com/v1',
        name: 'Staging'
      },
      production: {
        apiBase: 'https://api.tiendanube.com/v1',
        name: 'Production'
      }
    };

    const envConfig = config[environment];
    const testUrl = `${envConfig.apiBase}/${storeId}/${endpoint}`;

    console.warn('[TIENDANUBE-TEST] Testing connection:', {
      environment: envConfig.name,
      storeId,
      endpoint,
      url: testUrl
    });

    // Realizar la prueba de conexión
    const startTime = Date.now();
    
    const response = await fetch(testUrl, {
      headers: {
        'Authentication': `bearer ${accessToken}`,
        'User-Agent': 'FiniAI/1.0 (Connection Testing)',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      const data = await response.json();
      
      console.warn('[TIENDANUBE-TEST] Connection successful:', {
        status: response.status,
        responseTime: `${responseTime}ms`,
        dataKeys: Object.keys(data)
      });

      return NextResponse.json({
        success: true,
        data: {
          environment: envConfig.name,
          storeId,
          endpoint,
          url: testUrl,
          responseTime: `${responseTime}ms`,
          status: response.status,
          data,
          headers: {
            'content-type': response.headers.get('content-type'),
            'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
          }
        },
        message: `Connection to ${envConfig.name} environment successful`
      });
    } else {
      const errorText = await response.text();
      
      console.error('[TIENDANUBE-TEST] Connection failed:', {
        status: response.status,
        statusText: response.statusText,
        responseTime: `${responseTime}ms`,
        error: errorText
      });

      return NextResponse.json({
        success: false,
        error: `Connection failed: ${response.status} ${response.statusText}`,
        details: {
          environment: envConfig.name,
          storeId,
          endpoint,
          url: testUrl,
          responseTime: `${responseTime}ms`,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: {
            'content-type': response.headers.get('content-type'),
            'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining'),
            'x-ratelimit-reset': response.headers.get('x-ratelimit-reset')
          }
        }
      }, { status: response.status });
    }

  } catch (error) {
    console.error('[TIENDANUBE-TEST] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to test connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Tienda Nube Connection Test API',
    usage: {
      method: 'POST',
      endpoint: '/api/tiendanube/test-connection',
      body: {
        storeId: 'your-store-id',
        accessToken: 'your-access-token',
        environment: 'development | staging | production',
        endpoint: 'store | products | orders | customers'
      }
    },
    features: [
      'Test connection to any Tienda Nube environment',
      'Measure response times',
      'Check rate limits',
      'Validate access tokens',
      'Test different API endpoints'
    ],
    environments: {
      development: 'https://api.tiendanube.com/v1',
      staging: 'https://api-staging.tiendanube.com/v1',
      production: 'https://api.tiendanube.com/v1'
    },
    commonEndpoints: [
      'store - Store information',
      'products - List products',
      'orders - List orders',
      'customers - List customers'
    ]
  });
} 