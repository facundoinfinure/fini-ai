#!/usr/bin/env node

/**
 * Script para crear .env.local con los Content SIDs correctos de Twilio
 */

const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`${colors.cyan}🎯 ${msg}${colors.reset}`)
};

function createEnvLocal() {
  log.title('Creando .env.local con Content SIDs de WhatsApp actualizados\n');

  const envContent = `# ========================================
# Fini AI - Variables de Entorno (LOCAL)
# ========================================
# Este archivo NO debe ser commiteado al repositorio

# ========================================
# BASE DE DATOS (SUPABASE)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ========================================
# AUTENTICACIÓN (NEXTAUTH)
# ========================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here

# ========================================
# WHATSAPP/TWILIO - CONFIGURACIÓN REAL
# ========================================
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+14065002249

# WhatsApp Message Templates Content SIDs - REALES desde Twilio
TWILIO_OTP_CONTENTSID=HXc00fd0971da921a1e4ca16cf99903a31
TWILIO_WELCOME_CONTENTSID=HX37335001f6ecc645927aca368343a747
TWILIO_ANALYTICS_CONTENTSID=HX21a8906e743b3fd022adf6683b9ff46c
TWILIO_MARKETING_CONTENTSID=HXf914f35a15c434180c7c7940d7ef7bfc
TWILIO_ERROR_CONTENTSID=HXa5d6a66578456c49a9c00f9ad08c06af

# Backup OTP Template (si el principal falla)
TWILIO_OTP_BACKUP_CONTENTSID=HXb9bf898907a224e533b55577070ffd4d

# ========================================
# TIENDA NUBE
# ========================================
TIENDANUBE_CLIENT_ID=your-tiendanube-client-id
TIENDANUBE_CLIENT_SECRET=your-tiendanube-client-secret
TIENDANUBE_REDIRECT_URI=http://localhost:3000/api/tiendanube/oauth/callback

# ========================================
# STRIPE (OPCIONAL PARA TESTING)
# ========================================
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# ========================================
# CONFIGURACIÓN DE LA APP
# ========================================
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# ========================================
# FEATURE FLAGS
# ========================================
ENABLE_WHATSAPP_INTEGRATION=true
ENABLE_TIENDANUBE_SYNC=true

# ========================================
# NOTAS IMPORTANTES
# ========================================
# 1. Completa las variables que comienzan con "your-"
# 2. Los Content SIDs de WhatsApp ya están configurados correctamente
# 3. Ejecuta: npm run verify-env para verificar la configuración
`;

  const envPath = path.join(process.cwd(), '.env.local');
  
  try {
    // Verificar si ya existe
    if (fs.existsSync(envPath)) {
      log.warning('.env.local ya existe');
      
      // Leer contenido actual
      const currentContent = fs.readFileSync(envPath, 'utf8');
      
      // Verificar si tiene los Content SIDs actualizados
      const hasUpdatedSIDs = currentContent.includes('HX37335001f6ecc645927aca368343a747');
      
      if (hasUpdatedSIDs) {
        log.success('Los Content SIDs ya están actualizados');
        return;
      }
      
      // Crear backup
      const backupPath = envPath + '.backup.' + Date.now();
      fs.writeFileSync(backupPath, currentContent);
      log.info(`Backup creado: ${backupPath}`);
    }
    
    // Escribir nuevo contenido
    fs.writeFileSync(envPath, envContent);
    log.success('.env.local creado/actualizado exitosamente');
    
    console.log('\n📋 Variables de WhatsApp configuradas:');
    console.log('   ✅ TWILIO_OTP_CONTENTSID=HXc00fd0971da921a1e4ca16cf99903a31');
    console.log('   ✅ TWILIO_WELCOME_CONTENTSID=HX37335001f6ecc645927aca368343a747');
    console.log('   ✅ TWILIO_ANALYTICS_CONTENTSID=HX21a8906e743b3fd022adf6683b9ff46c');
    console.log('   ✅ TWILIO_MARKETING_CONTENTSID=HXf914f35a15c434180c7c7940d7ef7bfc');
    console.log('   ✅ TWILIO_ERROR_CONTENTSID=HXa5d6a66578456c49a9c00f9ad08c06af');
    
    console.log('\n📝 SIGUIENTE PASO:');
    console.log('   1. Edita .env.local y completa las variables que comienzan con "your-"');
    console.log('   2. Especialmente: TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN');
    console.log('   3. Ejecuta: npm run verify-env');
    
    console.log('\n🚀 Con estos Content SIDs, el error 63016 debería resolverse');
    
  } catch (error) {
    log.error(`Error creando .env.local: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createEnvLocal();
}

module.exports = { createEnvLocal }; 