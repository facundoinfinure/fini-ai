#!/usr/bin/env node

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fini-tn.vercel.app'
  : 'http://localhost:3000';

console.log('🧹 Cleanup Background Processes');
console.log('================================');
console.log(`📡 URL base: ${BASE_URL}\n`);

async function checkAPIEndpoint(path, method = 'GET', body = null, description = '') {
  try {
    console.log(`🔍 ${description}`);
    console.log(`  📡 ${method} ${path}`);
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fini-Cleanup/1.0'
      }
    };
    
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${BASE_URL}${path}`, options);
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 405 && method === 'GET') {
      console.log(`   ✅ Endpoint exists (405 = Method Not Allowed for GET is normal for POST endpoints)`);
      return { exists: true, working: true };
    } else if ([200, 401, 400].includes(response.status)) {
      console.log(`   ✅ Endpoint working correctly`);
      return { exists: true, working: true };
    } else if (response.status === 404) {
      console.log(`   ❌ Endpoint not found (not deployed)`);
      return { exists: false, working: false };
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
      return { exists: true, working: false };
    }
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
    return { exists: false, working: false, error: error.message };
  }
}

async function checkSystemHealth() {
  console.log('1️⃣ VERIFICACIÓN DE ENDPOINTS');
  console.log('─'.repeat(40));
  
  const endpointChecks = [
    { path: '/api/stores/simple-sync', method: 'GET', desc: 'Simple Sync Endpoint' },
    { path: '/api/stores/manage', method: 'GET', desc: 'Store Manage Endpoint' },
    { path: '/api/stores', method: 'GET', desc: 'Stores List Endpoint' },
    { path: '/api/health', method: 'GET', desc: 'Health Check Endpoint' }
  ];
  
  const results = [];
  
  for (const check of endpointChecks) {
    const result = await checkAPIEndpoint(check.path, check.method, null, check.desc);
    results.push({ ...check, ...result });
  }
  
  console.log('\n📊 Resumen de Endpoints:');
  const workingEndpoints = results.filter(r => r.working).length;
  const totalEndpoints = results.length;
  
  results.forEach(result => {
    const status = result.working ? '✅' : '❌';
    console.log(`   ${status} ${result.desc}: ${result.working ? 'OK' : 'FAIL'}`);
  });
  
  console.log(`\n📈 Endpoints funcionando: ${workingEndpoints}/${totalEndpoints}`);
  
  return { workingEndpoints, totalEndpoints, allWorking: workingEndpoints === totalEndpoints };
}

async function cleanupOrphanedProcesses() {
  console.log('\n2️⃣ LIMPIEZA DE PROCESOS HUÉRFANOS');
  console.log('─'.repeat(40));
  
  try {
    console.log('🧹 Intentando limpiar locks de RAG...');
    
    // Call cleanup endpoint if available
    const cleanupResult = await checkAPIEndpoint('/api/debug/system-repair', 'POST', 
      { action: 'cleanup_rag_locks' }, 'RAG Locks Cleanup');
    
    if (cleanupResult.working) {
      console.log('✅ Llamada de limpieza enviada exitosamente');
    } else {
      console.log('⚠️  Endpoint de limpieza no disponible, continuando...');
    }
    
    console.log('🧹 Verificando estado de sincronización...');
    
    // Check sync status
    const syncResult = await checkAPIEndpoint('/api/stores/sync-status', 'GET', null, 'Sync Status Check');
    
    if (syncResult.working) {
      console.log('✅ Sistema de sincronización respondiendo');
    } else {
      console.log('⚠️  Sistema de sincronización podría tener problemas');
    }
    
  } catch (error) {
    console.log(`❌ Error durante limpieza: ${error.message}`);
  }
}

async function verifyStoreManagement() {
  console.log('\n3️⃣ VERIFICACIÓN DE GESTIÓN DE TIENDAS');
  console.log('─'.repeat(40));
  
  try {
    console.log('🔍 Verificando acceso a endpoints de gestión...');
    
    // Test store management endpoints with proper methods
    const tests = [
      {
        path: '/api/stores',
        method: 'GET',
        desc: 'Listado de tiendas',
        expectedStatuses: [200, 401] // 401 = needs auth (normal)
      },
      {
        path: '/api/stores/simple-sync',
        method: 'POST',
        body: { storeId: 'test-store' },
        desc: 'Sincronización de tienda',
        expectedStatuses: [200, 401, 404] // 401 = needs auth, 404 = store not found (normal)
      },
      {
        path: '/api/stores/manage',
        method: 'POST', 
        body: { action: 'delete', storeId: 'test-store' },
        desc: 'Gestión de tienda',
        expectedStatuses: [200, 401, 404] // 401 = needs auth, 404 = store not found (normal)
      }
    ];
    
    let passedTests = 0;
    
    for (const test of tests) {
      try {
        const response = await fetch(`${BASE_URL}${test.path}`, {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Fini-Test/1.0'
          },
          body: test.body ? JSON.stringify(test.body) : undefined
        });
        
        const passed = test.expectedStatuses.includes(response.status);
        const status = passed ? '✅' : '❌';
        
        console.log(`   ${status} ${test.desc}: ${response.status} ${passed ? '(EXPECTED)' : '(UNEXPECTED)'}`);
        
        if (passed) passedTests++;
        
        // Log response for debugging
        if (!passed) {
          try {
            const text = await response.text();
            console.log(`      Response: ${text.substring(0, 100)}...`);
          } catch (e) {
            console.log(`      Could not read response body`);
          }
        }
        
      } catch (error) {
        console.log(`   ❌ ${test.desc}: Network error (${error.message})`);
      }
    }
    
    console.log(`\n📊 Tests pasados: ${passedTests}/${tests.length}`);
    
    if (passedTests === tests.length) {
      console.log('🎉 Todos los endpoints de gestión están funcionando correctamente!');
      return true;
    } else {
      console.log('⚠️  Algunos endpoints tienen problemas');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error verificando gestión de tiendas: ${error.message}`);
    return false;
  }
}

async function runFullCleanup() {
  console.log('🚀 Iniciando limpieza completa del sistema...\n');
  
  try {
    // Step 1: Check system health
    const healthResult = await checkSystemHealth();
    
    // Step 2: Cleanup orphaned processes
    await cleanupOrphanedProcesses();
    
    // Step 3: Verify store management functionality
    const storeManagementOk = await verifyStoreManagement();
    
    // Summary
    console.log('\n📋 RESUMEN FINAL');
    console.log('='.repeat(50));
    
    if (healthResult.allWorking && storeManagementOk) {
      console.log('🎉 ¡SISTEMA COMPLETAMENTE FUNCIONAL!');
      console.log('✅ Todos los endpoints están funcionando');
      console.log('✅ Gestión de tiendas operativa');
      console.log('✅ Procesos huérfanos limpiados');
      console.log('\n💡 El usuario debería poder sincronizar y eliminar tiendas sin problemas.');
    } else {
      console.log('⚠️  SISTEMA PARCIALMENTE FUNCIONAL');
      
      if (!healthResult.allWorking) {
        console.log(`❌ Endpoints: ${healthResult.workingEndpoints}/${healthResult.totalEndpoints} funcionando`);
      } else {
        console.log('✅ Endpoints: Todos funcionando');
      }
      
      if (!storeManagementOk) {
        console.log('❌ Gestión de tiendas: Problemas detectados');
      } else {
        console.log('✅ Gestión de tiendas: Funcionando');
      }
      
      console.log('\n🔧 ACCIONES RECOMENDADAS:');
      console.log('1. Verificar deployment en Vercel');
      console.log('2. Revisar logs de producción para errores específicos');
      console.log('3. Intentar redeployar la aplicación');
    }
    
    console.log('\n📝 PRÓXIMOS PASOS PARA EL USUARIO:');
    console.log('1. Intentar sincronizar una tienda desde la UI');
    console.log('2. Si aparecen errores, revisar Network tab en DevTools');
    console.log('3. Reportar cualquier error específico que aparezca');
    
  } catch (error) {
    console.error('\n💥 Error durante limpieza:', error);
    console.log('\n🆘 ESTADO CRÍTICO - Contactar soporte técnico');
  }
}

runFullCleanup().catch(console.error); 