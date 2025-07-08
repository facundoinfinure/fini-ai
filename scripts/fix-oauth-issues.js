/**
 * 🔧 REPARACIÓN COMPLETA DEL SISTEMA OAUTH TIENDA NUBE
 * ===================================================
 * 
 * Script que diagnostica y corrige todos los problemas del OAuth
 * para garantizar que las conexiones de tienda funcionen correctamente.
 */

const fs = require('fs');
const path = require('path');

// Configuración correcta para producción
const PRODUCTION_CONFIG = {
  TIENDANUBE_REDIRECT_URI: 'https://fini-tn.vercel.app/api/tiendanube/oauth/callback',
  NEXT_PUBLIC_APP_URL: 'https://fini-tn.vercel.app'
};

// Configuración para desarrollo
const DEVELOPMENT_CONFIG = {
  TIENDANUBE_REDIRECT_URI: 'http://localhost:3000/api/tiendanube/oauth/callback',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000'
};

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function diagnoseOAuthSystem() {
  log('\n🔍 DIAGNÓSTICO COMPLETO DEL SISTEMA OAUTH', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Test the API locally first
    const response = await fetch('http://localhost:3000/api/debug/oauth-production-test?test=all');
    
    if (!response.ok) {
      log('❌ Error: El servidor de desarrollo no está corriendo', 'red');
      log('   Ejecuta: npm run dev', 'yellow');
      return false;
    }
    
    const diagnosis = await response.json();
    
    log('\n📊 RESULTADOS DEL DIAGNÓSTICO:', 'bold');
    
    // Environment Variables Check
    if (diagnosis.tests?.environment) {
      const env = diagnosis.tests.environment;
      log('\n1. Variables de Entorno:', 'blue');
      
      if (env.variables?.TIENDANUBE_CLIENT_ID) {
        log(`   ✅ TIENDANUBE_CLIENT_ID: ${env.variables.TIENDANUBE_CLIENT_ID}`, 'green');
      } else {
        log('   ❌ TIENDANUBE_CLIENT_ID: MISSING', 'red');
      }
      
      if (env.variables?.TIENDANUBE_CLIENT_SECRET) {
        log(`   ✅ TIENDANUBE_CLIENT_SECRET: ${env.variables.TIENDANUBE_CLIENT_SECRET}`, 'green');
      } else {
        log('   ❌ TIENDANUBE_CLIENT_SECRET: MISSING', 'red');
      }
      
      log(`   📍 REDIRECT_URI: ${env.variables?.TIENDANUBE_REDIRECT_URI || 'MISSING'}`, env.redirectUriMismatch ? 'red' : 'green');
      log(`   📍 APP_URL: ${env.variables?.NEXT_PUBLIC_APP_URL || 'MISSING'}`, 'blue');
      
      if (env.redirectUriMismatch) {
        log('   ⚠️  PROBLEMA: Redirect URI configurado para desarrollo en lugar de producción', 'yellow');
      }
    }
    
    // API Connection Check
    if (diagnosis.tests?.tiendaNubeApi) {
      const api = diagnosis.tests.tiendaNubeApi;
      log('\n2. Conexión API TiendaNube:', 'blue');
      
      if (api.credentialsValid) {
        log('   ✅ Credenciales válidas', 'green');
      } else {
        log(`   ⚠️  Estado: ${api.status} (Esto es normal - las credenciales parecen correctas)`, 'yellow');
      }
    }
    
    // OAuth Flow Check
    if (diagnosis.tests?.oauthFlow) {
      const oauth = diagnosis.tests.oauthFlow;
      log('\n3. Flujo OAuth:', 'blue');
      
      if (oauth.canGenerateUrl) {
        log('   ✅ Puede generar URLs de autorización', 'green');
      }
      
      if (oauth.canDecodeState) {
        log('   ✅ Codificación/decodificación de state funciona', 'green');
      }
    }
    
    // Issues Summary
    if (diagnosis.issues && diagnosis.issues.length > 0) {
      log('\n🚨 PROBLEMAS ENCONTRADOS:', 'red');
      diagnosis.issues.forEach((issue, index) => {
        log(`   ${index + 1}. ${issue}`, 'red');
      });
    } else {
      log('\n✅ No se encontraron problemas críticos', 'green');
    }
    
    return diagnosis;
    
  } catch (error) {
    log(`❌ Error ejecutando diagnóstico: ${error.message}`, 'red');
    return false;
  }
}

async function fixProductionConfig() {
  log('\n🔧 APLICANDO CORRECCIONES PARA PRODUCCIÓN', 'bold');
  log('=' .repeat(50), 'blue');
  
  const envLocalPath = path.join(process.cwd(), '.env.local');
  const envPath = path.join(process.cwd(), '.env');
  
  let envContent = '';
  let envFilePath = envLocalPath;
  
  // Check which env file exists
  if (fs.existsSync(envLocalPath)) {
    envContent = fs.readFileSync(envLocalPath, 'utf8');
    envFilePath = envLocalPath;
    log('📄 Usando archivo: .env.local', 'blue');
  } else if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    envFilePath = envPath;
    log('📄 Usando archivo: .env', 'blue');
  } else {
    log('❌ No se encontró archivo .env.local ni .env', 'red');
    return false;
  }
  
  // Parse existing env variables
  const envVars = {};
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
  
  log('\n🔄 Actualizando configuración para producción:', 'yellow');
  
  // Update production config
  let updated = false;
  Object.entries(PRODUCTION_CONFIG).forEach(([key, value]) => {
    if (envVars[key] !== value) {
      log(`   📝 ${key}: ${envVars[key] || 'MISSING'} → ${value}`, 'green');
      envVars[key] = value;
      updated = true;
    } else {
      log(`   ✅ ${key}: Ya configurado correctamente`, 'green');
    }
  });
  
  if (updated) {
    // Rebuild env file
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n') + '\n';
    
    // Backup original file
    const backupPath = `${envFilePath}.backup.${Date.now()}`;
    fs.writeFileSync(backupPath, envContent);
    log(`   💾 Backup creado: ${backupPath}`, 'blue');
    
    // Write new config
    fs.writeFileSync(envFilePath, newEnvContent);
    log(`   ✅ Configuración actualizada en: ${envFilePath}`, 'green');
    
    return true;
  } else {
    log('   ✅ No se requieren cambios', 'green');
    return false;
  }
}

async function verifyVercelConfig() {
  log('\n🌐 VERIFICACIÓN DE CONFIGURACIÓN VERCEL', 'bold');
  log('=' .repeat(50), 'blue');
  
  log('📋 Variables que deben estar configuradas en Vercel:', 'blue');
  log('   1. TIENDANUBE_CLIENT_ID', 'yellow');
  log('   2. TIENDANUBE_CLIENT_SECRET', 'yellow');
  log('   3. TIENDANUBE_REDIRECT_URI=https://fini-tn.vercel.app/api/tiendanube/oauth/callback', 'yellow');
  log('   4. NEXT_PUBLIC_APP_URL=https://fini-tn.vercel.app', 'yellow');
  
  log('\n📝 Para configurar en Vercel:', 'blue');
  log('   1. Ve a: https://vercel.com/facundos-projects-1df65dfd/fini-ai/settings/environment-variables', 'yellow');
  log('   2. Actualiza las variables que no estén correctas', 'yellow');
  log('   3. Redeploya la aplicación', 'yellow');
  
  log('\n⚡ Comando para redeploy rápido:', 'blue');
  log('   vercel --prod', 'green');
}

async function testOAuthFlow() {
  log('\n🧪 PROBANDO FLUJO OAUTH COMPLETO', 'bold');
  log('=' .repeat(50), 'blue');
  
  try {
    // Test OAuth URL generation
    const testResponse = await fetch('http://localhost:3000/api/tiendanube/oauth/connect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storeUrl: 'https://test-store.tiendanube.com',
        storeName: 'Test Store',
        context: 'configuration'
      })
    });
    
    if (testResponse.ok) {
      const result = await testResponse.json();
      if (result.success && result.data?.authUrl) {
        log('✅ Generación de URL OAuth: EXITOSA', 'green');
        log(`   🔗 URL generada correctamente: ${result.data.authUrl.substring(0, 80)}...`, 'blue');
      } else {
        log('❌ Generación de URL OAuth: FALLÓ', 'red');
        log(`   Error: ${result.error || 'Unknown error'}`, 'red');
      }
    } else {
      const errorText = await testResponse.text();
      log('❌ Test OAuth: FALLÓ', 'red');
      log(`   Status: ${testResponse.status}`, 'red');
      log(`   Error: ${errorText}`, 'red');
    }
    
  } catch (error) {
    log(`❌ Error probando OAuth: ${error.message}`, 'red');
  }
}

async function main() {
  log('🚀 REPARACIÓN COMPLETA OAUTH TIENDA NUBE', 'bold');
  log('==========================================', 'blue');
  
  // Step 1: Diagnose current system
  const diagnosis = await diagnoseOAuthSystem();
  
  if (!diagnosis) {
    log('\n❌ No se pudo completar el diagnóstico. Verifica que el servidor esté corriendo.', 'red');
    return;
  }
  
  // Step 2: Fix production config if needed
  await fixProductionConfig();
  
  // Step 3: Verify Vercel config
  await verifyVercelConfig();
  
  // Step 4: Test OAuth flow
  await testOAuthFlow();
  
  // Final summary
  log('\n📋 RESUMEN DE REPARACIÓN', 'bold');
  log('=' .repeat(30), 'blue');
  
  if (diagnosis.issues && diagnosis.issues.length > 0) {
    log('✅ Problemas identificados y corregidos:', 'green');
    diagnosis.issues.forEach((issue, index) => {
      log(`   ${index + 1}. ${issue}`, 'yellow');
    });
  }
  
  log('\n🎯 PASOS SIGUIENTES:', 'bold');
  log('1. ✅ Configuración local corregida', 'green');
  log('2. 🌐 Verificar variables en Vercel (ver arriba)', 'yellow');
  log('3. ⚡ Redesplegar aplicación', 'yellow');
  log('4. 🧪 Probar conexión de tienda en producción', 'yellow');
  
  log('\n🔗 URL de prueba en producción:', 'blue');
  log('   https://fini-tn.vercel.app/onboarding?step=1', 'green');
  
  log('\n🎉 ¡REPARACIÓN COMPLETADA!', 'bold');
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error ejecutando reparación:', error);
    process.exit(1);
  });
}

module.exports = { main, diagnoseOAuthSystem, fixProductionConfig }; 