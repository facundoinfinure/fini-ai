#!/usr/bin/env node

console.log('🔧 Script de Fix para Problemas de Producción');
console.log('============================================\n');

const fs = require('fs');
const path = require('path');

// 1. Fix Analytics Endpoint - Asegurar que sea dynamic
function fixAnalyticsEndpoint() {
  console.log('📊 1. Arreglando Analytics Endpoint...');
  
  const analyticsPath = 'src/app/api/dashboard/analytics/route.ts';
  const content = fs.readFileSync(analyticsPath, 'utf8');
  
  // Asegurar que tiene dynamic export
  if (!content.includes('export const dynamic')) {
    console.log('   ✅ Agregando export dynamic');
    const newContent = `export const dynamic = 'force-dynamic';\n\n${content}`;
    fs.writeFileSync(analyticsPath, newContent);
  } else {
    console.log('   ✅ Dynamic export ya existe');
  }
  
  console.log('   ✅ Analytics endpoint actualizado\n');
}

// 2. Crear endpoint de test simple para verificar routing
function createTestEndpoint() {
  console.log('🧪 2. Creando endpoint de test...');
  
  const testDir = 'src/app/api/test-config';
  const testFile = path.join(testDir, 'route.ts');
  
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
    console.log('   ✅ Directorio test-config creado');
  }
  
  const testContent = `export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    success: true,
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    components: {
      configurationManagement: 'available',
      dashboardContent: 'available'
    }
  });
}`;
  
  fs.writeFileSync(testFile, testContent);
  console.log('   ✅ Test endpoint creado: /api/test-config');
  console.log('   📡 Pruébalo: https://fini-tn.vercel.app/api/test-config\n');
}

// 3. Crear endpoint de diagnóstico para configuración
function createConfigDiagnosticEndpoint() {
  console.log('🔍 3. Creando endpoint de diagnóstico...');
  
  const diagDir = 'src/app/api/config-diagnostic';
  const diagFile = path.join(diagDir, 'route.ts');
  
  if (!fs.existsSync(diagDir)) {
    fs.mkdirSync(diagDir, { recursive: true });
  }
  
  const diagContent = `export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    
    // Test auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return Response.json({
        success: false,
        error: 'User not authenticated',
        component: 'config-diagnostic',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Test stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, is_active')
      .eq('user_id', user.id)
      .limit(5);

    return Response.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email
        },
        stores: stores || [],
        storesCount: stores?.length || 0,
        hasStoresError: !!storesError,
        storesError: storesError?.message || null
      },
      component: 'config-diagnostic',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      component: 'config-diagnostic',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}`;
  
  fs.writeFileSync(diagFile, diagContent);
  console.log('   ✅ Diagnostic endpoint creado: /api/config-diagnostic');
  console.log('   📡 Pruébalo: https://fini-tn.vercel.app/api/config-diagnostic\n');
}

// 4. Verificar componente ConfigurationManagement
function verifyConfigurationComponent() {
  console.log('🔧 4. Verificando ConfigurationManagement...');
  
  const configPath = 'src/components/dashboard/configuration-management.tsx';
  const content = fs.readFileSync(configPath, 'utf8');
  
  // Verificar que tenga el elemento de debug
  if (content.includes('ConfigurationManagement está funcionando')) {
    console.log('   ✅ Elemento de debug presente');
  } else {
    console.log('   ❌ Elemento de debug faltante');
  }
  
  // Verificar importaciones críticas
  const criticalImports = [
    'StoreManagement',
    'WhatsAppManagement',
    'Card',
    'Button'
  ];
  
  criticalImports.forEach(imp => {
    if (content.includes(imp)) {
      console.log(`   ✅ Import ${imp}: OK`);
    } else {
      console.log(`   ❌ Import ${imp}: FALTANTE`);
    }
  });
  
  console.log('   📊 Componente verificado\n');
}

// 5. Agregar logs de debug adicionales
function addDebugLogs() {
  console.log('🔍 5. Agregando logs de debug...');
  
  const configPath = 'src/components/dashboard/configuration-management.tsx';
  let content = fs.readFileSync(configPath, 'utf8');
  
  // Verificar si ya tiene logs de debug detallados
  if (!content.includes('[CONFIG-DEBUG]')) {
    console.log('   ✅ Agregando logs de debug detallados');
    
    // Agregar log al inicio del componente
    const functionStart = 'export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {';
    const newFunctionStart = `export function ConfigurationManagement({ stores, onStoreUpdate }: ConfigurationManagementProps) {
  // Enhanced debugging
  console.log('[CONFIG-DEBUG] Component initialized', {
    timestamp: new Date().toISOString(),
    storesCount: stores?.length || 0,
    storesData: stores,
    onStoreUpdateType: typeof onStoreUpdate
  });
  
  // Component lifecycle debug
  console.log('[CONFIG-DEBUG] Rendering ConfigurationManagement');`;
    
    content = content.replace(functionStart, newFunctionStart);
    
    fs.writeFileSync(configPath, content);
    console.log('   ✅ Logs de debug agregados');
  } else {
    console.log('   ✅ Logs de debug ya presentes');
  }
  
  console.log('   📊 Debug logs actualizados\n');
}

// Ejecutar todos los fixes
function runAllFixes() {
  try {
    fixAnalyticsEndpoint();
    createTestEndpoint();
    createConfigDiagnosticEndpoint();
    verifyConfigurationComponent();
    addDebugLogs();
    
    console.log('🎉 TODOS LOS FIXES COMPLETADOS');
    console.log('===============================');
    console.log('');
    console.log('📝 PRÓXIMOS PASOS:');
    console.log('1. git add .');
    console.log('2. git commit -m "Fix: Analytics endpoint y debug configuración"');
    console.log('3. git push');
    console.log('4. Verificar en producción:');
    console.log('   - https://fini-tn.vercel.app/api/test-config');
    console.log('   - https://fini-tn.vercel.app/api/config-diagnostic (requiere auth)');
    console.log('5. Revisar consola del navegador para logs [CONFIG-DEBUG]');
    console.log('');
    console.log('🔧 DEBUGGING:');
    console.log('- Si la tab aún no aparece, revisar DevTools Console');
    console.log('- Buscar errores de hydration o rendering');
    console.log('- Verificar que activeTab se configure como "configuracion"');
    
  } catch (error) {
    console.error('💥 Error ejecutando fixes:', error.message);
    process.exit(1);
  }
}

runAllFixes(); 