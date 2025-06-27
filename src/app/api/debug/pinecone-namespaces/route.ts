import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DEBUG endpoint to check Pinecone namespace initialization status
 * GET /api/debug/pinecone-namespaces
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG:namespaces] Starting Pinecone namespace debugging...');

    // 1. Check environment variables
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      PINECONE_API_KEY: !!process.env.PINECONE_API_KEY,
      PINECONE_INDEX_NAME: !!process.env.PINECONE_INDEX_NAME,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY
    };

    const missingVars = Object.entries(envCheck)
      .filter(([_, hasVar]) => !hasVar)
      .map(([varName, _]) => varName);

    console.log('[DEBUG:namespaces] Environment check:', envCheck);

    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        details: {
          missingVars,
          impact: 'RAG namespace initialization will fail silently',
          recommendation: 'Configure missing environment variables in Vercel dashboard'
        }
      }, { status: 500 });
    }

    // 2. Check Supabase connection and get recent stores
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[DEBUG:namespaces] Checking recent stores...');

    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, user_id, created_at, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (storesError) {
      console.error('[DEBUG:namespaces] Store fetch error:', storesError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: storesError
      }, { status: 500 });
    }

    const recentStores = stores?.filter(store => {
      const createdDate = new Date(store.created_at);
      return (Date.now() - createdDate.getTime()) < (24 * 60 * 60 * 1000); // 24 hours
    }) || [];

    console.log(`[DEBUG:namespaces] Found ${stores?.length || 0} total stores, ${recentStores.length} recent`);

    // 3. Test Pinecone API access
    let pineconeStatus = 'unknown';
    let pineconeDetails = {};
    
    try {
      console.log('[DEBUG:namespaces] Testing Pinecone API...');
      
      const pineconeResponse = await fetch('https://api.pinecone.io/indexes', {
        headers: {
          'Api-Key': process.env.PINECONE_API_KEY!
        }
      });

      if (pineconeResponse.ok) {
        const indexes = await pineconeResponse.json();
        const ourIndex = indexes.indexes?.find((idx: any) => idx.name === process.env.PINECONE_INDEX_NAME);
        
        pineconeStatus = 'accessible';
        pineconeDetails = {
          totalIndexes: indexes.indexes?.length || 0,
          ourIndexFound: !!ourIndex,
          ourIndexStatus: ourIndex?.status?.ready ? 'ready' : ourIndex?.status?.state || 'unknown',
          ourIndexDimension: ourIndex?.dimension,
          ourIndexMetric: ourIndex?.metric
        };
        
        console.log('[DEBUG:namespaces] Pinecone API accessible:', pineconeDetails);
      } else {
        pineconeStatus = 'error';
        pineconeDetails = {
          error: `${pineconeResponse.status} ${pineconeResponse.statusText}`,
          body: await pineconeResponse.text()
        };
        console.error('[DEBUG:namespaces] Pinecone API error:', pineconeDetails);
      }
    } catch (pineconeError) {
      pineconeStatus = 'failed';
      pineconeDetails = {
        error: pineconeError instanceof Error ? pineconeError.message : 'Unknown error'
      };
      console.error('[DEBUG:namespaces] Pinecone API failed:', pineconeError);
    }

    // 4. Test RAG Engine (if possible)
    let ragStatus = 'unknown';
    let ragDetails = {};

    try {
      console.log('[DEBUG:namespaces] Testing RAG Engine...');
      
      // Dynamic import like in production
      const { FiniRAGEngine } = await import('@/lib/rag');
      const ragEngine = new FiniRAGEngine();
      
      const stats = await ragEngine.getStats();
      ragStatus = stats.isConfigured ? 'configured' : 'not_configured';
      ragDetails = {
        isConfigured: stats.isConfigured,
        errors: stats.errors,
        embeddings: stats.embeddings,
        vectorStore: stats.vectorStore
      };
      
      console.log('[DEBUG:namespaces] RAG Engine stats:', ragDetails);
    } catch (ragError) {
      ragStatus = 'failed';
      ragDetails = {
        error: ragError instanceof Error ? ragError.message : 'Unknown error'
      };
      console.error('[DEBUG:namespaces] RAG Engine failed:', ragError);
    }

    // 5. Generate expected namespaces for recent stores
    const expectedNamespaces = recentStores.map(store => ({
      storeId: store.id,
      storeName: store.name,
      createdAt: store.created_at,
      namespaces: [
        `store-${store.id}`,
        `store-${store.id}-products`,
        `store-${store.id}-orders`,
        `store-${store.id}-customers`,
        `store-${store.id}-analytics`,
        `store-${store.id}-conversations`
      ]
    }));

    // 6. Return comprehensive debug information
    const debugInfo = {
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        status: missingVars.length === 0 ? 'complete' : 'incomplete',
        variables: envCheck,
        missingVars
      },
      database: {
        status: 'connected',
        totalStores: stores?.length || 0,
        recentStores: recentStores.length,
        storesList: stores?.slice(0, 5).map(s => ({
          id: s.id,
          name: s.name,
          created: s.created_at
        }))
      },
      pinecone: {
        status: pineconeStatus,
        details: pineconeDetails
      },
      rag: {
        status: ragStatus,
        details: ragDetails
      },
      expectedNamespaces,
      debugging: {
        checkLogs: [
          '[DEBUG] Starting async namespace initialization for store:',
          '[RAG:engine] Initializing namespaces for store:',
          '[SUCCESS] RAG namespaces initialized for store:',
          '[WARNING] RAG namespace initialization failed'
        ],
        checkPinecone: 'https://app.pinecone.io - Browse index for namespaces',
        testStores: expectedNamespaces.length > 0 ? expectedNamespaces[0] : null
      }
    };

    console.log('[DEBUG:namespaces] Debug complete:', {
      env: debugInfo.environment.status,
      db: debugInfo.database.status,
      pinecone: debugInfo.pinecone.status,
      rag: debugInfo.rag.status
    });

    return NextResponse.json(debugInfo);

  } catch (error) {
    console.error('[DEBUG:namespaces] Debug endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 