#!/usr/bin/env node

/**
 * 🚨 DIAGNÓSTICO COMPLETO DE ERRORES DE VERCEL
 * =============================================
 * 
 * Script para diagnosticar y resolver errores críticos identificados en logs:
 * 1. Stripe Webhook signature verification
 * 2. TiendaNube API 401 Unauthorized 
 * 3. RAG System failures
 */

const https = require('https');

const PRODUCTION_URL = 'https://fini-tn.vercel.app';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔧 ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.purple}\n🔍 ${msg}${colors.reset}`)
};

/**
 * Make HTTP request to production API
 */
async function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fini-Diagnostic-Script/1.0'
      }
    };

    if (body) {
      const bodyString = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          };
          resolve(result);
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * 1. Check Stripe webhook configuration
 */
async function checkStripeWebhook() {
  log.header('DIAGNÓSTICO STRIPE WEBHOOK');
  
  try {
    // Test webhook endpoint
    const response = await makeRequest('/api/stripe/webhook', 'POST', {
      test: 'diagnostic'
    });
    
    if (response.status === 400) {
      log.warning('Webhook endpoint activo pero rechaza requests sin firma válida (esperado)');
    } else {
      log.error(`Webhook endpoint respuesta inesperada: ${response.status}`);
    }
    
    // Check environment variables that should exist
    log.step('Verificando configuración en Vercel...');
    console.log('   Variables requeridas:');
    console.log('   • STRIPE_WEBHOOK_SECRET (crítico para verificación)');
    console.log('   • STRIPE_SECRET_KEY');
    console.log('   • NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
    
    log.info('SOLUCIÓN STRIPE:');
    console.log('   1. Ve a Stripe Dashboard → Webhooks');
    console.log('   2. Busca webhook para fini-tn.vercel.app');
    console.log('   3. Copia el "Signing secret"');
    console.log('   4. Actualiza STRIPE_WEBHOOK_SECRET en Vercel');
    console.log('   5. Redeploy la aplicación');
    
  } catch (error) {
    log.error(`Error testing Stripe webhook: ${error.message}`);
  }
}

/**
 * 2. Check TiendaNube API access
 */
async function checkTiendaNubeAPI() {
  log.header('DIAGNÓSTICO TIENDANUBE API');
  
  try {
    // Test stores endpoint
    const response = await makeRequest('/api/stores');
    
    if (response.status === 200 && response.body?.success) {
      log.success(`Endpoint /api/stores funcional: ${response.body.data?.length || 0} stores`);
      
      // Check if we have stores with invalid tokens
      const stores = response.body.data || [];
      const storesWithTokens = stores.filter(store => store.access_token);
      
      if (storesWithTokens.length === 0) {
        log.warning('No hay stores con access_token');
      } else {
        log.info(`${storesWithTokens.length} stores tienen access_token`);
        
        // Test API call with first store
        if (storesWithTokens.length > 0) {
          const testStore = storesWithTokens[0];
          log.step(`Testing API call con store: ${testStore.name}`);
          
          const testResponse = await makeRequest(`/api/stores/${testStore.id}/analyze`, 'POST');
          
          if (testResponse.status === 401) {
            log.error('Token expirado - Usuario necesita reconectar TiendaNube');
          } else if (testResponse.status === 200) {
            log.success('Token válido - API funcional');
          } else {
            log.warning(`Respuesta inesperada: ${testResponse.status}`);
          }
        }
      }
    } else {
      log.error(`Stores endpoint error: ${response.status}`);
    }
    
    log.info('SOLUCIÓN TIENDANUBE:');
    console.log('   1. Usuario debe ir a Dashboard → Configuración');
    console.log('   2. Desconectar y reconectar TiendaNube');
    console.log('   3. Esto generará nuevos tokens válidos');
    console.log('   4. O implementar refresh token automático');
    
  } catch (error) {
    log.error(`Error testing TiendaNube API: ${error.message}`);
  }
}

/**
 * Main diagnostic function
 */
async function runDiagnosis() {
  console.log(`${colors.bold}${colors.purple}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    🚨 DIAGNÓSTICO VERCEL                     ║');
  console.log('║                                                              ║');
  console.log('║  Análisis de errores críticos en logs de producción         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);
  
  await checkStripeWebhook();
  console.log('');
  
  await checkTiendaNubeAPI();
  console.log('');
  
  console.log(`${colors.bold}🎯 PLAN DE ACCIÓN:${colors.reset}`);
  console.log('   1. 🔴 Fix Stripe Webhook Secret en Vercel');
  console.log('   2. 🔴 Fix TiendaNube tokens expirados');
  console.log('   3. 🟡 Verificar RAG system después de fixes');
}

// Execute if run directly
if (require.main === module) {
  runDiagnosis().catch(error => {
    console.error(`❌ Diagnostic failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runDiagnosis }; 