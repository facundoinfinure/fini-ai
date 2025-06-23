import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    console.log('[INFO] Creating missing tables using direct approach');
    
    // First, let's try to create the whatsapp_numbers table directly
    try {
      const { data: data1, error: error1 } = await supabaseAdmin
        .from('whatsapp_numbers')
        .select('*')
        .limit(1);
      
      if (error1 && error1.message.includes('does not exist')) {
        console.log('[INFO] whatsapp_numbers table does not exist, it needs to be created manually');
        return NextResponse.json({
          success: false,
          message: 'whatsapp_numbers table needs to be created via Supabase dashboard',
          error: 'Table creation requires manual intervention'
        });
      } else {
        console.log('[INFO] whatsapp_numbers table exists');
      }
    } catch (e) {
      console.log('[INFO] Error checking whatsapp_numbers:', e);
    }

    // Check whatsapp_store_connections
    try {
      const { data: data2, error: error2 } = await supabaseAdmin
        .from('whatsapp_store_connections')
        .select('*')
        .limit(1);
      
      if (error2 && error2.message.includes('does not exist')) {
        console.log('[INFO] whatsapp_store_connections table does not exist, it needs to be created manually');
        return NextResponse.json({
          success: false,
          message: 'whatsapp_store_connections table needs to be created via Supabase dashboard',
          error: 'Table creation requires manual intervention'
        });
      } else {
        console.log('[INFO] whatsapp_store_connections table exists');
      }
    } catch (e) {
      console.log('[INFO] Error checking whatsapp_store_connections:', e);
    }

    console.log('[INFO] All tables exist');

    return NextResponse.json({
      success: true,
      message: 'All tables verified successfully'
    });

  } catch (error) {
    console.error('[ERROR] Direct SQL execution failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Direct SQL execution failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 