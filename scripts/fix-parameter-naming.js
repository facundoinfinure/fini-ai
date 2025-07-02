#!/usr/bin/env node

/**
 * Fix Parameter Naming Issues
 * 
 * This script fixes TypeScript errors related to parameter naming in:
 * - Event handlers: onChange={(_e) => ... e.target.value}
 * - Map functions: .map((_item) => ... item.property)
 * - Filter functions: .filter((_item) => ... item.property)
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fixParameterNaming() {
  log('🔧 FIXING PARAMETER NAMING ISSUES', 'cyan');
  
  // Find all TypeScript/TSX files
  const files = glob.sync('src/**/*.{ts,tsx}', { ignore: 'node_modules/**' });
  
  let totalFilesFixed = 0;
  let totalFixesApplied = 0;

  files.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    let newContent = content;
    let fileFixesCount = 0;

    // Fix 1: Event handlers - onChange={(_e) => ... e.target.value}
    const eventHandlerRegex = /onChange=\{\((_\w+)\) => ([^}]*?)\b\1\.target\.value/g;
    newContent = newContent.replace(eventHandlerRegex, (match, param, rest) => {
      const fixedParam = param.substring(1); // Remove underscore
      fileFixesCount++;
      return `onChange={(${fixedParam}) => ${rest}${fixedParam}.target.value`;
    });

    // Fix 2: onClick handlers - onClick={(_e) => ... e.stopPropagation()}
    const clickHandlerRegex = /onClick=\{\((_\w+)\) => ([^}]*?)\b\1\.(stopPropagation|preventDefault)/g;
    newContent = newContent.replace(clickHandlerRegex, (match, param, rest, method) => {
      const fixedParam = param.substring(1);
      fileFixesCount++;
      return `onClick={(${fixedParam}) => ${rest}${fixedParam}.${method}`;
    });

    // Fix 3: onKeyDown handlers  
    const keyHandlerRegex = /onKeyDown=\{\((_\w+)\) => ([^}]*?)\b\1\.key/g;
    newContent = newContent.replace(keyHandlerRegex, (match, param, rest) => {
      const fixedParam = param.substring(1);
      fileFixesCount++;
      return `onKeyDown={(${fixedParam}) => ${rest}${fixedParam}.key`;
    });

    // Fix 4: Map functions - .map((_item) => ... item.property)
    const mapRegex = /\.map\(\((_\w+)[^)]*\) => ([^}]+?\b\1\.\w+[^}]*)\)/g;
    newContent = newContent.replace(mapRegex, (match, param, body) => {
      const fixedParam = param.substring(1);
      const fixedBody = body.replace(new RegExp(`\\b${param}\\b`, 'g'), fixedParam);
      fileFixesCount++;
      return `.map((${fixedParam}) => ${fixedBody})`;
    });

    // Fix 5: Filter functions  
    const filterRegex = /\.filter\(\((_\w+)[^)]*\) => ([^}]+?\b\1\.\w+[^}]*)\)/g;
    newContent = newContent.replace(filterRegex, (match, param, body) => {
      const fixedParam = param.substring(1);
      const fixedBody = body.replace(new RegExp(`\\b${param}\\b`, 'g'), fixedParam);
      fileFixesCount++;
      return `.filter((${fixedParam}) => ${fixedBody})`;
    });

    // Fix 6: setState functions - setState((_prev) => ... prev...)
    const setStateRegex = /set\w+\(\((_\w+)\) => ([^}]*?)\b\1\b(?!\.\w)/g;
    newContent = newContent.replace(setStateRegex, (match, param, rest) => {
      const fixedParam = param.substring(1);
      const fixedRest = rest.replace(new RegExp(`\\b${param}\\b`, 'g'), fixedParam);
      fileFixesCount++;
      return match.replace(`(${param})`, `(${fixedParam})`).replace(rest, fixedRest);
    });

    if (fileFixesCount > 0) {
      fs.writeFileSync(filePath, newContent);
      totalFilesFixed++;
      totalFixesApplied += fileFixesCount;
      log(`✅ Fixed ${fileFixesCount} issues in ${filePath}`, 'green');
    }
  });

  log(`\n📊 SUMMARY:`, 'cyan');
  log(`Files processed: ${files.length}`, 'blue');
  log(`Files fixed: ${totalFilesFixed}`, 'green');
  log(`Total fixes applied: ${totalFixesApplied}`, 'green');

  if (totalFixesApplied > 0) {
    log(`\n🎯 Parameter naming issues fixed! Run 'npx tsc --noEmit' to verify.`, 'green');
  } else {
    log(`\n✨ No parameter naming issues found.`, 'yellow');
  }
}

if (require.main === module) {
  fixParameterNaming();
}

module.exports = { fixParameterNaming }; 