#!/usr/bin/env node

// Script básico de verificación de seguridad
const fs = require('fs');
const path = require('path');

function checkForSecrets(content, filePath) {
  // Ignorar archivos específicos que sabemos que son seguros
  const safeFiles = [
    'package.json',
    'package-lock.json',
    '.env.example',
    '.env.local', // Archivo local de variables de entorno
    '.env.development',
    '.env.test',
    'jest.config.js',
    'next.config.js',
  ];

  if (safeFiles.includes(path.basename(filePath))) {
    return true;
  }

  // Ignorar archivos en directorios específicos
  const safeDirectories = [
    'node_modules',
    '.git',
    '.next',
    'public',
    'docs',
  ];

  if (safeDirectories.some(dir => filePath.includes(dir))) {
    return true;
  }

  // Patrones más específicos para secretos reales
  const patterns = [
    /(['"])(sk_live_[0-9a-zA-Z]{24})(['"])/i, // Stripe Live Key
    /(['"])(rk_live_[0-9a-zA-Z]{24})(['"])/i, // Stripe Restricted Key
    /(['"])(sk_test_[0-9a-zA-Z]{24})(['"])/i, // Stripe Test Key
    /(['"])(pk_live_[0-9a-zA-Z]{24})(['"])/i, // Stripe Public Key
    /(['"])(pk_test_[0-9a-zA-Z]{24})(['"])/i, // Stripe Public Test Key
    /(['"])(xoxb-[0-9a-zA-Z]{72})(['"])/i, // Slack Bot Token
    /(['"])(xoxp-[0-9a-zA-Z]{72})(['"])/i, // Slack User Token
    /(['"])(xox[par]-[0-9a-zA-Z-]{166})(['"])/i, // Slack Webhook URL
    /(['"])(AIza[0-9A-Za-z-_]{35})(['"])/i, // Google API Key
    /(['"])(ya29\.[0-9A-Za-z-_]+)(['"])/i, // Google OAuth Access Token
    /(['"])(AKIA[0-9A-Z]{16})(['"])/i, // AWS Access Key ID
    /(['"])[0-9a-f]{32}(['"])/i, // MD5 hash
    /(['"])[0-9a-f]{40}(['"])/i, // SHA1 hash
    /(['"])[0-9a-f]{64}(['"])/i, // SHA256 hash
  ];

  return !patterns.some(pattern => pattern.test(content));
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let passed = true;

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (file === 'node_modules' || file === '.git' || file === '.next') {
        continue;
      }
      passed = scanDirectory(fullPath) && passed;
    } else if (stat.isFile() && /\.(js|ts|tsx|jsx|json|env.*|yml|yaml)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (!checkForSecrets(content, fullPath)) {
        console.error(`[WARNING] Possible hardcoded secrets found in ${fullPath}`);
        passed = false;
      }
    }
  }

  return passed;
}

try {
  console.log('🔒 Running security checks...');
  const passed = scanDirectory(process.cwd());
  
  if (passed) {
    console.log('✅ Security check passed');
    process.exit(0);
  } else {
    console.error('❌ Security check failed');
    process.exit(1);
  }
} catch (error) {
  console.error('Error running security checks:', error);
  process.exit(1);
} 