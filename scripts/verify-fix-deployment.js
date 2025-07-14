#!/usr/bin/env node

console.log('🔍 Verificación Post-Deploy: Tab de Configuración');
console.log('==============================================\n');

const BASE_URL = 'https://fini-tn.vercel.app';

async function testEndpoint(url, description, expectStatus = [200, 401]) {
  try {
    console.log(`🧪 ${description}`);
    console.log(`   📡 Testing: ${url}`);
    
    const response = await fetch(url);
    const isSuccess = expectStatus.includes(response.status);
    
    console.log(`   ${isSuccess ? '✅' : '❌'} Status: ${response.status} ${isSuccess ? '(PASS)' : '(FAIL)'}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const data = await response.json();
        console.log(`   📊 Success: ${data.success}`);
        if (data.error) {
          console.log(`   ⚠️  Error: ${data.error}`);
        }
        if (data.message) {
          console.log(`   💬 Message: ${data.message}`);
        }
        if (data.timestamp) {
          console.log(`   ⏰ Timestamp: ${data.timestamp}`);
        }
      } catch (e) {
        const text = await response.text();
        console.log(`   📄 Response: ${text.substring(0, 150)}...`);
      }
    } else {
      const text = await response.text();
      console.log(`   📄 Response: ${text.substring(0, 100)}...`);
    }
    
    console.log('');
    return { passed: isSuccess, status: response.status };
  } catch (error) {
    console.log(`   💥 Error: ${error.message}`);
    console.log('');
    return { passed: false, error: error.message };
  }
}

async function runVerification() {
  console.log('🚀 Iniciando verificación post-deploy...\n');
  
  const results = [];
  
  // Test new endpoints that should now work
  const endpointsToTest = [
    {
      url: `${BASE_URL}/api/test-config`,
      desc: '🧪 Test Config Endpoint (NUEVO)',
      expectStatus: [200]
    },
    {
      url: `${BASE_URL}/api/config-diagnostic`,
      desc: '🔍 Config Diagnostic Endpoint (NUEVO)',
      expectStatus: [401] // Should require auth
    },
    {
      url: `${BASE_URL}/api/dashboard/analytics?timeRange=30d`,
      desc: '📊 Dashboard Analytics Endpoint (ARREGLADO)',
      expectStatus: [401] // Should require auth
    },
    {
      url: `${BASE_URL}/api/dashboard/summary`,
      desc: '📈 Dashboard Summary Endpoint',
      expectStatus: [401]
    },
    {
      url: `${BASE_URL}/api/stores`,
      desc: '🏪 Stores Endpoint',
      expectStatus: [401]
    }
  ];
  
  for (const endpoint of endpointsToTest) {
    const result = await testEndpoint(endpoint.url, endpoint.desc, endpoint.expectStatus);
    results.push(result);
  }
  
  // Summary
  console.log('📊 RESUMEN DE VERIFICACIÓN');
  console.log('==========================');
  
  const passedEndpoints = results.filter(r => r.passed).length;
  const failedEndpoints = results.filter(r => !r.passed).length;
  const errorEndpoints = results.filter(r => r.error).length;
  
  console.log(`✅ Endpoints funcionando: ${passedEndpoints}`);
  console.log(`❌ Endpoints con problemas: ${failedEndpoints}`);
  console.log(`💥 Endpoints con errores: ${errorEndpoints}`);
  console.log(`📊 Total endpoints: ${results.length}`);
  
  console.log('\n🎯 ESTADO DEL FIX:');
  
  if (failedEndpoints === 0 && errorEndpoints === 0) {
    console.log('🎉 ¡TODOS LOS ENDPOINTS FUNCIONAN CORRECTAMENTE!');
    console.log('✅ El fix se desplegó exitosamente');
  } else if (failedEndpoints <= 1) {
    console.log('⚠️  Algunos endpoints aún tienen problemas menores');
    console.log('🔄 El despliegue podría estar en progreso');
  } else {
    console.log('❌ Varios endpoints tienen problemas');
    console.log('🔍 Revisa los errores arriba');
  }
  
  console.log('\n📝 PRÓXIMOS PASOS PARA EL USUARIO:');
  console.log('==================================');
  console.log('1. Ir a: https://fini-tn.vercel.app/dashboard');
  console.log('2. Hacer login si es necesario');
  console.log('3. Hacer clic en la tab "Configuración" en el sidebar');
  console.log('4. Verificar que aparezca:');
  console.log('   ✅ Elemento azul: "ConfigurationManagement está funcionando"');
  console.log('   ✅ Secciones de Gestión de Tiendas y WhatsApp');
  console.log('5. Abrir DevTools > Console para ver logs [CONFIG-DEBUG]');
  
  console.log('\n🔧 SI LA TAB AÚN NO APARECE:');
  console.log('============================');
  console.log('1. Hacer hard refresh (Cmd+Shift+R o Ctrl+Shift+R)');
  console.log('2. Limpiar cache del navegador');
  console.log('3. Verificar en DevTools Console por errores JavaScript');
  console.log('4. Buscar logs que empiecen con [CONFIG-DEBUG]');
  
  console.log('\n🌐 ENDPOINTS DE VERIFICACIÓN:');
  console.log('=============================');
  console.log('🧪 Test: https://fini-tn.vercel.app/api/test-config');
  console.log('🔍 Diagnostic: https://fini-tn.vercel.app/api/config-diagnostic (requiere login)');
  
  console.log('\n⚡ DIAGNÓSTICO ADICIONAL:');
  console.log('========================');
  console.log('Si nada funciona, ejecutar:');
  console.log('node scripts/diagnose-configuration-tab.js');
}

// Esperar un poco antes de verificar para dar tiempo al despliegue
console.log('⏰ Esperando 30 segundos para que complete el despliegue...\n');

setTimeout(() => {
  runVerification().catch(console.error);
}, 30000); 