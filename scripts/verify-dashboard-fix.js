#!/usr/bin/env node

/**
 * 🔍 SCRIPT DE VERIFICACIÓN DASHBOARD
 * ===================================
 * 
 * Verifica que el dashboard y especialmente la sección de configuración
 * funcionen correctamente después del fix del endpoint analytics faltante.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.VERCEL_URL || 'https://fini-tn.vercel.app';

console.log('🔍 Iniciando verificación del dashboard...');
console.log(`📡 URL base: ${BASE_URL}`);

const tests = [
  {
    name: 'Dashboard Analytics Endpoint',
    url: '/api/dashboard/analytics?timeRange=30d',
    expectedStatus: [200, 401], // 401 es válido si no está autenticado
    description: 'Verifica que el endpoint de analytics existe y responde'
  },
  {
    name: 'Dashboard Summary Endpoint',
    url: '/api/dashboard/summary',
    expectedStatus: [200, 401],
    description: 'Verifica que el endpoint de summary funciona'
  },
  {
    name: 'Stores Endpoint',
    url: '/api/stores',
    expectedStatus: [200, 401],
    description: 'Verifica que el endpoint de stores funciona'
  },
  {
    name: 'Operations Endpoint',
    url: '/api/operations',
    expectedStatus: [200, 401],
    description: 'Verifica que el endpoint de operations funciona'
  }
];

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${BASE_URL}${url}`;
    
    console.log(`  📡 Testing: ${fullUrl}`);
    
    https.get(fullUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runTest(test) {
  try {
    console.log(`\n🧪 ${test.name}`);
    console.log(`   ${test.description}`);
    
    const result = await makeRequest(test.url);
    const statusOk = test.expectedStatus.includes(result.status);
    
    if (statusOk) {
      console.log(`   ✅ Status: ${result.status} (${statusOk ? 'PASS' : 'FAIL'})`);
      
      // Try to parse JSON if possible
      try {
        const jsonData = JSON.parse(result.data);
        if (jsonData.success !== undefined) {
          console.log(`   📊 Success: ${jsonData.success}`);
        }
        if (jsonData.error) {
          console.log(`   ⚠️  Error: ${jsonData.error}`);
        }
      } catch (e) {
        console.log(`   📄 Response length: ${result.data.length} chars`);
      }
      
      return { test: test.name, status: 'PASS', httpStatus: result.status };
    } else {
      console.log(`   ❌ Status: ${result.status} (FAIL - expected ${test.expectedStatus})`);
      console.log(`   📄 Response: ${result.data.substring(0, 200)}...`);
      return { test: test.name, status: 'FAIL', httpStatus: result.status };
    }
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
    return { test: test.name, status: 'ERROR', error: error.message };
  }
}

function checkConfigurationComponent() {
  console.log('\n🔍 Verificando componente ConfigurationManagement...');
  
  const configPath = path.join(__dirname, '../src/components/dashboard/configuration-management.tsx');
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    
    // Check for key elements
    const checks = [
      { name: 'Export default', pattern: /export function ConfigurationManagement/g },
      { name: 'Store management', pattern: /StoreManagement/g },
      { name: 'WhatsApp management', pattern: /WhatsAppManagement/g },
      { name: 'Error boundaries', pattern: /try\s*{|catch\s*\(/g },
      { name: 'Debug logs', pattern: /console\.log.*ConfigurationManagement/g }
    ];
    
    checks.forEach(check => {
      const matches = content.match(check.pattern);
      const count = matches ? matches.length : 0;
      console.log(`   ${count > 0 ? '✅' : '❌'} ${check.name}: ${count} matches`);
    });
    
    console.log(`   📊 File size: ${content.length} characters`);
    console.log(`   📊 Lines: ${content.split('\n').length}`);
    
  } catch (error) {
    console.log(`   💥 Error reading file: ${error.message}`);
  }
}

function checkDashboardContent() {
  console.log('\n🔍 Verificando DashboardContent...');
  
  const dashboardPath = path.join(__dirname, '../src/components/dashboard/dashboard-content.tsx');
  
  try {
    const content = fs.readFileSync(dashboardPath, 'utf8');
    
    // Check for configuration tab handling
    const configChecks = [
      { name: 'Configuration tab condition', pattern: /activeTab === ["']configuracion["']/g },
      { name: 'ConfigurationManagement import', pattern: /import.*ConfigurationManagement/g },
      { name: 'ConfigurationManagement usage', pattern: /<ConfigurationManagement/g },
      { name: 'Error boundary', pattern: /<DashboardErrorBoundary>/g }
    ];
    
    configChecks.forEach(check => {
      const matches = content.match(check.pattern);
      const count = matches ? matches.length : 0;
      console.log(`   ${count > 0 ? '✅' : '❌'} ${check.name}: ${count} matches`);
    });
    
  } catch (error) {
    console.log(`   💥 Error reading dashboard file: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Iniciando verificación completa...\n');
  
  // Run API tests
  const results = [];
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }
  
  // Check component files
  checkConfigurationComponent();
  checkDashboardContent();
  
  // Summary
  console.log('\n📊 RESUMEN DE RESULTADOS');
  console.log('========================');
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  
  console.log(`✅ Pasaron: ${passed}`);
  console.log(`❌ Fallaron: ${failed}`);
  console.log(`💥 Errores: ${errors}`);
  console.log(`📊 Total: ${results.length}\n`);
  
  if (failed === 0 && errors === 0) {
    console.log('🎉 ¡Todos los tests pasaron! El dashboard debería funcionar correctamente.');
  } else {
    console.log('⚠️  Algunos tests fallaron. Revisa los resultados arriba.');
  }
  
  console.log('\n📝 RECOMENDACIONES:');
  console.log('- Si ves errores 401, es normal - significa que los endpoints existen');
  console.log('- Si ves errores 404, significa que falta implementar esos endpoints');
  console.log('- Verifica que el componente ConfigurationManagement se renderiza correctamente');
  console.log('- Revisa la consola del navegador para errores JavaScript');
}

main().catch(console.error); 