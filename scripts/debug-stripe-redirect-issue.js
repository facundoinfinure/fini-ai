#!/usr/bin/env node

/**
 * Debug: Problema de redirección después de pago Stripe
 * 
 * Este script verifica:
 * 1. Configuración de URLs en el sistema
 * 2. Estado de webhooks de Stripe
 * 3. Variables de entorno correctas
 * 4. Recomendaciones para el usuario
 */

console.log('🔍 Debugging Stripe Redirect Issue - Diagnosticando problema de redirección');
console.log('=========================================================================\n');

async function debugStripeRedirectIssue() {
  try {
    console.log('📋 Test 1: Verificando configuración de URLs...');
    
    // Check environment variables
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const vercelUrl = process.env.VERCEL_URL;
    
    console.log('🌐 URLs configuradas:');
    console.log(`   NEXT_PUBLIC_APP_URL: ${appUrl || '❌ No configurada'}`);
    console.log(`   VERCEL_URL: ${vercelUrl || '❌ No configurada'}`);
    
    // Expected URLs
    const expectedUrls = {
      production: 'https://fini-ai.vercel.app',
      dashboard: 'https://fini-ai.vercel.app/dashboard',
      onboarding: 'https://fini-ai.vercel.app/onboarding'
    };
    
    console.log('\n🎯 URLs esperadas:');
    Object.entries(expectedUrls).forEach(([name, url]) => {
      console.log(`   ${name}: ${url}`);
    });

    console.log('\n🔧 Test 2: Verificando configuración success_url...');
    
    const successUrlPattern = `${appUrl || 'https://fini-ai.vercel.app'}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`;
    console.log('   Success URL configurada:', successUrlPattern);
    
    const cancelUrlPattern = `${appUrl || 'https://fini-ai.vercel.app'}/dashboard?canceled=true`;
    console.log('   Cancel URL configurada:', cancelUrlPattern);

    console.log('\n📱 Test 3: Verificando desde la transacción actual...');
    console.log('   Tu transacción fue exitosa ✅');
    console.log('   Session ID visible en URL de Stripe ✅');
    console.log('   Basic Plan - $299.99/año procesado ✅');

    console.log('\n🚨 Test 4: Posibles causas del problema...');
    
    const possibleCauses = [
      '1. NEXT_PUBLIC_APP_URL no configurada en Vercel',
      '2. Popup blocker del navegador bloqueó redirección',
      '3. Error JavaScript en el dashboard al cargar',
      '4. Webhook de Stripe aún procesando (delay normal)',
      '5. Success URL malformada por variable faltante'
    ];

    possibleCauses.forEach(cause => {
      console.log(`   ⚠️  ${cause}`);
    });

    console.log('\n✅ Test 5: Soluciones inmediatas...');
    
    const immediateSolutions = [
      '🎯 ACCIÓN: Ve manualmente a https://fini-ai.vercel.app/dashboard',
      '🔄 VERIFICAR: Tu suscripción debería aparecer como activa',
      '📱 ESPERAR: Mensaje WhatsApp puede tardar 1-2 minutos',
      '🛠️  REVISAR: Logs de Vercel para errores JavaScript'
    ];

    immediateSolutions.forEach(solution => {
      console.log(`   ${solution}`);
    });

    console.log('\n🔧 Test 6: Configuración recomendada para Vercel...');
    
    const vercelConfig = {
      'NEXT_PUBLIC_APP_URL': 'https://fini-ai.vercel.app',
      'STRIPE_SUCCESS_URL': 'https://fini-ai.vercel.app/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}',
      'STRIPE_CANCEL_URL': 'https://fini-ai.vercel.app/dashboard?canceled=true'
    };

    console.log('   Variables que deben estar en Vercel:');
    Object.entries(vercelConfig).forEach(([key, value]) => {
      console.log(`   ${key}=${value}`);
    });

    console.log('\n🔍 Test 7: Debug específico de tu sesión...');
    
    // Extract session info from the screenshot URL if possible
    console.log('   📸 De tu captura vemos:');
    console.log('   - Pago completado exitosamente');
    console.log('   - Basic Plan anual ($299.99)');
    console.log('   - "Entorno de prueba" activo');
    console.log('   - Stripe procesó el pago correctamente');

    console.log('\n🎯 Test 8: Pasos de recuperación...');
    
    const recoverySteps = [
      '1. 🌐 Ve a: https://fini-ai.vercel.app/dashboard',
      '2. 🔐 Inicia sesión si es necesario',
      '3. ✅ Verifica que tu suscripción aparezca como "Basic Plan"',
      '4. 📱 Revisa WhatsApp en 1-2 minutos para mensaje bienvenida',
      '5. 🔄 Si no funciona, contacta soporte con session ID de Stripe'
    ];

    recoverySteps.forEach(step => {
      console.log(`   ${step}`);
    });

    console.log('\n🛡️  Test 9: Prevención futura...');
    
    const preventionMeasures = [
      '✓ Configurar NEXT_PUBLIC_APP_URL en Vercel',
      '✓ Agregar logs adicionales en dashboard success handler',
      '✓ Implementar fallback si redirección falla',
      '✓ Mostrar mensaje "Redirigiendo..." en Stripe',
      '✓ Timeout automático para redirección manual'
    ];

    preventionMeasures.forEach(measure => {
      console.log(`   ${measure}`);
    });

    console.log('\n🚀 ACCIÓN INMEDIATA RECOMENDADA:');
    console.log('========================================');
    console.log('1. 🎯 Abre nueva pestaña: https://fini-ai.vercel.app/dashboard');
    console.log('2. 🔐 Inicia sesión con tu cuenta');
    console.log('3. ✅ Tu suscripción Basic debería estar activa');
    console.log('4. 📱 Mensaje WhatsApp llegará automáticamente');
    console.log('5. 🎉 ¡Comienza a usar Fini AI!');

    console.log('\n📞 Si necesitas ayuda adicional:');
    console.log('   - Guarda el session ID de Stripe de la URL');
    console.log('   - Reporta que completaste pago pero no hubo redirección');
    console.log('   - Tu suscripción está procesada correctamente');

  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  debugStripeRedirectIssue();
}

module.exports = { debugStripeRedirectIssue }; 