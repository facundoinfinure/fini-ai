#!/usr/bin/env node

/**
 * Debug script para investigar el problema de "No se encontró ninguna tienda conectada"
 * en el paso 2 del onboarding (Análisis)
 */

const DEBUG_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://fini-tn.vercel.app';

async function debugStoresEndpoint() {
  console.log('🔍 [DEBUG] Debugging Stores Endpoint Issue\n');

  console.log('📝 PROBLEMA IDENTIFICADO:');
  console.log('   El endpoint /api/stores devuelve: { success: true, data: stores }');
  console.log('   Pero onboarding espera: { success: true, stores: [...] }');
  console.log('   Línea problemática: !storesData.stores || storesData.stores.length === 0\n');

  console.log('🔧 UBICACIÓN DEL BUG:');
  console.log('   Archivo: src/app/onboarding/page.tsx');
  console.log('   Función: handleStoreAnalysis()');
  console.log('   Línea: ~333');
  console.log('   Código problemático:');
  console.log('   ```');
  console.log('   if (!storesData.success || !storesData.stores || storesData.stores.length === 0) {');
  console.log('     throw new Error("No se encontró ninguna tienda conectada");');
  console.log('   }');
  console.log('   ```\n');

  console.log('✅ SOLUCIÓN:');
  console.log('   Cambiar "storesData.stores" por "storesData.data"');
  console.log('   Código corregido:');
  console.log('   ```');
  console.log('   if (!storesData.success || !storesData.data || storesData.data.length === 0) {');
  console.log('     throw new Error("No se encontró ninguna tienda conectada");');
  console.log('   }');
  console.log('   ```\n');

  console.log('🔍 VERIFICACIÓN NECESARIA:');
  console.log('   Buscar otros lugares donde se use .stores en lugar de .data');
  console.log('   Verificar consistencia en toda la app\n');

  console.log('🚀 PASOS PARA REPARAR:');
  console.log('   1. Corregir handleStoreAnalysis en onboarding');
  console.log('   2. Verificar otros endpoints que usen stores');
  console.log('   3. Standardizar estructura de respuesta');
  console.log('   4. Hacer commit y deploy');

  return {
    issue: 'Response structure mismatch',
    location: 'src/app/onboarding/page.tsx:~333',
    fix: 'Change storesData.stores to storesData.data'
  };
}

async function main() {
  try {
    const result = await debugStoresEndpoint();
    
    console.log('\n🎯 [SUMMARY]');
    console.log('Issue:', result.issue);
    console.log('Location:', result.location);
    console.log('Fix:', result.fix);
    
    console.log('\n✅ [NEXT ACTIONS]');
    console.log('1. Apply the fix to onboarding page');
    console.log('2. Search for other instances of .stores usage');
    console.log('3. Test the onboarding flow');
    console.log('4. Deploy the fix');
    
  } catch (error) {
    console.error('❌ [ERROR] Debug script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { debugStoresEndpoint }; 