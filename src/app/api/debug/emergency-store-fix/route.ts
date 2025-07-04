import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Emergency Store Fix - Find and repair store database issues
 * GET /api/debug/emergency-store-fix
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[EMERGENCY-FIX] Starting emergency store diagnosis...');
    
    // Use service role to bypass RLS and see all data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const problemStoreId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
    
    const results: any = {
      timestamp: new Date().toISOString(),
      problemStoreId,
      findings: []
    };

    // Check 1: Look for the specific store ID
    console.log('[EMERGENCY-FIX] 1. Checking for specific store ID...');
    const { data: specificStore, error: specificError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', problemStoreId);

    results.findings.push({
      check: 'Specific Store ID',
      storeId: problemStoreId,
      found: specificStore?.length || 0,
      error: specificError?.message,
      data: specificStore
    });

    // Check 2: Look for stores with the platform store ID
    console.log('[EMERGENCY-FIX] 2. Checking for platform store ID...');
    const { data: platformStores, error: platformError } = await supabase
      .from('stores')
      .select('*')
      .eq('platform_store_id', '2088752');

    results.findings.push({
      check: 'Platform Store ID 2088752',
      found: platformStores?.length || 0,
      error: platformError?.message,
      data: platformStores
    });

    // Check 3: Look for stores with name "LOBO"
    console.log('[EMERGENCY-FIX] 3. Checking for store name LOBO...');
    const { data: namedStores, error: namedError } = await supabase
      .from('stores')
      .select('*')
      .ilike('name', '%LOBO%');

    results.findings.push({
      check: 'Store Name LOBO',
      found: namedStores?.length || 0,
      error: namedError?.message,
      data: namedStores
    });

    // Check 4: Get all stores for user facundo@infinure
    console.log('[EMERGENCY-FIX] 4. Getting all stores for user...');
    
    // First get the user ID
    const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
    let targetUserId = null;
    
    if (userData?.users) {
      const targetUser = userData.users.find((u: any) => u.email === 'facundo@infinure.com');
      targetUserId = targetUser?.id;
    }

    if (targetUserId) {
      const { data: userStores, error: userStoresError } = await supabase
        .from('stores')
        .select('*')
        .eq('user_id', targetUserId);

      results.findings.push({
        check: 'All User Stores',
        userId: targetUserId,
        found: userStores?.length || 0,
        error: userStoresError?.message,
        data: userStores
      });
    } else {
      results.findings.push({
        check: 'All User Stores',
        found: 0,
        error: 'User not found or user lookup failed',
        data: null
      });
    }

    // Check 5: Look for recent stores (last 7 days)
    console.log('[EMERGENCY-FIX] 5. Checking recent stores...');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentStores, error: recentError } = await supabase
      .from('stores')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    results.findings.push({
      check: 'Recent Stores (7 days)',
      found: recentStores?.length || 0,
      error: recentError?.message,
      data: recentStores
    });

    // Analysis
    const validStores = results.findings
      .filter(f => f.found > 0 && f.data)
      .flatMap(f => f.data)
      .filter(store => store.access_token); // Only stores with valid tokens

    results.analysis = {
      totalFindings: results.findings.length,
      storesWithValidTokens: validStores.length,
      recommendedStoreId: validStores.length > 0 ? validStores[0].id : null,
      needsReconnection: validStores.length === 0,
      duplicateStores: results.findings.some(f => f.found > 1)
    };

    if (validStores.length > 0) {
      results.solution = {
        action: 'UPDATE_STORE_ID',
        oldStoreId: problemStoreId,
        newStoreId: validStores[0].id,
        storeName: validStores[0].name,
        instructions: [
          'Use the new store ID for all operations',
          'Test RAG sync with the valid store',
          'Update any hardcoded references'
        ]
      };
    } else {
      results.solution = {
        action: 'RECONNECT_STORE',
        instructions: [
          'Go to Configuration → Store',
          'Click Reconnect Store',
          'Complete OAuth flow with TiendaNube',
          'Wait for sync to complete'
        ]
      };
    }

    console.log('[EMERGENCY-FIX] Emergency diagnosis completed');

    return NextResponse.json({
      success: true,
      message: 'Emergency store diagnosis completed',
      results
    });

  } catch (error) {
    console.error('[EMERGENCY-FIX] Emergency diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Emergency diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 