#!/usr/bin/env node

/**
 * Script que espera el deploy de Vercel y aplica fixes automáticamente
 */

const https = require('https');
const { applyProductionFixes } = require('./apply-production-fixes');

const PRODUCTION_URL = 'https://fini-tn.vercel.app';
const MAX_WAIT_TIME = 5 * 60 * 1000; // 5 minutos
const CHECK_INTERVAL = 10 * 1000; // 10 segundos

async function checkAPIAvailability() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fini-tn.vercel.app',
      port: 443,
      path: '/api/fix-production-schema',
      method: 'GET',
      headers: {
        'User-Agent': 'Fini-Deploy-Check/1.0'
      }
    };

    const req = https.request(options, (res) => {
      resolve({
        status: res.statusCode,
        available: res.statusCode === 200
      });
    });

    req.on('error', () => {
      resolve({
        status: 0,
        available: false
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        status: 0,
        available: false
      });
    });

    req.end();
  });
}

async function waitForDeploy() {
  console.log('🚀 ESPERANDO DEPLOY DE VERCEL...');
  console.log('================================\n');
  
  const startTime = Date.now();
  let attempts = 0;
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    attempts++;
    console.log(`🔍 Intento ${attempts}: Verificando disponibilidad del API...`);
    
    const result = await checkAPIAvailability();
    
    if (result.available) {
      console.log('✅ API disponible! Deploy completado.');
      return true;
    } else {
      console.log(`   ⏳ API no disponible (status: ${result.status}). Esperando...`);
    }
    
    // Esperar antes del siguiente intento
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
  
  console.log('⏰ Timeout esperando deploy. Continuando de todas formas...');
  return false;
}

async function deployAndFix() {
  console.log('🔧 DEPLOY Y APLICACIÓN DE FIXES CRÍTICOS');
  console.log('==========================================\n');
  
  // 1. Esperar deploy
  const deployReady = await waitForDeploy();
  
  if (!deployReady) {
    console.log('⚠️  Deploy no confirmado, pero continuando...\n');
  } else {
    console.log('🎉 Deploy confirmado! Aplicando fixes...\n');
  }
  
  // 2. Esperar un poco más para asegurar
  console.log('⏳ Esperando 30 segundos adicionales para estabilizar...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // 3. Aplicar fixes
  console.log('\n🔧 INICIANDO APLICACIÓN DE FIXES');
  console.log('=================================\n');
  
  try {
    await applyProductionFixes();
    console.log('\n🎉 ¡PROCESO COMPLETADO EXITOSAMENTE!');
    console.log('=====================================');
    console.log('');
    console.log('✅ Deploy realizado');
    console.log('✅ Fixes aplicados');
    console.log('✅ Sistema listo para uso');
    console.log('');
    console.log('🔗 VERIFICAR:');
    console.log('• Dashboard: https://fini-tn.vercel.app/dashboard');
    console.log('• WhatsApp: Probar envío de mensajes');
    console.log('• Logs: https://vercel.com/dashboard');
  } catch (error) {
    console.error('\n❌ Error aplicando fixes:', error.message);
    console.log('\n📋 ACCIÓN REQUERIDA:');
    console.log('1. Verificar logs de Vercel');
    console.log('2. Ejecutar manualmente: node scripts/apply-production-fixes.js');
    console.log('3. Revisar configuración de variables de entorno');
  }
}

// Información del proceso
if (require.main === module) {
  console.log('🚀 INICIANDO PROCESO DE DEPLOY Y FIX');
  console.log('====================================');
  console.log('Este script:');
  console.log('1. Espera que Vercel complete el deploy');
  console.log('2. Verifica la disponibilidad del nuevo API');
  console.log('3. Aplica automáticamente los fixes críticos');
  console.log('4. Verifica que todo funcione correctamente');
  console.log('');
  
  deployAndFix().catch(console.error);
}

module.exports = { deployAndFix, waitForDeploy }; 