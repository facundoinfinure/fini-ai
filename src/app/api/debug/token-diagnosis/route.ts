import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';

/**
 * 🔧 COMPREHENSIVE TOKEN DIAGNOSIS ENDPOINT
 * ==========================================
 * 
 * Diagnoses and fixes TiendaNube authentication issues:
 * - Tests all stored tokens
 * - Identifies invalid/expired tokens
 * - Provides reconnection URLs
 * - Fixes broken store configurations
 */

export const dynamic = 'force-dynamic';

interface StoreTokenDiagnosis {
  storeId: string;
  storeName: string;
  platformStoreId: string;
  hasAccessToken: boolean;
  tokenStatus: 'valid' | 'invalid' | 'missing' | 'error';
  apiTestResult?: any;
  error?: string;
  reconnectionRequired: boolean;
  reconnectionUrl?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[TOKEN-DIAGNOSIS] Starting comprehensive token diagnosis...');
    
    const supabase = createClient();
    
    // Get all TiendaNube stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, platform_store_id, name, access_token, user_id, is_active, created_at, last_sync_at')
      .eq('platform', 'tiendanube')
      .order('created_at', { ascending: false });

    if (storesError) {
      console.error('[TOKEN-DIAGNOSIS] Failed to fetch stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores from database',
        details: storesError.message
      }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No TiendaNube stores found',
        stores: [],
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          missing: 0,
          reconnectionRequired: 0
        }
      });
    }

    console.log(`[TOKEN-DIAGNOSIS] Found ${stores.length} TiendaNube stores to diagnose`);

    const diagnosis: StoreTokenDiagnosis[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let missingCount = 0;
    let reconnectionRequired = 0;

    // Process stores in batches to avoid overwhelming APIs
    const batchSize = 3;
    for (let i = 0; i < stores.length; i += batchSize) {
      const batch = stores.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (store) => {
        console.log(`[TOKEN-DIAGNOSIS] Testing store: ${store.name || store.id}`);
        
        const storeDiagnosis: StoreTokenDiagnosis = {
          storeId: store.id,
          storeName: store.name || 'Tienda sin nombre',
          platformStoreId: store.platform_store_id,
          hasAccessToken: !!store.access_token,
          tokenStatus: 'missing',
          reconnectionRequired: false
        };

        // Check if token exists
        if (!store.access_token) {
          storeDiagnosis.tokenStatus = 'missing';
          storeDiagnosis.error = 'No access token found in database';
          storeDiagnosis.reconnectionRequired = true;
          missingCount++;
          return storeDiagnosis;
        }

        // Test token with TiendaNube API
        try {
          console.log(`[TOKEN-DIAGNOSIS] Testing API connection for store: ${store.platform_store_id}`);
          
          const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
          const storeInfo = await api.getStore();
          
          storeDiagnosis.tokenStatus = 'valid';
          storeDiagnosis.apiTestResult = {
            storeId: storeInfo.id,
            storeName: storeInfo.name,
            url: storeInfo.url,
            testSuccess: true
          };
          validCount++;
          
          console.log(`[TOKEN-DIAGNOSIS] ✅ Token valid for store: ${store.name}`);
          
        } catch (apiError) {
          console.error(`[TOKEN-DIAGNOSIS] ❌ Token test failed for store: ${store.name}`, apiError);
          
          storeDiagnosis.tokenStatus = 'invalid';
          storeDiagnosis.error = apiError instanceof Error ? apiError.message : 'Unknown API error';
          storeDiagnosis.reconnectionRequired = true;
          invalidCount++;

          // Check if it's specifically an auth error
          if (apiError instanceof Error && 
              (apiError.message.includes('401') || 
               apiError.message.includes('403') || 
               apiError.message.includes('Authentication failed'))) {
            
            // Mark store for reconnection using Token Manager
            try {
              await TiendaNubeTokenManager.getInstance().markStoreForReconnection(
                store.id,
                `Token diagnosis: ${apiError.message}`
              );
              
              // Generate reconnection URL
              const reconnectionData = {
                storeId: store.id,
                storeName: store.name || 'Tienda sin nombre',
                platformStoreId: store.platform_store_id,
                userId: store.user_id,
                lastValidation: new Date().toISOString(),
                reconnectionRequired: true
              };
              
              storeDiagnosis.reconnectionUrl = TiendaNubeTokenManager.getInstance().generateReconnectionUrl(reconnectionData);
              reconnectionRequired++;
              
            } catch (markError) {
              console.error(`[TOKEN-DIAGNOSIS] Failed to mark store for reconnection:`, markError);
            }
          }
        }

        return storeDiagnosis;
      });

      const batchResults = await Promise.all(batchPromises);
      diagnosis.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < stores.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Generate summary
    const summary = {
      total: stores.length,
      valid: validCount,
      invalid: invalidCount,
      missing: missingCount,
      reconnectionRequired,
      testCompleted: new Date().toISOString()
    };

    console.log(`[TOKEN-DIAGNOSIS] Diagnosis completed:`, summary);

    // Check for immediate fixes we can apply
    const fixableIssues = [];
    const criticalIssues = diagnosis.filter(d => d.reconnectionRequired);

    if (criticalIssues.length > 0) {
      fixableIssues.push({
        type: 'critical_auth_failures',
        count: criticalIssues.length,
        description: 'Stores with invalid tokens requiring reconnection',
        stores: criticalIssues.map(s => ({
          name: s.storeName,
          storeId: s.storeId,
          reconnectionUrl: s.reconnectionUrl
        }))
      });
    }

    return NextResponse.json({
      success: true,
      summary,
      diagnosis,
      fixableIssues,
      recommendations: [
        criticalIssues.length > 0 && "Critical: Users need to reconnect their stores through OAuth",
        invalidCount > 0 && "Consider implementing proactive token validation",
        validCount === 0 && stores.length > 0 && "Emergency: All tokens are invalid - check TiendaNube app configuration"
      ].filter(Boolean),
      nextSteps: {
        immediate: criticalIssues.length > 0 ? "Send reconnection notifications to affected users" : "All tokens are healthy",
        preventive: "Implement regular token health checks",
        monitoring: "Set up alerts for authentication failures"
      }
    });

  } catch (error) {
    console.error('[TOKEN-DIAGNOSIS] Unexpected error during diagnosis:', error);
    return NextResponse.json({
      success: false,
      error: 'Token diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST: Fix specific token issues
 */
export async function POST(request: NextRequest) {
  try {
    const { action, storeId, force = false } = await request.json();
    
    if (!action || !storeId) {
      return NextResponse.json({
        success: false,
        error: 'Action and storeId are required'
      }, { status: 400 });
    }

    console.log(`[TOKEN-DIAGNOSIS] Executing fix action: ${action} for store: ${storeId}`);

    const supabase = createClient();

    switch (action) {
      case 'mark_for_reconnection':
        const success = await TiendaNubeTokenManager.getInstance().markStoreForReconnection(
          storeId,
          'Manual fix via token diagnosis'
        );

        if (success) {
          return NextResponse.json({
            success: true,
            message: `Store ${storeId} marked for reconnection`,
            action: 'marked_for_reconnection'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Failed to mark store for reconnection'
          }, { status: 500 });
        }

      case 'test_token':
        // Get store and test its token
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError || !store) {
          return NextResponse.json({
            success: false,
            error: 'Store not found'
          }, { status: 404 });
        }

        if (!store.access_token) {
          return NextResponse.json({
            success: false,
            error: 'Store has no access token',
            requiresReconnection: true
          });
        }

        try {
          const api = new TiendaNubeAPI(store.access_token, store.platform_store_id);
          const storeInfo = await api.getStore();
          
          return NextResponse.json({
            success: true,
            tokenValid: true,
            storeInfo: {
              id: storeInfo.id,
              name: storeInfo.name,
              url: storeInfo.url
            }
          });
        } catch (apiError) {
          return NextResponse.json({
            success: false,
            tokenValid: false,
            error: apiError instanceof Error ? apiError.message : 'API test failed',
            requiresReconnection: true
          });
        }

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[TOKEN-DIAGNOSIS] Fix operation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Fix operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
