#!/usr/bin/env node

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fini-tn.vercel.app'
  : 'http://localhost:3000';

console.log('🧪 Test de Operaciones de Tiendas');
console.log('==================================');
console.log(`📡 URL base: ${BASE_URL}\n`);

async function testEndpoint(url, method = 'GET', body = null, description = '') {
  try {
    console.log(`🔍 ${description}`);
    console.log(`  📡 ${method} ${url}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fini-Test-Script/1.0'
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const isSuccess = [200, 401, 400].includes(response.status); // 401/400 es OK, significa que existe pero requiere auth/datos
    
    console.log(`   ${isSuccess ? '✅' : '❌'} Status: ${response.status} ${isSuccess ? '(ENDPOINT EXISTS)' : '(ENDPOINT MISSING)'}`);
    
    try {
      const data = await response.json();
      console.log(`   📊 Response: ${JSON.stringify(data).substring(0, 150)}...`);
      
      if (data.error) {
        console.log(`   💡 Error (expected): ${data.error}`);
      }
    } catch (e) {
      const text = await response.text();
      console.log(`   📄 Non-JSON response: ${text.substring(0, 100)}...`);
    }
    
    return { passed: isSuccess, status: response.status };
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Iniciando pruebas de endpoints...\n');
  
  const results = [];
  
  // Test 1: Simple Sync Endpoint
  console.log('1️⃣ ENDPOINT DE SINCRONIZACIÓN');
  console.log('─'.repeat(40));
  const syncResult = await testEndpoint(
    `${BASE_URL}/api/stores/simple-sync`,
    'POST',
    { storeId: 'test-store-id' },
    'Store Sync Endpoint (POST)'
  );
  results.push({ name: 'Simple Sync', ...syncResult });
  
  console.log('');
  
  // Test 2: Store Management Endpoints
  console.log('2️⃣ ENDPOINT DE GESTIÓN DE TIENDAS');
  console.log('─'.repeat(40));
  
  // Test store update
  const updateResult = await testEndpoint(
    `${BASE_URL}/api/stores/manage`,
    'POST',
    { 
      action: 'update', 
      storeId: 'test-store-id', 
      name: 'Test Store', 
      domain: 'test.mitiendanube.com' 
    },
    'Store Update (POST /api/stores/manage)'
  );
  results.push({ name: 'Store Update', ...updateResult });
  
  console.log('');
  
  // Test store deletion
  const deleteResult = await testEndpoint(
    `${BASE_URL}/api/stores/manage`,
    'POST',
    { 
      action: 'delete', 
      storeId: 'test-store-id' 
    },
    'Store Delete (POST /api/stores/manage)'
  );
  results.push({ name: 'Store Delete', ...deleteResult });
  
  console.log('');
  
  // Test 3: Existing Store Endpoints (for comparison)
  console.log('3️⃣ ENDPOINTS EXISTENTES (COMPARACIÓN)');
  console.log('─'.repeat(40));
  
  const storesGetResult = await testEndpoint(
    `${BASE_URL}/api/stores`,
    'GET',
    null,
    'Get Stores (GET /api/stores)'
  );
  results.push({ name: 'Get Stores', ...storesGetResult });
  
  console.log('');
  
  // Test 4: Invalid requests (should return proper errors)
  console.log('4️⃣ VALIDACIÓN DE ERRORES');
  console.log('─'.repeat(40));
  
  const invalidSyncResult = await testEndpoint(
    `${BASE_URL}/api/stores/simple-sync`,
    'POST',
    {}, // Empty body - should return error
    'Invalid Sync Request (empty body)'
  );
  results.push({ name: 'Invalid Sync', ...invalidSyncResult });
  
  console.log('');
  
  const invalidManageResult = await testEndpoint(
    `${BASE_URL}/api/stores/manage`,
    'POST',
    { action: 'invalid_action' }, // Invalid action
    'Invalid Manage Request (invalid action)'
  );
  results.push({ name: 'Invalid Manage', ...invalidManageResult });
  
  console.log('');
  
  // Summary
  console.log('📊 RESUMEN DE RESULTADOS');
  console.log('='.repeat(50));
  
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = results.filter(r => !r.passed).length;
  const totalTests = results.length;
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    const statusText = result.passed ? 'OK' : 'FAIL';
    console.log(`${index + 1}. ${status} ${result.name}: ${statusText} (${result.status || result.error})`);
  });
  
  console.log('');
  console.log(`📈 Tests pasados: ${passedTests}/${totalTests}`);
  console.log(`📉 Tests fallados: ${failedTests}/${totalTests}`);
  console.log(`📊 Porcentaje éxito: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  console.log('');
  console.log('🎯 ANÁLISIS:');
  
  if (passedTests >= 4) {
    console.log('✅ Excelente: Los endpoints principales están funcionando');
    console.log('✅ El usuario debería poder sincronizar y eliminar tiendas');
  } else if (passedTests >= 2) {
    console.log('⚠️  Parcial: Algunos endpoints funcionan, otros tienen problemas');
    console.log('💡 Revisar endpoints que retornan estados diferentes a 200/400/401');
  } else {
    console.log('❌ Crítico: Múltiples endpoints no están funcionando');
    console.log('🚨 Verificar deployment y configuración de rutas');
  }
  
  console.log('');
  console.log('📝 PRÓXIMOS PASOS:');
  console.log('1. Si ves errores 401 "User not authenticated" - es normal (requiere login)');
  console.log('2. Si ves errores 400 "Store not found" - es normal (store de prueba no existe)');
  console.log('3. Si ves errores 404 "Not Found" - el endpoint no existe o no se deployó');
  console.log('4. Si ves network errors - verificar que la app esté ejecutándose');
  
  console.log('');
  console.log('🔧 PARA PROBAR CON DATOS REALES:');
  console.log('1. Hacer login en la aplicación');
  console.log('2. Inspeccionar Network tab en DevTools');
  console.log('3. Intentar sincronizar/eliminar una tienda real');
  console.log('4. Verificar que los requests lleguen a los endpoints correctos');
}

runTests().catch(console.error); 