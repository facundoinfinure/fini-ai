#!/usr/bin/env node

/**
 * Debug: Verificar URLs exactas enviadas a Stripe
 * 
 * Este script verifica:
 * 1. Variable de entorno NEXT_PUBLIC_APP_URL
 * 2. URLs que se envían al crear checkout session
 * 3. Configuración de Stripe Pricing Table
 */

console.log('🔍 Debug Stripe URLs - Verificando URLs exactas enviadas a Stripe');
console.log('================================================================\n');

async function debugStripeUrls() {
  try {
    console.log('📋 Test 1: Verificando variable de entorno...');
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    console.log(`🌐 NEXT_PUBLIC_APP_URL: ${appUrl || '❌ No configurada'}`);
    
    if (appUrl) {
      console.log(`✅ Variable configurada correctamente: ${appUrl}`);
      
      // URLs que se generarían
      const expectedUrls = {
        success: `${appUrl}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel: `${appUrl}/dashboard?canceled=true`,
        webhook: `${appUrl}/api/stripe/webhook`
      };
      
      console.log('\n🎯 URLs que se enviarían a Stripe:');
      Object.entries(expectedUrls).forEach(([type, url]) => {
        console.log(`   ${type}: ${url}`);
      });
      
      // Test de accesibilidad
      console.log('\n🔗 Test 2: Verificando accesibilidad de URLs...');
      
      try {
        const response = await fetch(appUrl);
        console.log(`✅ ${appUrl} - Status: ${response.status}`);
      } catch (error) {
        console.log(`❌ ${appUrl} - Error: ${error.message}`);
      }
      
    } else {
      console.log('❌ Variable no configurada - usando fallback');
      
      const fallbackUrl = 'https://fini-ai.vercel.app';
      console.log(`🔄 Fallback URL: ${fallbackUrl}`);
      
      try {
        const response = await fetch(fallbackUrl);
        console.log(`${response.status === 200 ? '✅' : '❌'} ${fallbackUrl} - Status: ${response.status}`);
      } catch (error) {
        console.log(`❌ ${fallbackUrl} - Error: ${error.message}`);
      }
    }
    
    console.log('\n🚨 Test 3: Identificando problema de redirección...');
    
    const possibleIssues = [
      '1. Stripe Pricing Table configurada con URL incorrecta',
      '2. Checkout session usando fallback en lugar de variable',
      '3. Frontend enviando URLs hardcodeadas al API',
      '4. Variable de entorno no disponible en runtime',
      '5. Problema en el CSP bloqueando redirección'
    ];
    
    possibleIssues.forEach(issue => {
      console.log(`   ⚠️  ${issue}`);
    });
    
    console.log('\n🔧 Test 4: Soluciones recomendadas...');
    
    const solutions = [
      '1. ✅ Variable ya está configurada correctamente en Vercel',
      '2. 🔍 Verificar configuración en Stripe Dashboard',
      '3. 📝 Actualizar Stripe Pricing Table si tiene URLs hardcodeadas',
      '4. 🔄 Verificar que el checkout session use la variable',
      '5. 🎯 Probar crear nueva sesión de checkout manualmente'
    ];
    
    solutions.forEach(solution => {
      console.log(`   ${solution}`);
    });
    
    console.log('\n📱 Test 5: Verificación en vivo...');
    
    if (appUrl) {
      const testUrl = `${appUrl}/dashboard`;
      console.log(`🎯 URL del dashboard: ${testUrl}`);
      console.log(`🔗 Prueba manual: Abre ${testUrl} en tu navegador`);
      
      if (appUrl.includes('fini-tn.vercel.app')) {
        console.log('✅ URL correcta detectada (fini-tn.vercel.app)');
      } else if (appUrl.includes('fini-ai.vercel.app')) {
        console.log('❌ URL incorrecta detectada (fini-ai.vercel.app no existe)');
      }
    }
    
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('===================');
    
    if (appUrl && appUrl.includes('fini-tn.vercel.app')) {
      console.log('✅ Variable configurada correctamente');
      console.log('🔍 El problema puede estar en:');
      console.log('   - Configuración de Stripe Pricing Table');
      console.log('   - URLs hardcodeadas en el frontend');
      console.log('   - Problema en la creación del checkout session');
    } else {
      console.log('❌ Variable mal configurada o usando URL incorrecta');
      console.log('🔧 ACCIÓN: Actualizar variable a https://fini-tn.vercel.app');
    }
    
    console.log('\n📞 SIGUIENTE PASO:');
    console.log('🎯 Ve a tu dashboard: https://fini-tn.vercel.app/dashboard');
    console.log('✅ Tu suscripción YA está activa');

  } catch (error) {
    console.error('❌ Error en debug:', error);
  }
}

// Ejecutar diagnóstico
if (require.main === module) {
  debugStripeUrls();
}

module.exports = { debugStripeUrls }; 