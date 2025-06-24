import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request: NextRequest) {
  try {
    console.log('[INFO] Health check requested');
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        tiendanube: 'unknown',
        whatsapp: 'unknown'
      }
    };

    // Test database connection
    try {
      console.log('[INFO] Testing database connection');
      const supabase = createClient();
      const { data: _usersTable, error: dbError } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (dbError) {
        console.error('[ERROR] Database connection failed:', dbError);
        health.services.database = 'unhealthy';
        health.status = 'degraded';
      } else {
        console.log('[INFO] Database connection successful');
        health.services.database = 'healthy';
      }
    } catch (error) {
      console.error('[ERROR] Database test failed:', error);
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Test Tienda Nube API
    try {
      console.log('[INFO] Testing Tienda Nube API connection');
      const tiendanubeResponse = await fetch('https://api.tiendanube.com/v1/');
      
      // Tienda Nube API returns 401 when no auth token is provided, which is expected and means it's healthy
      if (tiendanubeResponse.status === 401 || tiendanubeResponse.ok) {
        console.log('[INFO] Tienda Nube API connection successful');
        health.services.tiendanube = 'healthy';
      } else {
        console.error('[ERROR] Tienda Nube API connection failed:', tiendanubeResponse.status);
        health.services.tiendanube = 'unhealthy';
        health.status = 'degraded';
      }
    } catch (error) {
      console.error('[ERROR] Tiendanube API test failed:', error);
      health.services.tiendanube = 'unhealthy';
      health.status = 'degraded';
    }

    // Test WhatsApp/Twilio API
    try {
      console.log('[INFO] Testing WhatsApp API connection');
      const twilioResponse = await fetch('https://api.twilio.com/2010-04-01/Accounts');
      
      if (twilioResponse.status === 401) {
        // 401 is expected without auth, means API is reachable
        console.log('[INFO] WhatsApp API connection successful');
        health.services.whatsapp = 'healthy';
      } else {
        console.error('[ERROR] WhatsApp API connection failed:', twilioResponse.status);
        health.services.whatsapp = 'unhealthy';
        health.status = 'degraded';
      }
    } catch (error) {
      console.error('[ERROR] WhatsApp API test failed:', error);
      health.services.whatsapp = 'unhealthy';
      health.status = 'degraded';
    }

    console.log('[INFO] Health check completed:', health.status);

    return NextResponse.json(health);

  } catch (error) {
    console.error('[ERROR] Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
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