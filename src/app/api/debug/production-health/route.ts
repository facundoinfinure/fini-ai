import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    const healthCheck = {
      timestamp: new Date().toISOString(),
      database: 'unknown',
      storeCount: 0,
      storesWithTokens: 0,
      ragCapable: false,
      issues: [] as string[],
      sampleStores: [] as Array<{id: string, name: string, hasToken: boolean, lastSync: string | null}>
    };

    // Check database connection and store count
    try {
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name, tiendanube_store_id, access_token, last_sync_at')
        .limit(10);

      if (storesError) {
        healthCheck.issues.push(`Database error: ${storesError.message}`);
        healthCheck.database = 'error';
      } else {
        healthCheck.database = 'connected';
        healthCheck.storeCount = stores?.length || 0;
        healthCheck.storesWithTokens = stores?.filter(s => s.access_token).length || 0;
        
        // Check if any stores have recent sync
        const recentSyncs = stores?.filter(s => s.last_sync_at).length || 0;
        healthCheck.ragCapable = recentSyncs > 0;

        if (healthCheck.storeCount === 0) {
          healthCheck.issues.push('No stores found in database');
        }
        
        if (healthCheck.storesWithTokens === 0) {
          healthCheck.issues.push('No stores with valid tokens');
        }

        // Show sample stores for debugging
        if (stores && stores.length > 0) {
          healthCheck.sampleStores = stores.slice(0, 3).map(s => ({
            id: s.id,
            name: s.name,
            hasToken: !!s.access_token,
            lastSync: s.last_sync_at
          }));
        }
      }
    } catch (error) {
      healthCheck.issues.push(`Database connection failed: ${error}`);
      healthCheck.database = 'disconnected';
    }

    // Check environment variables
    const requiredEnvs = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'PINECONE_API_KEY',
      'OPENAI_API_KEY'
    ];

    const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
    if (missingEnvs.length > 0) {
      healthCheck.issues.push(`Missing environment variables: ${missingEnvs.join(', ')}`);
    }

    const status = healthCheck.issues.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND';
    
    return NextResponse.json({
      status,
      health: healthCheck,
      recommendation: status === 'HEALTHY' 
        ? 'System ready for production - RAG will work for all existing and new stores'
        : 'Issues found - review and fix before production deployment'
    });

  } catch (error) {
    return NextResponse.json({
      status: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Critical error - system not ready for production'
    }, { status: 500 });
  }
} 