import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('[EMERGENCY] Adding missing store columns...');
    
    const supabase = createClient();
    
    // Check authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    console.log('[EMERGENCY] User authenticated:', session.user.id);

    // Check if columns already exist by trying to select them
    console.log('[EMERGENCY] Checking if columns exist...');
    const { data: testData, error: testError } = await supabase
      .from('stores')
      .select('id, currency, timezone, language, last_sync_at')
      .limit(1);
    
    if (!testError) {
      console.log('[EMERGENCY] Columns already exist!');
      return NextResponse.json({
        success: true,
        message: 'Store columns already exist',
        sample_data: testData
      });
    }
    
    if (testError && !testError.message.includes('does not exist')) {
      console.error('[EMERGENCY] Unexpected error:', testError);
      return NextResponse.json({
        success: false,
        error: `Unexpected error: ${testError.message}`
      }, { status: 500 });
    }

    // Columns don't exist, we need to provide migration instructions
    console.log('[EMERGENCY] Columns do not exist. Providing migration instructions...');
    
    const migrationSQL = `-- Run this SQL in Supabase Dashboard > SQL Editor:
-- Add metadata columns to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'ARS',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Argentina/Buenos_Aires',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'es',
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;

-- Update existing stores with default values  
UPDATE public.stores 
SET 
  currency = COALESCE(currency, 'ARS'),
  timezone = COALESCE(timezone, 'America/Argentina/Buenos_Aires'),
  language = COALESCE(language, 'es')
WHERE currency IS NULL OR timezone IS NULL OR language IS NULL;

-- Migrate last_sync to last_sync_at if last_sync column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'last_sync') THEN
    UPDATE public.stores SET last_sync_at = last_sync WHERE last_sync_at IS NULL AND last_sync IS NOT NULL;
  END IF;
END $$;`;

    return NextResponse.json({
      success: false,
      error: 'Store columns missing - migration required',
      migration_required: true,
      migration_sql: migrationSQL,
      instructions: [
        '1. Go to Supabase Dashboard > SQL Editor',
        '2. Copy and paste the migration_sql provided',
        '3. Execute the SQL commands',
        '4. Test OAuth callback again',
        '5. Optional: Run this endpoint again to verify'
      ],
      dashboard_url: 'https://supabase.com/dashboard'
    }, { status: 400 });

  } catch (error) {
    console.error('[EMERGENCY] Add store columns failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 