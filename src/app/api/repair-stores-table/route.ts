import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[INFO] Starting CRITICAL stores table repair and migration...');

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

    console.log('[INFO] Testing database connection...');

    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.error('[ERROR] Database connection failed:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message
      }, { status: 500 });
    }

    console.log('[INFO] Database connection successful');

    // Get current stores table structure
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (testError) {
      console.error('[ERROR] Cannot access stores table:', testError.message);
      return NextResponse.json({
        success: false,
        error: `Cannot access stores table: ${testError.message}`,
      }, { status: 500 });
    }

    const currentColumns = testData?.[0] ? Object.keys(testData[0]) : [];
    console.log('[INFO] Current columns in stores table:', currentColumns);

    // CRITICAL MIGRATION ANALYSIS
    // The database has: store_url, tiendanube_store_id, store_name
    // The code expects: domain, platform_store_id, name
    
    const needsDomainColumn = !currentColumns.includes('domain');
    const needsPlatformStoreIdColumn = !currentColumns.includes('platform_store_id');
    const needsNameColumn = !currentColumns.includes('name');
    const needsPlatformColumn = !currentColumns.includes('platform');

    const hasStoreUrl = currentColumns.includes('store_url');
    const hasTiendaNubeStoreId = currentColumns.includes('tiendanube_store_id');
    const hasStoreName = currentColumns.includes('store_name');

    console.log('[INFO] Migration analysis:', {
      needsDomainColumn,
      needsPlatformStoreIdColumn,
      needsNameColumn,
      needsPlatformColumn,
      hasStoreUrl,
      hasTiendaNubeStoreId,
      hasStoreName
    });

    // Check if we need migration  
    console.log('[DEBUG] Migration needs check:', {
      needsDomainColumn,
      needsPlatformStoreIdColumn, 
      needsNameColumn,
      needsPlatformColumn
    });

    if (!needsDomainColumn && !needsPlatformStoreIdColumn && !needsNameColumn && !needsPlatformColumn) {
      console.log('[INFO] All required columns already exist');
      
      // Test access to critical columns
      const { data: testAccess, error: accessError } = await supabase
        .from('stores')
        .select('id, name, domain, platform, platform_store_id')
        .limit(1);

      if (accessError) {
        console.error('[ERROR] Cannot access required columns:', accessError);
        return NextResponse.json({
          success: false,
          error: 'Cannot access required columns',
          details: accessError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Stores table is already properly configured',
        columns: currentColumns,
        status: 'healthy'
      });
    }

    // If we need migration, provide detailed manual instructions
    console.log('[ERROR] CRITICAL: Database schema needs manual migration');

    const migrationCommands = [];

    // Add missing columns
    if (needsDomainColumn) {
      migrationCommands.push("ALTER TABLE public.stores ADD COLUMN domain TEXT DEFAULT '';");
    }
    if (needsPlatformStoreIdColumn) {
      migrationCommands.push("ALTER TABLE public.stores ADD COLUMN platform_store_id TEXT;");
    }
    if (needsNameColumn) {
      migrationCommands.push("ALTER TABLE public.stores ADD COLUMN name TEXT DEFAULT '';");
    }
    if (needsPlatformColumn) {
      migrationCommands.push("ALTER TABLE public.stores ADD COLUMN platform TEXT DEFAULT 'tiendanube';");
    }

    // Migrate data from old columns to new columns
    if (needsDomainColumn && hasStoreUrl) {
      migrationCommands.push("UPDATE public.stores SET domain = COALESCE(store_url, '') WHERE domain IS NULL OR domain = '';");
    }
    if (needsPlatformStoreIdColumn && hasTiendaNubeStoreId) {
      migrationCommands.push("UPDATE public.stores SET platform_store_id = COALESCE(tiendanube_store_id, '') WHERE platform_store_id IS NULL OR platform_store_id = '';");
    }
    if (needsNameColumn && hasStoreName) {
      migrationCommands.push("UPDATE public.stores SET name = COALESCE(store_name, 'Mi Tienda') WHERE name IS NULL OR name = '';");
    }

    // Set default values for empty fields
    if (needsNameColumn) {
      migrationCommands.push("UPDATE public.stores SET name = 'Mi Tienda' WHERE name IS NULL OR name = '';");
    }
    if (needsDomainColumn) {
      migrationCommands.push("UPDATE public.stores SET domain = '' WHERE domain IS NULL;");
    }

    return NextResponse.json({
      success: false,
      error: 'CRITICAL: Manual database migration required',
      current_columns: currentColumns,
      missing_columns: {
        domain: needsDomainColumn,
        platform_store_id: needsPlatformStoreIdColumn,
        name: needsNameColumn,
        platform: needsPlatformColumn
      },
      migration_commands: migrationCommands,
      urgent_instructions: [
        '🚨 CRITICAL: Your database schema is out of sync with the application code.',
        '🚨 This is causing the "column does not exist" errors you\'re seeing.',
        '',
        '📋 IMMEDIATE ACTION REQUIRED:',
        '1. Go to your Supabase dashboard: https://supabase.com/dashboard',
        '2. Navigate to your project',
        '3. Go to "SQL Editor" in the left sidebar',
        '4. Execute each command below ONE BY ONE:',
        '',
        '💡 After completing all commands, call this endpoint again to verify the migration.',
        '',
        '⚠️  DO NOT skip any commands - execute them in the exact order shown.',
        '⚠️  Each command should show "Success. No rows returned" or similar.'
      ],
      step_by_step_commands: migrationCommands.map((cmd, index) => ({
        step: index + 1,
        description: index < 4 ? 'Add missing column' : index < 7 ? 'Migrate existing data' : 'Set default values',
        sql: cmd,
        expected_result: 'Success. No rows returned'
      })),
      verification_query: 'SELECT id, name, domain, platform, platform_store_id FROM stores LIMIT 1;',
      action_required: 'manual_sql_execution_critical'
    }, { status: 200 }); // Use 200 so instructions are clearly visible

  } catch (error) {
    console.error('[ERROR] Critical migration analysis failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Critical migration analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 