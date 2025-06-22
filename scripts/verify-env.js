#!/usr/bin/env node

/**
 * Script para verificar que todas las variables de entorno necesarias estén configuradas
 * Uso: npm run verify-env
 */

const fs = require('fs');
const path = require('path');

// Variables de entorno requeridas por categoría
const requiredEnvVars = {
  database: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ],
  auth: [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET'
  ],
  tiendanube: [
    'TIENDANUBE_CLIENT_ID',
    'TIENDANUBE_CLIENT_SECRET',
    'TIENDANUBE_REDIRECT_URI'
  ],
  whatsapp: [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER'
  ],
  stripe: [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ],
  optional: [
    'OPENAI_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'PINECONE_INDEX_NAME'
  ]
};

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envFiles = ['.env.local', '.env', '.env.example'];
  const projectRoot = path.resolve(__dirname, '..');
  
  for (const envFile of envFiles) {
    const envPath = path.join(projectRoot, envFile);
    if (fs.existsSync(envPath)) {
      log(`✓ Encontrado archivo de variables de entorno: ${envFile}`, 'green');
      return envPath;
    }
  }
  
  log('✗ No se encontró ningún archivo de variables de entorno (.env.local, .env, .env.example)', 'red');
  return null;
}

function checkRequiredVars() {
  const missing = {};
  const present = {};
  let hasErrors = false;

  // Patrones para detectar valores de placeholder
  const placeholderPatterns = [
    /^your-.*-here$/,
    /^your_.*_here$/,
    /^placeholder$/,
    /^example$/,
    /^test$/,
    /^dummy$/,
    /^fake$/,
    /^mock$/
  ];

  function isPlaceholder(value) {
    if (!value || value.trim() === '') return true;
    return placeholderPatterns.some(pattern => pattern.test(value.toLowerCase()));
  }

  // Verificar variables requeridas
  for (const [category, vars] of Object.entries(requiredEnvVars)) {
    if (category === 'optional') continue;
    
    missing[category] = [];
    present[category] = [];
    
    for (const varName of vars) {
      const value = process.env[varName];
      if (value && !isPlaceholder(value)) {
        present[category].push(varName);
      } else {
        missing[category].push(varName);
        hasErrors = true;
      }
    }
  }

  // Verificar variables opcionales
  missing.optional = [];
  present.optional = [];
  
  for (const varName of requiredEnvVars.optional) {
    const value = process.env[varName];
    if (value && !isPlaceholder(value)) {
      present.optional.push(varName);
    } else {
      missing.optional.push(varName);
    }
  }

  return { missing, present, hasErrors };
}

function displayResults(missing, present) {
  log('\n📋 Resumen de Variables de Entorno:', 'bright');
  log('=====================================\n');

  // Mostrar variables presentes
  for (const [category, vars] of Object.entries(present)) {
    if (vars.length > 0) {
      const icon = category === 'optional' ? '🔧' : '✅';
      log(`${icon} ${category.toUpperCase()} (${vars.length} configuradas):`, 'green');
      vars.forEach(varName => {
        log(`   ✓ ${varName}`, 'green');
      });
      log('');
    }
  }

  // Mostrar variables faltantes
  let hasRequiredMissing = false;
  for (const [category, vars] of Object.entries(missing)) {
    if (vars.length > 0) {
      const icon = category === 'optional' ? '🔧' : '❌';
      const color = category === 'optional' ? 'yellow' : 'red';
      log(`${icon} ${category.toUpperCase()} (${vars.length} faltantes):`, color);
      vars.forEach(varName => {
        log(`   ✗ ${varName}`, color);
      });
      log('');
      
      if (category !== 'optional') {
        hasRequiredMissing = true;
      }
    }
  }

  return hasRequiredMissing;
}

function provideInstructions(hasRequiredMissing) {
  if (hasRequiredMissing) {
    log('🚨 ACCIÓN REQUERIDA:', 'red');
    log('Debes configurar las variables de entorno faltantes para que la aplicación funcione correctamente.\n', 'red');
    
    log('📝 Instrucciones:', 'cyan');
    log('1. Copia el archivo .env.example a .env.local:', 'cyan');
    log('   cp .env.example .env.local\n', 'cyan');
    
    log('2. Completa las variables faltantes en .env.local:', 'cyan');
    log('   - Obtén las credenciales de Supabase desde: https://supabase.com/dashboard', 'cyan');
    log('   - Obtén las credenciales de Tienda Nube desde: https://www.tiendanube.com/apps/developers', 'cyan');
    log('   - Obtén las credenciales de Twilio desde: https://console.twilio.com/', 'cyan');
    log('   - Obtén las credenciales de Stripe desde: https://dashboard.stripe.com/apikeys\n', 'cyan');
    
    log('3. Ejecuta este script nuevamente para verificar:', 'cyan');
    log('   npm run verify-env\n', 'cyan');
    
    return false;
  } else {
    log('🎉 ¡Todo configurado correctamente!', 'green');
    log('Puedes ejecutar la aplicación con: npm run dev', 'green');
    return true;
  }
}

function main() {
  log('🔍 Verificando configuración de variables de entorno...', 'blue');
  
  // Verificar archivo de entorno
  const envPath = checkEnvFile();
  if (!envPath) {
    process.exit(1);
  }

  // Cargar variables de entorno si existe el archivo
  if (envPath && envPath.endsWith('.env.local')) {
    require('dotenv').config({ path: envPath });
  }

  // Verificar variables requeridas
  const { missing, present, hasErrors } = checkRequiredVars();
  
  // Mostrar resultados
  const hasRequiredMissing = displayResults(missing, present);
  
  // Proporcionar instrucciones
  const isReady = provideInstructions(hasRequiredMissing);
  
  // Salir con código de error si faltan variables requeridas
  if (!isReady) {
    process.exit(1);
  }
}

// Ejecutar el script
if (require.main === module) {
  main();
}

module.exports = { checkRequiredVars, displayResults }; 