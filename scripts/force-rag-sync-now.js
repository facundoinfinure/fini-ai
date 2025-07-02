#!/usr/bin/env node

/**
 * 🚀 FORCE RAG SYNC FOR EXISTING STORES
 * ====================================
 * 
 * Script rápido para triggear sync manual de tiendas existentes
 */

console.log('🚀 TRIGGERING RAG SYNC FOR EXISTING STORES');
console.log('==========================================');

const API_BASE = 'https://fini-tn.vercel.app';

// Lista de stores conocidas para triggear sync
const STORE_IDS = [
  // Agrega aquí los IDs de las tiendas que necesitan sync
  // El script intentará hacer sync de todas las stores activas
];

async function triggerRagSync() {
  try {
    console.log('🔄 Triggering RAG sync via production API...');
    
    // Use the test endpoint to trigger sync for all stores
    const response = await fetch(`${API_BASE}/api/test-rag-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ RAG sync triggered successfully');
      console.log(`📊 Results: ${data.results?.triggered || 0} stores sync triggered`);
      
      if (data.results?.details) {
        data.results.details.forEach(store => {
          console.log(`  • ${store.storeName}: ${store.status}`);
        });
      }
    } else {
      console.log(`⚠️  Response: ${response.status} ${response.statusText}`);
      const errorData = await response.text();
      console.log('Error details:', errorData);
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Wait 2-5 minutes for sync to complete');
  console.log('2. Try asking: "¿qué productos tengo?"');
  console.log('3. Product Manager should respond with real data');
  console.log('4. Monitor Vercel logs for sync progress');
}

triggerRagSync();
