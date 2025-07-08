#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTable() {
  console.log('🔧 Creando tabla tiendanube_tokens...');
  
  try {
    // Método más directo usando query SQL
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql: `
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
          
          ALTER TABLE public.tiendanube_tokens ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY IF NOT EXISTS "Users can access own tokens" 
          ON public.tiendanube_tokens FOR ALL 
          USING (auth.uid()::text = user_id::text);
        `
      });

    if (error) {
      console.error('❌ Error con exec_sql:', error);
      
      // Intentar método alternativo con query directa
      console.log('🔄 Intentando con query directa...');
      const { data: directData, error: directError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'tiendanube_tokens');
        
      if (directError) {
        console.error('❌ Error verificando tabla:', directError);
        return false;
      }
      
      if (directData.length === 0) {
        console.log('⚠️ Tabla no existe, necesita ser creada manualmente');
        return false;
      }
    }
    
    console.log('✅ Tabla creada o ya existe');
    return true;
    
  } catch (error) {
    console.error('💥 Error inesperado:', error);
    return false;
  }
}

createTable()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  }); 