#!/usr/bin/env node

/**
 * 🧪 TEST NAMESPACE CREATION
 * =========================
 * 
 * Script to test and debug why only 2 of 6 namespaces are created
 * for store ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a
 * 
 * Expected: 6 namespaces (store, products, orders, customers, analytics, conversations)
 * Actual: 2 namespaces (store, analytics)
 * Missing: 4 namespaces (products, orders, customers, conversations)
 */

const fetch = require('node-fetch');

const STORE_ID = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a';
const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  : 'http://localhost:3000';

async function testNamespaceCreation() {
  console.log('🧪 Testing namespace creation debugging...\n');

  try {
    // 1. Check current status
    console.log('1️⃣ Checking current store status...');
    const statusResponse = await fetch(`${BASE_URL}/api/debug/pinecone-namespace-diagnosis?storeId=${STORE_ID}`);
    const statusData = await statusResponse.json();
    
    console.log('Store Status:', {
      exists: statusData.status?.quickDiagnosis?.storeExists,
      active: statusData.status?.quickDiagnosis?.storeActive,
      lastSync: statusData.status?.quickDiagnosis?.lastSync,
      hasToken: statusData.status?.quickDiagnosis?.hasToken
    });

    // 2. Check orphaned namespaces
    console.log('\n2️⃣ Checking for orphaned namespaces...');
    const orphanResponse = await fetch(`${BASE_URL}/api/debug/cleanup-orphaned-namespaces?storeId=${STORE_ID}`);
    const orphanData = await orphanResponse.json();
    
    console.log('Orphan Check:', {
      success: orphanData.success,
      storeInfo: orphanData.diagnostics?.store,
      relatedData: orphanData.diagnostics?.relatedData,
      recommendations: orphanData.diagnostics?.recommendations
    });

    // 3. Run diagnostic test if we have valid auth
    console.log('\n3️⃣ Running comprehensive namespace diagnostic...');
    
    // Get a session token (this is a simplified approach - in real usage you'd need proper auth)
    console.log('Note: This test requires authentication. Run manually from authenticated browser session.');
    console.log(`Manual test URLs:`);
    console.log(`- Status: ${BASE_URL}/api/debug/pinecone-namespace-diagnosis?storeId=${STORE_ID}`);
    console.log(`- Cleanup: ${BASE_URL}/api/debug/cleanup-orphaned-namespaces?storeId=${STORE_ID}`);
    
    console.log('\n4️⃣ Manual cleanup instructions:');
    console.log('If store is disconnected, run this cleanup:');
    console.log(`
curl -X POST ${BASE_URL}/api/debug/cleanup-orphaned-namespaces \\
  -H "Content-Type: application/json" \\
  -d '{"storeId": "${STORE_ID}", "action": "deep_cleanup"}' \\
  --cookie "your-session-cookie"
    `);

    console.log('\n5️⃣ Expected namespace structure:');
    const expectedNamespaces = [
      `store-${STORE_ID}`,
      `store-${STORE_ID}-products`,
      `store-${STORE_ID}-orders`, 
      `store-${STORE_ID}-customers`,
      `store-${STORE_ID}-analytics`,
      `store-${STORE_ID}-conversations`
    ];
    
    expectedNamespaces.forEach(ns => console.log(`  - ${ns}`));
    
    console.log('\n6️⃣ Common issues to check:');
    console.log('- ❌ Token expired/invalid for TiendaNube API');
    console.log('- ❌ Network timeouts to Pinecone');
    console.log('- ❌ Rate limiting on embedding generation');
    console.log('- ❌ Promise.allSettled() hiding individual failures');
    console.log('- ❌ Insufficient permissions or quota limits');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

async function cleanupOrphanedNamespaces() {
  console.log('🧹 Cleaning up orphaned namespaces...\n');
  
  console.log(`⚠️  WARNING: This will delete ALL Pinecone data for store ${STORE_ID}`);
  console.log('This should only be run if the store is disconnected/inactive.\n');
  
  // In a real cleanup, you'd make the authenticated API call here
  console.log('To run cleanup manually:');
  console.log('1. Open browser DevTools');
  console.log('2. Go to Application > Cookies');
  console.log('3. Copy session cookie value');
  console.log('4. Run:');
  console.log(`
fetch('/api/debug/cleanup-orphaned-namespaces', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    storeId: '${STORE_ID}',
    action: 'deep_cleanup'
  })
}).then(r => r.json()).then(console.log)
  `);
}

// Main execution
if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'cleanup') {
    cleanupOrphanedNamespaces();
  } else {
    testNamespaceCreation();
  }
}

module.exports = {
  testNamespaceCreation,
  cleanupOrphanedNamespaces
}; 