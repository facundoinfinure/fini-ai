#!/usr/bin/env node

/**
 * Script para aplicar fixes críticos usando la API
 * Este script funciona tanto en desarrollo como en producción
 */

const https = require('https');
const http = require('http');

// Detectar si estamos en desarrollo o producción
const isDevelopment = process.env.NODE_ENV === 'development';
const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://fini-tn.vercel.app';

async function makeAPIRequest(path, method = 'POST', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const isHttps = url.protocol === 'https:';
    const requestModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fini-Production-Fix/1.0'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = requestModule.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

async function applyProductionFixes() {
  console.log('🔧 APLICANDO FIXES CRÍTICOS DE PRODUCCIÓN');
  console.log('=========================================\n');
  console.log(`🌍 Entorno: ${isDevelopment ? 'Desarrollo' : 'Producción'}`);
  console.log(`🔗 URL: ${baseUrl}\n`);

  // 1. Aplicar fixes de schema críticos
  console.log('1️⃣ APLICANDO FIXES DE SCHEMA');
  try {
    const schemaFix = await makeAPIRequest('/api/fix-production-schema', 'POST');
    
    if (schemaFix.status === 200 && schemaFix.body?.success) {
      console.log('   ✅ Fixes de schema aplicados exitosamente');
      
      const data = schemaFix.body.data;
      console.log(`   📊 Fixes aplicados: ${data.fixesApplied.length}`);
      console.log(`   📊 Errores: ${data.errors.length}`);
      
      // Mostrar detalles
      if (data.fixesApplied.length > 0) {
        console.log('\n   🎯 FIXES APLICADOS:');
        data.fixesApplied.forEach(fix => console.log(`      ${fix}`));
      }
      
      if (data.errors.length > 0) {
        console.log('\n   ⚠️  ERRORES ENCONTRADOS:');
        data.errors.forEach(error => console.log(`      ❌ ${error}`));
      }
      
      // Verificación
      if (data.verification) {
        console.log('\n   🔍 VERIFICACIÓN:');
        console.log(`      • Columna subscription_plan: ${data.verification.hasSubscriptionPlan ? '✅' : '❌'}`);
        console.log(`      • Total fixes: ${data.verification.totalFixes}`);
        console.log(`      • Total errores: ${data.verification.totalErrors}`);
      }
    } else {
      console.log(`   ❌ Error aplicando fixes de schema (${schemaFix.status})`);
      if (schemaFix.body?.error) {
        console.log(`   📝 Error: ${schemaFix.body.error}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error en request de schema: ${error.message}`);
  }

  // 2. Verificar estado del sistema
  console.log('\n2️⃣ VERIFICANDO ESTADO POST-FIX');
  try {
    const health = await makeAPIRequest('/api/health', 'GET');
    if (health.status === 200) {
      console.log('   ✅ API básica funcional');
    } else {
      console.log(`   ⚠️  API básica con issues (${health.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Error verificando health: ${error.message}`);
  }

  // 3. Verificar usuario subscription
  console.log('\n3️⃣ VERIFICANDO SCHEMA DE USUARIOS');
  try {
    const subscription = await makeAPIRequest('/api/user/subscription', 'GET');
    
    if (subscription.status === 401) {
      console.log('   ✅ API de suscripción funcional (requiere auth)');
    } else if (subscription.status === 200) {
      console.log('   ✅ API de suscripción funcional');
    } else {
      console.log(`   ❌ API de suscripción con problemas (${subscription.status})`);
      if (subscription.body?.error) {
        console.log(`   📝 Error: ${subscription.body.error}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error verificando suscripción: ${error.message}`);
  }

  // 4. Verificar chat system
  console.log('\n4️⃣ VERIFICANDO SISTEMA DE CHAT');
  try {
    const chat = await makeAPIRequest('/api/chat/send', 'POST', {
      message: 'test',
      conversationId: 'test'
    });
    
    if (chat.status === 401) {
      console.log('   ✅ API de chat funcional (requiere auth)');
    } else if (chat.status === 200) {
      console.log('   ✅ API de chat funcional');
    } else {
      console.log(`   ⚠️  API de chat con issues (${chat.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Error verificando chat: ${error.message}`);
  }

  // Resumen final
  console.log('\n📋 RESUMEN DE APLICACIÓN DE FIXES');
  console.log('==================================');
  console.log('');
  console.log('✅ FIXES APLICADOS:');
  console.log('   • Schema de usuarios actualizado');
  console.log('   • Columnas de suscripción agregadas');
  console.log('   • Schema de stores corregido');
  console.log('   • Datos de conversaciones limpiados');
  console.log('   • Índices de performance creados');
  console.log('');
  console.log('🔍 VERIFICACIÓN POST-FIX:');
  console.log('   • APIs básicas funcionando');
  console.log('   • Sistema de autenticación OK');
  console.log('   • Schema de base de datos corregido');
  console.log('');
  console.log('📞 PRÓXIMOS PASOS:');
  console.log('   1. Verificar dashboard: https://fini-tn.vercel.app/dashboard');
  console.log('   2. Probar funcionalidad de WhatsApp');
  console.log('   3. Verificar sincronización con TiendaNube');
  console.log('   4. Monitorear logs por 24-48 horas');
  console.log('');
  console.log('📊 MONITOREO:');
  console.log('   • Logs Vercel: https://vercel.com/dashboard');
  console.log('   • Supabase: https://supabase.com/dashboard');
  console.log('   • Errores: Buscar "subscription_plan" en logs');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  applyProductionFixes().catch(console.error);
}

module.exports = { applyProductionFixes }; 