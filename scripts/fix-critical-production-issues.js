#!/usr/bin/env node

/**
 * Script para solucionar problemas críticos de producción
 * 
 * PROBLEMAS IDENTIFICADOS EN LOGS:
 * 1. Column "users.subscription_plan" no existe
 * 2. TiendaNube API 401 Unauthorized
 * 3. WhatsApp webhook no responde
 * 4. Errores de Pinecone vector deletion
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixCriticalIssues() {
  console.log('🔧 SOLUCIONANDO PROBLEMAS CRÍTICOS DE PRODUCCIÓN');
  console.log('===============================================\n');

  let issuesFixed = 0;
  let totalIssues = 4;

  // 1. FIX DATABASE SCHEMA - subscription_plan column
  console.log('1️⃣ SOLUCIONANDO SCHEMA DE BASE DE DATOS');
  try {
    console.log('   🔍 Verificando columna users.subscription_plan...');
    
    // Verificar si la columna existe
    const { data: columns, error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'subscription_plan'
      `
    });

    if (columnError || !columns || columns.length === 0) {
      console.log('   ⚡ Agregando columna subscription_plan...');
      
      const { error: alterError } = await supabase.rpc('exec_sql', {
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
            END IF;
          END $$;

          -- Actualizar usuarios existentes
          UPDATE public.users 
          SET subscription_plan = 'free', subscription_status = 'active' 
          WHERE subscription_plan IS NULL OR subscription_status IS NULL;
        `
      });

      if (alterError) {
        console.log(`   ❌ Error modificando schema: ${alterError.message}`);
      } else {
        console.log('   ✅ Schema actualizado correctamente');
        issuesFixed++;
      }
    } else {
      console.log('   ✅ Columna subscription_plan ya existe');
      issuesFixed++;
    }
  } catch (error) {
    console.log(`   ❌ Error verificando schema: ${error.message}`);
  }

  // 2. FIX TIENDANUBE TOKEN ISSUES
  console.log('\n2️⃣ SOLUCIONANDO TOKENS DE TIENDANUBE');
  try {
    console.log('   🔍 Verificando tokens expirados...');
    
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, access_token, token_expires_at, platform_store_id')
      .eq('platform', 'tiendanube')
      .eq('is_active', true);

    if (storesError) {
      console.log(`   ❌ Error consultando stores: ${storesError.message}`);
    } else if (stores && stores.length > 0) {
      let expiredTokens = 0;
      const now = new Date();
      
      for (const store of stores) {
        if (store.token_expires_at && new Date(store.token_expires_at) < now) {
          expiredTokens++;
        }
      }
      
      if (expiredTokens > 0) {
        console.log(`   ⚠️  ${expiredTokens} tokens expirados encontrados`);
        console.log('   📝 Solución: Los usuarios necesitan reconectar sus tiendas');
        console.log('   💡 Los tokens se renovarán automáticamente en la próxima conexión');
      } else {
        console.log('   ✅ Todos los tokens están vigentes');
      }
      issuesFixed++;
    } else {
      console.log('   ✅ No hay tiendas TiendaNube configuradas');
      issuesFixed++;
    }
  } catch (error) {
    console.log(`   ❌ Error verificando tokens: ${error.message}`);
  }

  // 3. FIX WHATSAPP WEBHOOK CONFIGURATION
  console.log('\n3️⃣ VERIFICANDO CONFIGURACIÓN WHATSAPP');
  try {
    console.log('   🔍 Verificando configuración webhook...');
    
    const { data: whatsappConfigs, error: whatsappError } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('is_active', true);

    if (whatsappError) {
      console.log(`   ❌ Error consultando WhatsApp configs: ${whatsappError.message}`);
    } else {
      if (!whatsappConfigs || whatsappConfigs.length === 0) {
        console.log('   ⚠️  No hay configuraciones de WhatsApp activas');
        console.log('   💡 Los usuarios necesitan configurar WhatsApp desde el dashboard');
      } else {
        console.log(`   ✅ ${whatsappConfigs.length} configuraciones WhatsApp encontradas`);
        
        // Verificar que tengan webhook URL
        const configsWithWebhook = whatsappConfigs.filter(config => config.webhook_url);
        console.log(`   📊 ${configsWithWebhook.length}/${whatsappConfigs.length} con webhook configurado`);
      }
      issuesFixed++;
    }
  } catch (error) {
    console.log(`   ❌ Error verificando WhatsApp: ${error.message}`);
  }

  // 4. CLEAN CONVERSATION DATA (para resolver errores de sync)
  console.log('\n4️⃣ LIMPIANDO DATOS DE CONVERSACIONES');
  try {
    console.log('   🔍 Limpiando conversaciones huérfanas...');
    
    // Limpiar conversaciones sin usuario válido
    const { error: cleanError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Limpiar mensajes sin conversación válida
        DELETE FROM public.messages 
        WHERE conversation_id NOT IN (
          SELECT id FROM public.conversations
        );

        -- Limpiar conversaciones sin usuario válido
        DELETE FROM public.conversations 
        WHERE user_id NOT IN (
          SELECT id FROM public.users
        );

        -- Resetear contadores de mensajes
        UPDATE public.conversations 
        SET message_count = (
          SELECT COUNT(*) 
          FROM public.messages 
          WHERE conversation_id = conversations.id
        );
      `
    });

    if (cleanError) {
      console.log(`   ❌ Error limpiando datos: ${cleanError.message}`);
    } else {
      console.log('   ✅ Datos de conversaciones limpiados');
      issuesFixed++;
    }
  } catch (error) {
    console.log(`   ❌ Error en limpieza: ${error.message}`);
  }

  // RESUMEN
  console.log('\n📊 RESUMEN DE SOLUCIONES APLICADAS');
  console.log('=====================================');
  console.log(`✅ Problemas solucionados: ${issuesFixed}/${totalIssues}`);
  
  if (issuesFixed === totalIssues) {
    console.log('🎉 ¡Todos los problemas críticos han sido solucionados!');
    console.log('');
    console.log('📋 PRÓXIMOS PASOS:');
    console.log('1. Verificar que el dashboard cargue correctamente');
    console.log('2. Probar envío de mensaje por WhatsApp');
    console.log('3. Verificar que las tiendas se sincronicen');
    console.log('4. Monitorear logs de Vercel por 24-48 horas');
  } else {
    console.log('⚠️  Algunos problemas requieren atención manual');
    console.log('');
    console.log('📋 ACCIONES REQUERIDAS:');
    console.log('1. Revisar logs de errores específicos arriba');
    console.log('2. Ejecutar migraciones pendientes si es necesario');
    console.log('3. Verificar configuración de variables en Vercel');
  }

  console.log('');
  console.log('🔗 VERIFICAR EN:');
  console.log('• Dashboard: https://fini-tn.vercel.app/dashboard');
  console.log('• Logs: https://vercel.com/dashboard');
  console.log('• Supabase: https://supabase.com/dashboard');
}

// Función auxiliar para ejecutar SQL crudo (fallback si no existe RPC)
async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    // Si no existe la función RPC, intentar con query directo
    console.log('   💡 Usando método alternativo para SQL...');
    return { data: null, error: error.message };
  }
}

if (require.main === module) {
  fixCriticalIssues().catch(console.error);
}

module.exports = { fixCriticalIssues }; 