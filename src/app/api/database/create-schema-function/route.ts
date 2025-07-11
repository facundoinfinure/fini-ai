import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering to prevent static build errors
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Creating schema check function in Supabase...');
    
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create the RPC function to access information_schema.columns
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION get_table_columns(
        table_name_param TEXT,
        schema_name_param TEXT DEFAULT 'public'
      )
      RETURNS TABLE(
        column_name TEXT,
        data_type TEXT,
        is_nullable TEXT,
        column_default TEXT,
        ordinal_position INTEGER
      ) 
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          c.column_name::TEXT,
          c.data_type::TEXT,
          c.is_nullable::TEXT,
          c.column_default::TEXT,
          c.ordinal_position::INTEGER
        FROM information_schema.columns c
        WHERE c.table_name = table_name_param
          AND c.table_schema = schema_name_param
        ORDER BY c.ordinal_position;
      END;
      $$;
    `;

    const { data: createResult, error: createError } = await supabaseAdmin
      .rpc('exec_sql', { sql: createFunctionSQL });

    if (createError) {
      console.error('[ERROR] Failed to create function:', createError);
      
      // Try alternative approach using direct SQL execution
      const { error: directError } = await supabaseAdmin
        .from('_sql_exec')
        .insert({ sql: createFunctionSQL });
      
      if (directError) {
        console.error('[ERROR] Direct SQL execution also failed:', directError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create schema function',
          details: createError.message,
          fallback_error: directError.message,
          message: 'You may need to create this function manually in Supabase SQL Editor'
        }, { status: 500 });
      }
    }

    // Grant permissions
    const grantSQL = `
      GRANT EXECUTE ON FUNCTION get_table_columns(TEXT, TEXT) TO authenticated;
      GRANT EXECUTE ON FUNCTION get_table_columns(TEXT, TEXT) TO service_role;
    `;

    const { error: grantError } = await supabaseAdmin
      .rpc('exec_sql', { sql: grantSQL });

    if (grantError) {
      console.warn('[WARN] Failed to grant permissions:', grantError.message);
    }

    // Test the function
    const { data: testResult, error: testError } = await supabaseAdmin
      .rpc('get_table_columns', { 
        table_name_param: 'stores',
        schema_name_param: 'public' 
      });

    if (testError) {
      console.error('[ERROR] Function test failed:', testError);
      return NextResponse.json({
        success: false,
        error: 'Function created but test failed',
        details: testError.message,
        sql_provided: createFunctionSQL
      }, { status: 500 });
    }

    console.log('[INFO] Schema function created and tested successfully');

    return NextResponse.json({
      success: true,
      message: 'Schema check function created successfully',
      test_result: testResult,
      columns_found: testResult?.length || 0
    });

  } catch (error) {
    console.error('[ERROR] Schema function creation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      manual_sql: `
        -- Run this SQL in Supabase SQL Editor:
        CREATE OR REPLACE FUNCTION get_table_columns(
          table_name_param TEXT,
          schema_name_param TEXT DEFAULT 'public'
        )
        RETURNS TABLE(
          column_name TEXT,
          data_type TEXT,
          is_nullable TEXT,
          column_default TEXT,
          ordinal_position INTEGER
        ) 
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            c.column_name::TEXT,
            c.data_type::TEXT,
            c.is_nullable::TEXT,
            c.column_default::TEXT,
            c.ordinal_position::INTEGER
          FROM information_schema.columns c
          WHERE c.table_name = table_name_param
            AND c.table_schema = schema_name_param
          ORDER BY c.ordinal_position;
        END;
        $$;
        
        GRANT EXECUTE ON FUNCTION get_table_columns(TEXT, TEXT) TO authenticated;
        GRANT EXECUTE ON FUNCTION get_table_columns(TEXT, TEXT) TO service_role;
      `
    }, { status: 500 });
  }
} 