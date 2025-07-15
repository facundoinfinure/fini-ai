#!/usr/bin/env node

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://fini-tn.vercel.app'
  : 'http://localhost:3000';

console.log('🔍 Testing Store Info Endpoint');
console.log('=============================');
console.log(`📡 Base URL: ${BASE_URL}\n`);

async function testStoreInfo(storeUrl, description) {
  try {
    console.log(`🧪 ${description}`);
    console.log(`  📡 Testing URL: ${storeUrl}`);
    
    const response = await fetch(`${BASE_URL}/api/tiendanube/store-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ storeUrl })
    });
    
    const data = await response.json();
    
    console.log(`   ${data.success ? '✅' : '❌'} Status: ${response.status}`);
    console.log(`   📊 Success: ${data.success}`);
    
    if (data.success && data.data) {
      console.log(`   🏪 Store Name: "${data.data.name}"`);
      console.log(`   🔍 Source: ${data.data.source}`);
      console.log(`   🌐 URL: ${data.data.url}`);
    } else if (data.error) {
      console.log(`   ⚠️  Error: ${data.error}`);
    }
    
    return { passed: data.success, data: data.data };
  } catch (error) {
    console.log(`   💥 Network Error: ${error.message}`);
    return { passed: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting Store Info Tests...\n');
  
  const testCases = [
    {
      url: 'https://finaidemotiendanube.com',
      description: 'Test with finaidemotiendanube.com (should extract from URL)'
    },
    {
      url: 'https://mitienda.mitiendanube.com',
      description: 'Test with mitienda.mitiendanube.com (should extract from URL)'
    },
    {
      url: 'https://awesome-store.tiendanube.com',
      description: 'Test with awesome-store.tiendanube.com (should extract "Awesome Store")'
    },
    {
      url: 'https://invalid-url.com',
      description: 'Test with invalid URL (should fail validation)'
    },
    {
      url: '',
      description: 'Test with empty URL (should fail validation)'
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testStoreInfo(testCase.url, testCase.description);
    results.push(result);
    console.log(''); // Empty line between tests
  }
  
  // Summary
  console.log('📊 SUMMARY');
  console.log('==========');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${results.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Store info endpoint is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Check the results above.');
  }
  
  console.log('\n📝 USAGE EXAMPLE:');
  console.log('curl -X POST https://fini-tn.vercel.app/api/tiendanube/store-info \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -d \'{"storeUrl": "https://mitienda.mitiendanube.com"}\'');
}

runTests().catch(console.error); 