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
    
    // TiendaNube Token Check
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: expiredTokens, error } = await supabase
        .from('tiendanube_tokens')
        .select('count')
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'active');
        
      if (error) throw error;
      const expiredCount = expiredTokens?.[0]?.count || 0;
      
      if (expiredCount > 0) {
        checks.push({
          service: 'TiendaNube Tokens',
          status: 'warning',
          message: expiredCount + ' expired tokens require refresh',
          details: { expiredCount }
        });
        if (overallStatus === 'healthy') overallStatus = 'warning';
      } else {
        checks.push({ service: 'TiendaNube Tokens', status: 'healthy', message: 'All tokens are valid' });
      }
    } catch (error: any) {
      checks.push({ service: 'TiendaNube Tokens', status: 'warning', message: 'Health check failed: ' + error.message });
      if (overallStatus === 'healthy') overallStatus = 'warning';
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