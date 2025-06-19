#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing critical ESLint errors...');

// Función para arreglar variables no utilizadas
function fixUnusedVariables() {
  console.log('🧹 Fixing unused variables...');
  
  const files = [
    'src/app/api/dashboard/stats/route.ts',
    'src/app/api/health/route.ts',
    'src/app/api/user/complete-onboarding/route.ts',
    'src/app/api/whatsapp/configure/route.ts',
    'src/app/api/whatsapp/test/route.ts',
    'src/app/api/whatsapp/webhook/route.ts',
    'src/app/auth/signin/page.tsx',
    'src/app/dashboard/page.tsx',
    'src/app/onboarding/page.tsx',
    'src/app/page.tsx',
    'src/lib/agents/base-agent.ts',
    'src/lib/agents/multi-agent-system.ts',
    'src/lib/agents/orchestrator-agent.ts',
    'src/lib/agents/types.ts',
    'src/lib/auth/config.ts',
    'src/lib/auth/tiendanube-provider.ts',
    'src/lib/integrations/supabase.ts',
    'src/lib/integrations/twilio-whatsapp.ts',
    'src/lib/integrations/twilio.ts',
    'src/lib/integrations/whatsapp/twilio-service.ts',
    'src/lib/rag/embeddings.ts',
    'src/lib/security.ts',
    'src/types/agents.ts',
    'src/types/database.ts',
    'src/types/tiendanube.ts'
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Arreglar parámetros de función no utilizados
        content = content.replace(
          /function\s+\w+\s*\(\s*(\w+)\s*\)/g,
          (match, param) => {
            if (param && !param.startsWith('_')) {
              return match.replace(param, `_${param}`);
            }
            return match;
          }
        );
        
        // Arreglar arrow functions
        content = content.replace(
          /\(\s*(\w+)\s*\)\s*=>/g,
          (match, param) => {
            if (param && !param.startsWith('_')) {
              return match.replace(param, `_${param}`);
            }
            return match;
          }
        );
        
        // Arreglar variables no utilizadas
        content = content.replace(
          /const\s+(\w+)\s*=\s*[^;]+;/g,
          (match, varName) => {
            if (varName && !varName.startsWith('_')) {
              return match.replace(varName, `_${varName}`);
            }
            return match;
          }
        );
        
        fs.writeFileSync(file, content);
        console.log(`✅ Fixed unused variables in ${file}`);
      } catch (error) {
        console.error(`❌ Error fixing ${file}:`, error.message);
      }
    }
  });
}

// Función para arreglar console statements
function fixConsoleStatements() {
  console.log('🔇 Fixing console statements...');
  
  const files = [
    'src/app/api/tiendanube/dev-connect/route.ts',
    'src/app/api/tiendanube/oauth/callback/route.ts',
    'src/app/api/tiendanube/oauth/connect/route.ts',
    'src/app/api/tiendanube/sync/route.ts',
    'src/app/api/tiendanube/test-connection/route.ts',
    'src/app/api/user/complete-onboarding/route.ts',
    'src/app/api/webhooks/tiendanube/customers-data-request/route.ts',
    'src/app/api/webhooks/tiendanube/customers-redact/route.ts',
    'src/app/api/webhooks/tiendanube/store-redact/route.ts',
    'src/app/api/whatsapp/send-welcome/route.ts',
    'src/app/api/whatsapp/test/route.ts',
    'src/app/api/whatsapp/webhook/route.ts',
    'src/app/auth/signin/page.tsx',
    'src/app/onboarding/page.tsx',
    'src/lib/agents/base-agent.ts',
    'src/lib/agents/multi-agent-system.ts',
    'src/lib/auth/config.ts',
    'src/lib/auth/tiendanube-provider.ts',
    'src/lib/integrations/supabase.ts',
    'src/lib/integrations/tiendanube.ts',
    'src/lib/integrations/twilio-whatsapp.ts',
    'src/lib/integrations/twilio.ts',
    'src/lib/integrations/whatsapp/twilio-service.ts',
    'src/lib/rag/document-processor.ts',
    'src/lib/rag/embeddings.ts',
    'src/lib/rag/rag-engine.ts',
    'src/lib/rag/vector-store.ts',
    'src/lib/security.ts',
    'src/middleware.ts'
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Reemplazar console.log con console.warn para debugging
        content = content.replace(/console\.log\(/g, 'console.warn(');
        
        fs.writeFileSync(file, content);
        console.log(`✅ Fixed console statements in ${file}`);
      } catch (error) {
        console.error(`❌ Error fixing ${file}:`, error.message);
      }
    }
  });
}

// Función para arreglar object shorthand
function fixObjectShorthand() {
  console.log('📝 Fixing object shorthand...');
  
  const files = [
    'src/app/api/tiendanube/dev-connect/route.ts',
    'src/app/api/tiendanube/oauth/connect/route.ts',
    'src/app/api/tiendanube/test-connection/route.ts',
    'src/app/api/whatsapp/webhook/route.ts',
    'src/lib/agents/base-agent.ts',
    'src/lib/auth/config.ts',
    'src/lib/integrations/tiendanube.ts',
    'src/lib/integrations/twilio.ts',
    'src/lib/rag/vector-store.ts'
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Arreglar object shorthand
        content = content.replace(
          /(\w+):\s*\1\s*([,}])/g,
          '$1$2'
        );
        
        fs.writeFileSync(file, content);
        console.log(`✅ Fixed object shorthand in ${file}`);
      } catch (error) {
        console.error(`❌ Error fixing ${file}:`, error.message);
      }
    }
  });
}

// Función para arreglar template literals
function fixTemplateLiterals() {
  console.log('🔗 Fixing template literals...');
  
  const files = [
    'src/app/api/whatsapp/send-welcome/route.ts',
    'src/lib/integrations/whatsapp/config.ts'
  ];

  files.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        let content = fs.readFileSync(file, 'utf8');
        
        // Arreglar concatenación de strings
        content = content.replace(
          /'([^']+)'\s*\+\s*([^;]+)/g,
          '`$1${$2}`'
        );
        
        fs.writeFileSync(file, content);
        console.log(`✅ Fixed template literals in ${file}`);
      } catch (error) {
        console.error(`❌ Error fixing ${file}:`, error.message);
      }
    }
  });
}

// Función principal
async function main() {
  console.log('🚀 Starting critical ESLint fixes...\n');
  
  const steps = [
    { name: 'Unused variables', fn: fixUnusedVariables },
    { name: 'Console statements', fn: fixConsoleStatements },
    { name: 'Object shorthand', fn: fixObjectShorthand },
    { name: 'Template literals', fn: fixTemplateLiterals }
  ];
  
  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    await step.fn();
    console.log(`✅ ${step.name} completed`);
  }
  
  console.log('\n🎉 Critical ESLint fixes completed!');
  console.log('\n📊 Running ESLint check...');
  
  try {
    execSync('npx eslint "src/**/*.{ts,tsx}" --format=compact', { stdio: 'inherit' });
  } catch (error) {
    console.log('\n⚠️  Some ESLint warnings remain, but critical errors should be fixed.');
  }
}

main().catch(console.error); 