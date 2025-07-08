/**
 * Endpoint para crear específicamente la tabla tiendanube_tokens
 */
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  console.log('[INFO] Creando tabla tiendanube_tokens...');

  try {
    const supabase = supabaseAdmin;

    // Verificar si la tabla ya existe
    try {
      const { data: existingData } = await supabase
        .from('tiendanube_tokens')
        .select('id')
        .limit(1);
        
      if (existingData !== null) {
        console.log('[INFO] Tabla tiendanube_tokens ya existe');
        return NextResponse.json({
          success: true,
          message: 'Tabla tiendanube_tokens ya existe',
          created: false
        });
      }
    } catch (error) {
      console.log('[INFO] Tabla no existe, creándola...');
    }

    // Crear la tabla usando la función SQL
    const createSQL = `
      -- Crear tabla tiendanube_tokens
      CREATE TABLE IF NOT EXISTS public.tiendanube_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        store_id UUID NOT NULL,
        user_id UUID NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(store_id, user_id)
      );

      -- Habilitar RLS
      ALTER TABLE public.tiendanube_tokens ENABLE ROW LEVEL SECURITY;

      -- Crear política de acceso
      CREATE POLICY IF NOT EXISTS "Users can access own tokens" 
      ON public.tiendanube_tokens FOR ALL 
      USING (auth.uid()::text = user_id::text);

      -- Crear índices
      CREATE INDEX IF NOT EXISTS idx_tiendanube_tokens_store_id ON public.tiendanube_tokens(store_id);
      CREATE INDEX IF NOT EXISTS idx_tiendanube_tokens_user_id ON public.tiendanube_tokens(user_id);

      -- Trigger para updated_at
      CREATE TRIGGER IF NOT EXISTS update_tiendanube_tokens_updated_at 
      BEFORE UPDATE ON public.tiendanube_tokens 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    console.log('[INFO] Ejecutando SQL para crear tabla tiendanube_tokens...');

    // Método directo usando supabaseAdmin igual que setup-database
    const { error } = await supabase.rpc('exec_sql', { sql: createSQL });
    
    if (error) {
      console.error('[ERROR] Error ejecutando SQL:', error);
      throw new Error(`SQL execution failed: ${error.message}`);
    }

    console.log('[INFO] ✅ Tabla tiendanube_tokens creada exitosamente');
    
    return NextResponse.json({
      success: true,
      message: 'Tabla tiendanube_tokens creada exitosamente',
      created: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[ERROR] Error creando tabla tiendanube_tokens:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error creando tabla',
      details: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 