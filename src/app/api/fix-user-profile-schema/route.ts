import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Fixing user profile schema...');
    
    // Use service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test basic access first
    console.log('[INFO] Testing database access...');
    const { data: testUsers, error: accessError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);

    if (accessError) {
      console.log('[ERROR] Cannot access users table:', accessError.message);
      return NextResponse.json({
        success: false,
        error: 'Cannot access users table',
        details: accessError.message
      }, { status: 500 });
    }

    console.log('[INFO] Database access successful');

    // Test if we can select the problematic columns
    console.log('[INFO] Testing column access...');
    const { data: columnTest, error: columnError } = await supabase
      .from('users')
      .select('id, email, updated_at, full_name, business_name')
      .limit(1);

    if (columnError) {
      console.log('[WARNING] Some columns missing:', columnError.message);
      
      // The columns are missing, need manual SQL execution
      // For now, let's return detailed information about the issue
      return NextResponse.json({
        success: false,
        error: 'Missing columns detected',
        details: columnError.message,
        recommendation: 'Run database migration manually in Supabase SQL Editor',
        sqlToRun: `
-- Add missing columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_type TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_description TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_audience TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
        `
      }, { status: 500 });
    }

    console.log('[INFO] All columns are accessible');

    return NextResponse.json({
      success: true,
      message: 'User profile schema is already correct',
      columnsAvailable: columnTest && columnTest.length > 0 ? Object.keys(columnTest[0]) : []
    });

  } catch (error) {
    console.error('[ERROR] Schema check failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 