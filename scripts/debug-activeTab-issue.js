#!/usr/bin/env node

console.log('🔍 Debug: Problema ActiveTab - ConfigurationManagement no se ejecuta');
console.log('================================================================\n');

const fs = require('fs');

// 1. Verificar los valores exactos de activeTab
function checkActiveTabValues() {
  console.log('📊 1. Verificando valores de activeTab...');
  
  const dashboardPath = 'src/components/dashboard/dashboard-content.tsx';
  const content = fs.readFileSync(dashboardPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('   🔍 Valores de activeTab encontrados:');
  lines.forEach((line, index) => {
    if (line.includes('activeTab === ') && line.includes('"')) {
      const match = line.match(/activeTab === "([^"]+)"/);
      if (match) {
        console.log(`   📍 L${index + 1}: activeTab === "${match[1]}"`);
      }
    }
  });
}

// 2. Verificar valores en sidebar
function checkSidebarValues() {
  console.log('\n📋 2. Verificando valores en sidebar...');
  
  const sidebarPath = 'src/components/ui/sidebar-layout.tsx';
  const content = fs.readFileSync(sidebarPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('   🔍 Navigation items en sidebar:');
  let inNavigationItems = false;
  lines.forEach((line, index) => {
    if (line.includes('navigationItems')) {
      inNavigationItems = true;
    }
    if (inNavigationItems && line.includes('id:')) {
      const match = line.match(/id: '([^']+)'/);
      if (match) {
        console.log(`   📍 L${index + 1}: id: '${match[1]}'`);
      }
    }
    if (inNavigationItems && line.includes('];')) {
      inNavigationItems = false;
    }
  });
}

// 3. Crear debug en DashboardContent para ver activeTab en tiempo real
function addActiveTabDebug() {
  console.log('\n🔧 3. Agregando debug de activeTab en tiempo real...');
  
  const dashboardPath = 'src/components/dashboard/dashboard-content.tsx';
  let content = fs.readFileSync(dashboardPath, 'utf8');
  
  // Buscar donde está el return del JSX y agregar debug antes
  const lines = content.split('\n');
  let insertIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().includes('return (') && !lines[i].includes('//')) {
      insertIndex = i;
      break;
    }
  }
  
  if (insertIndex > -1) {
    const debugCode = `
  // 🔴 SUPER DEBUG - ACTIVE TAB VALUE
  console.log('🔴🔴🔴 DASHBOARD CONTENT - ACTIVE TAB:', activeTab);
  console.log('🔴 Type of activeTab:', typeof activeTab);
  console.log('🔴 activeTab === "configuracion":', activeTab === "configuracion");
  console.log('🔴 activeTab === "Configuration":', activeTab === "Configuration");
  console.log('🔴 activeTab === "Configuración":', activeTab === "Configuración");
`;
    
    lines.splice(insertIndex, 0, debugCode);
    content = lines.join('\n');
    fs.writeFileSync(dashboardPath, content);
    console.log('   ✅ Debug de activeTab agregado antes del return JSX');
  } else {
    console.log('   ❌ No se pudo encontrar return JSX');
  }
}

// Ejecutar diagnóstico
checkActiveTabValues();
checkSidebarValues();
addActiveTabDebug();

console.log('\n🎯 PRÓXIMO PASO: Deploy y revisar console para ver valor real de activeTab');
console.log('                 Esto revelará exactamente qué valor llega vs qué esperamos'); 