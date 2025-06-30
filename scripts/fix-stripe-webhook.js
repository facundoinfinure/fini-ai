#!/usr/bin/env node

/**
 * 🔧 FIX STRIPE WEBHOOK SIGNATURE ERROR
 * ====================================
 * 
 * Resuelve el error crítico:
 * "StripeSignatureVerificationError: No signatures found matching the expected signature"
 */

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

async function fixStripeWebhook() {
  console.log(`${colors.bold}${colors.purple}`);
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                  🔧 FIX STRIPE WEBHOOK                       ║');
  console.log('║                                                              ║');
  console.log('║  Resolver error de verificación de firma                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);

  log.step('Identificando el problema...');
  console.log('   Error actual: StripeSignatureVerificationError');
  console.log('   Causa: STRIPE_WEBHOOK_SECRET incorrecto o faltante');
  console.log('   Impacto: Suscripciones no se procesan automáticamente');

  console.log('\n📋 PASOS PARA RESOLVER:');
  console.log(`${colors.bold}${colors.yellow}`);
  console.log('1. ACCEDER AL STRIPE DASHBOARD:');
  console.log(`${colors.reset}`);
  console.log('   • Ve a: https://dashboard.stripe.com/webhooks');
  console.log('   • Busca el webhook con URL: https://fini-tn.vercel.app/api/stripe/webhook');
  console.log('   • Si no existe, créalo con estos eventos:');
  console.log('     - checkout.session.completed');
  console.log('     - customer.subscription.updated');
  console.log('     - customer.subscription.deleted');

  console.log(`\n${colors.bold}${colors.yellow}2. OBTENER EL SIGNING SECRET:${colors.reset}`);
  console.log('   • Click en el webhook');
  console.log('   • En la sección "Signing secret", click "Reveal"');
  console.log('   • Copia el secret (formato: whsec_xxxx...)');

  console.log(`\n${colors.bold}${colors.yellow}3. ACTUALIZAR EN VERCEL:${colors.reset}`);
  console.log('   • Ve a: https://vercel.com/dashboard');
  console.log('   • Selecciona el proyecto fini-tn');
  console.log('   • Ve a Settings → Environment Variables');
  console.log('   • Busca STRIPE_WEBHOOK_SECRET');
  console.log('   • Si existe: Edit y pega el nuevo secret');
  console.log('   • Si no existe: Add variable:');
  console.log('     Name: STRIPE_WEBHOOK_SECRET');
  console.log('     Value: whsec_xxxx... (el secret copiado)');
  console.log('     Environment: Production');

  console.log(`\n${colors.bold}${colors.yellow}4. REDEPLOY:${colors.reset}`);
  console.log('   • En Vercel, ve a Deployments');
  console.log('   • Click en "Redeploy" en el último deployment');
  console.log('   • O haz un nuevo commit al repositorio');

  console.log(`\n${colors.bold}${colors.green}5. VERIFICAR:${colors.reset}`);
  console.log('   • Espera ~2 minutos después del deploy');
  console.log('   • Ve a Stripe Dashboard → Webhooks');
  console.log('   • Envía un webhook de prueba');
  console.log('   • Debería aparecer como "succeeded"');

  console.log(`\n${colors.bold}📊 COMANDOS ÚTILES:${colors.reset}`);
  console.log('   • Verificar webhook: node scripts/test-stripe-webhook.js');
  console.log('   • Ver logs: node scripts/diagnose-vercel-errors.js');
  console.log('   • Test completo: node scripts/test-stripe-integration.js');

  console.log(`\n${colors.bold}${colors.cyan}🎯 RESULTADO ESPERADO:${colors.reset}`);
  console.log('   ✅ Webhooks de Stripe procesan sin errores');
  console.log('   ✅ Suscripciones se activan automáticamente');
  console.log('   ✅ Mensajes de bienvenida se envían');
  console.log('   ✅ Logs de Vercel sin StripeSignatureVerificationError');

  console.log(`\n${colors.bold}⚠️  TROUBLESHOOTING:${colors.reset}`);
  console.log('   • Si persiste el error: El secret puede estar mal copiado');
  console.log('   • Verificar que no hay espacios extra al copiar');
  console.log('   • El secret debe empezar con "whsec_"');
  console.log('   • Verificar que el webhook URL es exactamente: https://fini-tn.vercel.app/api/stripe/webhook');

  log.success('Guía de fix completada. Ejecuta los pasos manualmente.');
}

// Execute if run directly
if (require.main === module) {
  fixStripeWebhook().catch(error => {
    log.error(`Fix failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { fixStripeWebhook }; 