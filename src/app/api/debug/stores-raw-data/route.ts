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
 * 🔍 RAW STORES DATA INSPECTOR
 * ============================
 * 
 * Muestra los datos raw de todas las stores para diagnosticar
 * problemas de estructura y campos faltantes.
 */
export async function GET() {
  try {
    console.log('[STORES-RAW] Fetching all stores data...');
    
    // Get ALL stores without any filters
    const { data: allStores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('*');

    if (storesError) {
      console.error('[STORES-RAW] Error fetching stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: storesError.message
      }, { status: 500 });
    }

    // Get tiendanube_tokens data
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('tiendanube_tokens')
      .select('*');

    if (tokensError) {
      console.error('[STORES-RAW] Error fetching tokens:', tokensError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch tokens',
        details: tokensError.message
      }, { status: 500 });
    }

    // Analyze the data
    const analysis = {
      totalStores: allStores?.length || 0,
      totalTokens: tokens?.length || 0,
      platformBreakdown: {},
      missingFields: {
        platform: 0,
        accessToken: 0,
        platformStoreId: 0
      },
      storesSummary: allStores?.map(store => ({
        id: store.id,
        name: store.name,
        platform: store.platform,
        hasPlatform: !!store.platform,
        hasAccessToken: !!store.access_token,
        hasPlatformStoreId: !!store.platform_store_id,
        userId: store.user_id,
        isActive: store.is_active,
        createdAt: store.created_at
      })) || [],
      tokensSummary: tokens?.map(token => ({
        storeId: token.store_id,
        userId: token.user_id,
        hasAccessToken: !!token.access_token,
        hasRefreshToken: !!token.refresh_token,
        expiresAt: token.expires_at
      })) || []
    };

    // Count platforms
    allStores?.forEach(store => {
      const platform = store.platform || 'null';
      analysis.platformBreakdown[platform] = (analysis.platformBreakdown[platform] || 0) + 1;
      
      if (!store.platform) analysis.missingFields.platform++;
      if (!store.access_token) analysis.missingFields.accessToken++;
      if (!store.platform_store_id) analysis.missingFields.platformStoreId++;
    });

    // Find matching tokens for stores
    const storesWithTokens = allStores?.map(store => {
      const matchingToken = tokens?.find(token => 
        token.store_id === store.id && token.user_id === store.user_id
      );
      
      return {
        store: {
          id: store.id,
          name: store.name,
          platform: store.platform,
          hasAccessToken: !!store.access_token
        },
        token: matchingToken ? {
          hasAccessToken: !!matchingToken.access_token,
          hasRefreshToken: !!matchingToken.refresh_token,
          expiresAt: matchingToken.expires_at
        } : null,
        isSync: !!matchingToken
      };
    }) || [];

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      analysis,
      storesWithTokens,
      issues: {
        missingPlatformField: analysis.missingFields.platform > 0,
        missingAccessTokens: analysis.missingFields.accessToken > 0,
        missingPlatformStoreIds: analysis.missingFields.platformStoreId > 0,
        tokensNotSynced: analysis.totalStores !== analysis.totalTokens
      },
      recommendations: [
        analysis.missingFields.platform > 0 && "Update stores with missing 'platform' field",
        analysis.missingFields.accessToken > 0 && "Stores without access_token need reconnection",
        analysis.totalStores !== analysis.totalTokens && "Token migration may be incomplete"
      ].filter(Boolean)
    });

  } catch (error) {
    console.error('[STORES-RAW] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch raw data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 