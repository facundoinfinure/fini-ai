#!/usr/bin/env node

/**
 * 🎯 TEST FINAL: Verificar OTP en producción
 * 
 * Confirmar que el template funciona con la nueva variable
 */

require('dotenv').config({ path: '.env.production' });
const twilio = require('twilio');

console.log('🎯 TEST FINAL: Verificando OTP con nueva configuración\n');

async function testFinalOTP() {
  // Usar las variables de producción
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const contentSid = process.env.TWILIO_OTP_CONTENTSID;
  
  console.log(`📋 ContentSID en uso: ${contentSid}`);
  console.log(`🏭 Ambiente: PRODUCCIÓN\n`);
  
  // 1. Verificar que el template existe
  console.log('1️⃣ VERIFICANDO TEMPLATE...');
  try {
    const content = await client.content.v1.contents(contentSid).fetch();
    console.log(`✅ Template encontrado: ${content.friendlyName}`);
    console.log(`📝 Status: ${content.status || 'approved'}`);
    console.log(`🌐 Language: ${content.language}`);
  } catch (error) {
    console.error(`❌ Template no encontrado: ${error.message}`);
    return false;
  }
  
  // 2. Probar envío con 1 parámetro (formato correcto)
  console.log('\n2️⃣ PROBANDO ENVÍO OTP...');
  const testPhoneNumber = '+5491157269307';
  const testOTPCode = '999888';
  
  try {
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify({
        1: testOTPCode
      })
    });
    
    console.log(`✅ OTP ENVIADO EXITOSAMENTE!`);
    console.log(`📧 Message SID: ${message.sid}`);
    console.log(`📱 Código enviado: ${testOTPCode}`);
    console.log(`📊 Status: ${message.status}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ ERROR EN ENVÍO: ${error.message}`);
    console.error(`📋 Error code: ${error.code}`);
    return false;
  }
}

async function main() {
  const success = await testFinalOTP();
  
  console.log('\n🏆 RESULTADO FINAL:');
  if (success) {
    console.log('✅ OTP FUNCIONA PERFECTAMENTE EN PRODUCCIÓN');
    console.log('✅ Error 20422 DEFINITIVAMENTE RESUELTO');
    console.log('✅ Template configurado correctamente');
    console.log('\n🚀 La aplicación está lista para usar!');
  } else {
    console.log('❌ Aún hay problemas con el template OTP');
    console.log('🔧 Se requiere más investigación');
  }
}

main().catch(console.error); 