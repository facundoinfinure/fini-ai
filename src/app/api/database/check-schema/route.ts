import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Checking database schema...');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check what columns exist in the stores table
    const { data: columns, error: schemaError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'stores')
      .eq('table_schema', 'public');

    if (schemaError) {
      console.error('[ERROR] Schema check failed:', schemaError);
      return NextResponse.json({
        success: false,
        error: 'Schema check failed',
        details: schemaError.message
      }, { status: 500 });
    }

    const columnNames = columns?.map(col => col.column_name) || [];
    
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