import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('[INFO] Running health check');
    
    const supabase = createClient();
    
    // Test 1: Check environment variables
    console.log('[INFO] Test 1: Checking environment variables');
    const envCheck = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set'
    };

    console.log('[INFO] Environment check:', envCheck);

    // Test 2: Check if tables exist by trying to query them
    console.log('[INFO] Test 2: Checking if tables exist');
    const { data: usersTable, error: usersTableError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const { data: storesTable, error: storesTableError } = await supabase
      .from('stores')
      .select('count')
      .limit(1);

    const { data: whatsappConfigsTable, error: whatsappConfigsTableError } = await supabase
      .from('whatsapp_configs')
      .select('count')
      .limit(1);

    console.log('[INFO] Tables check:', {
      usersTable: { exists: !usersTableError, error: usersTableError },
      storesTable: { exists: !storesTableError, error: storesTableError },
      whatsappConfigsTable: { exists: !whatsappConfigsTableError, error: whatsappConfigsTableError }
    });

    // Test 3: Check if we can connect to Supabase
    console.log('[INFO] Test 3: Testing Supabase connection');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('id')
      .limit(0);

    const connectionSuccess = !connectionError;

    console.log('[INFO] Connection test:', { success: connectionSuccess, error: connectionError });

    return NextResponse.json({
      success: true,
      data: {
        environment: envCheck,
        tables: {
          users: { exists: !usersTableError, error: usersTableError },
          stores: { exists: !storesTableError, error: storesTableError },
          whatsapp_configs: { exists: !whatsappConfigsTableError, error: whatsappConfigsTableError }
        },
        connection: {
          success: connectionSuccess,
          error: connectionError
        }
      },
      message: 'Health check completed'
    });

  } catch (error) {
    console.error('[ERROR] Health check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Endpoint específico para load balancers (más simple)
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
} 