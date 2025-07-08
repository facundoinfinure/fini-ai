#!/usr/bin/env node

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTiendaNubeTokensTable() {
  console.log('🔧 Creando tabla tiendanube_tokens...');
  
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS public.tiendanube_tokens (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(store_id, user_id)
    );
  `;

  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql_command: createTableSQL 
    });
    
    if (error) {
      console.error('❌ Error creando tabla:', error);
      
      // Intentar método alternativo con SQL directo
      console.log('🔄 Intentando método alternativo...');
      const { error: directError } = await supabase
        .from('_sql')
        .insert({ query: createTableSQL });
        
      if (directError) {
        console.error('❌ Error con método alternativo:', directError);
        return false;
      }
    }
    
    // Crear RLS policies
    const rlsPolicies = [
      `ALTER TABLE public.tiendanube_tokens ENABLE ROW LEVEL SECURITY;`,
      `CREATE POLICY "Users can access own tokens" ON public.tiendanube_tokens FOR ALL USING (auth.uid()::text = user_id::text);`
    ];
    
    for (const policy of rlsPolicies) {
      await supabase.rpc('exec_sql', { sql_command: policy });
    }
    
    console.log('✅ Tabla tiendanube_tokens creada exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    return false;
  }
}

// Ejecutar
createTiendaNubeTokensTable()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 