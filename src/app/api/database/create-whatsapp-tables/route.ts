import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST() {
  try {
    console.log('[INFO] Creating WhatsApp tables manually');

    // 1. Crear tabla whatsapp_numbers
    const createWhatsAppNumbers = `
      CREATE TABLE IF NOT EXISTS public.whatsapp_numbers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        phone_number TEXT NOT NULL,
        display_name TEXT,
        twilio_account_sid TEXT,
        twilio_auth_token TEXT,
        webhook_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('[INFO] Creating whatsapp_numbers table...');
    const { error: error1 } = await supabaseAdmin.rpc('exec_sql', { sql: createWhatsAppNumbers });
    
    if (error1) {
      console.error('[ERROR] Failed to create whatsapp_numbers:', error1);
      // Continúa con el siguiente paso
    }

    // 2. Crear tabla whatsapp_store_connections
    const createConnections = `
      CREATE TABLE IF NOT EXISTS public.whatsapp_store_connections (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
        store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(whatsapp_number_id, store_id)
      );
    `;

    console.log('[INFO] Creating whatsapp_store_connections table...');
    const { error: error2 } = await supabaseAdmin.rpc('exec_sql', { sql: createConnections });
    
    if (error2) {
      console.error('[ERROR] Failed to create whatsapp_store_connections:', error2);
      // Continúa con el siguiente paso
    }

    // 3. Habilitar RLS
    console.log('[INFO] Enabling RLS...');
    const enableRLS = `
      ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.whatsapp_store_connections ENABLE ROW LEVEL SECURITY;
    `;

    const { error: error3 } = await supabaseAdmin.rpc('exec_sql', { sql: enableRLS });
    if (error3) {
      console.error('[ERROR] Failed to enable RLS:', error3);
    }

    // 4. Crear políticas RLS
    console.log('[INFO] Creating RLS policies...');
    const policies = `
      -- WhatsApp numbers policies
      CREATE POLICY "Users can view own whatsapp numbers" ON public.whatsapp_numbers FOR SELECT USING (auth.uid() = user_id);
      CREATE POLICY "Users can insert own whatsapp numbers" ON public.whatsapp_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "Users can update own whatsapp numbers" ON public.whatsapp_numbers FOR UPDATE USING (auth.uid() = user_id);
      CREATE POLICY "Users can delete own whatsapp numbers" ON public.whatsapp_numbers FOR DELETE USING (auth.uid() = user_id);

      -- WhatsApp store connections policies
      CREATE POLICY "Users can view own whatsapp store connections" ON public.whatsapp_store_connections FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.whatsapp_numbers 
          WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
          AND public.whatsapp_numbers.user_id = auth.uid()
        )
      );
      CREATE POLICY "Users can insert own whatsapp store connections" ON public.whatsapp_store_connections FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.whatsapp_numbers 
          WHERE public.whatsapp_numbers.id = public.whatsapp_store_connections.whatsapp_number_id 
          AND public.whatsapp_numbers.user_id = auth.uid()
        ) AND EXISTS (
          SELECT 1 FROM public.stores 
          WHERE public.stores.id = public.whatsapp_store_connections.store_id 
          AND public.stores.user_id = auth.uid()
        )
      );
    `;

    const { error: error4 } = await supabaseAdmin.rpc('exec_sql', { sql: policies });
    if (error4) {
      console.error('[ERROR] Failed to create policies:', error4);
    }

    // 5. Crear índices
    console.log('[INFO] Creating indexes...');
    const indexes = `
      CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_user_id ON public.whatsapp_numbers(user_id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_phone ON public.whatsapp_numbers(phone_number);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_number_id ON public.whatsapp_store_connections(whatsapp_number_id);
      CREATE INDEX IF NOT EXISTS idx_whatsapp_store_connections_store_id ON public.whatsapp_store_connections(store_id);
    `;

    const { error: error5 } = await supabaseAdmin.rpc('exec_sql', { sql: indexes });
    if (error5) {
      console.error('[ERROR] Failed to create indexes:', error5);
    }

    console.log('[INFO] Attempting alternative approach...');
    
    // Approach alternativo: verificar si las tablas existen
    const { data: existingTables, error: checkError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['whatsapp_numbers', 'whatsapp_store_connections']);

    if (checkError) {
      console.error('[ERROR] Could not check existing tables:', checkError);
    }

    const tableNames = existingTables?.map(t => t.table_name) || [];
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp tables creation attempted',
      errors: {
        whatsapp_numbers: error1?.message || null,
        whatsapp_store_connections: error2?.message || null,
        rls: error3?.message || null,
        policies: error4?.message || null,
        indexes: error5?.message || null
      },
      existing_tables: tableNames,
      note: 'If all errors are null or about existing objects, the operation was successful'
    });

  } catch (error) {
    console.error('[ERROR] Failed to create WhatsApp tables:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 