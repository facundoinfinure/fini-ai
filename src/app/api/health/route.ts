import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface HealthCheck {
  service: string;
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  details?: any;
}

export async function GET(_request: NextRequest) {
  const checks: HealthCheck[] = [];
  let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
  
  try {
    // Database Check
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      checks.push({ service: 'Database', status: 'healthy', message: 'Connection successful' });
    } catch (error: any) {
      checks.push({ service: 'Database', status: 'critical', message: 'Connection failed: ' + error.message });
      overallStatus = 'critical';
    }
    
    // Stripe Webhook Check
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      checks.push({ service: 'Stripe Webhook', status: 'critical', message: 'STRIPE_WEBHOOK_SECRET not configured' });
      overallStatus = 'critical';
    } else if (!webhookSecret.startsWith('whsec_')) {
      checks.push({ service: 'Stripe Webhook', status: 'critical', message: 'Invalid STRIPE_WEBHOOK_SECRET format' });
      overallStatus = 'critical';
    } else {
      checks.push({ service: 'Stripe Webhook', status: 'healthy', message: 'Webhook secret configured correctly' });
    }
    
    // Check TiendaNube tokens table exists
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: tokensData, error: tokensError } = await supabase
        .from('tiendanube_tokens')
        .select('count')
        .limit(1);

      if (tokensError) {
        checks.push({
          service: 'TiendaNube Tokens',
          status: 'warning',
          message: `Table needs manual creation: ${tokensError.message}. Use SQL Editor in Supabase Dashboard to create it.`
        });
      } else {
        checks.push({
          service: 'TiendaNube Tokens',
          status: 'healthy',
          message: 'Table exists and accessible'
        });
      }
    } catch (error) {
      checks.push({
        service: 'TiendaNube Tokens',
        status: 'warning',
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'} - Create table manually in Supabase Dashboard`
      });
    }
    
    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        warning: checks.filter(c => c.status === 'warning').length,
        critical: checks.filter(c => c.status === 'critical').length
      }
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: 'critical',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks
    }, { status: 500 });
  }
}