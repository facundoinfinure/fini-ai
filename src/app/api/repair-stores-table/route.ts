import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[INFO] Starting stores table repair...');

  try {
    // Create Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration',
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[INFO] Testing current stores table...');

    // Test if stores table exists and what columns it has
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('[ERROR] Cannot access stores table:', testError.message);
      
      // If table doesn't exist at all, we need to create it through Supabase dashboard
      if (testError.message.includes('does not exist')) {
        return NextResponse.json({
          success: false,
          error: 'Stores table does not exist',
          solution: 'Please create the stores table manually in Supabase dashboard with this schema:\n\nCREATE TABLE public.stores (\n  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),\n  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,\n  platform TEXT NOT NULL DEFAULT \'tiendanube\',\n  platform_store_id TEXT NOT NULL,\n  name TEXT NOT NULL,\n  domain TEXT NOT NULL,\n  access_token TEXT NOT NULL,\n  refresh_token TEXT,\n  token_expires_at TIMESTAMP WITH TIME ZONE,\n  is_active BOOLEAN DEFAULT TRUE,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  last_sync_at TIMESTAMP WITH TIME ZONE\n);',
          action_required: 'manual_table_creation'
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: false,
        error: `Table access error: ${testError.message}`,
      }, { status: 500 });
    }

    console.log('[INFO] Stores table accessible');
    
    // Get columns info
    const columns = testData?.[0] ? Object.keys(testData[0]) : [];
    console.log('[INFO] Current columns:', columns);

    // Check if name column exists
    const hasNameColumn = columns.includes('name');
    const hasPlatformColumn = columns.includes('platform');
    const hasPlatformStoreIdColumn = columns.includes('platform_store_id');

    console.log('[INFO] Column check:', {
      hasNameColumn,
      hasPlatformColumn,
      hasPlatformStoreIdColumn
    });

    // If missing critical columns, provide manual SQL
    const missingColumns = [];
    const sqlStatements = [];

    if (!hasNameColumn) {
      missingColumns.push('name');
      sqlStatements.push('ALTER TABLE public.stores ADD COLUMN name TEXT;');
    }

    if (!hasPlatformColumn) {
      missingColumns.push('platform');
      sqlStatements.push('ALTER TABLE public.stores ADD COLUMN platform TEXT NOT NULL DEFAULT \'tiendanube\';');
    }

    if (!hasPlatformStoreIdColumn) {
      missingColumns.push('platform_store_id');
      sqlStatements.push('ALTER TABLE public.stores ADD COLUMN platform_store_id TEXT;');
    }

    if (missingColumns.length > 0) {
      console.log('[INFO] Missing columns detected:', missingColumns);
      
      return NextResponse.json({
        success: false,
        error: `Missing columns: ${missingColumns.join(', ')}`,
        missing_columns: missingColumns,
        solution: 'Execute these SQL statements in Supabase SQL Editor:',
        sql_statements: sqlStatements,
        instructions: [
          '1. Go to your Supabase dashboard',
          '2. Navigate to SQL Editor',
          '3. Execute each SQL statement one by one:',
          ...sqlStatements.map((sql, index) => `   ${index + 1}. ${sql}`),
          '4. After executing, try connecting a store again'
        ],
        action_required: 'manual_sql_execution'
      }, { status: 200 }); // Use 200 so the response shows properly
    }

    // Test name column specifically
    const { error: nameTestError } = await supabase
      .from('stores')
      .select('name')
      .limit(1);

    if (nameTestError) {
      console.error('[ERROR] Name column test failed:', nameTestError.message);
      return NextResponse.json({
        success: false,
        error: `Name column error: ${nameTestError.message}`,
        solution: 'The name column might exist but have issues. Please check the column type and constraints.',
      }, { status: 500 });
    }

    console.log('[INFO] All required columns are present and accessible');

    return NextResponse.json({
      success: true,
      message: 'Stores table is properly configured',
      columns: columns,
      status: 'healthy'
    });

  } catch (error) {
    console.error('[ERROR] Stores table repair failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Repair failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 