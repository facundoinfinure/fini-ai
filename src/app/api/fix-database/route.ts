/**
 * API endpoint to fix database schema issues
 * POST /api/fix-database
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(_request: NextRequest) {
  try {
    console.log('[INFO] Checking database schema issues...');
    
    // First, let's check if the table exists and what its current schema looks like
    const { data: columnInfo, error: columnError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, is_nullable, data_type')
      .eq('table_name', 'stores')
      .eq('column_name', 'refresh_token');

    if (columnError) {
      console.error('[ERROR] Failed to query column information:', columnError);
      return NextResponse.json({
        success: false,
        error: `Failed to check database schema: ${columnError.message}`,
        details: columnError
      }, { status: 500 });
    }

    if (!columnInfo || columnInfo.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'refresh_token column does not exist - this is fine for new schemas',
        changes: []
      });
    }

    const column = columnInfo[0];
    console.log('[INFO] Current refresh_token column info:', column);

    if (column.is_nullable === 'YES') {
      return NextResponse.json({
        success: true,
        message: 'refresh_token column is already nullable - no fix needed',
        changes: [],
        current_schema: column
      });
    }

    // If we get here, the column exists and is NOT NULL, so we need to fix it
    // We'll try to use a direct SQL command through the supabase SQL editor API
    console.log('[INFO] Column is NOT NULL, attempting to make it nullable...');
    
    // For now, return instructions for manual fix since direct SQL execution might not be available
    return NextResponse.json({
      success: false,
      requiresManualFix: true,
      error: 'refresh_token column is NOT NULL and needs to be fixed',
      current_schema: column,
      manualFixInstructions: [
        '1. Go to your Supabase project dashboard',
        '2. Navigate to SQL Editor',
        '3. Run this command:',
        '   ALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;',
        '4. Or recreate the stores table with the correct schema from the updated setup-database endpoint'
      ],
      sqlToRun: 'ALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;'
    });

  } catch (error) {
    console.error('[ERROR] Database check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
} 