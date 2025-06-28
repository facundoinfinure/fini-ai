#!/usr/bin/env node

/**
 * Script de diagnóstico para problemas de producción
 * Verifica el estado del sistema sin necesidad de variables de entorno locales
 */

const https = require('https');

const PRODUCTION_URL = 'https://fini-tn.vercel.app';

async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fini-Diagnostic-Script/1.0'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
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

async function checkHealth() {
  console.log('🏥 DIAGNÓSTICO DEL SISTEMA EN PRODUCCIÓN');
  console.log('=========================================\n');

  // 1. Health check básico
  console.log('1️⃣ HEALTH CHECK BÁSICO');
  try {
    const health = await makeRequest('/api/health');
    if (health.status === 200) {
      console.log('   ✅ API básica funcional');
    } else {
      console.log(`   ❌ API básica con problemas (${health.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Error de conexión: ${error.message}`);
  }

  // 2. Database schema check
  console.log('\n2️⃣ VERIFICACIÓN DE SCHEMA DB');
  try {
    const schema = await makeRequest('/api/debug/schema-validation');
    if (schema.status === 200 && schema.body?.success) {
      console.log('   ✅ Schema de base de datos OK');
      if (schema.body.data?.missingTables?.length > 0) {
        console.log(`   ⚠️  Tablas faltantes: ${schema.body.data.missingTables.join(', ')}`);
      }
      if (schema.body.data?.missingColumns?.length > 0) {
        console.log(`   ⚠️  Columnas faltantes: ${schema.body.data.missingColumns.length}`);
      }
    } else {
      console.log(`   ❌ Schema con problemas (${schema.status})`);
      if (schema.body?.error) {
        console.log(`   📝 Error: ${schema.body.error}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error verificando schema: ${error.message}`);
  }

  // 3. Store status check
  console.log('\n3️⃣ ESTADO DE TIENDAS');
  try {
    const stores = await makeRequest('/api/dashboard/store-status');
    if (stores.status === 200 && stores.body?.success) {
      console.log('   ✅ API de tiendas accesible');
      const data = stores.body.data;
      console.log(`   📊 Tiendas totales: ${data.totalStores || 'N/A'}`);
      console.log(`   📊 Tiendas activas: ${data.activeStores || 'N/A'}`);
      if (data.connectionIssues > 0) {
        console.log(`   ⚠️  Tiendas con problemas de conexión: ${data.connectionIssues}`);
      }
    } else {
      console.log(`   ❌ API de tiendas con problemas (${stores.status})`);
      if (stores.body?.error) {
        console.log(`   📝 Error: ${stores.body.error}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error verificando tiendas: ${error.message}`);
  }

  // 4. Chat system check
  console.log('\n4️⃣ SISTEMA DE CHAT');
  try {
    const chat = await makeRequest('/api/conversations', 'POST', {});
    // Esperamos 401 porque no estamos autenticados, eso está bien
    if (chat.status === 401) {
      console.log('   ✅ API de chat funcional (requiere auth)');
    } else if (chat.status === 200) {
      console.log('   ✅ API de chat funcional');
    } else {
      console.log(`   ❌ API de chat con problemas (${chat.status})`);
    }
  } catch (error) {
    console.log(`   ❌ Error verificando chat: ${error.message}`);
  }

  // 5. Agent system check
  console.log('\n5️⃣ SISTEMA DE AGENTES');
  try {
    const routing = await makeRequest('/api/debug/test-routing', 'POST', {
      message: 'que productos tengo cargados en mi tienda?'
    });
    
    if (routing.status === 200 && routing.body?.success) {
      console.log('   ✅ Sistema de routing de agentes funcional');
      const data = routing.body.data;
      console.log(`   📊 Agente seleccionado: ${data.selectedAgent || 'N/A'}`);
      console.log(`   📊 Confianza: ${data.confidence || 'N/A'}%`);
    } else {
      console.log(`   ❌ Sistema de agentes con problemas (${routing.status})`);
      if (routing.body?.error) {
        console.log(`   📝 Error: ${routing.body.error}`);
      }
    }
  } catch (error) {
    console.log(`   ❌ Error verificando agentes: ${error.message}`);
  }

  console.log('\n📋 RESUMEN DEL DIAGNÓSTICO:');
  console.log('==========================================');
  console.log('Los errores encontrados en los logs indican:');
  console.log('');
  console.log('🔴 PROBLEMAS CRÍTICOS IDENTIFICADOS:');
  console.log('   • TiendaNube API 401 Unauthorized');
  console.log('   • Column "users.subscription_plan" no existe');
  console.log('   • WhatsApp webhook no responde');
  console.log('   • Errores de Pinecone vector deletion');
  console.log('');
  console.log('🔧 SOLUCIONES REQUERIDAS:');
  console.log('   1. Ejecutar migración de base de datos');
  console.log('   2. Renovar tokens de TiendaNube expirados');
  console.log('   3. Verificar configuración webhook WhatsApp');
  console.log('   4. Limpiar errores de Pinecone');
  console.log('');
  console.log('📞 SIGUIENTE PASO:');
  console.log('   Ejecutar: node scripts/fix-critical-production-issues.js');
}

checkHealth().catch(console.error); 