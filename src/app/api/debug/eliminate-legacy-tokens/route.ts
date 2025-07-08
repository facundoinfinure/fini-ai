import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const dynamic = 'force-dynamic';

/**
 * 🧹 ELIMINATE LEGACY TOKEN SYSTEM
 * ================================
 * 
 * Elimina completamente el sistema legacy tiendanube_tokens y
 * confirma que el sistema unificado funciona correctamente.
 * 
 * ACCIONES:
 * 1. Eliminar tabla tiendanube_tokens (no escalable)
 * 2. Verificar integridad del sistema unificado stores
 * 3. Confirmar que todas las plataformas funcionen
 */
export async function POST() {
  try {
    console.log('[ELIMINATE-LEGACY] 🧹 Starting legacy system elimination...');
    
    const results = {
      legacyTableEliminated: false,
      unifiedSystemVerified: false,
      storesData: null as any,
      actions: [] as string[],
      errors: [] as string[]
    };

    // 1. Eliminar tabla tiendanube_tokens
    try {
      console.log('[ELIMINATE-LEGACY] 1️⃣ Eliminating tiendanube_tokens table...');
      
      const { error: dropError } = await supabaseAdmin.rpc('exec_sql', {
        sql: 'DROP TABLE IF EXISTS tiendanube_tokens CASCADE;'
      });

      if (dropError) {
        console.warn('[ELIMINATE-LEGACY] Could not drop table (may not exist):', dropError.message);
        results.actions.push('⚠️ Table tiendanube_tokens may not exist or already dropped');
      } else {
        console.log('[ELIMINATE-LEGACY] ✅ Table tiendanube_tokens eliminated');
        results.legacyTableEliminated = true;
        results.actions.push('✅ Eliminated legacy table tiendanube_tokens');
      }
      
    } catch (error) {
      const errorMsg = `Failed to eliminate legacy table: ${error instanceof Error ? error.message : error}`;
      console.error('[ELIMINATE-LEGACY] Error:', errorMsg);
      results.errors.push(errorMsg);
      results.actions.push('❌ Could not eliminate legacy table (manual intervention may be needed)');
    }

    // 2. Verificar sistema unificado stores
    try {
      console.log('[ELIMINATE-LEGACY] 2️⃣ Verifying unified stores system...');
      
      const { data: stores, error: storesError } = await supabaseAdmin
        .from('stores')
        .select(`
          id,
          user_id,
          platform,
          platform_store_id,
          name,
          domain,
          access_token,
          is_active,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (storesError) {
        throw new Error(`Stores query failed: ${storesError.message}`);
      }

      console.log(`[ELIMINATE-LEGACY] Found ${stores?.length || 0} stores in unified system`);
      
      results.storesData = {
        totalStores: stores?.length || 0,
        activeStores: stores?.filter(s => s.is_active).length || 0,
        platformBreakdown: {},
        storesWithTokens: stores?.filter(s => s.access_token).length || 0,
        storesWithoutPlatformId: stores?.filter(s => !s.platform_store_id).length || 0
      };

      // Contar por plataforma
      if (stores && stores.length > 0) {
        const platformCounts: Record<string, number> = {};
        stores.forEach(store => {
          const platform = store.platform || 'unknown';
          platformCounts[platform] = (platformCounts[platform] || 0) + 1;
        });
        results.storesData.platformBreakdown = platformCounts;
      }

      results.unifiedSystemVerified = true;
      results.actions.push(`✅ Unified system verified: ${results.storesData.totalStores} stores`);
      
      if (results.storesData.storesWithoutPlatformId > 0) {
        results.actions.push(`⚠️ Found ${results.storesData.storesWithoutPlatformId} stores without platform_store_id`);
      }

    } catch (error) {
      const errorMsg = `Failed to verify unified system: ${error instanceof Error ? error.message : error}`;
      console.error('[ELIMINATE-LEGACY] Error:', errorMsg);
      results.errors.push(errorMsg);
      results.actions.push('❌ Could not verify unified stores system');
    }

    // 3. Health check del sistema unificado
    try {
      console.log('[ELIMINATE-LEGACY] 3️⃣ Testing Universal Token Manager...');
      
      // Import dinámico para evitar problemas de dependencias
      const { UniversalTokenManager } = await import('@/lib/integrations/universal-token-manager');
      
      // Solo hacer health check básico
      const healthCheck = await UniversalTokenManager.getInstance().runSystemHealthCheck();
      
      results.actions.push(`✅ Universal Token Manager tested: ${healthCheck.totalStores} stores checked`);
      
      if (healthCheck.invalidStores > 0) {
        results.actions.push(`⚠️ Found ${healthCheck.invalidStores} stores needing reconnection`);
      }

    } catch (error) {
      const errorMsg = `Universal Token Manager test failed: ${error instanceof Error ? error.message : error}`;
      console.warn('[ELIMINATE-LEGACY] Warning:', errorMsg);
      results.actions.push('⚠️ Could not test Universal Token Manager (may need first request to initialize)');
    }

    // Resultado final
    const success = results.unifiedSystemVerified && results.errors.length === 0;
    
    console.log('[ELIMINATE-LEGACY] 🎯 Legacy elimination completed');
    console.log(`[ELIMINATE-LEGACY] Success: ${success}`);
    console.log(`[ELIMINATE-LEGACY] Actions: ${results.actions.length}`);
    console.log(`[ELIMINATE-LEGACY] Errors: ${results.errors.length}`);

    return NextResponse.json({
      success,
      message: success 
        ? '🎉 Legacy system eliminated successfully - Multi-platform architecture active'
        : '⚠️ Legacy elimination completed with warnings - Manual review needed',
      timestamp: new Date().toISOString(),
      results,
      nextSteps: success ? [
        '✅ Update all code references to use UniversalTokenManager',
        '✅ Remove TiendaNubeAutoRefresh dependencies',
        '✅ Test end-to-end OAuth flow',
        '✅ Verify RAG system integration'
      ] : [
        '❌ Review errors and warnings above',
        '❌ Manual intervention may be required',
        '❌ Contact admin for troubleshooting'
      ]
    }, { status: success ? 200 : 207 }); // 207 = Multi-Status

  } catch (error) {
    console.error('[ELIMINATE-LEGACY] Critical error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Critical error during legacy elimination',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      recommendation: 'Manual intervention required - contact system administrator'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Eliminate Legacy Token System',
    description: 'Removes tiendanube_tokens table and verifies unified multi-platform system',
    usage: 'POST to this endpoint to execute legacy elimination',
    warning: '🚨 This operation is irreversible - ensure data backup exists',
    architecture: {
      before: 'stores + tiendanube_tokens (platform-specific)',
      after: 'stores only (universal multi-platform)',
      benefits: [
        'Single source of truth for all platforms',
        'Scalable to Shopify, WooCommerce, etc.',
        'Simplified token management',
        'Reduced architectural complexity'
      ]
    }
  });
} 