import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

/**
 * Debug endpoint to check RAG data synchronization status
 * GET /api/debug/rag-status
 * 
 * Verifies:
 * - Store sync timestamps
 * - RAG engine configuration
 * - Sample search results
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Check if this is an internal call (service role key)
    const authHeader = request.headers.get('Authorization');
    const isInternalCall = authHeader && authHeader.includes(process.env.SUPABASE_SERVICE_ROLE_KEY || '');

    if (!isInternalCall) {
      return NextResponse.json({
        success: false,
        error: 'Internal access only'
      }, { status: 401 });
    }

    console.log('[RAG-STATUS] Checking RAG system health...');

    // Test RAG engine initialization
    let ragEngineStatus = false;
    let ragStats = null;
    let ragError = null;

    try {
      const { getUnifiedRAGEngine } = await import('@/lib/rag/unified-rag-engine');
      const ragEngine = getUnifiedRAGEngine();
      
      // Get RAG stats
      ragStats = await ragEngine.getStats();
      ragEngineStatus = ragStats.isConfigured;
      
      console.log('[RAG-STATUS] RAG engine stats:', {
        isConfigured: ragStats.isConfigured,
        errors: ragStats.errors,
        vectorStoreStats: ragStats.vectorStore
      });
    } catch (error) {
      ragError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[RAG-STATUS] RAG engine failed:', ragError);
    }

    // Test essential services
    const servicesStatus = {
      openai: !!process.env.OPENAI_API_KEY,
      pinecone: !!process.env.PINECONE_API_KEY,
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // Overall health check
    const isHealthy = ragEngineStatus && 
      servicesStatus.openai && 
      servicesStatus.pinecone && 
      servicesStatus.supabase;

    const healthReport = {
      isHealthy,
      ragEngine: {
        status: ragEngineStatus,
        error: ragError,
        stats: ragStats
      },
      services: servicesStatus,
      timestamp: new Date().toISOString()
    };

    console.log(`[RAG-STATUS] Health check completed - Status: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);

    return NextResponse.json({
      success: true,
      data: healthReport
    });

  } catch (error) {
    console.error('[RAG-STATUS] Health check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 