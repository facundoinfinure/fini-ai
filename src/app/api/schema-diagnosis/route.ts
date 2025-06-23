import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[INFO] Schema diagnosis starting...');

  try {
    // Create Supabase client directly with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration',
        env_vars: {
          url: !!supabaseUrl,
          service_key: !!supabaseServiceKey
        }
      }, { status: 500 });
    }

    console.log('[INFO] Environment variables found');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test basic connection
    const { data: _connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('[ERROR] Connection failed:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message
      }, { status: 500 });
    }

    console.log('[INFO] Database connection successful');

    // Check stores table structure
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    const storesTableInfo = {
      accessible: !storesError,
      error: storesError?.message,
      columns: storesData?.[0] ? Object.keys(storesData[0]) : [],
      hasNameColumn: false,
      hasData: (storesData?.length || 0) > 0,
      nameColumnError: undefined as string | undefined
    };

    // Test specific name column access
    const { data: _nameTest, error: nameError } = await supabase
      .from('stores')
      .select('name')
      .limit(1);

    storesTableInfo.hasNameColumn = !nameError;
    if (nameError) {
      storesTableInfo.nameColumnError = nameError.message;
    }

    // Check what columns might exist instead
    const possibleColumns = ['store_name', 'shop_name', 'title', 'display_name'];
    const alternativeColumns: string[] = [];

    for (const col of possibleColumns) {
      try {
        const { error } = await supabase
          .from('stores')
          .select(col)
          .limit(1);
        
        if (!error) {
          alternativeColumns.push(col);
        }
      } catch (e) {
        // Column doesn't exist, continue
      }
    }

    const diagnosis = {
      database_connected: true,
      stores_table: storesTableInfo,
      alternative_name_columns: alternativeColumns,
      recommendations: [] as string[]
    };

    // Add recommendations
    if (!storesTableInfo.hasNameColumn) {
      if (alternativeColumns.length > 0) {
        diagnosis.recommendations.push(
          `Found alternative columns: ${alternativeColumns.join(', ')}. Consider renaming one to 'name'.`
        );
      } else {
        diagnosis.recommendations.push(
          'No name column found. Need to add "name" column to stores table.'
        );
      }
    }

    if (!storesTableInfo.accessible) {
      diagnosis.recommendations.push(
        'Stores table is not accessible. May need to run database setup.'
      );
    }

    // Add solution steps
    if (!storesTableInfo.hasNameColumn) {
      diagnosis.recommendations.push(
        'SOLUTION: Run POST /api/setup-database to create the proper schema with the "name" column.'
      );
    }

    console.log('[INFO] Schema diagnosis completed');

    return NextResponse.json({
      success: true,
      diagnosis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ERROR] Schema diagnosis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Schema diagnosis failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 