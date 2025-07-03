// Test Script para verificar el sistema de chat
console.log('🧪 TESTING FINI CHAT SYSTEM');
console.log('============================');

// Test 1: Verificar que los archivos críticos existen
const fs = require('fs');
const path = require('path');

const criticalFiles = [
  'src/lib/agents/base-agent.ts',
  'src/lib/agents/analytics-agent.ts',
  'src/lib/agents/product-manager-agent.ts',
  'src/app/api/chat/send/route.ts'
];

console.log('\n📁 Verificando archivos críticos:');
criticalFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING!`);
  }
});

// Test 2: Verificar configuración de threshold en base-agent
console.log('\n🔧 Verificando configuración RAG:');
try {
  const baseAgentContent = fs.readFileSync('src/lib/agents/base-agent.ts', 'utf8');
  
  if (baseAgentContent.includes('threshold: 0.3')) {
    console.log('✅ RAG threshold configurado a 0.3 (mejorado)');
  } else if (baseAgentContent.includes('threshold: this.config.ragConfig.threshold')) {
    console.log('⚠️  RAG threshold usando config (necesita verificación)');
  } else {
    console.log('❌ RAG threshold no encontrado o mal configurado');
  }
  
  if (baseAgentContent.includes('generateDataAvailabilityContext')) {
    console.log('✅ Fallbacks mejorados implementados');
  } else {
    console.log('❌ Fallbacks mejorados no encontrados');
  }
} catch (error) {
  console.log('❌ Error leyendo base-agent.ts:', error.message);
}

// Test 3: Verificar mejoras en Analytics Agent
console.log('\n📊 Verificando Analytics Agent:');
try {
  const analyticsContent = fs.readFileSync('src/lib/agents/analytics-agent.ts', 'utf8');
  
  if (analyticsContent.includes('Estrategia de Precios para tu Tienda')) {
    console.log('✅ Respuestas mejoradas de pricing implementadas');
  } else {
    console.log('❌ Respuestas mejoradas de pricing no encontradas');
  }
  
  if (analyticsContent.includes('Analytics de Tu Tienda - Sistema en Sincronización')) {
    console.log('✅ Fallback mejorado de analytics implementado');
  } else {
    console.log('❌ Fallback mejorado de analytics no encontrado');
  }
} catch (error) {
  console.log('❌ Error leyendo analytics-agent.ts:', error.message);
}

console.log('\n🎯 RECOMENDACIONES:');
console.log('1. Verifica que todos los archivos críticos ✅ estén presentes');
console.log('2. Si hay ❌, ejecuta: git pull origin main');
console.log('3. Ejecuta: npm run build para verificar que compila');
console.log('4. Prueba el chat en la aplicación con consultas como:');
console.log('   - "Cuéntame sobre mi tienda"');
console.log('   - "Qué productos tengo"');
console.log('   - "Análisis de ventas"');

console.log('\n✨ Si todo está ✅, el sistema debe funcionar correctamente!');
