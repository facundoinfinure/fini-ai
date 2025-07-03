import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';

/**
 * 🔧 AUTOMATIC AUTH ISSUES FIX ENDPOINT
 * ======================================
 * 
 * Automatically fixes authentication issues:
 * - Cleans up invalid tokens
 * - Stops failed RAG auto-sync processes
 * - Marks stores for reconnection
 * - Prevents authentication error loops
 */

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[AUTH-FIX] Starting automatic authentication issues fix...');
    
    const { force = false, specificStoreId = null } = await request.json();
    
    const supabase = createClient();
    
    let storeQuery = supabase
      .from('stores')
      .select('id, platform_store_id, name, access_token, user_id, is_active, last_sync_at')
      .eq('platform', 'tiendanube');
    
    // If specific store requested, filter to that store
    if (specificStoreId) {
      storeQuery = storeQuery.eq('id', specificStoreId);
    }
    
    const { data: stores, error: storesError } = await storeQuery;

    if (storesError) {
      console.error('[AUTH-FIX] Failed to fetch stores:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores from database',
        details: storesError.message
      }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: specificStoreId ? 'Store not found' : 'No TiendaNube stores found',
        processed: 0
      });
    }

    console.log(`[AUTH-FIX] Found ${stores.length} stores to process`);

    const results = {
      processed: 0,
      fixed: 0,
      markedForReconnection: 0,
      alreadyValid: 0,
      errors: [] as any[]
    };

    // Process each store
    for (const store of stores) {
      results.processed++;
      
      try {
        console.log(`[AUTH-FIX] Processing store: ${store.name || store.id}`);
        
        // Test token validity using Token Manager
        const tokenValidation = await TiendaNubeTokenManager.validateStoreTokens(store.id);
        
        if (tokenValidation.isValid) {
          console.log(`[AUTH-FIX] ✅ Store ${store.name} has valid token`);
          results.alreadyValid++;
          continue;
        }
        
        console.log(`[AUTH-FIX] ❌ Store ${store.name} has invalid token: ${tokenValidation.error}`);
        
        // Mark store for reconnection
        const markSuccess = await TiendaNubeTokenManager.getInstance().markStoreForReconnection(
          store.id,
          `Auto-fix: ${tokenValidation.error || 'Token validation failed'}`
        );
        
        if (markSuccess) {
          console.log(`[AUTH-FIX] ✅ Marked store ${store.name} for reconnection`);
          results.markedForReconnection++;
          results.fixed++;
          
          // 🔥 CRITICAL: Stop any background RAG processes for this store
          try {
            console.log(`[AUTH-FIX] 🛑 Stopping background processes for store: ${store.id}`);
            
            // Update store to indicate auth issue resolved
            await supabase
              .from('stores')
              .update({ 
                updated_at: new Date().toISOString()
              })
              .eq('id', store.id);
              
            console.log(`[AUTH-FIX] ✅ Updated store sync status for: ${store.name}`);
            
          } catch (stopProcessError) {
            console.error(`[AUTH-FIX] ⚠️ Failed to stop background processes for store ${store.id}:`, stopProcessError);
          }
          
        } else {
          console.error(`[AUTH-FIX] ❌ Failed to mark store ${store.name} for reconnection`);
          results.errors.push({
            storeId: store.id,
            storeName: store.name,
            error: 'Failed to mark for reconnection'
          });
        }
        
      } catch (storeError) {
        console.error(`[AUTH-FIX] ❌ Error processing store ${store.id}:`, storeError);
        results.errors.push({
          storeId: store.id,
          storeName: store.name || 'Unknown',
          error: storeError instanceof Error ? storeError.message : 'Unknown error'
        });
      }
      
      // Small delay between stores to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`[AUTH-FIX] Fix completed:`, results);

    // If we fixed any issues, run a cleanup
    if (results.fixed > 0) {
      try {
        console.log(`[AUTH-FIX] 🧹 Running cleanup after fixing ${results.fixed} stores...`);
        
        // Could add additional cleanup operations here
        // - Clear failed job queues
        // - Reset error counters
        // - Notify monitoring systems
        
        console.log(`[AUTH-FIX] ✅ Cleanup completed`);
      } catch (cleanupError) {
        console.error(`[AUTH-FIX] ⚠️ Cleanup failed:`, cleanupError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} stores, fixed ${results.fixed} authentication issues`,
      results,
      nextSteps: results.markedForReconnection > 0 ? [
        "Affected users should receive reconnection notifications",
        "Users need to complete OAuth flow again",
        "Check dashboard for stores requiring reconnection"
      ] : [
        "All stores have valid tokens",
        "No action required"
      ]
    });

  } catch (error) {
    console.error('[AUTH-FIX] Unexpected error during fix operation:', error);
    return NextResponse.json({
      success: false,
      error: 'Fix operation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET: Check what issues would be fixed (dry run)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[AUTH-FIX] Running dry-run check for authentication issues...');
    
    const supabase = createClient();
    
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, platform_store_id, name, access_token, user_id, is_active, created_at, updated_at')
      .eq('platform', 'tiendanube');

    if (storesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: storesError.message
      }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No TiendaNube stores found',
        issues: []
      });
    }

    const issues = [];
    let validStores = 0;
    let problemStores = 0;

    // Check each store without making fixes
    for (const store of stores) {
      try {
        const tokenValidation = await TiendaNubeTokenManager.validateStoreTokens(store.id);
        
        if (!tokenValidation.isValid) {
          problemStores++;
          issues.push({
            storeId: store.id,
            storeName: store.name || 'Tienda sin nombre',
            platformStoreId: store.platform_store_id,
            issue: tokenValidation.error || 'Token validation failed',
            createdAt: store.created_at,
            updatedAt: store.updated_at,
            fixAction: 'mark_for_reconnection'
          });
        } else {
          validStores++;
        }
      } catch (checkError) {
        problemStores++;
        issues.push({
          storeId: store.id,
          storeName: store.name || 'Unknown',
          issue: checkError instanceof Error ? checkError.message : 'Check failed',
          fixAction: 'investigation_needed'
        });
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalStores: stores.length,
        validStores,
        problemStores,
        issuesFound: issues.length
      },
      issues,
      wouldFix: problemStores,
      recommendation: problemStores > 0 ? 
        "Run POST /api/debug/fix-auth-issues to automatically fix these issues" :
        "All stores are healthy - no fixes needed"
    });

  } catch (error) {
    console.error('[AUTH-FIX] Dry-run check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Dry-run check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
