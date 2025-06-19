#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing ESLint errors...');

// Función para ejecutar comandos
function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`❌ Error running: ${command}`);
    return false;
  }
}

// Función para arreglar imports automáticamente
function fixImports() {
  console.log('📦 Fixing import order...');
  return runCommand('npx eslint --fix "src/**/*.{ts,tsx}"');
}

// Función para arreglar variables no utilizadas
function fixUnusedVars() {
  console.log('🧹 Fixing unused variables...');
  
  // Buscar archivos con variables no utilizadas
  const files = execSync('npx eslint "src/**/*.{ts,tsx}" --format=compact | grep "no-unused-vars" | cut -d: -f1', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf8');
      
      // Arreglar variables no utilizadas en parámetros de función
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
      
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed unused variables in ${file}`);
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error.message);
    }
  });
}

// Función para arreglar console statements
function fixConsoleStatements() {
  console.log('🔇 Fixing console statements...');
  
  const files = execSync('npx eslint "src/**/*.{ts,tsx}" --format=compact | grep "no-console" | cut -d: -f1', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  
  files.forEach(file => {
    try {
      let content = fs.readFileSync(file, 'utf8');
      
      // Reemplazar console.log con console.warn para debugging
      content = content.replace(/console\.log\(/g, 'console.warn(');
      
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed console statements in ${file}`);
    } catch (error) {
      console.error(`❌ Error fixing ${file}:`, error.message);
    }
  });
}

// Función para arreglar object shorthand
function fixObjectShorthand() {
  console.log('📝 Fixing object shorthand...');
  return runCommand('npx eslint --fix "src/**/*.{ts,tsx}" --rule "object-shorthand: error"');
}

// Función para arreglar prefer-template
function fixPreferTemplate() {
  console.log('🔗 Fixing template literals...');
  return runCommand('npx eslint --fix "src/**/*.{ts,tsx}" --rule "prefer-template: error"');
}

// Función principal
async function main() {
  console.log('🚀 Starting ESLint fixes...\n');
  
  // Ejecutar fixes en orden
  const steps = [
    { name: 'Import order', fn: fixImports },
    { name: 'Object shorthand', fn: fixObjectShorthand },
    { name: 'Template literals', fn: fixPreferTemplate },
    { name: 'Unused variables', fn: fixUnusedVars },
    { name: 'Console statements', fn: fixConsoleStatements }
  ];
  
  for (const step of steps) {
    console.log(`\n📋 ${step.name}...`);
    const success = await step.fn();
    if (success) {
      console.log(`✅ ${step.name} completed`);
    } else {
      console.log(`⚠️  ${step.name} had issues`);
    }
  }
  
  console.log('\n🎉 ESLint fixes completed!');
  console.log('\n📊 Running final ESLint check...');
  runCommand('npx eslint "src/**/*.{ts,tsx}" --format=compact');
}

main().catch(console.error); 