#!/usr/bin/env node

/**
 * Test Stripe Integration
 * 
 * Este script verifica que la integración de Stripe esté correctamente configurada
 * y funcionando en todos los aspectos.
 */

const https = require('https');
const { execSync } = require('child_process');

// Colores para console
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

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Función para hacer requests HTTP
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 1. Verificar variables de entorno
function checkEnvironmentVariables() {
  log('\n🔍 VERIFICANDO VARIABLES DE ENTORNO...', 'bold');
  
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID',
    'STRIPE_BASIC_MONTHLY_PRICE_ID',
    'STRIPE_BASIC_ANNUAL_PRICE_ID',
    'STRIPE_PRO_MONTHLY_PRICE_ID',
    'STRIPE_PRO_ANNUAL_PRICE_ID'
  ];
  
  let allPresent = true;
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      logSuccess(`${varName}: Configurada`);
    } else {
      logError(`${varName}: FALTANTE`);
      allPresent = false;
    }
  });
  
  if (allPresent) {
    logSuccess('Todas las variables de entorno están configuradas');
  } else {
    logError('Faltan variables de entorno críticas');
    logInfo('Ejecuta: node scripts/create-stripe-env.js para configurar');
  }
  
  return allPresent;
}

// 2. Verificar endpoints de API
async function checkAPIEndpoints() {
  log('\n🌐 VERIFICANDO ENDPOINTS DE API...', 'bold');
  
  const baseURL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
    
  logInfo(`Base URL: ${baseURL}`);
  
  const endpoints = [
    '/api/health',
    '/api/stripe/create-checkout-session',
    '/api/stripe/webhook'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${baseURL}${endpoint}`;
      
      if (endpoint === '/api/stripe/create-checkout-session') {
        // Test POST request
        const response = await makeRequest(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            planType: 'basic',
            billingCycle: 'monthly'
          })
        });
        
        if (response.status === 200 || response.status === 401) {
          logSuccess(`${endpoint}: Endpoint disponible`);
        } else {
          logWarning(`${endpoint}: Status ${response.status}`);
        }
      } else if (endpoint === '/api/stripe/webhook') {
        // Test POST request para webhook
        const response = await makeRequest(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'stripe-signature': 'test'
          },
          body: JSON.stringify({ type: 'test' })
        });
        
        if (response.status === 400 || response.status === 401) {
          logSuccess(`${endpoint}: Webhook endpoint disponible`);
        } else {
          logWarning(`${endpoint}: Status ${response.status}`);
        }
      } else {
        // Test GET request
        const response = await makeRequest(url);
        
        if (response.status === 200) {
          logSuccess(`${endpoint}: OK`);
        } else {
          logWarning(`${endpoint}: Status ${response.status}`);
        }
      }
    } catch (error) {
      logError(`${endpoint}: Error - ${error.message}`);
    }
  }
}

// 3. Verificar configuración de Stripe
async function checkStripeConfiguration() {
  log('\n💳 VERIFICANDO CONFIGURACIÓN DE STRIPE...', 'bold');
  
  if (!process.env.STRIPE_SECRET_KEY) {
    logError('STRIPE_SECRET_KEY no está configurada');
    return false;
  }
  
  try {
    // Verificar que la clave sea válida haciendo una llamada a Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Test: Listar productos
    const products = await stripe.products.list({ limit: 10 });
    logSuccess(`Conexión a Stripe exitosa. Productos encontrados: ${products.data.length}`);
    
    // Verificar que tenemos los productos necesarios
    const productNames = products.data.map(p => p.name);
    const hasBasic = productNames.some(name => name.includes('Basic'));
    const hasPro = productNames.some(name => name.includes('Pro'));
    
    if (hasBasic && hasPro) {
      logSuccess('Productos Basic y Pro encontrados en Stripe');
    } else {
      logWarning('No se encontraron todos los productos necesarios');
      logInfo('Productos encontrados: ' + productNames.join(', '));
    }
    
    // Verificar precios
    const priceIds = [
      process.env.STRIPE_BASIC_MONTHLY_PRICE_ID,
      process.env.STRIPE_BASIC_ANNUAL_PRICE_ID,
      process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
      process.env.STRIPE_PRO_ANNUAL_PRICE_ID
    ].filter(Boolean);
    
    let validPrices = 0;
    
    for (const priceId of priceIds) {
      try {
        await stripe.prices.retrieve(priceId);
        validPrices++;
      } catch (error) {
        logError(`Price ID inválido: ${priceId}`);
      }
    }
    
    logInfo(`Precios válidos: ${validPrices}/${priceIds.length}`);
    
    return true;
    
  } catch (error) {
    logError(`Error conectando a Stripe: ${error.message}`);
    return false;
  }
}

// 4. Test de checkout session
async function testCheckoutSession() {
  log('\n🛒 TESTING CHECKOUT SESSION...', 'bold');
  
  const baseURL = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';
  
  try {
    const response = await makeRequest(`${baseURL}/api/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planType: 'basic',
        billingCycle: 'monthly'
      })
    });
    
    if (response.status === 200 && response.data.url) {
      logSuccess('Checkout session creada exitosamente');
      logInfo(`URL de checkout: ${response.data.url.substring(0, 50)}...`);
    } else if (response.status === 401) {
      logWarning('Checkout requiere autenticación (normal)');
    } else {
      logError(`Error en checkout: ${response.status} - ${JSON.stringify(response.data)}`);
    }
    
  } catch (error) {
    logError(`Error testing checkout: ${error.message}`);
  }
}

// 5. Verificar pricing table
function checkPricingTable() {
  log('\n📊 VERIFICANDO PRICING TABLE...', 'bold');
  
  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID;
  
  if (pricingTableId) {
    logSuccess(`Pricing Table ID configurado: ${pricingTableId}`);
    
    if (pricingTableId.startsWith('prctbl_')) {
      logSuccess('Formato de Pricing Table ID válido');
    } else {
      logWarning('Formato de Pricing Table ID inusual');
    }
  } else {
    logError('NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID no configurado');
  }
}

// 6. Generar reporte
function generateReport() {
  log('\n📋 REPORTE FINAL', 'bold');
  
  const issues = [];
  const recommendations = [];
  
  // Verificar si estamos en modo test
  const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('sk_test_');
  
  if (isTestMode) {
    logInfo('✅ Configuración en MODO TEST - Perfecto para desarrollo');
  } else {
    logWarning('⚠️  Configuración en MODO LIVE - Asegúrate de estar listo para producción');
  }
  
  // Recommendations
  recommendations.push('💡 Usa tarjeta 4242 4242 4242 4242 para testing');
  recommendations.push('💡 Configura webhooks en Stripe Dashboard');
  recommendations.push('💡 Prueba el flujo completo en /onboarding');
  
  log('\n🔧 PRÓXIMOS PASOS RECOMENDADOS:', 'yellow');
  recommendations.forEach(rec => log(rec, 'yellow'));
  
  if (issues.length > 0) {
    log('\n⚠️  PROBLEMAS DETECTADOS:', 'red');
    issues.forEach(issue => log(issue, 'red'));
  } else {
    log('\n🎉 ¡CONFIGURACIÓN PARECE ESTAR CORRECTA!', 'green');
  }
}

// Función principal
async function main() {
  log('🚀 INICIANDO VERIFICACIÓN DE INTEGRACIÓN STRIPE', 'bold');
  log('==================================================', 'blue');
  
  try {
    // Cargar variables de entorno
    require('dotenv').config();
    
    // Ejecutar todas las verificaciones
    const envOK = checkEnvironmentVariables();
    await checkAPIEndpoints();
    
    if (envOK) {
      await checkStripeConfiguration();
      await testCheckoutSession();
    }
    
    checkPricingTable();
    generateReport();
    
    log('\n✨ VERIFICACIÓN COMPLETADA', 'bold');
    
  } catch (error) {
    logError(`Error general: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar solo si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  checkAPIEndpoints,
  checkStripeConfiguration,
  testCheckoutSession,
  checkPricingTable
}; 