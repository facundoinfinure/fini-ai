#!/usr/bin/env node

/**
 * Debug WhatsApp Status - Test the /api/stores endpoint
 * This script tests what data the Chat section is receiving about WhatsApp status
 */

const https = require('https');
const http = require('http');

console.log('🔍 Debug WhatsApp Status - Testing /api/stores endpoint');
console.log('============================================================\n');

// Test with production URL (replace with your actual URL)
const testUrl = 'https://fini-tn.vercel.app/api/stores';

console.log(`📡 Testing endpoint: ${testUrl}`);
console.log('⚠️  Note: This will fail without proper authentication, but we can see the response structure\n');

const url = new URL(testUrl);
const options = {
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'User-Agent': 'Debug-Script/1.0',
    'Accept': 'application/json'
  }
};

const client = url.protocol === 'https:' ? https : http;

const req = client.request(options, (res) => {
  console.log(`📊 Status Code: ${res.statusCode}`);
  console.log(`📋 Headers:`, res.headers);
  console.log('');

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('📦 Response Body:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success && response.data && Array.isArray(response.data)) {
        console.log('\n🔍 WhatsApp Status Analysis:');
        response.data.forEach((store, index) => {
          console.log(`\nStore ${index + 1}: ${store.name || store.id}`);
          console.log(`  - ID: ${store.id}`);
          console.log(`  - WhatsApp Number: ${store.whatsapp_number || 'None'}`);
          console.log(`  - WhatsApp Display Name: ${store.whatsapp_display_name || 'None'}`);
          console.log(`  - WhatsApp Verified: ${store.whatsapp_verified ? '✅ YES' : '❌ NO'}`);
          console.log(`  - Status: ${store.status}`);
        });
      }
    } catch (error) {
      console.log('📦 Raw Response Body:');
      console.log(data);
      console.log('\n❌ JSON Parse Error:', error.message);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request Error:', error.message);
});

req.end();

console.log('⏳ Making request...\n'); 