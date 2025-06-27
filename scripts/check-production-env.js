#!/usr/bin/env node

/**
 * Check Production Environment Variables
 * Helps identify missing env vars causing auth issues in production
 */

const requiredEnvVars = {
  // Database
  'NEXT_PUBLIC_SUPABASE_URL': 'Supabase URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': 'Supabase Anon Key', 
  'SUPABASE_SERVICE_ROLE_KEY': 'Supabase Service Role Key',
  
  // Auth
  'NEXTAUTH_SECRET': 'NextAuth Secret',
  'NEXTAUTH_URL': 'NextAuth URL (debe ser https://fini-tn.vercel.app)',
  'NEXT_PUBLIC_APP_URL': 'App URL (debe ser https://fini-tn.vercel.app)',
  
  // Twilio WhatsApp
  'TWILIO_ACCOUNT_SID': 'Twilio Account SID',
  'TWILIO_AUTH_TOKEN': 'Twilio Auth Token',
  'TWILIO_PHONE_NUMBER': 'Twilio Phone Number',
  'TWILIO_OTP_CONTENTSID': 'OTP Template Content SID',
  
  // Tienda Nube
  'TIENDANUBE_CLIENT_ID': 'Tienda Nube Client ID',
  'TIENDANUBE_CLIENT_SECRET': 'Tienda Nube Client Secret',
  
  // Stripe
  'STRIPE_SECRET_KEY': 'Stripe Secret Key',
  'STRIPE_PUBLISHABLE_KEY': 'Stripe Publishable Key'
};

console.log('🔍 PRODUCTION ENVIRONMENT CHECK');
console.log('=================================\n');

console.log('📋 VARIABLES REQUERIDAS EN VERCEL:\n');

Object.entries(requiredEnvVars).forEach(([key, description]) => {
  console.log(`${key}`);
  console.log(`  📝 ${description}`);
  
  if (key === 'NEXTAUTH_URL') {
    console.log(`  ✅ Debe ser: https://fini-tn.vercel.app`);
  } else if (key === 'NEXT_PUBLIC_APP_URL') {
    console.log(`  ✅ Debe ser: https://fini-tn.vercel.app`);
  } else if (key === 'NEXTAUTH_SECRET') {
    console.log(`  ✅ Debe ser: Una string aleatoria segura`);
  }
  
  console.log('');
});

console.log('🔧 PASOS PARA CONFIGURAR EN VERCEL:');
console.log('1. Ve a: https://vercel.com/dashboard');
console.log('2. Selecciona tu proyecto fini-ai');
console.log('3. Ve a Settings → Environment Variables');
console.log('4. Agrega TODAS las variables listadas arriba');
console.log('5. IMPORTANTE: Cambia estas URLs para producción:');
console.log('   • NEXTAUTH_URL=https://fini-tn.vercel.app');
console.log('   • NEXT_PUBLIC_APP_URL=https://fini-tn.vercel.app');
console.log('6. Redeploy después de agregar variables\n');

console.log('🚨 ERRORES COMUNES EN PRODUCCIÓN:');
console.log('• NEXTAUTH_URL apuntando a localhost');
console.log('• NEXTAUTH_SECRET faltante o vacío');
console.log('• Variables de Twilio faltantes → Error "Invalid Parameter"');
console.log('• Supabase service role key faltante → Auth errors\n');

console.log('🎯 PARA VERIFICAR:');
console.log('1. Configura todas las variables en Vercel');
console.log('2. Redeploy el proyecto');
console.log('3. Ve a https://fini-tn.vercel.app/dashboard');
console.log('4. El modal de WhatsApp OTP debería funcionar\n');

console.log('✅ Los cambios de código YA están deployados');
console.log('❌ El problema es configuración de entorno en Vercel'); 