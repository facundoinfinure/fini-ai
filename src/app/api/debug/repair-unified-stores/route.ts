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
 * 🔧 REPAIR UNIFIED STORES SYSTEM
 * ===============================
 * 
 * Repara y activa el sistema unificado de stores:
 * 1. Activa stores desactivadas con tokens válidos
 * 2. Corrige platform_store_id faltantes
 * 3. Valida estructura multi-plataforma
 * 4. Prepara sistema para Shopify/WooCommerce
 */
export async function POST() {
  try {
    console.log('[REPAIR-STORES] 🔧 Starting unified stores repair...');
    
    const results = {
      storesActivated: 0,
      platformIdsFixed: 0,
      storesValidated: 0,
      storesWithIssues: 0,
      actions: [] as string[],
      issues: [] as string[],
      storeDetails: [] as any[]
    };

    // 1. Obtener todas las stores
    console.log('[REPAIR-STORES] 1️⃣ Fetching all stores...');
    
    const { data: stores, error: fetchError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch stores: ${fetchError.message}`);
    }

    if (!stores || stores.length === 0) {
      console.log('[REPAIR-STORES] No stores found in system');
      return NextResponse.json({
        success: true,
        message: 'No stores found - system ready for first store creation',
        results: {
          ...results,
          actions: ['ℹ️ No stores found in system']
        }
      });
    }

    console.log(`[REPAIR-STORES] Found ${stores.length} stores`);

    // 2. Reparar cada store
    for (const store of stores) {
      console.log(`[REPAIR-STORES] Processing store: ${store.name || store.id}`);
      
      const storeIssues: string[] = [];
      const storeActions: string[] = [];
      let needsUpdate = false;
      const updates: any = {};

      // 2.1 Verificar y corregir platform_store_id
      if (!store.platform_store_id && store.tiendanube_store_id) {
        console.log(`[REPAIR-STORES] Copying tiendanube_store_id to platform_store_id for store: ${store.id}`);
        updates.platform_store_id = store.tiendanube_store_id;
        storeActions.push('✅ Set platform_store_id from tiendanube_store_id');
        needsUpdate = true;
        results.platformIdsFixed++;
      } else if (!store.platform_store_id) {
        storeIssues.push('❌ Missing platform_store_id and tiendanube_store_id');
        results.storesWithIssues++;
      }

      // 2.2 Verificar y activar stores con tokens válidos
      if (!store.is_active && store.access_token) {
        console.log(`[REPAIR-STORES] Activating store with valid token: ${store.id}`);
        updates.is_active = true;
        updates.updated_at = new Date().toISOString();
        storeActions.push('✅ Activated store (has valid access_token)');
        needsUpdate = true;
        results.storesActivated++;
      } else if (!store.access_token) {
        storeIssues.push('❌ Missing access_token - needs OAuth reconnection');
        results.storesWithIssues++;
      }

      // 2.3 Asegurar platform field
      if (!store.platform) {
        console.log(`[REPAIR-STORES] Setting default platform to tiendanube for store: ${store.id}`);
        updates.platform = 'tiendanube';
        storeActions.push('✅ Set platform to tiendanube (default)');
        needsUpdate = true;
      }

      // 2.4 Aplicar updates si es necesario
      if (needsUpdate) {
        console.log(`[REPAIR-STORES] Updating store: ${store.id}`, updates);
        
        const { error: updateError } = await supabaseAdmin
          .from('stores')
          .update(updates)
          .eq('id', store.id);

        if (updateError) {
          console.error(`[REPAIR-STORES] Failed to update store ${store.id}:`, updateError);
          storeIssues.push(`❌ Update failed: ${updateError.message}`);
          results.storesWithIssues++;
        } else {
          console.log(`[REPAIR-STORES] ✅ Store updated successfully: ${store.id}`);
          results.storesValidated++;
        }
      } else {
        console.log(`[REPAIR-STORES] Store already valid: ${store.id}`);
        results.storesValidated++;
      }

      // Guardar detalles del store
      results.storeDetails.push({
        id: store.id,
        name: store.name || 'Unnamed Store',
        platform: store.platform || updates.platform || 'unknown',
        platformStoreId: store.platform_store_id || updates.platform_store_id || 'missing',
        isActive: store.is_active || updates.is_active || false,
        hasToken: !!store.access_token,
        actions: storeActions,
        issues: storeIssues
      });
    }

    // 3. Verificar estado final
    console.log('[REPAIR-STORES] 3️⃣ Verifying final state...');
    
    const { data: finalStores, error: finalError } = await supabaseAdmin
      .from('stores')
      .select('id, name, platform, platform_store_id, is_active, access_token')
      .order('created_at', { ascending: false });

    if (finalError) {
      console.error('[REPAIR-STORES] Failed to verify final state:', finalError);
      results.issues.push('⚠️ Could not verify final state');
    } else {
      const activeStores = finalStores?.filter(s => s.is_active).length || 0;
      const storesWithTokens = finalStores?.filter(s => s.access_token).length || 0;
      const storesWithPlatformId = finalStores?.filter(s => s.platform_store_id).length || 0;
      
      results.actions.push(`✅ Final state: ${activeStores}/${finalStores?.length} stores active`);
      results.actions.push(`✅ Tokens: ${storesWithTokens}/${finalStores?.length} stores have access_token`);
      results.actions.push(`✅ Platform IDs: ${storesWithPlatformId}/${finalStores?.length} stores have platform_store_id`);
    }

    // 4. Test Universal Token Manager
    try {
      console.log('[REPAIR-STORES] 4️⃣ Testing Universal Token Manager...');
      
      const { UniversalTokenManager } = await import('@/lib/integrations/universal-token-manager');
      
      const healthCheck = await UniversalTokenManager.getInstance().runSystemHealthCheck();
      
      results.actions.push(`✅ Universal Token Manager: ${healthCheck.validStores} valid, ${healthCheck.invalidStores} invalid`);
      
      // Mostrar breakdown por plataforma
      Object.entries(healthCheck.storesByPlatform).forEach(([platform, count]) => {
        if (count > 0) {
          results.actions.push(`📊 Platform ${platform}: ${count} stores`);
        }
      });

    } catch (error) {
      console.warn('[REPAIR-STORES] Universal Token Manager test failed:', error);
      results.issues.push('⚠️ Could not test Universal Token Manager');
    }

    // Resultado final
    const hasIssues = results.storesWithIssues > 0 || results.issues.length > 0;
    const success = !hasIssues;
    
    console.log('[REPAIR-STORES] 🎯 Repair completed');
    console.log(`[REPAIR-STORES] Success: ${success}`);
    console.log(`[REPAIR-STORES] Stores processed: ${stores.length}`);
    console.log(`[REPAIR-STORES] Activated: ${results.storesActivated}`);
    console.log(`[REPAIR-STORES] Platform IDs fixed: ${results.platformIdsFixed}`);
    console.log(`[REPAIR-STORES] Issues: ${results.storesWithIssues}`);

    return NextResponse.json({
      success,
      message: success 
        ? '🎉 Unified stores system repaired and activated successfully'
        : '⚠️ System repaired with some issues - manual review recommended',
      timestamp: new Date().toISOString(),
      results,
      nextSteps: success ? [
        '✅ Test OAuth flow end-to-end',
        '✅ Verify RAG system integration',
        '✅ Test Universal Token Manager in production',
        '✅ Ready for Shopify/WooCommerce integration'
      ] : [
        '❌ Review stores with issues above',
        '❌ Fix missing tokens via OAuth reconnection',
        '❌ Verify platform_store_id mapping',
        '❌ Manual intervention may be required'
      ]
    }, { status: success ? 200 : 207 });

  } catch (error) {
    console.error('[REPAIR-STORES] Critical error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Critical error during stores repair',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      recommendation: 'Manual intervention required - check store data integrity'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Repair Unified Stores System',
    description: 'Repairs and activates stores in the unified multi-platform system',
    usage: 'POST to this endpoint to execute store repairs',
    actions: [
      'Activate stores with valid tokens',
      'Fix missing platform_store_id fields',
      'Validate multi-platform structure',
      'Test Universal Token Manager'
    ]
  });
} 