/**
 * API endpoint to fix database schema issues
 * POST /api/fix-database
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  console.log('[INFO] Starting database column migration...');

  try {
    const supabase = createClient();

    // Check if we can connect
    const { data: connection } = await supabase.from('users').select('count').limit(1);
    if (!connection) {
      throw new Error('Cannot connect to database');
    }

    console.log('[INFO] Database connection successful');

    // Check current column names in stores table
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);

    if (storesError) {
      console.log('[INFO] Stores table might not exist or has different schema');
    }

    // Try to rename columns if they exist with old names
    try {
      // First, check if old columns exist
      const { data: storeCheck } = await supabase.rpc('exec_sql', {
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'stores' 
          AND column_name IN ('store_name', 'store_url');
        `
      });

      if (storeCheck && storeCheck.length > 0) {
        console.log('[INFO] Found old column names, renaming...');
        
        // Rename store_name to name
        await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE stores RENAME COLUMN store_name TO name;'
        });
        
        // Rename store_url to domain  
        await supabase.rpc('exec_sql', {
          sql: 'ALTER TABLE stores RENAME COLUMN store_url TO domain;'
        });
        
        console.log('[INFO] Columns renamed successfully');
      } else {
        console.log('[INFO] Columns already have correct names');
      }
    } catch (renameError) {
      console.log('[INFO] Column rename not needed or already done:', renameError);
    }

    // Verify final schema
    const { data: finalCheck, error: finalError } = await supabase
      .from('stores')
      .select('name, domain')
      .limit(1);

    if (finalError) {
      throw new Error(`Schema verification failed: ${finalError.message}`);
    }

    console.log('[INFO] Database migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ERROR] Database migration failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Migration failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 