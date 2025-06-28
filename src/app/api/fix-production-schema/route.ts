import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * API para aplicar fixes críticos de schema en producción
 * POST /api/fix-production-schema
 */
export async function POST(_request: NextRequest) {
  try {
    console.log('[CRITICAL-FIX] Aplicando fixes críticos de schema...');
    
    // Usar service role para modificaciones de schema
    const supabaseAdmin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const fixes: string[] = [];
    const errors: string[] = [];

    // 1. FIX: Agregar columnas subscription_plan y subscription_status
    console.log('[CRITICAL-FIX] 1. Agregando columnas de suscripción...');
    try {
      const { error: subscriptionError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          -- Agregar columna subscription_plan si no existe
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'subscription_plan'
            ) THEN
              ALTER TABLE public.users 
              ADD COLUMN subscription_plan TEXT DEFAULT 'free' 
              CHECK (subscription_plan IN ('free', 'pro', 'enterprise'));
              
              -- Actualizar usuarios existentes
              UPDATE public.users 
              SET subscription_plan = 'free' 
              WHERE subscription_plan IS NULL;
            END IF;
          END $$;

          -- Agregar columna subscription_status si no existe
          DO $$ 
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'users' AND column_name = 'subscription_status'
            ) THEN
              ALTER TABLE public.users 
              ADD COLUMN subscription_status TEXT DEFAULT 'active' 
              CHECK (subscription_status IN ('active', 'inactive', 'cancelled'));
              
              -- Actualizar usuarios existentes
              UPDATE public.users 
              SET subscription_status = 'active' 
              WHERE subscription_status IS NULL;
            END IF;
          END $$;
        `
      });

      if (subscriptionError) {
        // Fallback: usar ALTER TABLE directo
        console.log('[CRITICAL-FIX] Usando método alternativo...');
        
        const alterQueries = [
          `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free'`,
          `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'`,
          `UPDATE public.users SET subscription_plan = 'free' WHERE subscription_plan IS NULL`,
          `UPDATE public.users SET subscription_status = 'active' WHERE subscription_status IS NULL`
        ];

        for (const query of alterQueries) {
          try {
            await supabaseAdmin.rpc('exec_sql', { sql: query });
          } catch (queryError) {
            console.log(`[CRITICAL-FIX] Error en query individual: ${queryError}`);
            // Continuar con la siguiente query
          }
        }
      }
      
      fixes.push('✅ Columnas de suscripción agregadas');
    } catch (error) {
      console.error('[CRITICAL-FIX] Error agregando columnas:', error);
      errors.push(`Columnas suscripción: ${error}`);
    }

    // 2. FIX: Verificar y actualizar schema de stores
    console.log('[CRITICAL-FIX] 2. Verificando schema de stores...');
    try {
      const { error: storesError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          -- Agregar columnas de stores si no existen
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'tiendanube';
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform_store_id TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS domain TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
          
          -- Migrar datos de columnas antiguas si existen
          UPDATE public.stores SET 
            platform_store_id = tiendanube_store_id,
            name = store_name,
            domain = store_url
          WHERE platform_store_id IS NULL AND tiendanube_store_id IS NOT NULL;
          
          -- Hacer refresh_token nullable
          ALTER TABLE public.stores ALTER COLUMN refresh_token DROP NOT NULL;
        `
      });

      if (!storesError) {
        fixes.push('✅ Schema de stores actualizado');
      } else {
        errors.push(`Schema stores: ${storesError.message}`);
      }
    } catch (error) {
      console.error('[CRITICAL-FIX] Error en schema stores:', error);
      errors.push(`Schema stores: ${error}`);
    }

    // 3. FIX: Crear tabla title para conversaciones si no existe
    console.log('[CRITICAL-FIX] 3. Verificando tabla de conversaciones...');
    try {
      const { error: conversationsError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          -- Agregar columna title a conversaciones si no existe
          ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS title TEXT;
          
          -- Limpiar datos huérfanos
          DELETE FROM public.messages 
          WHERE conversation_id NOT IN (
            SELECT id FROM public.conversations
          );
          
          -- Actualizar contadores
          UPDATE public.conversations 
          SET message_count = COALESCE((
            SELECT COUNT(*) 
            FROM public.messages 
            WHERE conversation_id = conversations.id
          ), 0);
        `
      });

      if (!conversationsError) {
        fixes.push('✅ Conversaciones actualizadas');
      } else {
        errors.push(`Conversaciones: ${conversationsError.message}`);
      }
    } catch (error) {
      console.error('[CRITICAL-FIX] Error en conversaciones:', error);
      errors.push(`Conversaciones: ${error}`);
    }

    // 4. FIX: Crear índices faltantes
    console.log('[CRITICAL-FIX] 4. Creando índices...');
    try {
      const { error: indexError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          -- Crear índices de performance
          CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
          CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
          CREATE INDEX IF NOT EXISTS idx_stores_platform_store_id ON public.stores(platform_store_id);
          CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
          CREATE INDEX IF NOT EXISTS idx_conversations_customer_number ON public.conversations(customer_number);
          CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
          CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
        `
      });

      if (!indexError) {
        fixes.push('✅ Índices creados');
      } else {
        errors.push(`Índices: ${indexError.message}`);
      }
    } catch (error) {
      console.error('[CRITICAL-FIX] Error creando índices:', error);
      errors.push(`Índices: ${error}`);
    }

    // Verificar estado final
    console.log('[CRITICAL-FIX] 5. Verificando estado final...');
    const { data: usersSchema } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'subscription_plan');

    const hasSubscriptionPlan = usersSchema && usersSchema.length > 0;

    return NextResponse.json({
      success: true,
      message: 'Fixes críticos aplicados',
      data: {
        fixesApplied: fixes,
        errors,
        verification: {
          hasSubscriptionPlan,
          totalFixes: fixes.length,
          totalErrors: errors.length
        }
      }
    });

  } catch (error) {
    console.error('[CRITICAL-FIX] Error general:', error);
    return NextResponse.json({
      success: false,
      error: 'Error aplicando fixes críticos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API para fixes críticos de producción',
    usage: {
      method: 'POST',
      endpoint: '/api/fix-production-schema',
      description: 'Aplica fixes críticos para resolver errores de schema en producción'
    },
    fixes: [
      'Agregar columnas subscription_plan y subscription_status',
      'Actualizar schema de stores',
      'Limpiar datos de conversaciones',
      'Crear índices de performance'
    ]
  });
} 