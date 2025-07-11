import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to prevent static build errors
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Checking database schema...');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check what columns exist in the stores table using direct SQL query
    // information_schema.columns is a PostgreSQL system view that requires SQL, not .from()
    const { data: columns, error: schemaError } = await supabaseAdmin
      .rpc('get_table_columns', { 
        table_name_param: 'stores',
        schema_name_param: 'public' 
      });

    // If RPC doesn't exist, fall back to direct SQL
    if (schemaError && schemaError.message?.includes('function get_table_columns')) {
      console.log('[INFO] RPC function not found, using direct SQL query...');
      
      const { data: sqlResult, error: sqlError } = await supabaseAdmin
        .from('stores')
        .select('*')
        .limit(0); // Get structure without data

      if (sqlError) {
        console.error('[ERROR] Schema check failed:', sqlError);
        return NextResponse.json({
          success: false,
          error: 'Schema check failed',
          details: sqlError.message
        }, { status: 500 });
      }

      // Alternative: Check specific columns by trying to select them
      const testColumns = ['tiendanube_store_id', 'platform_store_id', 'store_name', 'store_url'];
      const columnExists: Record<string, boolean> = {};
      
      for (const col of testColumns) {
        try {
          const { error } = await supabaseAdmin
            .from('stores')
            .select(col)
            .limit(1);
          
          columnExists[col] = !error;
        } catch {
          columnExists[col] = false;
        }
      }

      const schemaStatus = {
        hasOldColumns: columnExists['tiendanube_store_id'],
        hasNewColumns: columnExists['platform_store_id'],
        detectedColumns: Object.keys(columnExists).filter(col => columnExists[col]),
        needsMigration: columnExists['tiendanube_store_id'] && !columnExists['platform_store_id']
      };

      // Also check if there are any stores in the database
      const { data: stores, error: storesError } = await supabaseAdmin
        .from('stores')
        .select('*')
        .limit(5);

      if (storesError) {
        console.error('[ERROR] Error checking stores:', storesError);
      }

      console.log('[INFO] Schema check completed (fallback method):', schemaStatus);

      return NextResponse.json({
        success: true,
        method: 'column_test_fallback',
        schema: schemaStatus,
        sampleStores: stores || [],
        storeCount: stores?.length || 0
      });
    }

    if (schemaError) {
      console.error('[ERROR] Schema check failed:', schemaError);
      return NextResponse.json({
        success: false,
        error: 'Schema check failed',
        details: schemaError.message
      }, { status: 500 });
    }

    const columnNames = columns?.map((col: any) => col.column_name) || [];
    
    // Check if old or new schema
    const hasOldSchema = columnNames.includes('tiendanube_store_id');
    const hasNewSchema = columnNames.includes('platform_store_id');
    
    const schemaStatus = {
      hasOldColumns: hasOldSchema,
      hasNewColumns: hasNewSchema,
      allColumns: columnNames,
      needsMigration: hasOldSchema && !hasNewSchema
    };

    // Also check if there are any stores in the database
    const { data: stores, error: storesError } = await supabaseAdmin
      .from('stores')
      .select('*')
      .limit(5);

    if (storesError) {
      console.error('[ERROR] Error checking stores:', storesError);
    }

    console.log('[INFO] Schema check completed:', schemaStatus);

    return NextResponse.json({
      success: true,
      method: 'rpc_function',
      schema: schemaStatus,
      sampleStores: stores || [],
      storeCount: stores?.length || 0
    });

  } catch (error) {
    console.error('[ERROR] Schema check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 