#!/usr/bin/env node

/**
 * 🔧 FIX TYPESCRIPT PROMISE.RACE ERRORS
 * ====================================
 * 
 * Arregla los errores de TypeScript en Promise.race para el deployment
 */

const fs = require('fs');

console.log('🔧 FIXING TYPESCRIPT PROMISE.RACE ERRORS');
console.log('========================================');

const filePath = 'src/lib/database/client.ts';

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix 1: Replace the Promise.race with timeout for namespace initialization
  const namespaceRacePattern = /const namespaceResult = await Promise\.race<\{ success: boolean; error\?: string \}>\(\[[\s\S]*?new Promise\([^}]+}\), 30000\)\)[\s\S]*?\]\);/;
  
  const namespaceReplace = `try {
        const namespaceResult = await Promise.race([
          ragEngine.initializeStoreNamespaces(storeId),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Namespace timeout')), 30000))
        ]) as { success: boolean; error?: string };
        
        if (!namespaceResult.success) {
          throw new Error(\`Namespace initialization failed: \${namespaceResult.error}\`);
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Namespace timeout') {
          throw new Error('Namespace initialization timed out after 30 seconds');
        }
        throw error;
      }`;
  
  content = content.replace(namespaceRacePattern, namespaceReplace);
  
  // Fix 2: Replace the Promise.race with timeout for data indexing
  const indexingRacePattern = /await Promise\.race<void>\(\[[\s\S]*?new Promise\([^}]+}\), 60000\)\)[\s\S]*?\]\);/;
  
  const indexingReplace = `try {
        await Promise.race([
          ragEngine.indexStoreData(storeId, store.store.access_token),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Indexing timeout')), 60000))
        ]);
      } catch (error) {
        if (error instanceof Error && error.message === 'Indexing timeout') {
          throw new Error('Data indexing timed out after 60 seconds');
        }
        throw error;
      }`;
  
  content = content.replace(indexingRacePattern, indexingReplace);
  
  // Write the fixed content
  fs.writeFileSync(filePath, content);
  
  console.log('✅ TypeScript Promise.race errors fixed');
  console.log('✅ Ready for deployment');
  
} catch (error) {
  console.error('❌ Error fixing TypeScript:', error.message);
  process.exit(1);
}
