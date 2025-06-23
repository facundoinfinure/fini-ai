#!/usr/bin/env node

// Script para verificar variables de entorno críticas
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXTAUTH_SECRET'
];

const optionalVars = [
  'NEXTAUTH_URL',
  'TIENDANUBE_CLIENT_ID',
  'TIENDANUBE_CLIENT_SECRET'
];

console.log('🔍 Verificando variables de entorno...\n');

let hasErrors = false;
let hasWarnings = false;

// Verificar variables obligatorias
console.log('📋 Variables OBLIGATORIAS:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: NO CONFIGURADA`);
    hasErrors = true;
  } else if (value.includes('your-') || value.includes('tu-') || value.includes('here')) {
    console.log(`⚠️  ${varName}: VALOR DE EJEMPLO (cambiar por valor real)`);
    hasWarnings = true;
  } else {
    const maskedValue = value.length > 20 ? 
      `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 
      `${value.substring(0, 4)}...`;
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📋 Variables OPCIONALES:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚠️  ${varName}: No configurada (opcional)`);
  } else if (value.includes('your-') || value.includes('tu-') || value.includes('here')) {
    console.log(`⚠️  ${varName}: VALOR DE EJEMPLO`);
    hasWarnings = true;
  } else {
    const maskedValue = value.length > 20 ? 
      `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 
      `${value.substring(0, 4)}...`;
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📊 RESUMEN:');
if (hasErrors) {
  console.log('❌ ERROR: Faltan variables obligatorias');
  console.log('💡 Solución: Configura las variables faltantes en .env.local');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  ADVERTENCIA: Algunas variables usan valores de ejemplo');
  console.log('💡 Recomendación: Actualiza los valores con datos reales');
  process.exit(0);
} else {
  console.log('✅ ¡Todas las variables están configuradas correctamente!');
  process.exit(0);
} 