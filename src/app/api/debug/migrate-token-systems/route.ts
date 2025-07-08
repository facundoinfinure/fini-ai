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
 * 🔄 MIGRATE TOKEN SYSTEMS
 * ========================
 * 
 * Migra tokens de stores.access_token a tiendanube_tokens para 
 * sincronizar ambos sistemas y eliminar inconsistencias.
 */
export async function POST() {
  try {
    console.log('[TOKEN-MIGRATION] 🚀 Starting token systems migration...');
    
    // 1. Obtener todas las stores con tokens
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .eq('platform', 'tiendanube')
      .not('access_token', 'is', null);

    if (storesError) {
      console.error('[TOKEN-MIGRATION] ❌ Error fetching stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: storesError.message
      }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      console.log('[TOKEN-MIGRATION] ℹ️ No TiendaNube stores with tokens found');
      return NextResponse.json({
        success: true,
        message: 'No stores to migrate',
        summary: {
          storesFound: 0,
          tokensMigrated: 0,
          errors: 0
        }
      });
    }

    console.log(`[TOKEN-MIGRATION] 📋 Found ${stores.length} stores with tokens`);

    const results = [];
    let migrated = 0;
    let errors = 0;
    let skipped = 0;

    // 2. Migrar cada store
    for (const store of stores) {
      try {
        console.log(`[TOKEN-MIGRATION] 🔄 Processing store: ${store.name} (${store.id})`);

        // Verificar si ya existe en tiendanube_tokens
        const { data: existingToken, error: checkError } = await supabaseAdmin
          .from('tiendanube_tokens')
          .select('*')
          .eq('store_id', store.id)
          .eq('user_id', store.user_id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // Error diferente a "no rows found"
          console.warn(`[TOKEN-MIGRATION] ⚠️ Error checking existing token for store ${store.id}:`, checkError);
          errors++;
          results.push({
            storeId: store.id,
            storeName: store.name,
            status: 'error',
            error: `Check failed: ${checkError.message}`
          });
          continue;
        }

        if (existingToken) {
          console.log(`[TOKEN-MIGRATION] ⭐ Token already exists for store ${store.id}, skipping`);
          skipped++;
          results.push({
            storeId: store.id,
            storeName: store.name,
            status: 'skipped',
            reason: 'Token already exists in tiendanube_tokens'
          });
          continue;
        }

        // Migrar token
        const tokenData = {
          store_id: store.id,
          user_id: store.user_id,
          access_token: store.access_token,
          refresh_token: store.refresh_token,
          expires_at: store.token_expires_at || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabaseAdmin
          .from('tiendanube_tokens')
          .insert(tokenData);

        if (insertError) {
          console.error(`[TOKEN-MIGRATION] ❌ Failed to migrate token for store ${store.id}:`, insertError);
          errors++;
          results.push({
            storeId: store.id,
            storeName: store.name,
            status: 'error',
            error: `Migration failed: ${insertError.message}`
          });
        } else {
          console.log(`[TOKEN-MIGRATION] ✅ Successfully migrated token for store ${store.id}`);
          migrated++;
          results.push({
            storeId: store.id,
            storeName: store.name,
            status: 'migrated',
            tokenData: {
              hasAccessToken: !!tokenData.access_token,
              hasRefreshToken: !!tokenData.refresh_token,
              expiresAt: tokenData.expires_at
            }
          });
        }

      } catch (error) {
        console.error(`[TOKEN-MIGRATION] ❌ Unexpected error for store ${store.id}:`, error);
        errors++;
        results.push({
          storeId: store.id,
          storeName: store.name || 'Unknown',
          status: 'error',
          error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
        });
      }
    }

    const summary = {
      storesFound: stores.length,
      tokensMigrated: migrated,
      tokensSkipped: skipped,
      errors: errors,
      success: errors === 0
    };

    console.log('[TOKEN-MIGRATION] 📊 Migration completed:', summary);

    return NextResponse.json({
      success: true,
      message: `Token migration completed. Migrated: ${migrated}, Skipped: ${skipped}, Errors: ${errors}`,
      summary,
      results,
      nextSteps: [
        'Run health check to verify both systems are synchronized',
        'Test token-diagnosis endpoint to confirm tokens are accessible',
        'Test RAG functionality with migrated tokens'
      ]
    });

  } catch (error) {
    console.error('[TOKEN-MIGRATION] ❌ Fatal error during migration:', error);
    return NextResponse.json({
      success: false,
      error: 'Token migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET: Show migration status and information
 */
export async function GET() {
  try {
    console.log('[TOKEN-MIGRATION] 📋 Checking migration status...');

    // Check stores with tokens
    const { data: storesWithTokens, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('id, name, user_id, access_token, refresh_token, token_expires_at')
      .eq('platform', 'tiendanube')
      .not('access_token', 'is', null);

    if (storesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check stores',
        details: storesError.message
      }, { status: 500 });
    }

    // Check tiendanube_tokens
    const { data: tokenEntries, error: tokensError } = await supabaseAdmin
      .from('tiendanube_tokens')
      .select('store_id, user_id, access_token, refresh_token, expires_at');

    if (tokensError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to check tiendanube_tokens',
        details: tokensError.message
      }, { status: 500 });
    }

    const storesCount = storesWithTokens?.length || 0;
    const tokensCount = tokenEntries?.length || 0;

    const needsMigration = storesCount > tokensCount;
    const isSync = storesCount === tokensCount;

    return NextResponse.json({
      success: true,
      status: {
        needsMigration,
        isSync,
        storesWithTokens: storesCount,
        tokensInSeparateTable: tokensCount,
        difference: storesCount - tokensCount
      },
      stores: storesWithTokens?.map(store => ({
        id: store.id,
        name: store.name,
        hasAccessToken: !!store.access_token,
        hasRefreshToken: !!store.refresh_token,
        tokenExpires: store.token_expires_at
      })) || [],
      tokens: tokenEntries?.map(token => ({
        storeId: token.store_id,
        userId: token.user_id,
        hasAccessToken: !!token.access_token,
        hasRefreshToken: !!token.refresh_token,
        expires: token.expires_at
      })) || [],
      recommendation: needsMigration 
        ? 'Run POST /api/debug/migrate-token-systems to sync both systems'
        : isSync 
          ? 'Systems are synchronized'
          : 'Review manually - more tokens than stores found'
    });

  } catch (error) {
    console.error('[TOKEN-MIGRATION] ❌ Error checking migration status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 