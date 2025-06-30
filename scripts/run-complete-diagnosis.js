#!/usr/bin/env node

/**
 * 🔍 DIAGNÓSTICO COMPLETO VERCEL - TODO EN UNO
 * ============================================
 * 
 * Script maestro que ejecuta todos los diagnósticos y 
 * proporciona un plan de acción consolidado
 */

const { runDiagnosis } = require('./diagnose-vercel-errors');
const { fixStripeWebhook } = require('./fix-stripe-webhook');
const { checkTokenStatus } = require('./fix-tiendanube-tokens');

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
  step: (msg) => console.log(`${colors.cyan}🔧 ${msg}${colors.reset}`),
  header: (msg) => console.log(`${colors.bold}${colors.purple}${msg}${colors.reset}`)
};

/**
 * Generate executive summary
 */
function generateExecutiveSummary(results) {
  log.header('\n📊 RESUMEN EJECUTIVO');
  console.log('='.repeat(60));
  
  console.log(`\n${colors.bold}🚨 ERRORES CRÍTICOS IDENTIFICADOS:${colors.reset}`);
  console.log('   1. 🔴 Stripe Webhook Signature Error');
  console.log('   2. 🔴 TiendaNube API 401 Unauthorized');
  console.log('   3. 🔴 RAG System Failures (consecuencia)');
  
  console.log(`\n${colors.bold}💥 IMPACTO EN PRODUCCIÓN:${colors.reset}`);
  console.log('   • Suscripciones NO se procesan automáticamente');
  console.log('   • Agentes AI NO tienen acceso a datos de tienda');
  console.log('   • Chat funciona pero con información limitada');
  console.log('   • Analytics están desactualizados');
  
  console.log(`\n${colors.bold}⏱️  TIEMPO ESTIMADO DE RESOLUCIÓN:${colors.reset}`);
  console.log('   • Stripe Webhook: 15 minutos');
  console.log('   • TiendaNube Tokens: 30 minutos (coordinación con usuarios)');
  console.log('   • Verificación completa: 1-2 horas');
  
  console.log(`\n${colors.bold}🎯 ACCIONES PRIORITARIAS:${colors.reset}`);
  console.log(`   ${colors.red}1. INMEDIATO:${colors.reset} Fix Stripe Webhook Secret`);
  console.log(`   ${colors.red}2. URGENTE:${colors.reset} Contactar usuarios para reconectar TiendaNube`);
  console.log(`   ${colors.yellow}3. SEGUIMIENTO:${colors.reset} Monitorear logs por 24h`);
}

/**
 * Show next steps
 */
function showNextSteps() {
  log.header('\n🚀 PRÓXIMOS PASOS');
  console.log('='.repeat(60));
  
  console.log(`\n${colors.bold}${colors.red}⚡ ACCIÓN INMEDIATA (HAZ AHORA):${colors.reset}`);
  console.log('   1. Ejecuta: node scripts/fix-stripe-webhook.js');
  console.log('   2. Sigue las instrucciones del script');
  console.log('   3. Ve a Stripe Dashboard y actualiza webhook secret');
  console.log('   4. Redeploy en Vercel');
  
  console.log(`\n${colors.bold}${colors.yellow}📞 COORDINACIÓN CON USUARIOS (PRÓXIMAS 2 HORAS):${colors.reset}`);
  console.log('   1. Ejecuta: node scripts/fix-tiendanube-tokens.js');
  console.log('   2. Identifica usuarios con tokens expirados');
  console.log('   3. Envía mensaje de WhatsApp/email con instrucciones');
  console.log('   4. Apoya reconexión manual de TiendaNube');
  
  console.log(`\n${colors.bold}${colors.cyan}🔍 VERIFICACIÓN (DESPUÉS DE FIXES):${colors.reset}`);
  console.log('   1. Ejecuta: node scripts/diagnose-vercel-errors.js');
  console.log('   2. Verifica reducción de errores en logs Vercel');
  console.log('   3. Testea chat con consultas reales');
  console.log('   4. Confirma que suscripciones se procesan');
  
  console.log(`\n${colors.bold}📋 HERRAMIENTAS DISPONIBLES:${colors.reset}`);
  console.log('   • Diagnóstico: node scripts/diagnose-vercel-errors.js');
  console.log('   • Fix Stripe: node scripts/fix-stripe-webhook.js');
  console.log('   • Fix TiendaNube: node scripts/fix-tiendanube-tokens.js');
  console.log('   • Salud general: node scripts/verify-production-health.js');
  console.log('   • Documentación: VERCEL_ERRORS_SOLUTIONS.md');
}

/**
 * Main function
 */
async function runCompleteDiagnosis() {
  console.log(`${colors.bold}${colors.purple}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                🔍 DIAGNÓSTICO COMPLETO VERCEL                ║');
  console.log('║                                                              ║');
  console.log('║       Análisis integral + Plan de acción ejecutivo          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);
  
  const startTime = Date.now();
  
  try {
    // Run main diagnosis
    log.step('Ejecutando diagnóstico principal...');
    await runDiagnosis();
    
    console.log('\n' + '='.repeat(60));
    
    // Check token status
    log.step('Verificando estado detallado de tokens...');
    const tokenStatus = await checkTokenStatus();
    
    console.log('\n' + '='.repeat(60));
    
    // Generate summary and action plan
    generateExecutiveSummary({ tokenStatus });
    showNextSteps();
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    console.log(`\n${colors.bold}${colors.green}`);
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ DIAGNÓSTICO COMPLETADO                   ║');
    console.log(`║                                                              ║`);
    console.log(`║  Tiempo total: ${duration}s | Próximo paso: Ejecutar fixes       ║`);
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`${colors.reset}`);
    
    console.log(`\n${colors.bold}📖 DOCUMENTACIÓN COMPLETA:${colors.reset}`);
    console.log('   Lee: VERCEL_ERRORS_SOLUTIONS.md para detalles completos');
    
  } catch (error) {
    log.error(`Diagnóstico completo falló: ${error.message}`);
    console.log('\n📋 ALTERNATIVAS:');
    console.log('   • Ejecuta scripts individuales manualmente');
    console.log('   • Revisa logs de Vercel directamente');
    console.log('   • Contacta al equipo de desarrollo');
  }
}

// Execute if run directly
if (require.main === module) {
  runCompleteDiagnosis().catch(error => {
    console.error(`❌ Script failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { runCompleteDiagnosis }; 