#!/usr/bin/env node

/**
 * Script para obtener los Content SIDs de templates de WhatsApp desde Twilio
 * y generar las variables de entorno correctas
 */

require('dotenv').config({ path: '.env.local' });
const twilio = require('twilio');

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

async function getTwilioTemplates() {
  log.title('Obteniendo Content SIDs de Templates de WhatsApp desde Twilio\n');
  
  // Verificar credenciales
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    log.error('TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN son requeridos en .env.local');
    process.exit(1);
  }
  
  try {
    const client = twilio(accountSid, authToken);
    
    log.info('Conectando a Twilio...');
    
    // Obtener templates de contenido
    const contentTemplates = await client.content.v1.contents.list({
      limit: 50
    });
    
    log.success(`Encontrados ${contentTemplates.length} templates\n`);
    
    // Filtrar templates de Fini AI
    const finiTemplates = contentTemplates.filter(template => 
      template.friendlyName && 
      template.friendlyName.toLowerCase().includes('fini')
    );
    
    console.log('📋 Templates de Fini AI encontrados:\n');
    
    const templateMap = {};
    
    finiTemplates.forEach(template => {
      const name = template.friendlyName;
      const sid = template.sid;
      const status = template.approvalRequests ? 
        (template.approvalRequests.some(req => req.status === 'approved') ? 'APPROVED' : 'PENDING') : 
        'UNKNOWN';
      
      console.log(`   ${name}`);
      console.log(`   SID: ${sid}`);
      console.log(`   Status: ${status}`);
      console.log('');
      
      // Mapear por tipo de template
      if (name.toLowerCase().includes('otp') || name.toLowerCase().includes('verificacion')) {
        templateMap.OTP = sid;
      } else if (name.toLowerCase().includes('welcome') || name.toLowerCase().includes('bienvenid')) {
        templateMap.WELCOME = sid;
      } else if (name.toLowerCase().includes('analytics')) {
        templateMap.ANALYTICS = sid;
      } else if (name.toLowerCase().includes('marketing')) {
        templateMap.MARKETING = sid;
      } else if (name.toLowerCase().includes('error')) {
        templateMap.ERROR = sid;
      }
    });
    
    // Generar variables de entorno
    console.log('🔧 Variables de entorno para tu .env.local:\n');
    console.log('# WhatsApp Templates Content SIDs');
    
    if (templateMap.OTP) {
      console.log(`TWILIO_OTP_CONTENTSID=${templateMap.OTP}`);
    } else {
      log.warning('Template OTP no encontrado');
    }
    
    if (templateMap.WELCOME) {
      console.log(`TWILIO_WELCOME_CONTENTSID=${templateMap.WELCOME}`);
    } else {
      log.warning('Template WELCOME no encontrado');
    }
    
    if (templateMap.ANALYTICS) {
      console.log(`TWILIO_ANALYTICS_CONTENTSID=${templateMap.ANALYTICS}`);
    } else {
      log.warning('Template ANALYTICS no encontrado');
    }
    
    if (templateMap.MARKETING) {
      console.log(`TWILIO_MARKETING_CONTENTSID=${templateMap.MARKETING}`);
    } else {
      log.warning('Template MARKETING no encontrado');
    }
    
    if (templateMap.ERROR) {
      console.log(`TWILIO_ERROR_CONTENTSID=${templateMap.ERROR}`);
    } else {
      log.warning('Template ERROR no encontrado');
    }
    
    console.log('\n📝 Copia estas variables a tu .env.local');
    
    // Mostrar todos los templates disponibles si hay pocos matches
    if (Object.keys(templateMap).length < 3) {
      console.log('\n🔍 Todos los templates disponibles:');
      contentTemplates.forEach(template => {
        console.log(`   ${template.friendlyName}: ${template.sid}`);
      });
    }
    
  } catch (error) {
    log.error(`Error conectando a Twilio: ${error.message}`);
    
    if (error.message.includes('authenticate')) {
      log.error('Verifica tus credenciales TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN');
    }
    
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  getTwilioTemplates();
}

module.exports = { getTwilioTemplates }; 