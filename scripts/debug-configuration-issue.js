#!/usr/bin/env node

console.log('🔍 Diagnóstico: Por qué NO aparece Configuración');
console.log('==============================================\n');

const fs = require('fs');

// 1. Verificar estructura de DashboardContent
function checkDashboardContent() {
  console.log('📊 1. Verificando DashboardContent...');
  
  const dashboardPath = 'src/components/dashboard/dashboard-content.tsx';
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Buscar las líneas relevantes para Configuration
  const lines = content.split('\n');
  
  console.log('   🔍 Buscando referencias a "Configuration"...');
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes('configuration') || line.includes('Configuración')) {
      console.log(`   📍 Línea ${index + 1}: ${line.trim()}`);
    }
  });
  
  console.log('\n   🔍 Buscando estructura de activeTab...');
  lines.forEach((line, index) => {
    if (line.includes('activeTab') && line.includes('===')) {
      console.log(`   📍 Línea ${index + 1}: ${line.trim()}`);
    }
  });
  
  console.log('\n   🔍 Buscando imports de ConfigurationManagement...');
  lines.forEach((line, index) => {
    if (line.includes('ConfigurationManagement')) {
      console.log(`   📍 Línea ${index + 1}: ${line.trim()}`);
    }
  });
}

// 2. Verificar que ConfigurationManagement existe
function checkConfigurationManagement() {
  console.log('\n📋 2. Verificando ConfigurationManagement...');
  
  const configPath = 'src/components/dashboard/configuration-management.tsx';
  
  if (!fs.existsSync(configPath)) {
    console.log('   ❌ El archivo ConfigurationManagement NO EXISTE!');
    return;
  }
  
  const content = fs.readFileSync(configPath, 'utf8');
  
  // Verificar export
  if (content.includes('export default')) {
    console.log('   ✅ Tiene export default');
  } else {
    console.log('   ❌ NO tiene export default');
  }
  
  // Verificar que esté bien formado
  if (content.includes('function ConfigurationManagement') || content.includes('const ConfigurationManagement')) {
    console.log('   ✅ Función/Componente definido');
  } else {
    console.log('   ❌ NO se encuentra definición del componente');
  }
  
  // Verificar imports
  console.log('   📦 Imports encontrados:');
  const lines = content.split('\n');
  lines.slice(0, 20).forEach((line, index) => {
    if (line.trim().startsWith('import')) {
      console.log(`      ${line.trim()}`);
    }
  });
}

// 3. Verificar estructura exacta de render
function checkRenderLogic() {
  console.log('\n🎨 3. Verificando lógica de render...');
  
  const dashboardPath = 'src/components/dashboard/dashboard-content.tsx';
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Encontrar la sección completa de switch/conditional para activeTab
  const lines = content.split('\n');
  let inRenderSection = false;
  let bracketDepth = 0;
  
  console.log('   🔍 Estructura de renderizado:');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('activeTab') && (line.includes('===') || line.includes('switch'))) {
      inRenderSection = true;
      console.log(`   📍 L${i + 1}: ${line.trim()}`);
    }
    
    if (inRenderSection) {
      if (line.includes('{')) bracketDepth++;
      if (line.includes('}')) bracketDepth--;
      
      if (line.trim().includes('Configuration') || 
          line.trim().includes('Configuración') ||
          line.trim().includes('ConfigurationManagement')) {
        console.log(`   🎯 L${i + 1}: ${line.trim()}`);
      }
      
      if (bracketDepth === 0 && line.includes('}') && inRenderSection) {
        inRenderSection = false;
        console.log(`   📍 L${i + 1}: ${line.trim()} (FIN SECCIÓN)`);
        break;
      }
    }
  }
}

// Ejecutar diagnóstico
checkDashboardContent();
checkConfigurationManagement();
checkRenderLogic();

console.log('\n🎯 PRÓXIMO PASO: Revisar si activeTab está llegando como "Configuration" en el componente');
console.log('                 y verificar que no hay errores JavaScript en el browser console.'); 