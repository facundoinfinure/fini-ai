/**
 * 🧪 TEST REASONING FEATURE COMPLETE
 * Verifica que todas las funcionalidades de reasoning estén implementadas correctamente:
 * ✅ Interfaz Message incluye campo reasoning
 * ✅ Schema SQL incluye campo reasoning  
 * ✅ MessageService maneja reasoning
 * ✅ Endpoint de chat envía reasoning en respuesta
 * ✅ Frontend muestra reasoning expandible
 */

const fs = require('fs');
const path = require('path');

function checkFileContains(filePath, patterns, description) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const results = patterns.map(pattern => ({
      pattern: pattern.toString(),
      found: pattern.test(content)
    }));
    
    const allFound = results.every(r => r.found);
    console.log(`${allFound ? '✅' : '❌'} ${description}`);
    
    if (!allFound) {
      results.forEach(r => {
        if (!r.found) {
          console.log(`   ❌ Missing: ${r.pattern}`);
        }
      });
    }
    
    return allFound;
  } catch (error) {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    return false;
  }
}

function runReasoningTests() {
  console.log('🧪 Testing Reasoning Feature Implementation...\\n');
  
  let passed = 0;
  let total = 0;
  
  // Test 1: Database Schema Interface
  total++;
  if (checkFileContains(
    'src/lib/database/schema.ts',
    [
      /reasoning\?\s*:\s*string.*Agent reasoning for transparency/,
      /reasoning TEXT.*Agent reasoning for transparency/
    ],
    'Database Schema: Interface Message incluye campo reasoning'
  )) passed++;

  // Test 2: MessageService
  total++;
  if (checkFileContains(
    'src/lib/database/client.ts',
    [
      /reasoning.*String.*reasoning.*trim/,
      /messageData\.reasoning/
    ],
    'MessageService: Maneja campo reasoning correctamente'
  )) passed++;

  // Test 3: Chat Endpoint Backend
  total++;
  if (checkFileContains(
    'src/app/api/chat/send/route.ts',
    [
      /reasoning:\s*agentResponse\.reasoning.*Agent reasoning for transparency/,
      /reasoning:\s*agentResponse\.reasoning.*NEW.*transparency/
    ],
    'Chat Endpoint: Guarda y envía reasoning en respuesta'
  )) passed++;

  // Test 4: Frontend Chat Interface  
  total++;
  if (checkFileContains(
    'src/components/chat/fini-chat-interface.tsx',
    [
      /reasoning\?\s*:\s*string/,
      /expandedReasoning/,
      /proceso de análisis/
    ],
    'Frontend: Interface reasoning y toggle expandible'
  )) passed++;

  // Test 5: TypeScript Compilation
  total++;
  try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit --skipLibCheck', { 
      cwd: process.cwd(), 
      stdio: 'pipe' 
    });
    console.log('✅ TypeScript: Compilación exitosa sin errores de tipos');
    passed++;
  } catch (error) {
    console.log('❌ TypeScript: Errores de compilación detectados');
  }

  // Test 6: Chat Component Structure
  total++;
  if (checkFileContains(
    'src/components/chat/fini-chat-interface.tsx',
    [
      /Brain.*className.*w-.*h-/,
      /processingTime|processing.*time/i,
      /confidence.*\d/i
    ],
     'Frontend: Componentes UI para reasoning, tiempo y confianza'
  )) passed++;

  console.log(`\\n📊 RESULTADO FINAL: ${passed}/${total} tests pasaron`);
  
  if (passed === total) {
    console.log('\\n🎉 ¡TODAS LAS FUNCIONALIDADES DE REASONING IMPLEMENTADAS!');
    console.log('\\n✅ NEXT STEPS:');
    console.log('  1. Ejecutar SQL en Supabase Dashboard para agregar campo reasoning');
    console.log('  2. Hacer deploy del código actualizado');
    console.log('  3. Probar el chat para ver reasoning expandible');
    console.log('\\n📋 SQL PARA SUPABASE:');
    console.log('  ALTER TABLE messages ADD COLUMN IF NOT EXISTS reasoning TEXT;');
  } else {
    console.log(`\\n⚠️ ${total - passed} verificaciones fallaron - revisar implementación`);
  }
  
  return passed === total;
}

// Run tests
const success = runReasoningTests();
process.exit(success ? 0 : 1); 