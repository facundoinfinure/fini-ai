#!/usr/bin/env node

console.log('🔧 Fix Inmediato: Tab de Configuración Frontend');
console.log('==============================================\n');

const fs = require('fs');

// 1. Verificar y arreglar el componente ConfigurationManagement
function fixConfigurationComponent() {
  console.log('🔧 1. Arreglando ConfigurationManagement...');
  
  const configPath = 'src/components/dashboard/configuration-management.tsx';
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Asegurar que el elemento de debug sea súper visible
  const debugElementOld = 'div className="bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded">';
  const debugElementNew = 'div className="bg-red-500 border border-red-600 text-white px-6 py-4 rounded-lg font-bold text-xl mb-6" style={{zIndex: 9999, position: "relative"}}>';
  
  if (content.includes(debugElementOld)) {
    content = content.replace(debugElementOld, debugElementNew);
    console.log('   ✅ Elemento de debug hecho más visible (rojo y grande)');
  }
  
  // Asegurar que tiene console.log súper visible
  if (!content.includes('🔴 CONFIGURACION RENDERIZANDO')) {
    const functionStart = 'export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {';
    const newFunctionStart = `export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {
  // SUPER DEBUG - DEBE SER VISIBLE EN CONSOLE
  console.log('🔴 CONFIGURACION RENDERIZANDO - SI VES ESTO, EL COMPONENTE SE CARGA');
  console.log('🔴 STORES COUNT:', stores?.length || 0);
  console.log('🔴 TIMESTAMP:', new Date().toISOString());
  
  // Alert para debug inmediato (remover después)
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      console.log('🔴 COMPONENTE MONTADO EN DOM');
    }, 100);
  }`;
    
    content = content.replace(functionStart, newFunctionStart);
    console.log('   ✅ Logs súper visibles agregados');
  }
  
  fs.writeFileSync(configPath, content);
  console.log('   ✅ ConfigurationManagement actualizado\n');
}

// 2. Verificar y arreglar DashboardContent
function fixDashboardContent() {
  console.log('🔧 2. Arreglando DashboardContent...');
  
  const dashPath = 'src/components/dashboard/dashboard-content.tsx';
  let content = fs.readFileSync(dashPath, 'utf8');
  
  // Asegurar que la condición de la tab es correcta
  const tabCondition = '{activeTab === "configuracion" && (';
  const newTabCondition = '{activeTab === "configuracion" && (';
  
  // Agregar logs súper visibles para debugging
  if (!content.includes('🔴 ACTIVE TAB CHANGED')) {
    // Buscar donde se renderiza la tab
    const tabRenderSection = 'activeTab === "configuracion"';
    if (content.includes(tabRenderSection)) {
      const replacement = `activeTab === "configuracion" && (() => {
        console.log('🔴 ACTIVE TAB CHANGED TO CONFIGURACION');
        console.log('🔴 RENDERING CONFIGURATION TAB');
        return true;
      })()`;
      
      content = content.replace('activeTab === "configuracion"', replacement);
      console.log('   ✅ Logs de debugging para tab agregados');
    }
  }
  
  // Agregar log para cuando cambie activeTab
  if (!content.includes('🔴 TAB STATE DEBUG')) {
    const useEffectSection = 'const [activeTab, setActiveTab] = useState("chat");';
    const newUseEffectSection = `const [activeTab, setActiveTab] = useState("chat");
  
  // 🔴 TAB STATE DEBUG
  console.log('🔴 INITIAL ACTIVE TAB:', activeTab);`;
    
    content = content.replace(useEffectSection, newUseEffectSection);
    console.log('   ✅ Log de estado inicial de tab agregado');
  }
  
  fs.writeFileSync(dashPath, content);
  console.log('   ✅ DashboardContent actualizado\n');
}

// 3. Verificar SidebarLayout para asegurar que el tab click funcione
function fixSidebarLayout() {
  console.log('🔧 3. Verificando SidebarLayout...');
  
  const sidebarPath = 'src/components/ui/sidebar-layout.tsx';
  let content = fs.readFileSync(sidebarPath, 'utf8');
  
  // Buscar el manejo de click en configuración
  if (content.includes('configuracion') || content.includes('Configuración')) {
    console.log('   ✅ Sidebar tiene referencias a configuración');
  } else {
    console.log('   ⚠️  Sidebar podría no tener el tab de configuración');
  }
  
  console.log('   📊 SidebarLayout verificado\n');
}

// 4. Crear componente de debug temporal
function createDebugComponent() {
  console.log('🔧 4. Creando componente de debug temporal...');
  
  const debugPath = 'src/components/debug-config-tab.tsx';
  const debugContent = `"use client";

export function DebugConfigTab() {
  console.log('🔴 DEBUG COMPONENT LOADED');
  
  return (
    <div className="fixed top-0 left-0 w-full bg-red-500 text-white text-center py-2 z-50">
      🔴 DEBUG: Si ves esto, React está funcionando. Tab de configuración debería aparecer abajo.
    </div>
  );
}`;
  
  fs.writeFileSync(debugPath, debugContent);
  console.log('   ✅ Componente de debug creado');
  
  // Agregar al ConfigurationManagement
  const configPath = 'src/components/dashboard/configuration-management.tsx';
  let content = fs.readFileSync(configPath, 'utf8');
  
  if (!content.includes('DebugConfigTab')) {
    // Agregar import
    const imports = 'import { fetchPostWithAuth } from \'@/lib/fetch-with-auth\';';
    const newImports = `import { fetchPostWithAuth } from '@/lib/fetch-with-auth';
import { DebugConfigTab } from '@/components/debug-config-tab';`;
    
    content = content.replace(imports, newImports);
    
    // Agregar al return
    const returnStart = 'return (';
    const newReturnStart = `return (
    <>
      <DebugConfigTab />`;
    
    const returnEnd = '</div>\n  );';
    const newReturnEnd = '</div>\n    </>\n  );';
    
    content = content.replace(returnStart, newReturnStart);
    content = content.replace(returnEnd, newReturnEnd);
    
    fs.writeFileSync(configPath, content);
    console.log('   ✅ Debug component integrado\n');
  } else {
    console.log('   ✅ Debug component ya integrado\n');
  }
}

function runImmediateFix() {
  try {
    fixConfigurationComponent();
    fixDashboardContent();
    fixSidebarLayout();
    createDebugComponent();
    
    console.log('🎉 FIX INMEDIATO COMPLETADO');
    console.log('==========================');
    console.log('');
    console.log('📝 CAMBIOS APLICADOS:');
    console.log('✅ ConfigurationManagement con logs súper visibles');
    console.log('✅ DashboardContent con debugging de tabs');
    console.log('✅ Componente de debug temporal visible');
    console.log('✅ Elemento de debug rojo y grande');
    console.log('');
    console.log('🚀 PRÓXIMOS PASOS:');
    console.log('1. git add .');
    console.log('2. git commit -m "Fix: Debug inmediato para tab configuración"');
    console.log('3. git push');
    console.log('4. Esperar deploy (1-2 minutos)');
    console.log('5. Ir a https://fini-tn.vercel.app/dashboard');
    console.log('6. Buscar:');
    console.log('   🔴 Barra roja arriba si React funciona');
    console.log('   🔴 Elemento rojo grande si ConfigurationManagement se renderiza');
    console.log('   🔴 Logs en Console que empiecen con 🔴');
    console.log('');
    console.log('🔍 DEBUGGING:');
    console.log('- Si NO ves barra roja: Problema de JavaScript/React');
    console.log('- Si ves barra roja pero NO elemento rojo: Problema con tab routing');
    console.log('- Si ves ambos: ¡El fix funcionó!');
    
  } catch (error) {
    console.error('💥 Error en fix inmediato:', error.message);
    process.exit(1);
  }
}

runImmediateFix(); 