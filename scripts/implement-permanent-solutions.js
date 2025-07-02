#!/usr/bin/env node

/**
 * 🚀 SOLUCIONES PERMANENTES PARA PROBLEMAS CRÍTICOS
 * ================================================
 * 
 * PROBLEMA 1: Eliminación de conversaciones no funciona desde sidebar
 * PROBLEMA 2: Product Manager Agent sin datos (falta sync RAG)
 * 
 * Este script implementa las soluciones definitivas para ambos problemas.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

console.log('🚀 IMPLEMENTANDO SOLUCIONES PERMANENTES');
console.log('======================================');

// =============================================================================
// SOLUCIÓN 1: OPTIMISTIC UPDATES EN SIDEBAR PARA ELIMINACIÓN DE CONVERSACIONES
// =============================================================================

const SIDEBAR_LAYOUT_OPTIMISTIC_UPDATE = `  const handleConversationDelete = async (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    console.log('[SIDEBAR] Initiating optimistic conversation deletion:', conversationId);
    
    // 🔥 OPTIMISTIC UPDATE: Remove from UI immediately
    const currentConversations = conversations;
    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);
    
    // Clear selection if it was the selected conversation
    if (selectedConversation === conversationId) {
      setSelectedConversation(null);
    }
    
    // 🔄 COORDINATED DELETION: Always use parent callback when available
    if (onConversationDelete) {
      console.log('[SIDEBAR] Delegating deletion to parent component for backend sync');
      try {
        await onConversationDelete(conversationId);
        console.log('[SIDEBAR] ✅ Parent deletion completed successfully');
      } catch (error) {
        console.error('[SIDEBAR] ❌ Parent deletion failed, rolling back:', error);
        // 🔄 ROLLBACK: Restore previous state on failure
        setConversations(currentConversations);
        if (selectedConversation === conversationId) {
          setSelectedConversation(conversationId);
        }
      }
      return;
    }
    
    // 🚨 FALLBACK: Direct deletion if no parent callback
    try {
      const response = await fetch(\`/api/conversations/\${conversationId}\`, {
        method: 'DELETE',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || \`HTTP \${response.status}\`);
      }
      
      console.log('[SIDEBAR] ✅ Fallback deletion successful');
      
      // Trigger parent update if callback exists
      if (onConversationUpdate) {
        onConversationUpdate();
      }
      
    } catch (error) {
      console.error('[SIDEBAR] ❌ Deletion failed, rolling back:', error);
      // 🔄 ROLLBACK: Restore previous state
      setConversations(currentConversations);
      if (selectedConversation === conversationId) {
        setSelectedConversation(conversationId);
      }
    }
  }`;

// =============================================================================
// SOLUCIÓN 2: AUTO-SYNC RAG EN CREACIÓN DE TIENDAS
// =============================================================================

const STORE_SERVICE_IMMEDIATE_SYNC = `  /**
   * Immediate RAG sync for instant Product Manager access
   * 🚀 CRITICAL: This ensures agents have data immediately after store connection
   */
  static async syncStoreDataToRAGImmediate(storeId: string): Promise<void> {
    console.log(\`[STORE-SERVICE] Starting immediate RAG sync for store: \${storeId}\`);
    
    try {
      // Get store with access token
      const store = await this.getStore(storeId);
      if (!store.success || !store.store?.access_token) {
        throw new Error(\`Store not found or missing access token: \${storeId}\`);
      }

      // Dynamic import to avoid build issues
      const { FiniRAGEngine } = await import('@/lib/rag');
      const ragEngine = new FiniRAGEngine();
      
      // 1. Initialize namespaces with timeout
      console.log(\`[STORE-SERVICE] Initializing namespaces for: \${storeId}\`);
      const namespaceResult = await Promise.race([
        ragEngine.initializeStoreNamespaces(storeId),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Namespace timeout')), 30000))
      ]);
      
      if (!namespaceResult.success) {
        throw new Error(\`Namespace initialization failed: \${namespaceResult.error}\`);
      }

      // 2. Index store data with timeout
      console.log(\`[STORE-SERVICE] Indexing store data for: \${storeId}\`);
      await Promise.race([
        ragEngine.indexStoreData(storeId, store.store.access_token),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Indexing timeout')), 60000))
      ]);
      
      // 3. Update last sync timestamp
      await this.updateStore(storeId, { 
        last_sync_at: new Date().toISOString() 
      });
      
      console.log(\`[STORE-SERVICE] ✅ Immediate RAG sync completed for store: \${storeId}\`);
    } catch (error) {
      console.error(\`[STORE-SERVICE] ❌ Immediate RAG sync failed for \${storeId}:\`, error);
      throw error;
    }
  }`;

// =============================================================================
// FUNCIONES DE IMPLEMENTACIÓN
// =============================================================================

async function implementSolution1() {
  console.log('\n🔧 SOLUCIÓN 1: Optimistic Updates en Sidebar');
  console.log('===========================================');
  
  const sidebarPath = path.join(__dirname, '../src/components/ui/sidebar-layout.tsx');
  
  if (!fs.existsSync(sidebarPath)) {
    console.log('❌ No se encontró el archivo sidebar-layout.tsx');
    return false;
  }
  
  try {
    let content = fs.readFileSync(sidebarPath, 'utf8');
    
    // Check if already has optimistic updates
    if (content.includes('OPTIMISTIC UPDATE: Remove from UI immediately')) {
      console.log('✅ Optimistic updates ya implementados en sidebar');
      return true;
    }
    
    // Find and replace the existing handleConversationDelete function
    const functionStart = content.indexOf('const handleConversationDelete = async (conversationId: string, event: React.MouseEvent) => {');
    
    if (functionStart === -1) {
      console.log('⚠️  No se encontró la función handleConversationDelete');
      return false;
    }
    
    // Find the end of the function (matching braces)
    let braceCount = 0;
    let functionEnd = functionStart;
    let started = false;
    
    for (let i = functionStart; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++;
        started = true;
      } else if (content[i] === '}') {
        braceCount--;
        if (started && braceCount === 0) {
          functionEnd = i + 1;
          break;
        }
      }
    }
    
    // Replace the function
    const beforeFunction = content.substring(0, functionStart);
    const afterFunction = content.substring(functionEnd);
    const newContent = beforeFunction + SIDEBAR_LAYOUT_OPTIMISTIC_UPDATE + ';' + afterFunction;
    
    // Write updated content
    fs.writeFileSync(sidebarPath, newContent);
    console.log('✅ Sidebar actualizado con optimistic updates');
    return true;
    
  } catch (error) {
    console.log(`❌ Error actualizando sidebar: ${error.message}`);
    return false;
  }
}

async function implementSolution2() {
  console.log('\n🔧 SOLUCIÓN 2: Auto-sync RAG para Product Manager');
  console.log('===============================================');
  
  // 2A: Add immediate sync method to StoreService
  console.log('2A: Agregando método de sync inmediato...');
  const addMethodSuccess = await addImmediateSyncMethod();
  
  // 2B: Update store creation to use immediate sync
  console.log('2B: Actualizando creación de tiendas...');
  const updateCreationSuccess = await updateStoreCreation();
  
  // 2C: Force sync for existing stores
  console.log('2C: Sincronizando tiendas existentes...');
  await forceSyncExistingStores();
  
  return addMethodSuccess && updateCreationSuccess;
}

async function addImmediateSyncMethod() {
  const storeServicePath = path.join(__dirname, '../src/lib/database/client.ts');
  
  if (!fs.existsSync(storeServicePath)) {
    console.log('❌ No se encontró el archivo client.ts');
    return false;
  }
  
  try {
    let content = fs.readFileSync(storeServicePath, 'utf8');
    
    // Check if already has immediate sync
    if (content.includes('syncStoreDataToRAGImmediate')) {
      console.log('✅ Método de sync inmediato ya existe');
      return true;
    }
    
    // Find the place to insert the new method (before syncStoreDataToRAGAsync)
    const asyncMethodIndex = content.indexOf('static syncStoreDataToRAGAsync(storeId: string): void {');
    
    if (asyncMethodIndex === -1) {
      console.log('⚠️  No se encontró el método syncStoreDataToRAGAsync');
      return false;
    }
    
    // Insert the immediate sync method before the async one
    const beforeAsync = content.substring(0, asyncMethodIndex);
    const afterAsync = content.substring(asyncMethodIndex);
    const newContent = beforeAsync + STORE_SERVICE_IMMEDIATE_SYNC + '\n\n  ' + afterAsync;
    
    fs.writeFileSync(storeServicePath, newContent);
    console.log('✅ Método de sync inmediato agregado');
    return true;
    
  } catch (error) {
    console.log(`❌ Error agregando método: ${error.message}`);
    return false;
  }
}

async function updateStoreCreation() {
  const storeServicePath = path.join(__dirname, '../src/lib/database/client.ts');
  
  try {
    let content = fs.readFileSync(storeServicePath, 'utf8');
    
    // Check if already updated
    if (content.includes('syncStoreDataToRAGImmediate(newStore.id)')) {
      console.log('✅ Creación de tiendas ya actualizada');
      return true;
    }
    
    // Find the existing async sync call and replace it
    const asyncCallPattern = /\/\/ 🚀 ASYNC RAG DATA SYNC[\s\S]*?this\.syncStoreDataToRAGAsync\(newStore\.id\);/;
    
    if (asyncCallPattern.test(content)) {
      const newSyncCode = `// 🚀 IMMEDIATE RAG SYNC: For instant Product Manager access
      if (newStore?.id) {
        try {
          await this.syncStoreDataToRAGImmediate(newStore.id);
          console.log('[STORE-SERVICE] ✅ Immediate sync completed for new store');
        } catch (syncError) {
          console.warn('[STORE-SERVICE] Immediate sync failed, using async fallback:', syncError);
          this.syncStoreDataToRAGAsync(newStore.id);
        }
      }`;
      
      content = content.replace(asyncCallPattern, newSyncCode);
      
      fs.writeFileSync(storeServicePath, content);
      console.log('✅ Creación de tiendas actualizada para usar sync inmediato');
      return true;
    } else {
      console.log('⚠️  No se encontró el patrón de sync async en creación');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error actualizando creación: ${error.message}`);
    return false;
  }
}

async function forceSyncExistingStores() {
  try {
    // Skip if no environment variables (development mode)
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('⚠️  Variables de entorno no disponibles, saltando sync de tiendas existentes');
      return;
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    // Get active stores that need sync
    const { data: stores, error } = await supabase
      .from('stores')
      .select('id, name, access_token, last_sync_at, platform')
      .eq('is_active', true)
      .not('access_token', 'is', null)
      .limit(5); // Limit to prevent timeout
    
    if (error) {
      console.log(`❌ Error consultando stores: ${error.message}`);
      return;
    }
    
    if (!stores || stores.length === 0) {
      console.log('✅ No hay tiendas activas para sincronizar');
      return;
    }
    
    console.log(`📊 Encontradas ${stores.length} tiendas activas`);
    
    // Trigger sync for each store
    for (const store of stores.slice(0, 3)) { // Only sync first 3 to avoid timeout
      try {
        console.log(`🔄 Triggering sync for: ${store.name} (${store.id})`);
        
        // Use production URL or localhost
        const baseUrl = process.env.VERCEL_URL ? 
          `https://${process.env.VERCEL_URL}` :
          'https://fini-tn.vercel.app';
          
        const syncUrl = `${baseUrl}/api/stores/${store.id}/sync-rag`;
        
        // Fire-and-forget async sync
        fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(error => {
          console.log(`⚠️  Async sync error for ${store.name}: ${error.message}`);
        });
        
        console.log(`✅ Sync triggered for: ${store.name}`);
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`❌ Error triggering sync for ${store.name}: ${error.message}`);
      }
    }
    
    console.log(`✅ Sync process initiated for existing stores`);
    
  } catch (error) {
    console.log(`❌ Error en force sync: ${error.message}`);
  }
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function implementPermanentSolutions() {
  console.log('🚀 Iniciando implementación de soluciones permanentes...\n');
  
  let solution1Success = false;
  let solution2Success = false;
  
  try {
    // Implement Solution 1: Sidebar Optimistic Updates
    solution1Success = await implementSolution1();
    
    // Implement Solution 2: RAG Auto-sync
    solution2Success = await implementSolution2();
    
  } catch (error) {
    console.log(`❌ Error durante implementación: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 RESUMEN DE IMPLEMENTACIÓN');
  console.log('============================');
  console.log(`✅ Solución 1 (Eliminación Conversaciones): ${solution1Success ? 'IMPLEMENTADA' : 'FALLÓ'}`);
  console.log(`✅ Solución 2 (Product Manager Data): ${solution2Success ? 'IMPLEMENTADA' : 'FALLÓ'}`);
  
  if (solution1Success && solution2Success) {
    console.log('\n🎉 ¡TODAS LAS SOLUCIONES IMPLEMENTADAS EXITOSAMENTE!');
    console.log('');
    console.log('📋 PRÓXIMOS PASOS:');
    console.log('1. Commit y push de los cambios');
    console.log('2. Deploy a producción');
    console.log('3. Probar eliminación de conversaciones desde sidebar');
    console.log('4. Probar consultas al Product Manager Agent');
    console.log('5. Monitorear logs por 24 horas');
    
    console.log('\n🧪 COMANDOS DE PRUEBA:');
    console.log('• git add .');
    console.log('• git commit -m "🔧 Fix: Implement permanent solutions for conversation deletion and RAG sync"');
    console.log('• git push origin main');
    
  } else {
    console.log('\n⚠️  ALGUNAS SOLUCIONES REQUIEREN ATENCIÓN MANUAL');
    console.log('');
    console.log('📋 ACCIONES REQUERIDAS:');
    if (!solution1Success) {
      console.log('• Revisar manualmente sidebar-layout.tsx');
      console.log('• Implementar optimistic updates en handleConversationDelete');
    }
    if (!solution2Success) {
      console.log('• Revisar manualmente client.ts en database service');
      console.log('• Agregar syncStoreDataToRAGImmediate method');
    }
  }
  
  console.log('\n🔗 VERIFICAR RESULTADOS EN:');
  console.log('• Local: http://localhost:3000/dashboard');
  console.log('• Producción: https://fini-tn.vercel.app/dashboard');
  
  console.log('\n⏰ TIEMPO ESTIMADO PARA VER RESULTADOS:');
  console.log('• Eliminación de conversaciones: INMEDIATO después de deploy');
  console.log('• Product Manager con datos: 2-5 minutos después de sync');
}

if (require.main === module) {
  implementPermanentSolutions().catch(console.error);
}

module.exports = { implementPermanentSolutions };
