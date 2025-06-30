#!/usr/bin/env node

/**
 * 🔧 FIX TIENDANUBE TOKEN EXPIRATION
 * ==================================
 * 
 * Resuelve errores de "401 Unauthorized - Invalid access token"
 * Proporciona soluciones automáticas y manuales
 */

const https = require('https');

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  purple: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}🔧 ${msg}${colors.reset}`)
};

const PRODUCTION_URL = 'https://fini-tn.vercel.app';

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
 * Check current token status
 */
async function checkTokenStatus() {
  log.step('Verificando estado actual de tokens...');
  
  try {
    const response = await makeRequest('/api/stores');
    
    if (response.status === 200 && response.body?.success) {
      const stores = response.body.data || [];
      const storesWithTokens = stores.filter(store => store.access_token);
      const activeStores = stores.filter(store => store.is_active);
      
      log.info(`Total stores: ${stores.length}`);
      log.info(`Stores activas: ${activeStores.length}`);
      log.info(`Stores con tokens: ${storesWithTokens.length}`);
      
      if (storesWithTokens.length === 0) {
        log.error('¡Ninguna store tiene access_token!');
        return { hasValidTokens: false, stores: stores };
      }
      
      // Test tokens
      let validTokens = 0;
      let expiredTokens = 0;
      
      for (const store of storesWithTokens) {
        try {
          const testResponse = await makeRequest(`/api/stores/${store.id}/analyze`, 'POST');
          
          if (testResponse.status === 401) {
            log.error(`Token expirado: ${store.name} (${store.id})`);
            expiredTokens++;
          } else if (testResponse.status === 200) {
            log.success(`Token válido: ${store.name}`);
            validTokens++;
          } else {
            log.warning(`Estado desconocido: ${store.name} (${testResponse.status})`);
          }
        } catch (error) {
          log.warning(`Error testing ${store.name}: ${error.message}`);
          expiredTokens++;
        }
      }
      
      log.info(`Tokens válidos: ${validTokens}`);
      log.info(`Tokens expirados: ${expiredTokens}`);
      
      return { 
        hasValidTokens: validTokens > 0, 
        stores: stores,
        validTokens,
        expiredTokens 
      };
      
    } else {
      log.error(`Error accediendo a stores: ${response.status}`);
      return { hasValidTokens: false, stores: [] };
    }
    
  } catch (error) {
    log.error(`Error checking token status: ${error.message}`);
    return { hasValidTokens: false, stores: [] };
  }
}

/**
 * Provide fix instructions
 */
function showFixInstructions(tokenStatus) {
  console.log(`\n${colors.bold}${colors.purple}📋 SOLUCIONES DISPONIBLES:${colors.reset}`);
  
  if (tokenStatus.expiredTokens === 0) {
    log.success('¡Todos los tokens están válidos! No se requiere acción.');
    return;
  }
  
  console.log(`\n${colors.bold}${colors.yellow}🔧 OPCIÓN 1: FIX AUTOMÁTICO (RECOMENDADO)${colors.reset}`);
  console.log('   • Implementar refresh token automático');
  console.log('   • Requiere desarrollo adicional');
  console.log('   • Previene futuras expiraciones');
  
  console.log(`\n${colors.bold}${colors.yellow}🔧 OPCIÓN 2: RECONEXIÓN MANUAL (INMEDIATO)${colors.reset}`);
  console.log('   Para cada usuario afectado:');
  console.log('   1. Comunícate con el usuario');
  console.log('   2. Pídele que vaya a: https://fini-tn.vercel.app/dashboard');
  console.log('   3. En la sección "Configuración"');
  console.log('   4. Click "Desconectar TiendaNube"');
  console.log('   5. Luego "Conectar TiendaNube" nuevamente');
  console.log('   6. Esto generará un token fresco');
  
  console.log(`\n${colors.bold}${colors.yellow}🔧 OPCIÓN 3: NOTIFICACIÓN AUTOMÁTICA${colors.reset}`);
  console.log('   • Enviar WhatsApp/email a usuarios afectados');
  console.log('   • Guiarlos para reconectar su tienda');
  console.log('   • Usar template de mensaje automático');
  
  console.log(`\n${colors.bold}${colors.cyan}🚨 IMPACTO ACTUAL:${colors.reset}`);
  console.log('   ❌ Agentes AI no pueden obtener datos de tienda');
  console.log('   ❌ Analytics no funcionan correctamente');
  console.log('   ❌ Chat responde con información limitada');
  console.log('   ❌ RAG system no puede indexar productos/órdenes');
  
  console.log(`\n${colors.bold}📞 COMUNICACIÓN SUGERIDA AL USUARIO:${colors.reset}`);
  console.log(`${colors.yellow}---${colors.reset}`);
  console.log('Hola! Tu conexión con TiendaNube necesita renovarse.');
  console.log('Para seguir disfrutando de analytics completos:');
  console.log('1. Ve a tu dashboard: https://fini-tn.vercel.app/dashboard');
  console.log('2. En Configuración → Desconectar TiendaNube');
  console.log('3. Luego Conectar TiendaNube nuevamente');
  console.log('¡Esto toma menos de 1 minuto y ya podrás chatear con tu tienda!');
  console.log(`${colors.yellow}---${colors.reset}`);
}

/**
 * Main fix function
 */
async function fixTiendaNubeTokens() {
  console.log(`${colors.bold}${colors.purple}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║               🔧 FIX TIENDANUBE TOKENS                       ║');
  console.log('║                                                              ║');
  console.log('║  Resolver errores 401 Unauthorized                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  // Check current status
  const tokenStatus = await checkTokenStatus();
  
  console.log('');
  showFixInstructions(tokenStatus);
  
  console.log(`\n${colors.bold}📊 PRÓXIMOS PASOS:${colors.reset}`);
  console.log('   1. Implementar auto-refresh tokens (desarrollo)');
  console.log('   2. Notificar a usuarios para reconexión manual');
  console.log('   3. Monitorear logs para verificar reducción de errores 401');
  console.log('   4. Verificar que RAG system vuelve a funcionar');
  
  console.log(`\n${colors.bold}🔧 COMANDOS ÚTILES:${colors.reset}`);
  console.log('   • Verificar después del fix: node scripts/diagnose-vercel-errors.js');
  console.log('   • Test API TiendaNube: node scripts/test-tiendanube-api.js');
  console.log('   • Verificar salud: node scripts/verify-production-health.js');
}

// Execute if run directly
if (require.main === module) {
  fixTiendaNubeTokens().catch(error => {
    log.error(`Fix failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { fixTiendaNubeTokens, checkTokenStatus }; 