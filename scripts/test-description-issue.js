#!/usr/bin/env node

/**
 * 🧪 Test Description Issue
 * 
 * Simula diferentes escenarios que podrían causar "[object Object]" en la descripción
 */

console.log('🧪 Testing Description Issue Scenarios...\n');

// Escenario 1: store.description es undefined
console.log('📋 Scenario 1: store.description is undefined');
const store1 = { name: 'LOBO', description: undefined };
const fallback1 = store1.description || `Tienda online especializada en e-commerce general`;
console.log('Input:', store1.description);
console.log('Fallback:', fallback1);
console.log('Type:', typeof fallback1);
console.log('Result in UI:', fallback1.toString());
console.log('---');

// Escenario 2: store.description es null
console.log('\n📋 Scenario 2: store.description is null');
const store2 = { name: 'LOBO', description: null };
const fallback2 = store2.description || `Tienda online especializada en e-commerce general`;
console.log('Input:', store2.description);
console.log('Fallback:', fallback2);
console.log('Type:', typeof fallback2);
console.log('Result in UI:', fallback2.toString());
console.log('---');

// Escenario 3: store.description es un objeto (POSIBLE PROBLEMA)
console.log('\n📋 Scenario 3: store.description is an object (POTENTIAL ISSUE)');
const store3 = { 
  name: 'LOBO', 
  description: { 
    es: 'Descripción en español',
    en: 'Description in English'
  }
};
const fallback3 = store3.description || `Tienda online especializada en e-commerce general`;
console.log('Input:', store3.description);
console.log('Fallback:', fallback3);
console.log('Type:', typeof fallback3);
console.log('Result in UI:', fallback3.toString());
console.log('🚨 THIS WOULD SHOW AS [object Object]!');
console.log('---');

// Escenario 4: store.description es una cadena vacía
console.log('\n📋 Scenario 4: store.description is empty string');
const store4 = { name: 'LOBO', description: '' };
const fallback4 = store4.description || `Tienda online especializada en e-commerce general`;
console.log('Input:', store4.description);
console.log('Fallback:', fallback4);
console.log('Type:', typeof fallback4);
console.log('Result in UI:', fallback4.toString());
console.log('---');

// Escenario 5: Simulando respuesta de AI con objeto
console.log('\n📋 Scenario 5: AI response with object description');
const aiData = {
  category: 'E-commerce General',
  description: {
    short: 'Tienda online',
    long: 'Tienda online completa con productos variados'
  },
  targetAudience: 'Público general'
};

const profile5 = {
  description: aiData.description || store1.description || 'Tienda online'
};

console.log('AI Data Description:', aiData.description);
console.log('Profile Description:', profile5.description);
console.log('Type:', typeof profile5.description);
console.log('Result in UI:', profile5.description.toString());
console.log('🚨 THIS WOULD ALSO SHOW AS [object Object]!');
console.log('---');

// Escenario 6: Fix propuesto
console.log('\n📋 Scenario 6: PROPOSED FIX');
function safeDescription(desc, fallback = 'Tienda online') {
  if (!desc) return fallback;
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object') {
    // Intentar extraer una cadena del objeto
    if (desc.es) return desc.es;
    if (desc.en) return desc.en;
    if (desc.short) return desc.short;
    if (desc.long) return desc.long;
    if (desc.description) return desc.description;
    // Si no se puede extraer, usar fallback
    return fallback;
  }
  return String(desc);
}

console.log('Fixed Scenario 3:', safeDescription(store3.description));
console.log('Fixed Scenario 5:', safeDescription(aiData.description));
console.log('Fixed undefined:', safeDescription(undefined));
console.log('Fixed null:', safeDescription(null));
console.log('Fixed empty string:', safeDescription(''));
console.log('Fixed normal string:', safeDescription('Descripción normal'));

console.log('\n🎯 CONCLUSION:');
console.log('- The issue likely occurs when store.description or AI response is an object');
console.log('- We need to implement safeDescription() function in the store analysis');
console.log('- This function should handle objects, undefined, null, and empty strings');
console.log('\n✅ Test complete!'); 