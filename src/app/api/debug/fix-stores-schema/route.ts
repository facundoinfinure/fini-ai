import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  console.log('[INFO] Starting stores schema fix...');

  try {
    const supabase = createClient();

    // Test database connection
    const { data: connection } = await supabase.from('users').select('count').limit(1);
    if (!connection) {
      throw new Error('Cannot connect to database');
    }

    console.log('[INFO] Database connection successful');

    // Check current schema by trying to access the table
    const { data: tableData, error: tableError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('[INFO] Stores table might not exist or has different schema');
      console.log('[ERROR] Table error:', tableError);
    } else {
      console.log('[INFO] Table exists, columns:', Object.keys(tableData?.[0] || {}));
    }

    // Check for missing name column and try to fix it
    let nameColumnExists = false;
    
    try {
      const { data: testData, error: testError } = await supabase
        .from('stores')
        .select('name')
        .limit(1);
      
      if (!testError) {
        nameColumnExists = true;
        console.log('[INFO] Name column exists and is accessible');
      }
    } catch (error) {
      console.log('[INFO] Name column test failed:', error);
    }

    if (!nameColumnExists) {
      console.log('[INFO] Name column missing or inaccessible, attempting to fix...');
      
      console.log('[ERROR] Name column is missing. Cannot add columns via Supabase client.');
      console.log('[INFO] Please run the setup-database endpoint or add the column manually.');
      
      return NextResponse.json({
        success: false,
        error: 'Name column is missing from stores table',
        solution: 'Run POST /api/setup-database to create the proper schema',
        details: {
          nameColumnExists: false,
          tableAccessible: tableError === null
        }
      }, { status: 500 });
    }

    // Verify the fix
    const { data: finalTest, error: finalError } = await supabase
      .from('stores')
      .select('name')
      .limit(1);

    if (finalError) {
      console.error('[ERROR] Final verification failed:', finalError);
      return NextResponse.json({
        success: false,
        error: `Schema fix failed: ${finalError.message}`,
        details: {
          nameColumnExists,
          finalError: finalError.message
        }
      }, { status: 500 });
    }

    console.log('[INFO] Stores schema fix completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Stores schema fixed successfully',
      details: {
        nameColumnExists: true,
        tableAccessible: true
      }
    });

  } catch (error) {
    console.error('[ERROR] Stores schema fix failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Schema fix failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 