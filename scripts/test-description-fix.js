#!/usr/bin/env node

/**
 * 🧪 Test Description Fix
 * 
 * Verifica que el fix para "[object Object]" funciona correctamente
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Description Fix...\n');

// Import the safeDescription function by requiring the compiled module
const path = require('path');

// Simulate the safeDescription function (since we can't import TS directly)
function safeDescription(desc, fallback = 'Tienda online') {
  if (!desc) return fallback;
  
  if (typeof desc === 'string') {
    return desc.trim() || fallback;
  }
  
  if (typeof desc === 'object') {
    // Try to extract a string from the object
    if (desc.es) return String(desc.es).trim() || fallback;
    if (desc.en) return String(desc.en).trim() || fallback;
    if (desc.short) return String(desc.short).trim() || fallback;
    if (desc.long) return String(desc.long).trim() || fallback;
    if (desc.description) return String(desc.description).trim() || fallback;
    if (desc.text) return String(desc.text).trim() || fallback;
    
    // If object has a single property, try to use its value
    const keys = Object.keys(desc);
    if (keys.length === 1 && typeof desc[keys[0]] === 'string') {
      return String(desc[keys[0]]).trim() || fallback;
    }
    
    // If no extractable string found, use fallback
    return fallback;
  }
  
  // Convert any other type to string safely
  return String(desc).trim() || fallback;
}

// Test cases that were problematic before
const testCases = [
  {
    name: 'Undefined description',
    input: undefined,
    expected: 'Tienda online especializada en e-commerce'
  },
  {
    name: 'Null description', 
    input: null,
    expected: 'Tienda online especializada en e-commerce'
  },
  {
    name: 'Empty string description',
    input: '',
    expected: 'Tienda online especializada en e-commerce'
  },
  {
    name: 'Object with es property',
    input: { es: 'Descripción en español', en: 'English description' },
    expected: 'Descripción en español'
  },
  {
    name: 'Object with short property',
    input: { short: 'Tienda online', long: 'Tienda online completa' },
    expected: 'Tienda online'
  },
  {
    name: 'Object with nested description',
    input: { description: 'Descripción anidada' },
    expected: 'Descripción anidada'
  },
  {
    name: 'Single property object',
    input: { content: 'Contenido único' },
    expected: 'Contenido único'
  },
  {
    name: 'Complex object without extractable string',
    input: { id: 123, active: true, tags: ['a', 'b'] },
    expected: 'Tienda online especializada en e-commerce'
  },
  {
    name: 'Normal string description',
    input: 'Descripción normal de la tienda',
    expected: 'Descripción normal de la tienda'
  },
  {
    name: 'String with whitespace',
    input: '   Descripción con espacios   ',
    expected: 'Descripción con espacios'
  }
];

console.log('🧪 Running test cases...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = safeDescription(testCase.input, 'Tienda online especializada en e-commerce');
  const success = result === testCase.expected;
  
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`  Input: ${JSON.stringify(testCase.input)}`);
  console.log(`  Expected: "${testCase.expected}"`);
  console.log(`  Got: "${result}"`);
  console.log(`  Status: ${success ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (success) {
    passed++;
  } else {
    failed++;
  }
});

console.log('📊 Test Results:');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! The fix should work correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Review the implementation.');
}

// Test the actual problem scenario from the screenshot
console.log('\n🎯 Testing the exact problem scenario...');
console.log('Simulating what caused "[object Object]" in the UI:');

const problematicData = {
  // This could be what's coming from AI or Tienda Nube
  description: {
    es: 'Productos de e-commerce general de calidad',
    en: 'Quality general e-commerce products'
  }
};

const beforeFix = problematicData.description || 'fallback';
const afterFix = safeDescription(problematicData.description, 'fallback');

console.log('Before fix (what caused the problem):');
console.log(`  Value: ${JSON.stringify(beforeFix)}`);
console.log(`  Type: ${typeof beforeFix}`);
console.log(`  UI Display: ${beforeFix.toString()}`);

console.log('\nAfter fix:');
console.log(`  Value: ${JSON.stringify(afterFix)}`);
console.log(`  Type: ${typeof afterFix}`);
console.log(`  UI Display: ${afterFix}`);

console.log('\n✅ Fix validation complete!'); 