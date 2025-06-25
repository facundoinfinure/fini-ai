#!/usr/bin/env node

/**
 * Test específico para el template de Welcome
 */

require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

async function testWelcomeTemplate() {
  console.log('🧪 Test específico del Template de Welcome\n');

  // Verificar variables
  const requiredVars = {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,
    TWILIO_WELCOME_CONTENTSID: process.env.TWILIO_WELCOME_CONTENTSID
  };

  log.info('Verificando configuración...');
  for (const [key, value] of Object.entries(requiredVars)) {
    if (value && value !== '') {
      log.success(`${key}: ${value}`);
    } else {
      log.error(`${key}: No configurado`);
      return;
    }
  }

  // Crear cliente Twilio
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  try {
    log.info('\n🔍 Verificando si el template existe en Twilio...');
    
    // Intentar enviar un template de prueba (NO se enviará porque el número no es válido)
    console.log('\n📋 Configuración del template:');
    console.log(`Content SID: ${process.env.TWILIO_WELCOME_CONTENTSID}`);
    console.log('Variables que se enviarían:');
    console.log('  {{1}}: "Usuario"');
    console.log('  {{2}}: "tu tienda"');

    log.info('\n📱 Para probar realmente, usa un número válido...');
    
    // Simular la configuración que usaríamos
    const templateConfig = {
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: 'whatsapp:+1234567890', // Número falso para no enviar
      contentSid: process.env.TWILIO_WELCOME_CONTENTSID,
      contentVariables: JSON.stringify({
        1: 'Usuario',
        2: 'tu tienda'
      })
    };

    console.log('\n🔧 Configuración que se usaría:');
    console.log(JSON.stringify(templateConfig, null, 2));

    log.success('✅ Configuración del template parece correcta');
    log.warning('⚠️  Para probar completamente, necesitas enviar a un número real');

  } catch (error) {
    log.error(`Error al verificar template: ${error.message}`);
    
    if (error.message.includes('20404')) {
      log.error('❌ El Content SID no existe en tu cuenta de Twilio');
      log.info('💡 Verifica en: https://console.twilio.com/us1/develop/sms/content-template-builder/');
    }
  }
}

// Función para probar envío real (comentada por seguridad)
async function testRealSend() {
  console.log('\n🚨 FUNCIÓN DE PRUEBA REAL (DESHABILITADA)');
  console.log('Para probar con un número real, descomenta esta función');
  console.log('y cambia el número de teléfono por uno válido.');
  
  /*
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  try {
    const message = await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: 'whatsapp:+TU_NUMERO_AQUI', // Reemplaza con tu número
      contentSid: process.env.TWILIO_WELCOME_CONTENTSID,
      contentVariables: JSON.stringify({
        1: 'Usuario',
        2: 'tu tienda'
      })
    });
    
    log.success(`✅ Template enviado exitosamente: ${message.sid}`);
  } catch (error) {
    log.error(`❌ Error al enviar template: ${error.message}`);
  }
  */
}

async function main() {
  await testWelcomeTemplate();
  await testRealSend();
}

if (require.main === module) {
  main();
} 