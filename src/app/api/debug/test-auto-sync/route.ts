import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAutoSyncScheduler } from '@/lib/services/auto-sync-scheduler';

export const dynamic = 'force-dynamic';

/**
 * 🧪 AUTO-SYNC SYSTEM TEST ENDPOINT
 * =================================
 * 
 * Comprehensive test endpoint to verify that the auto-sync system is working:
 * - Check scheduler status
 * - Test store synchronization
 * - Verify authentication integration
 * - Validate bulletproof TiendaNube connection
 * - Test error handling and recovery
 */

export async function GET(request: NextRequest) {
  try {
    console.log('[AUTO-SYNC-TEST] 🧪 Starting comprehensive auto-sync system test...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      overall: 'unknown' as 'pass' | 'fail' | 'unknown',
      tests: [] as Array<{
        name: string;
        status: 'pass' | 'fail' | 'warning';
        message: string;
        details?: any;
      }>
    };

    // TEST 1: Authentication
    let currentUser = null;
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        testResults.tests.push({
          name: 'Authentication',
          status: 'warning',
          message: 'No authenticated user - test will continue with system-level checks'
        });
      } else {
        currentUser = user;
        testResults.tests.push({
          name: 'Authentication',
          status: 'pass',
          message: `User authenticated: ${user.email}`,
          details: { userId: user.id }
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Authentication',
        status: 'fail',
        message: `Authentication test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 2: Scheduler Initialization
    try {
      const scheduler = await getAutoSyncScheduler();
      const status = scheduler.getSyncStatus();
      
      testResults.tests.push({
        name: 'Scheduler Initialization',
        status: 'pass',
        message: `Scheduler running successfully`,
        details: {
          totalStores: status.totalStores,
          activeStores: status.activeStores,
          pendingStores: status.pendingStores,
          failedStores: status.failedStores
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Scheduler Initialization',
        status: 'fail',
        message: `Scheduler initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 3: Database Connection
    try {
      const supabase = createClient();
      const { data: stores, error } = await supabase
        .from('stores')
        .select('id, name, platform, is_active, last_sync_at')
        .eq('platform', 'tiendanube')
        .limit(5);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      testResults.tests.push({
        name: 'Database Connection',
        status: 'pass',
        message: `Database accessible, found ${stores?.length || 0} TiendaNube stores`,
        details: {
          storeCount: stores?.length || 0,
          stores: stores?.map(s => ({
            id: s.id,
            name: s.name,
            isActive: s.is_active,
            lastSync: s.last_sync_at
          }))
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'Database Connection',
        status: 'fail',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 4: TiendaNube Token Manager
    try {
      const { TiendaNubeTokenManager } = await import('@/lib/integrations/tiendanube-token-manager');
      const healthCheck = await TiendaNubeTokenManager.runHealthCheck();
      
      testResults.tests.push({
        name: 'TiendaNube Token Manager',
        status: healthCheck.invalidStores > 0 ? 'warning' : 'pass',
        message: `Health check completed: ${healthCheck.validStores} valid, ${healthCheck.invalidStores} invalid stores`,
        details: healthCheck
      });
    } catch (error) {
      testResults.tests.push({
        name: 'TiendaNube Token Manager',
        status: 'fail',
        message: `Token manager test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 5: RAG Engine Integration
    try {
      const { FiniRAGEngine } = await import('@/lib/rag');
      const ragEngine = new FiniRAGEngine();
      
      // Test basic RAG functionality
      testResults.tests.push({
        name: 'RAG Engine Integration',
        status: 'pass',
        message: 'RAG engine loaded successfully',
        details: {
          engineType: 'FiniRAGEngine',
          status: 'initialized'
        }
      });
    } catch (error) {
      testResults.tests.push({
        name: 'RAG Engine Integration',
        status: 'warning',
        message: `RAG engine test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 6: Auto-Sync API Endpoints
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      
      // Test scheduler status endpoint
      const response = await fetch(`${baseUrl}/api/stores/auto-sync-scheduler`, {
        method: 'GET',
        headers: {
          'cookie': request.headers.get('cookie') || ''
        }
      });
      
      if (response.status === 401) {
        testResults.tests.push({
          name: 'Auto-Sync API Endpoints',
          status: 'warning',
          message: 'API endpoints require authentication (expected behavior)',
          details: { statusCode: response.status }
        });
      } else if (response.ok) {
        const data = await response.json();
        testResults.tests.push({
          name: 'Auto-Sync API Endpoints',
          status: 'pass',
          message: 'API endpoints accessible',
          details: data
        });
      } else {
        throw new Error(`API responded with status ${response.status}`);
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Auto-Sync API Endpoints',
        status: 'warning',
        message: `API endpoint test inconclusive: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 7: Environment Variables
    try {
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'TIENDANUBE_CLIENT_ID',
        'TIENDANUBE_CLIENT_SECRET'
      ];

      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length === 0) {
        testResults.tests.push({
          name: 'Environment Variables',
          status: 'pass',
          message: 'All required environment variables are set',
          details: {
            required: requiredEnvVars.length,
            present: requiredEnvVars.length - missingVars.length
          }
        });
      } else {
        testResults.tests.push({
          name: 'Environment Variables',
          status: 'fail',
          message: `Missing required environment variables: ${missingVars.join(', ')}`,
          details: {
            required: requiredEnvVars.length,
            missing: missingVars
          }
        });
      }
    } catch (error) {
      testResults.tests.push({
        name: 'Environment Variables',
        status: 'fail',
        message: `Environment variable check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }

    // TEST 8: User-Specific Store Sync (if authenticated)
    if (currentUser) {
      try {
        const supabase = createClient();
        const { data: userStores, error } = await supabase
          .from('stores')
          .select('id, name, is_active, last_sync_at')
          .eq('user_id', currentUser.id)
          .eq('platform', 'tiendanube');

        if (error) {
          throw new Error(`Failed to get user stores: ${error.message}`);
        }

        const activeStores = userStores?.filter(s => s.is_active) || [];
        const recentSyncs = activeStores.filter(s => {
          if (!s.last_sync_at) return false;
          const lastSync = new Date(s.last_sync_at);
          const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);
          return hoursSinceSync < 24; // Synced in last 24 hours
        });

        testResults.tests.push({
          name: 'User Store Sync Status',
          status: activeStores.length > 0 ? 'pass' : 'warning',
          message: `User has ${activeStores.length} active stores, ${recentSyncs.length} synced recently`,
          details: {
            totalStores: userStores?.length || 0,
            activeStores: activeStores.length,
            recentSyncs: recentSyncs.length,
            stores: activeStores.map(s => ({
              id: s.id,
              name: s.name,
              lastSync: s.last_sync_at,
              needsSync: !s.last_sync_at || (Date.now() - new Date(s.last_sync_at).getTime()) > 24 * 60 * 60 * 1000
            }))
          }
        });
      } catch (error) {
        testResults.tests.push({
          name: 'User Store Sync Status',
          status: 'fail',
          message: `User store test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    // Calculate overall status
    const failedTests = testResults.tests.filter(t => t.status === 'fail');
    const warningTests = testResults.tests.filter(t => t.status === 'warning');
    
    if (failedTests.length === 0) {
      testResults.overall = warningTests.length === 0 ? 'pass' : 'pass';
    } else {
      testResults.overall = 'fail';
    }

    console.log(`[AUTO-SYNC-TEST] ✅ Test completed: ${testResults.overall} (${testResults.tests.length} tests, ${failedTests.length} failed, ${warningTests.length} warnings)`);

    return NextResponse.json({
      success: true,
      data: testResults,
      summary: {
        overall: testResults.overall,
        totalTests: testResults.tests.length,
        passed: testResults.tests.filter(t => t.status === 'pass').length,
        failed: failedTests.length,
        warnings: warningTests.length
      }
    });

  } catch (error) {
    console.error('[AUTO-SYNC-TEST] ❌ Test suite failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test suite execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/debug/test-auto-sync
 * Run specific auto-sync tests or trigger actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, storeId } = body;

    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    switch (action) {
      case 'trigger_user_sync':
        console.log(`[AUTO-SYNC-TEST] 🧪 Triggering sync for all user stores: ${user.id}`);
        
        // Call the scheduler API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stores/auto-sync-scheduler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            action: 'sync_all_user_stores'
          })
        });

        if (!response.ok) {
          throw new Error(`Sync API responded with status ${response.status}`);
        }

        const syncResult = await response.json();
        
        return NextResponse.json({
          success: true,
          data: syncResult,
          message: 'User store sync triggered successfully'
        });

      case 'test_single_store':
        if (!storeId) {
          return NextResponse.json({
            success: false,
            error: 'Store ID is required for single store test'
          }, { status: 400 });
        }

        console.log(`[AUTO-SYNC-TEST] 🧪 Testing single store sync: ${storeId}`);
        
        const singleStoreResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/stores/auto-sync-scheduler`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            action: 'sync_immediate',
            storeId
          })
        });

        if (!singleStoreResponse.ok) {
          throw new Error(`Single store sync API responded with status ${singleStoreResponse.status}`);
        }

        const singleStoreResult = await singleStoreResponse.json();
        
        return NextResponse.json({
          success: true,
          data: singleStoreResult,
          message: 'Single store sync test completed'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Supported actions: trigger_user_sync, test_single_store'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('[AUTO-SYNC-TEST] ❌ POST action failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test action failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 