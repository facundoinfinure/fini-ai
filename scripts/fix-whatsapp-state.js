#!/usr/bin/env node

/**
 * Fix WhatsApp State - Reset all numbers to unverified to force proper OTP flow
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔄 ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.white}${msg}${colors.reset}`)
};

async function fixWhatsAppState() {
  log.title('🔧 FIXING WHATSAPP STATE - RESET TO UNVERIFIED\n');
  
  // Verificar configuración de Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log.error('Faltan credenciales de Supabase');
    log.error('Verifica NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local');
    return false;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    log.step('1. Obteniendo números de WhatsApp existentes...\n');
    
    // Obtener todos los números de WhatsApp
    const { data: numbers, error: fetchError } = await supabase
      .from('whatsapp_numbers')
      .select('id, phone_number, display_name, is_verified, verified_at, user_id');
    
    if (fetchError) {
      log.error(`Error obteniendo números: ${fetchError.message}`);
      return false;
    }
    
    if (!numbers || numbers.length === 0) {
      log.warning('No se encontraron números de WhatsApp');
      return true;
    }
    
    log.info(`Encontrados ${numbers.length} números de WhatsApp`);
    console.log('');
    
    // Mostrar estado actual
    for (const number of numbers) {
      const status = number.is_verified ? '✅ VERIFICADO' : '❌ NO VERIFICADO';
      console.log(`   📱 ${number.phone_number} (${number.display_name}) - ${status}`);
    }
    
    log.step('\n2. Reseteando TODOS los números a estado NO VERIFICADO...\n');
    
    // Resetear todos los números a NO VERIFICADO
    const { error: updateError } = await supabase
      .from('whatsapp_numbers')
      .update({
        is_verified: false,
        verified_at: null,
        updated_at: new Date().toISOString()
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
    
    if (updateError) {
      log.error(`Error actualizando números: ${updateError.message}`);
      return false;
    }
    
    log.success(`✅ ${numbers.length} números reseteados a NO VERIFICADO`);
    
    log.step('\n3. Limpiando verificaciones antiguas...\n');
    
    // Eliminar todas las verificaciones antiguas
    const { error: deleteError } = await supabase
      .from('whatsapp_verifications')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) {
      log.warning(`Warning limpiando verificaciones: ${deleteError.message}`);
    } else {
      log.success('✅ Verificaciones antiguas eliminadas');
    }
    
    log.step('\n4. Verificando estado final...\n');
    
    // Verificar que todos están NO VERIFICADOS
    const { data: finalNumbers, error: finalError } = await supabase
      .from('whatsapp_numbers')
      .select('id, phone_number, display_name, is_verified, verified_at');
    
    if (finalError) {
      log.error(`Error verificando estado final: ${finalError.message}`);
      return false;
    }
    
    let allUnverified = true;
    for (const number of finalNumbers) {
      const status = number.is_verified ? '❌ VERIFICADO (ERROR!)' : '✅ NO VERIFICADO (OK)';
      console.log(`   📱 ${number.phone_number} - ${status}`);
      if (number.is_verified) {
        allUnverified = false;
      }
    }
    
    if (allUnverified) {
      log.success('\n🎉 TODOS LOS NÚMEROS ESTÁN CORRECTAMENTE NO VERIFICADOS');
    } else {
      log.error('\n❌ ALGUNOS NÚMEROS SIGUEN VERIFICADOS - REVISAR MANUALMENTE');
      return false;
    }
    
    log.step('\n5. Próximos pasos...\n');
    
    console.log('🚀 PARA USAR TU APP:');
    console.log('   1. npm run dev');
    console.log('   2. Ve a: http://localhost:3005/dashboard');
    console.log('   3. Pestaña WhatsApp → Los números ahora requieren verificación');
    console.log('   4. Intenta agregar un número → Debería aparecer modal OTP');
    console.log('   5. Si persiste error 500, revisa credenciales Twilio');
    
    console.log('\n🔧 SI PERSISTE EL PROBLEMA:');
    console.log('   • Verifica TWILIO_ACCOUNT_SID en .env.local');
    console.log('   • Verifica TWILIO_AUTH_TOKEN en .env.local');
    console.log('   • Verifica TWILIO_PHONE_NUMBER en .env.local');
    console.log('   • Ejecuta: node scripts/debug-whatsapp-otp.js');
    
    return true;
    
  } catch (error) {
    log.error(`Error inesperado: ${error.message}`);
    return false;
  }
}

// Ejecutar
fixWhatsAppState()
  .then(success => {
    if (success) {
      log.success('\n🎊 WHATSAPP STATE FIXED SUCCESSFULLY!');
      process.exit(0);
    } else {
      log.error('\n💥 FAILED TO FIX WHATSAPP STATE');
      process.exit(1);
    }
  })
  .catch(error => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  }); 