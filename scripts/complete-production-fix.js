#!/usr/bin/env node

/**
 * COMPLETE PRODUCTION FIX - Soluciona TODOS los problemas identificados
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const colors = {
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', 
  blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    log('🔧 COMPLETE PRODUCTION FIX - SOLUCIONANDO TODO', 'cyan');
    
    // Create TiendaNube Auto-Refresh System
    const autoRefreshCode = `/**
 * TiendaNube Token Auto-Refresh System
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TiendaNubeTokenManager } from './tiendanube-token-manager';

export class TiendaNubeAutoRefresh {
  private static instance: TiendaNubeAutoRefresh;
  private refreshQueue = new Map<string, Promise<string>>();
  
  static getInstance(): TiendaNubeAutoRefresh {
    if (!TiendaNubeAutoRefresh.instance) {
      TiendaNubeAutoRefresh.instance = new TiendaNubeAutoRefresh();
    }
    return TiendaNubeAutoRefresh.instance;
  }
  
  async getValidToken(storeId: string, userId: string): Promise<string> {
    try {
      const tokenManager = TiendaNubeTokenManager.getInstance();
      return await tokenManager.getValidToken(storeId, userId);
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('expired')) {
        console.log('[AUTO-REFRESH] Token expired, attempting refresh...');
        return this.handleTokenRefresh(storeId, userId);
      }
      throw error;
    }
  }
  
  private async handleTokenRefresh(storeId: string, userId: string): Promise<string> {
    const key = storeId + ':' + userId;
    
    if (this.refreshQueue.has(key)) {
      return this.refreshQueue.get(key)!;
    }
    
    const refreshPromise = this.performTokenRefresh(storeId, userId);
    this.refreshQueue.set(key, refreshPromise);
    
    try {
      const result = await refreshPromise;
      this.refreshQueue.delete(key);
      return result;
    } catch (error) {
      this.refreshQueue.delete(key);
      throw error;
    }
  }
  
  private async performTokenRefresh(storeId: string, userId: string): Promise<string> {
    const supabase = createServerSupabaseClient();
    
    const { data: tokenData, error } = await supabase
      .from('tiendanube_tokens')
      .select('*')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .single();
      
    if (error || !tokenData?.refresh_token) {
      throw new Error('Token not found - user needs to reconnect TiendaNube');
    }
    
    const response = await fetch('https://www.tiendanube.com/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: process.env.TIENDANUBE_CLIENT_ID!,
        client_secret: process.env.TIENDANUBE_CLIENT_SECRET!,
      }),
    });
    
    if (!response.ok) throw new Error('Failed to refresh token');
    
    const refreshData = await response.json();
    
    await supabase.from('tiendanube_tokens').update({
      access_token: refreshData.access_token,
      refresh_token: refreshData.refresh_token || tokenData.refresh_token,
      expires_at: new Date(Date.now() + (refreshData.expires_in * 1000)).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('store_id', storeId).eq('user_id', userId);
    
    console.log('[AUTO-REFRESH] ✅ Token refreshed successfully');
    return refreshData.access_token;
  }
}

export const tiendaNubeAutoRefresh = TiendaNubeAutoRefresh.getInstance();`;

    // Write auto-refresh system
    const autoRefreshPath = path.join(__dirname, '../src/lib/integrations/tiendanube-auto-refresh.ts');
    fs.writeFileSync(autoRefreshPath, autoRefreshCode);
    log('✅ TiendaNube auto-refresh system created', 'green');
    
    // Create health monitoring endpoint
    const healthCode = `import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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
      const supabase = createServerSupabaseClient();
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
      const supabase = createServerSupabaseClient();
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
}`;

    // Write health endpoint
    const healthDir = path.join(__dirname, '../src/app/api/health');
    if (!fs.existsSync(healthDir)) {
      fs.mkdirSync(healthDir, { recursive: true });
    }
    fs.writeFileSync(path.join(healthDir, 'route.ts'), healthCode);
    log('✅ Health monitoring endpoint created', 'green');
    
    // Show completion summary
    log('\n🎯 ALL FIXES APPLIED SUCCESSFULLY!', 'green');
    log('\n🚀 NEXT STEPS:', 'yellow');
    log('1. Configure Stripe webhook secret in Vercel:', 'blue');
    log('   • Go to https://dashboard.stripe.com/webhooks', 'blue');
    log('   • Copy signing secret and add to Vercel env vars', 'blue');
    log('   • Redeploy the application', 'blue');
    log('\n2. Test fixes: Visit https://fini-tn.vercel.app/api/health', 'blue');
    log('\n📋 FILES CREATED:', 'cyan');
    log('   • src/lib/integrations/tiendanube-auto-refresh.ts', 'blue');
    log('   • src/app/api/health/route.ts', 'blue');
    
  } catch (error) {
    log('❌ Fix failed: ' + error.message, 'red');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
