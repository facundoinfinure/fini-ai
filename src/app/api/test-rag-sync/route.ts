import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Test RAG Data Synchronization
 * GET /api/test-rag-sync - Shows sync status
 * POST /api/test-rag-sync - Triggers sync for active stores
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Check environment configuration
    const envStatus = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
      PINECONE_INDEX_NAME: !!process.env.PINECONE_INDEX_NAME,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    };

    const missingVars = Object.entries(envStatus)
      .filter(([_, hasVar]) => !hasVar)
      .map(([varName, _]) => varName);

    const isFullyConfigured = missingVars.length === 0;

    let storeInfo = null;
    let ragStatus = null;

    if (envStatus.NEXT_PUBLIC_SUPABASE_URL && envStatus.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Get store information
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: stores, error } = await supabase
          .from('stores')
          .select('id, name, user_id, access_token, is_active, created_at, last_sync_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && stores) {
          storeInfo = {
            totalStores: stores.length,
            storesWithTokens: stores.filter(s => s.access_token).length,
            stores: stores.map(store => ({
              id: store.id,
              name: store.name,
              hasAccessToken: !!store.access_token,
              lastSync: store.last_sync_at,
              createdAt: store.created_at
            }))
          };
        }
      } catch (dbError) {
        console.error('[DEBUG] Database connection failed:', dbError);
      }
    }

    // Test RAG engine if fully configured
    if (isFullyConfigured) {
      try {
        const { FiniRAGEngine } = await import('@/lib/rag');
        const ragEngine = new FiniRAGEngine();
        const stats = await ragEngine.getStats();
        
        ragStatus = {
          isConfigured: stats.isConfigured,
          errors: stats.errors,
          embeddings: stats.embeddings,
          vectorStore: stats.vectorStore
        };
      } catch (ragError) {
        ragStatus = {
          isConfigured: false,
          error: ragError instanceof Error ? ragError.message : 'Unknown error'
        };
      }
    }

    return NextResponse.json({
      success: true,
      environment: {
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development',
        isFullyConfigured,
        missingVars,
        envStatus
      },
      stores: storeInfo,
      rag: ragStatus,
      instructions: {
        production: [
          "1. Visit https://fini-ai.vercel.app/api/test-rag-sync in production",
          "2. All environment variables should be configured",
          "3. POST to this endpoint to trigger sync for all stores",
          "4. Check response for detailed sync results"
        ],
        development: [
          "1. Environment variables are not set in development",
          "2. RAG functionality requires production environment",
          "3. Use Vercel deployment to test RAG synchronization",
          "4. Monitor Vercel function logs for sync progress"
        ]
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: {
        isProduction: process.env.NODE_ENV === 'production',
        isDevelopment: process.env.NODE_ENV === 'development'
      }
    }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    // Check if we're properly configured
    const requiredVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'PINECONE_API_KEY',
      'PINECONE_INDEX_NAME',
      'OPENAI_API_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing required environment variables',
        missingVars,
        note: 'RAG sync requires production environment with all variables configured'
      }, { status: 400 });
    }

    // Get active stores
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, user_id, access_token, is_active')
      .eq('is_active', true)
      .not('access_token', 'is', null);

    if (storesError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch stores',
        details: storesError.message
      }, { status: 500 });
    }

    if (!stores || stores.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active stores with access tokens found',
        note: 'Stores need valid access tokens to sync data from external APIs'
      }, { status: 400 });
    }

    console.log(`[TEST-RAG] Starting sync for ${stores.length} stores...`);

    // Import the sync function
    const { StoreService } = await import('@/lib/database/client');
    
    const syncResults = [];

    // Trigger sync for each store
    for (const store of stores) {
      try {
        console.log(`[TEST-RAG] Triggering sync for store: ${store.name} (${store.id})`);
        
        // This is async fire-and-forget, so we trigger it and move on
        StoreService.syncStoreDataToRAGAsync(store.id);
        
        syncResults.push({
          storeId: store.id,
          storeName: store.name,
          status: 'triggered',
          triggeredAt: new Date().toISOString()
        });

        console.log(`[TEST-RAG] Sync triggered for store: ${store.id}`);
        
      } catch (error) {
        console.error(`[TEST-RAG] Failed to trigger sync for store ${store.id}:`, error);
        syncResults.push({
          storeId: store.id,
          storeName: store.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'RAG data sync triggered for all eligible stores',
      results: {
        totalStores: stores.length,
        triggered: syncResults.filter(r => r.status === 'triggered').length,
        failed: syncResults.filter(r => r.status === 'failed').length,
        details: syncResults
      },
      monitoring: {
        note: 'Sync operations run asynchronously in the background',
        checkLogs: 'Monitor Vercel function logs for detailed progress',
        expectedDuration: '1-5 minutes per store depending on data size',
        namespaces: 'Check Pinecone console for new store-specific namespaces'
      }
    });

  } catch (error) {
    console.error('[TEST-RAG] POST request failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 