#!/usr/bin/env node

/**
 * 🔍 VERIFICACIÓN RÁPIDA CONFIGURACIÓN
 * ====================================
 * 
 * Verifica que el componente ConfigurationManagement
 * se renderice correctamente después del fix.
 */

const https = require('https');

const BASE_URL = 'https://fini-tn.vercel.app';

console.log('🔍 Verificando si la configuración se muestra correctamente...');
console.log(`📡 URL: ${BASE_URL}`);

// Test 1: Verificar que la página del dashboard responde
function testDashboardPage() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fini-tn.vercel.app',
      port: 443,
      path: '/dashboard',
      method: 'GET',
      headers: {
        'User-Agent': 'Fini-Dashboard-Check/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const includes = {
          configTab: data.includes('Configuración') || data.includes('Configuration'),
          configManagement: data.includes('ConfigurationManagement'),
          testElement: data.includes('ConfigurationManagement está funcionando'),
          storeManagement: data.includes('StoreManagement'),
          whatsappManagement: data.includes('WhatsAppManagement')
        };
        
        console.log('\n📄 Dashboard Page Analysis:');
        console.log(`Status: ${res.statusCode}`);
        console.log(`✅ Contains "Configuración" tab: ${includes.configTab}`);
        console.log(`✅ Contains ConfigurationManagement: ${includes.configManagement}`);
        console.log(`🎯 Contains test element: ${includes.testElement}`);
        console.log(`🏪 Contains StoreManagement: ${includes.storeManagement}`);
        console.log(`📱 Contains WhatsAppManagement: ${includes.whatsappManagement}`);
        
        resolve({
          success: res.statusCode === 200,
          statusCode: res.statusCode,
          includes
        });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Error:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(10000, () => {
      console.error('❌ Timeout');
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

// Test 2: Verificar endpoint de analytics que creamos
function testAnalyticsEndpoint() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'fini-tn.vercel.app',
      port: 443,
      path: '/api/dashboard/analytics?timeRange=30d',
      method: 'GET',
      headers: {
        'User-Agent': 'Fini-Analytics-Check/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('\n📊 Analytics Endpoint:');
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${data.substring(0, 200)}...`);
        
        resolve({
          success: res.statusCode !== 404,
          statusCode: res.statusCode,
          response: data
        });
      });
    });

    req.on('error', (error) => {
      console.error('❌ Analytics Error:', error.message);
      resolve({ success: false, error: error.message });
    });

    req.setTimeout(5000, () => {
      console.error('❌ Analytics Timeout');
      req.destroy();
      resolve({ success: false, error: 'Timeout' });
    });

    req.end();
  });
}

// Ejecutar tests
async function runChecks() {
  console.log('🚀 Iniciando verificaciones...\n');
  
  const dashboardResult = await testDashboardPage();
  const analyticsResult = await testAnalyticsEndpoint();
  
  console.log('\n📋 RESUMEN:');
  console.log('===========');
  
  if (dashboardResult.success) {
    console.log('✅ Dashboard page responde correctamente');
    
    if (dashboardResult.includes?.testElement) {
      console.log('🎯 ¡ÉXITO! El elemento de prueba está presente');
      console.log('   → ConfigurationManagement se está renderizando');
    } else {
      console.log('⚠️  Elemento de prueba no encontrado');
      console.log('   → El componente puede no estar renderizando correctamente');
    }
  } else {
    console.log('❌ Dashboard page tiene problemas');
  }
  
  if (analyticsResult.success && analyticsResult.statusCode !== 404) {
    console.log('✅ Endpoint analytics funciona correctamente');
  } else {
    console.log('❌ Endpoint analytics aún no disponible (puede estar desplegando)');
  }
  
  console.log('\n💡 RECOMENDACIONES:');
  if (dashboardResult.includes?.testElement) {
    console.log('✅ La configuración debería aparecer correctamente ahora');
    console.log('✅ Puedes probar refrescando la página en el navegador');
  } else {
    console.log('⚠️  Si la configuración sigue vacía:');
    console.log('   1. Limpia el cache del navegador (Ctrl+Shift+R)');
    console.log('   2. Verifica la consola del navegador por errores JavaScript');
    console.log('   3. Espera 2-3 minutos más para que se complete el deploy');
  }
}

runChecks().catch(console.error); 