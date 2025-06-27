#!/usr/bin/env node

/**
 * 🔍 DEBUG: Template Parameters Issue
 * 
 * Diagnostica qué parámetros espera exactamente el template OTP
 */

require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

console.log('🔍 DEBUG: Investigando parámetros del template OTP\n');

async function debugTemplateParameters() {
  console.log('1️⃣ VERIFICANDO TEMPLATE OTP EN TWILIO...\n');
  
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const contentSid = process.env.TWILIO_OTP_CONTENTSID;
  
  console.log(`📋 Content SID: ${contentSid}`);
  
  try {
    // Obtener detalles del template
    const content = await client.content.v1.contents(contentSid).fetch();
    console.log(`✅ Template encontrado: ${content.friendlyName}`);
    console.log(`📝 Status: ${content.status || 'approved'}`);
    console.log(`🌐 Language: ${content.language}`);
    
    // Intentar obtener las variables del template
    console.log('\n📊 Detalles del template:');
    console.log('Types:', content.types);
    
    if (content.types && content.types['twilio/text']) {
      console.log('Text content:', content.types['twilio/text']);
    }
    
    if (content.types && content.types['twilio/whatsapp']) {
      console.log('WhatsApp content:', content.types['twilio/whatsapp']);
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo template:', error.message);
    return false;
  }
  
  console.log('\n2️⃣ PROBANDO DIFERENTES FORMATOS DE PARÁMETROS...\n');
  
  const testPhoneNumber = '+5491157269307';
  const testOTPCode = '123456';
  
  // Test 1: Solo código OTP (1 parámetro)
  console.log('🧪 Test 1: Solo código OTP');
  try {
    const message1 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify({
        1: testOTPCode
      })
    });
    
    console.log(`✅ Test 1 EXITOSO: ${message1.sid}`);
    
  } catch (error) {
    console.log(`❌ Test 1 falló: ${error.message}`);
    console.log(`📋 Error code: ${error.code || 'N/A'}`);
  }
  
  // Test 2: Código + minutos (2 parámetros)
  console.log('\n🧪 Test 2: Código + minutos de expiración');
  try {
    const message2 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify({
        1: testOTPCode,
        2: '10'
      })
    });
    
    console.log(`✅ Test 2 EXITOSO: ${message2.sid}`);
    
  } catch (error) {
    console.log(`❌ Test 2 falló: ${error.message}`);
    console.log(`📋 Error code: ${error.code || 'N/A'}`);
  }
  
  // Test 3: Formato con nombres en lugar de números
  console.log('\n🧪 Test 3: Formato con nombres de variables');
  try {
    const message3 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: contentSid,
      contentVariables: JSON.stringify({
        code: testOTPCode,
        minutes: '10'
      })
    });
    
    console.log(`✅ Test 3 EXITOSO: ${message3.sid}`);
    
  } catch (error) {
    console.log(`❌ Test 3 falló: ${error.message}`);
    console.log(`📋 Error code: ${error.code || 'N/A'}`);
  }
  
  // Test 4: Sin variables (template sin placeholders)
  console.log('\n🧪 Test 4: Sin variables');
  try {
    const message4 = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${testPhoneNumber}`,
      contentSid: contentSid
    });
    
    console.log(`✅ Test 4 EXITOSO: ${message4.sid}`);
    
  } catch (error) {
    console.log(`❌ Test 4 falló: ${error.message}`);
    console.log(`📋 Error code: ${error.code || 'N/A'}`);
  }
  
  console.log('\n🎯 ANÁLISIS COMPLETO');
  console.log('El test que funcione indica el formato correcto de parámetros');
  
  return true;
}

debugTemplateParameters().catch(console.error); 