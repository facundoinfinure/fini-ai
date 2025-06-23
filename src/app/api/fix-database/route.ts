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
      .eq('table_schema', 'public')
      .eq('table_name', 'stores')
      .eq('column_name', 'refresh_token');

    if (columnError) {
      console.error('[ERROR] Failed to query column information:', columnError);
      
      // Try alternative approach using raw SQL
      try {
        const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc('sql', {
          query: `
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'stores' 
            AND column_name = 'refresh_token'
          `
        });
        
        if (sqlError) {
          return NextResponse.json({
            success: false,
            error: `Failed to check database schema: ${sqlError.message}`,
            suggestion: 'Please run this SQL manually in Supabase SQL Editor:\nALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;',
            details: sqlError
          }, { status: 500 });
        }
        
        if (!sqlResult || sqlResult.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'refresh_token column does not exist - this is fine for new schemas',
            changes: []
          });
        }
        
        const column = sqlResult[0];
        if (column.is_nullable === 'YES') {
          return NextResponse.json({
            success: true,
            message: 'refresh_token column is already nullable - no fix needed',
            changes: [],
            current_schema: column
          });
        }
        
        // Column exists and is NOT NULL - needs manual fix
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
            '4. Then try the Tienda Nube connection again'
          ],
          sqlToRun: 'ALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;'
        });
        
      } catch (err) {
        return NextResponse.json({
          success: false,
          error: `Database check failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          suggestion: 'Please run this SQL manually in Supabase SQL Editor:\nALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;'
        }, { status: 500 });
      }
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
    // Return manual instructions since automatic fix might not work
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
        '4. Then try the Tienda Nube connection again'
      ],
      sqlToRun: 'ALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;'
    });

  } catch (error) {
    console.error('[ERROR] Database check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
      suggestion: 'Please run this SQL manually in Supabase SQL Editor:\nALTER TABLE stores ALTER COLUMN refresh_token DROP NOT NULL;'
    }, { status: 500 });
  }
} 