#!/usr/bin/env node

/**
 * Environment Variables Verification Script
 * Verifica que todas las variables de entorno requeridas estén configuradas
 */

const fs = require('fs');
const path = require('path');

// Colores para consola
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
};

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log.error('No se encontró el archivo .env.local');
    log.info('Copia env.example a .env.local y configura las variables');
    process.exit(1);
  }

  // Cargar variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && !key.startsWith('#') && values.length > 0) {
      envVars[key.trim()] = values.join('=').trim();
    }
  });

  return envVars;
}

function verifyRequiredVars() {
  log.info('Verificando variables de entorno requeridas...\n');
  
  const env = loadEnvFile();
  let allValid = true;
  let warnings = 0;

  // Variables críticas (obligatorias)
  const criticalVars = {
    'NEXT_PUBLIC_SUPABASE_URL': 'URL de Supabase',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Clave anónima de Supabase',
    'SUPABASE_SERVICE_ROLE_KEY': 'Clave de servicio de Supabase',
    'NEXTAUTH_SECRET': 'Secreto de NextAuth',
    'NEXTAUTH_URL': 'URL de NextAuth'
  };

  console.log('🔑 VARIABLES CRÍTICAS:');
  Object.entries(criticalVars).forEach(([key, description]) => {
    if (env[key] && env[key] !== '' && !env[key].includes('your-') && !env[key].includes('here')) {
      log.success(`${key}: ${description}`);
    } else {
      log.error(`${key}: ${description} - FALTANTE O VACÍA`);
      allValid = false;
    }
  });

  // Variables de Tienda Nube
  console.log('\n🏪 TIENDA NUBE:');
  const tiendanubeVars = {
    'TIENDANUBE_CLIENT_ID': 'Client ID de Tienda Nube',
    'TIENDANUBE_CLIENT_SECRET': 'Client Secret de Tienda Nube'
  };

  Object.entries(tiendanubeVars).forEach(([key, description]) => {
    if (env[key] && env[key] !== '' && !env[key].includes('your-')) {
      log.success(`${key}: ${description}`);
    } else {
      log.warning(`${key}: ${description} - No configurado`);
      warnings++;
    }
  });

  // Variables de WhatsApp/Twilio
  console.log('\n📱 WHATSAPP/TWILIO:');
  const whatsappVars = {
    'TWILIO_ACCOUNT_SID': 'Account SID de Twilio',
    'TWILIO_AUTH_TOKEN': 'Auth Token de Twilio',
    'TWILIO_PHONE_NUMBER': 'Número de WhatsApp de Twilio'
  };

  Object.entries(whatsappVars).forEach(([key, description]) => {
    if (env[key] && env[key] !== '' && !env[key].includes('your-')) {
      log.success(`${key}: ${description}`);
    } else {
      log.warning(`${key}: ${description} - No configurado`);
      warnings++;
    }
  });

  // Variables de WhatsApp Templates (Nuevas)
  console.log('\n📝 WHATSAPP TEMPLATES:');
  const templateVars = {
    'TWILIO_OTP_CONTENTSID': 'Template de verificación OTP',
    'TWILIO_WELCOME_CONTENTSID': 'Template de bienvenida',
    'TWILIO_ANALYTICS_CONTENTSID': 'Template de analytics',
    'TWILIO_MARKETING_CONTENTSID': 'Template de marketing',
    'TWILIO_ERROR_CONTENTSID': 'Template de errores'
  };

  let hasTemplates = false;
  Object.entries(templateVars).forEach(([key, description]) => {
    if (env[key] && env[key] !== '' && !env[key].includes('HX1234') && env[key].startsWith('HX')) {
      log.success(`${key}: ${description}`);
      hasTemplates = true;
    } else {
      log.warning(`${key}: ${description} - No configurado o usando ejemplo`);
      warnings++;
    }
  });

  if (!hasTemplates) {
    log.error('⚠️  IMPORTANTE: Sin templates configurados, se pueden producir errores 63016');
    log.info('📖 Consulta MANUAL_WHATSAPP_MIGRATION.md para configurar templates');
  }

  // Variables de Stripe
  console.log('\n💳 STRIPE:');
  const stripeVars = {
    'STRIPE_SECRET_KEY': 'Clave secreta de Stripe',
    'STRIPE_PUBLISHABLE_KEY': 'Clave pública de Stripe'
  };

  Object.entries(stripeVars).forEach(([key, description]) => {
    if (env[key] && env[key] !== '' && !env[key].includes('your-')) {
      log.success(`${key}: ${description}`);
    } else {
      log.warning(`${key}: ${description} - No configurado`);
      warnings++;
    }
  });

  // Variables de IA (Opcionales)
  console.log('\n🤖 IA Y RAG (OPCIONAL):');
  const aiVars = {
    'OPENAI_API_KEY': 'Clave de OpenAI',
    'PINECONE_API_KEY': 'Clave de Pinecone',
    'PINECONE_ENVIRONMENT': 'Entorno de Pinecone',
    'PINECONE_INDEX_NAME': 'Nombre del índice de Pinecone'
  };

  Object.entries(aiVars).forEach(([key, description]) => {
    if (env[key] && env[key] !== '' && !env[key].includes('your-')) {
      log.success(`${key}: ${description}`);
    } else {
      log.info(`${key}: ${description} - Opcional, no configurado`);
    }
  });

  // Resumen
  console.log('\n' + '='.repeat(50));
  if (allValid) {
    if (warnings === 0) {
      log.success('🎉 TODAS LAS VARIABLES ESTÁN CONFIGURADAS CORRECTAMENTE');
    } else {
      log.warning(`✅ Variables críticas OK, pero ${warnings} advertencias`);
      log.info('Las advertencias no impiden que la app funcione, pero limitan funcionalidades');
    }
  } else {
    log.error('❌ FALTAN VARIABLES CRÍTICAS - La app no funcionará correctamente');
    process.exit(1);
  }

  // Verificaciones adicionales
  console.log('\n🔍 VERIFICACIONES ADICIONALES:');
  
  // Verificar formato de URLs
  if (env.NEXT_PUBLIC_SUPABASE_URL && !env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    log.warning('SUPABASE_URL debería empezar con https://');
  }

  // Verificar formato de claves
  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
    log.warning('SUPABASE_ANON_KEY parece muy corta');
  }

  if (env.SUPABASE_SERVICE_ROLE_KEY && env.SUPABASE_SERVICE_ROLE_KEY.length < 100) {
    log.warning('SUPABASE_SERVICE_ROLE_KEY parece muy corta');
  }

  // Verificar templates de WhatsApp
  if (env.TWILIO_OTP_CONTENTSID && !env.TWILIO_OTP_CONTENTSID.startsWith('HX')) {
    log.warning('TWILIO_OTP_CONTENTSID debería empezar con "HX"');
  }

  // Verificar ambiente
  const nodeEnv = env.NODE_ENV || process.env.NODE_ENV || 'development';
  log.info(`Ambiente detectado: ${nodeEnv}`);

  if (nodeEnv === 'production') {
    log.warning('🚨 AMBIENTE DE PRODUCCIÓN - Verifica que todas las URLs sean de producción');
  }
}

function main() {
  console.log('🔍 Fini AI - Verificador de Variables de Entorno\n');
  
  try {
    verifyRequiredVars();
  } catch (error) {
    log.error(`Error durante verificación: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyRequiredVars }; 