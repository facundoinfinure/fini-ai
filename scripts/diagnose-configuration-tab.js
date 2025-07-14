#!/usr/bin/env node

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fini-tn.vercel.app'
  : 'http://localhost:3000';

console.log('🔍 Diagnóstico de Tab de Configuración');
console.log('===================================');
console.log(`📡 URL base: ${BASE_URL}\n`);

async function testEndpoint(url, description) {
  try {
    console.log(`🧪 ${description}`);
    console.log(`  📡 Testing: ${url}`);
    
    const response = await fetch(url);
    const isSuccess = [200, 401].includes(response.status); // 401 es OK, significa que existe pero requiere auth
    
    console.log(`   ${isSuccess ? '✅' : '❌'} Status: ${response.status} ${isSuccess ? '(PASS)' : '(FAIL - expected 200,401)'}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = await response.json();
        console.log(`   📊 Success: ${data.success}`);
        if (data.error) {
          console.log(`   ⚠️  Error: ${data.error}`);
        }
      } catch (e) {
        console.log(`   📄 Response: ${(await response.text()).substring(0, 100)}...`);
      }
    } else {
      const text = await response.text();
      console.log(`   📄 Response: ${text.substring(0, 100)}...`);
    }
    
    return { passed: isSuccess, status: response.status };
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function checkComponent(filePath, componentName, checks) {
  console.log(`🔍 Verificando ${componentName}...`);
  
  try {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`   ❌ File not found: ${fullPath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    let allChecks = 0;
    let passedChecks = 0;
    
    for (const [checkName, pattern] of Object.entries(checks)) {
      const matches = content.match(new RegExp(pattern, 'g'));
      const count = matches ? matches.length : 0;
      allChecks++;
      
      if (count > 0) {
        console.log(`   ✅ ${checkName}: ${count} matches`);
        passedChecks++;
      } else {
        console.log(`   ❌ ${checkName}: No matches found`);
      }
    }
    
    console.log(`   📊 File size: ${content.length} characters`);
    console.log(`   📊 Lines: ${content.split('\n').length}`);
    console.log(`   📊 Checks passed: ${passedChecks}/${allChecks}`);
    
    return { passed: passedChecks === allChecks, passedChecks, allChecks };
  } catch (error) {
    console.log(`   💥 Error reading file: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function runDiagnostics() {
  console.log('🚀 Iniciando diagnóstico completo...\n');
  
  const results = [];
  
  // Test critical endpoints that should exist
  const endpoints = [
    { url: `${BASE_URL}/api/dashboard/summary`, desc: 'Dashboard Summary Endpoint' },
    { url: `${BASE_URL}/api/stores`, desc: 'Stores Endpoint' },
    { url: `${BASE_URL}/api/user/profile`, desc: 'User Profile Endpoint' },
    { url: `${BASE_URL}/api/operations`, desc: 'Operations Endpoint' }
  ];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.url, endpoint.desc);
    results.push(result);
  }
  
  console.log('');
  
  // Check ConfigurationManagement component
  const configManagementChecks = {
    'Export default': 'export function ConfigurationManagement',
    'Store management': 'StoreManagement',
    'WhatsApp management': 'WhatsAppManagement',
    'Error boundaries': 'ErrorBoundary|try|catch',
    'Debug logs': 'console\\.log',
    'Test element': 'ConfigurationManagement está funcionando'
  };
  
  const configResult = await checkComponent(
    'src/components/dashboard/configuration-management.tsx',
    'ConfigurationManagement',
    configManagementChecks
  );
  
  console.log('');
  
  // Check DashboardContent component
  const dashboardChecks = {
    'Configuration tab condition': 'activeTab === "configuracion"',
    'ConfigurationManagement import': 'ConfigurationManagement.*from',
    'ConfigurationManagement usage': '<ConfigurationManagement',
    'Tab state management': 'setActiveTab',
    'Error boundary': 'DashboardErrorBoundary'
  };
  
  const dashboardResult = await checkComponent(
    'src/components/dashboard/dashboard-content.tsx',
    'DashboardContent',
    dashboardChecks
  );
  
  console.log('');
  
  // Check Analytics endpoint file
  const analyticsEndpointChecks = {
    'Export GET handler': 'export async function GET',
    'Authentication check': 'auth\\.getUser|createClient',
    'Error handling': 'try.*catch|NextResponse'
  };
  
  const analyticsResult = await checkComponent(
    'src/app/api/dashboard/analytics/route.ts',
    'Analytics Endpoint',
    analyticsEndpointChecks
  );
  
  console.log('');
  
  // Summary
  console.log('📊 RESUMEN DE RESULTADOS');
  console.log('========================');
  
  const passedEndpoints = results.filter(r => r.passed).length;
  const failedEndpoints = results.filter(r => !r.passed).length;
  const errorEndpoints = results.filter(r => r.error).length;
  
  console.log(`✅ Endpoints que pasaron: ${passedEndpoints}`);
  console.log(`❌ Endpoints que fallaron: ${failedEndpoints}`);
  console.log(`💥 Endpoints con errores: ${errorEndpoints}`);
  console.log(`📊 Total endpoints: ${results.length}`);
  
  if (configResult) {
    console.log(`🔧 ConfigurationManagement: ${configResult.passed ? '✅ OK' : '❌ PROBLEMAS'}`);
  }
  
  if (dashboardResult) {
    console.log(`🏠 DashboardContent: ${dashboardResult.passed ? '✅ OK' : '❌ PROBLEMAS'}`);
  }
  
  if (analyticsResult) {
    console.log(`📊 Analytics Endpoint: ${analyticsResult.passed ? '✅ OK' : '❌ PROBLEMAS'}`);
  }
  
  console.log('');
  
  if (failedEndpoints > 0 || (configResult && !configResult.passed) || (dashboardResult && !dashboardResult.passed)) {
    console.log('⚠️  Se encontraron problemas. Revisa los resultados arriba.');
  } else {
    console.log('🎉 Todo parece estar funcionando correctamente.');
  }
  
  console.log('\n📝 PRÓXIMOS PASOS:');
  console.log('- Si endpoints devuelven 401, es normal (requieren autenticación)');
  console.log('- Si devuelven 404, verificar que los archivos existan en el deploy');
  console.log('- Verificar la consola del navegador para errores JavaScript');
  console.log('- Asegurarse de que el estado activeTab se configure correctamente');
  
  console.log('\n🔧 DEBUGGING DIRECTO:');
  console.log('1. Abrir DevTools en el navegador');
  console.log('2. Ir a la tab "Console"');
  console.log('3. Buscar errores relacionados con ConfigurationManagement');
  console.log('4. Verificar que se renderice el elemento de debug azul');
}

runDiagnostics().catch(console.error); 