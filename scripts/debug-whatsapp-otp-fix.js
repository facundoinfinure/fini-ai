#!/usr/bin/env node

/**
 * 🔧 DEBUG SCRIPT: WhatsApp OTP Configuration
 * 
 * Verifica la configuración de WhatsApp OTP y testea el envío
 * Detecta errores 20422, 20404, 63016 y otros problemas comunes
 */

console.log('🔧 DEBUG: WhatsApp OTP Configuration & Testing\n');

// Check environment variables
console.log('📋 VERIFICANDO VARIABLES DE ENTORNO:');

const requiredVars = {
  'TWILIO_ACCOUNT_SID': process.env.TWILIO_ACCOUNT_SID,
  'TWILIO_AUTH_TOKEN': process.env.TWILIO_AUTH_TOKEN,
  'TWILIO_PHONE_NUMBER': process.env.TWILIO_PHONE_NUMBER,
  'TWILIO_OTP_CONTENTSID': process.env.TWILIO_OTP_CONTENTSID
};

let hasErrors = false;

Object.entries(requiredVars).forEach(([key, value]) => {
  if (!value) {
    console.log(`❌ ${key}: NO CONFIGURADA`);
    hasErrors = true;
  } else if (value.includes('your-') || value.includes('HX_') || value.includes('tu-')) {
    console.log(`⚠️  ${key}: VALOR DE EJEMPLO (${value})`);
    hasErrors = true;
  } else {
    const masked = value.length > 10 
      ? `${value.substring(0, 6)}...${value.substring(value.length - 4)}`
      : `${value.substring(0, 3)}...`;
    console.log(`✅ ${key}: ${masked}`);
  }
});

console.log('\n🔍 ANÁLISIS DE CONFIGURACIÓN:');

// Analyze TWILIO_OTP_CONTENTSID specifically
const contentSid = process.env.TWILIO_OTP_CONTENTSID;
if (!contentSid) {
  console.log('❌ TWILIO_OTP_CONTENTSID: No configurado');
  console.log('💡 SOLUCIÓN: Configurar Content SID del template OTP aprobado en Twilio');
} else if (contentSid.includes('HX_') || contentSid === '') {
  console.log('❌ TWILIO_OTP_CONTENTSID: Valor de placeholder/ejemplo');
  console.log('💡 SOLUCIÓN: Reemplazar con Content SID real del template aprobado');
} else if (!contentSid.startsWith('HX')) {
  console.log('❌ TWILIO_OTP_CONTENTSID: Formato inválido (debe empezar con HX)');
  console.log('💡 FORMATO ESPERADO: HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
} else {
  console.log('✅ TWILIO_OTP_CONTENTSID: Formato válido');
}

console.log('\n🧪 SIMULACIÓN DE ENVÍO OTP:');

// Test OTP variables
const testOtpCode = '123456';
const testPhoneNumber = '+1234567890';

console.log(`📱 Testeando con código: ${testOtpCode}`);
console.log(`📞 Número de prueba: ${testPhoneNumber}`);

// Simulate template variables
const templateVariables = {
  1: testOtpCode,
  2: '10' // expiry minutes
};

console.log(`🎯 Variables del template:`, JSON.stringify(templateVariables));

// Check if we have valid config for template
if (contentSid && contentSid.startsWith('HX') && !contentSid.includes('HX_')) {
  console.log('✅ CONFIGURACIÓN: Template puede ser usado');
  console.log('📋 PRÓXIMO PASO: Verificar que el template esté aprobado en Twilio Console');
} else {
  console.log('❌ CONFIGURACIÓN: Template NO puede ser usado');
  console.log('🔄 FALLBACK: Se usará mensaje freeform (solo funciona dentro de 24h)');
}

console.log('\n📝 MENSAJE FREEFORM DE FALLBACK:');
const fallbackMessage = `🔐 *Fini AI - Código de Verificación*

Código: *${testOtpCode}*

Este código expira en 10 minutos.
Por seguridad, no lo compartas con nadie.`;

console.log('📄 CONTENIDO DEL MENSAJE:');
console.log(fallbackMessage);

console.log('\n🚨 POSIBLES ERRORES TWILIO:');
console.log('• Error 20422: Invalid Parameter → Content SID inválido o variables incorrectas');
console.log('• Error 20404: Not Found → Content SID no existe o template eliminado');
console.log('• Error 63016: Outside Window → Fuera de ventana 24h, necesita template aprobado');

console.log('\n✅ RESUMEN:');
if (hasErrors) {
  console.log('❌ CONFIGURACIÓN INCOMPLETA');
  console.log('💡 ACCIÓN REQUERIDA:');
  console.log('   1. Configurar variables de entorno faltantes');
  console.log('   2. Crear template OTP aprobado en Twilio Console');
  console.log('   3. Copiar Content SID del template aprobado');
  console.log('   4. Testear envío de OTP');
} else {
  console.log('✅ CONFIGURACIÓN COMPLETA');
  console.log('🧪 PRÓXIMO PASO: Testear envío real de OTP');
}

console.log('\n🔗 RECURSOS ÚTILES:');
console.log('• Twilio Console Templates: https://console.twilio.com/us1/develop/sms/content-editor');
console.log('• Error 20422 Docs: https://www.twilio.com/docs/api/errors/20422');
console.log('• WhatsApp Template Guide: https://www.twilio.com/docs/whatsapp/tutorial/message-template-approvals-statuses');

process.exit(hasErrors ? 1 : 0); 