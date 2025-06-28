#!/usr/bin/env node

/**
 * 🔍 DEBUG: Template OTP de Producción
 * 
 * Verificar qué parámetros espera el template usado en producción
 */

require('dotenv').config({ path: '.env.production' });
const twilio = require('twilio');

console.log('🔍 DEBUG: Investigando template OTP de PRODUCCIÓN\n');

async function debugProductionTemplate() {
  console.log('1️⃣ COMPARANDO TEMPLATES...\n');
  
  const productionOTP = process.env.TWILIO_OTP_CONTENTSID;
  const backupOTP = process.env.TWILIO_OTP_BACKUP_CONTENTSID;
  
  console.log(`🏭 PRODUCCIÓN: ${productionOTP}`);
  console.log(`💾 BACKUP:     ${backupOTP}`);
  
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  // Verificar template de producción
  console.log('\n2️⃣ ANALIZANDO TEMPLATE DE PRODUCCIÓN...\n');
  
  try {
    const content = await client.content.v1.contents(productionOTP).fetch();
    console.log(`✅ Template: ${content.friendlyName}`);
    console.log(`📝 Status: ${content.status}`);
    console.log(`🌐 Language: ${content.language}`);
    console.log('📋 Content types:', JSON.stringify(content.types, null, 2));
    
  } catch (error) {
    console.error('❌ Error obteniendo template de producción:', error.message);
  }
  
  // Verificar template backup
  console.log('\n3️⃣ ANALIZANDO TEMPLATE BACKUP...\n');
  
  try {
    const content = await client.content.v1.contents(backupOTP).fetch();
    console.log(`✅ Template: ${content.friendlyName}`);
    console.log(`📝 Status: ${content.status}`);
    console.log(`🌐 Language: ${content.language}`);
    console.log('📋 Content types:', JSON.stringify(content.types, null, 2));
    
  } catch (error) {
    console.error('❌ Error obteniendo template backup:', error.message);
  }
  
  console.log('\n4️⃣ PROBANDO FORMATOS EN TEMPLATE DE PRODUCCIÓN...\n');
  
  const testPhoneNumber = '+5491157269307';
  const testOTPCode = '123456';
  
  // Test 1: Solo código (1 parámetro)
  console.log('🧪 Test 1: {1: codigo}');
  try {
    const message1 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: productionOTP,
      contentVariables: JSON.stringify({
        1: testOTPCode
      })
    });
    
    console.log(`✅ EXITOSO: ${message1.sid}`);
    
  } catch (error) {
    console.log(`❌ FALLÓ: ${error.message}`);
    console.log(`📋 Error code: ${error.code}`);
  }
  
  // Test 2: Sin parámetros
  console.log('\n🧪 Test 2: Sin parámetros');
  try {
    const message2 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: productionOTP
    });
    
    console.log(`✅ EXITOSO: ${message2.sid}`);
    
  } catch (error) {
    console.log(`❌ FALLÓ: ${error.message}`);
    console.log(`📋 Error code: ${error.code}`);
  }
  
  // Test 3: Código + tiempo (2 parámetros)
  console.log('\n🧪 Test 3: {1: codigo, 2: minutos}');
  try {
    const message3 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: productionOTP,
      contentVariables: JSON.stringify({
        1: testOTPCode,
        2: '10'
      })
    });
    
    console.log(`✅ EXITOSO: ${message3.sid}`);
    
  } catch (error) {
    console.log(`❌ FALLÓ: ${error.message}`);
    console.log(`📋 Error code: ${error.code}`);
  }
  
  console.log('\n🎯 CONCLUSIÓN');
  console.log('El test exitoso muestra el formato correcto para producción');
}

debugProductionTemplate().catch(console.error); 