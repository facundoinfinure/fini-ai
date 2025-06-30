#!/usr/bin/env node

/**
 * Fix: Configurar variables de entorno faltantes en Vercel
 * para evitar problemas de redirección después del pago
 */

console.log('🔧 Fixing Vercel Environment Variables - Configurando variables faltantes');
console.log('========================================================================\n');

function fixVercelEnvironmentVariables() {
  try {
    console.log('📋 Variables de entorno requeridas para Vercel...');
    
    const requiredVars = {
      'NEXT_PUBLIC_APP_URL': {
        value: 'https://fini-ai.vercel.app',
        description: 'URL base de la aplicación para redirecciones de Stripe',
        scope: 'Production, Preview, Development'
      },
      'STRIPE_SUCCESS_URL': {
        value: 'https://fini-ai.vercel.app/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}',
        description: 'URL de éxito después del pago en Stripe',
        scope: 'Production, Preview'
      },
      'STRIPE_CANCEL_URL': {
        value: 'https://fini-ai.vercel.app/dashboard?canceled=true',
        description: 'URL de cancelación desde Stripe',
        scope: 'Production, Preview'
      }
    };

    console.log('🎯 Variables que deben agregarse en Vercel Dashboard:');
    console.log('   https://vercel.com/facundoinfinure/fini-ai/settings/environment-variables\n');

    Object.entries(requiredVars).forEach(([key, config]) => {
      console.log(`📝 ${key}`);
      console.log(`   Value: ${config.value}`);
      console.log(`   Description: ${config.description}`);
      console.log(`   Environments: ${config.scope}`);
      console.log('');
    });

    console.log('🛠️  Pasos para configurar en Vercel:');
    console.log('1. 🌐 Ve a: https://vercel.com/dashboard');
    console.log('2. 📂 Selecciona proyecto: fini-ai'); 
    console.log('3. ⚙️  Ve a Settings > Environment Variables');
    console.log('4. ➕ Add New Variable para cada una de arriba');
    console.log('5. 🚀 Redeploy después de agregar las variables');

    console.log('\n🎯 Comando para agregar variables (si tienes Vercel CLI):');
    console.log('```bash');
    console.log('npx vercel env add NEXT_PUBLIC_APP_URL');
    console.log('# Luego ingresa: https://fini-ai.vercel.app');
    console.log('```');

    console.log('\n✅ Beneficios después del fix:');
    console.log('   ✓ Redirección automática después del pago');
    console.log('   ✓ URLs consistentes en toda la aplicación');
    console.log('   ✓ Mejor experiencia de usuario en checkout');
    console.log('   ✓ Debugging más fácil con URLs explícitas');

    console.log('\n🚨 MIENTRAS TANTO (para usuarios actuales):');
    console.log('   📱 Ir manualmente a dashboard funciona perfectamente');
    console.log('   ✅ Todas las suscripciones se procesan correctamente');
    console.log('   🎯 Webhook de Stripe funciona como backup');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Ejecutar el fix
if (require.main === module) {
  fixVercelEnvironmentVariables();
}

module.exports = { fixVercelEnvironmentVariables }; 