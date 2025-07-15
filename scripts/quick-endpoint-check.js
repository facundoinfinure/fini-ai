#!/usr/bin/env node

const BASE_URL = 'https://fini-tn.vercel.app';

console.log('🔍 Quick Endpoint Check');
console.log('======================');

async function checkEndpoint(path, description) {
  try {
    console.log(`📡 Testing: ${BASE_URL}${path}`);
    
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Fini-Test/1.0'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    
    if (response.status === 405) {
      console.log(`   ❌ ${description}: Method not allowed (endpoint exists but doesn't support GET)`);
      return 'method_not_allowed';
    } else if (response.status === 404) {
      console.log(`   ❌ ${description}: Not found (endpoint doesn't exist)`);
      return 'not_found';
    } else {
      console.log(`   ✅ ${description}: Endpoint exists`);
      return 'exists';
    }
  } catch (error) {
    console.log(`   💥 ${description}: Network error (${error.message})`);
    return 'error';
  }
}

async function runCheck() {
  console.log('Testing endpoints...\n');
  
  const results = await Promise.all([
    checkEndpoint('/api/stores/simple-sync', 'Simple Sync'),
    checkEndpoint('/api/stores/manage', 'Store Manage'),
    checkEndpoint('/api/stores', 'Stores (existing)')
  ]);
  
  console.log('\n📊 Summary:');
  
  const [simpleSyncResult, manageResult, storesResult] = results;
  
  if (simpleSyncResult === 'method_not_allowed' && manageResult === 'method_not_allowed') {
    console.log('✅ Both new endpoints exist! (405 means they don\'t support GET, which is expected)');
    console.log('🎉 The user should now be able to sync and delete stores!');
  } else if (simpleSyncResult === 'not_found' || manageResult === 'not_found') {
    console.log('❌ Some endpoints are missing. Deploy may still be in progress.');
    console.log('⏳ Try again in a few minutes.');
  } else {
    console.log('⚠️  Mixed results. Check individual endpoint statuses above.');
  }
  
  if (storesResult === 'exists') {
    console.log('✅ Existing stores endpoint is working correctly');
  }
}

runCheck().catch(console.error); 