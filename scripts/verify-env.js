#!/usr/bin/env node

/**
 * Script para verificar la configuración de variables de entorno
 * Uso: node scripts/verify-env.js
 */

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ Archivo .env.local no encontrado', 'red');
    log('💡 Copia env.example a .env.local y configura las variables', 'yellow');
    return false;
  }
  
  log('✅ Archivo .env.local encontrado', 'green');
  return true;
}

function checkRequiredVars() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'TIENDANUBE_CLIENT_ID',
    'TIENDANUBE_CLIENT_SECRET'
  ];
  
  const missing = [];
  const configured = [];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  }
  
  if (configured.length > 0) {
    log(`✅ Variables configuradas (${configured.length}):`, 'green');
    configured.forEach(varName => {
      const value = process.env[varName];
      const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
        ? `${value.substring(0, 8)}...` 
        : value;
      log(`   ${varName}=${displayValue}`, 'blue');
    });
  }
  
  if (missing.length > 0) {
    log(`❌ Variables faltantes (${missing.length}):`, 'red');
    missing.forEach(varName => {
      log(`   ${varName}`, 'red');
    });
    return false;
  }
  
  return true;
}

function checkOptionalVars() {
  const optionalVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'OPENAI_API_KEY',
    'PINECONE_API_KEY'
  ];
  
  const configured = [];
  const missing = [];
  
  for (const varName of optionalVars) {
    if (process.env[varName]) {
      configured.push(varName);
    } else {
      missing.push(varName);
    }
  }
  
  if (configured.length > 0) {
    log(`✅ Variables opcionales configuradas (${configured.length}):`, 'green');
    configured.forEach(varName => {
      const value = process.env[varName];
      const displayValue = varName.includes('SECRET') || varName.includes('KEY') 
        ? `${value.substring(0, 8)}...` 
        : value;
      log(`   ${varName}=${displayValue}`, 'blue');
    });
  }
  
  if (missing.length > 0) {
    log(`⚠️  Variables opcionales faltantes (${missing.length}):`, 'yellow');
    missing.forEach(varName => {
      log(`   ${varName}`, 'yellow');
    });
  }
}

function main() {
  log('🔍 Verificando configuración de variables de entorno...', 'bold');
  log('');
  
  // Cargar variables de .env.local manualmente
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    envLines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      }
    });
  }
  
  const envFileOk = checkEnvFile();
  log('');
  
  if (envFileOk) {
    const requiredOk = checkRequiredVars();
    log('');
    checkOptionalVars();
    log('');
    
    if (requiredOk) {
      log('🎉 ¡Configuración completa! La app debería funcionar correctamente.', 'green');
      log('');
      log('📋 Próximos pasos:', 'bold');
      log('1. Ejecuta: npm run dev');
      log('2. Ve a: http://localhost:3000');
      log('3. Prueba el login con Tienda Nube');
    } else {
      log('❌ Configuración incompleta. Completa las variables requeridas.', 'red');
      log('');
      log('📋 Para configurar Tienda Nube:', 'bold');
      log('1. Ve a: https://www.tiendanube.com/apps/developers');
      log('2. Crea una nueva app');
      log('3. Configura la URL de callback: http://localhost:3000/api/auth/callback/tiendanube');
      log('4. Copia CLIENT_ID y CLIENT_SECRET a .env.local');
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkEnvFile, checkRequiredVars, checkOptionalVars }; 