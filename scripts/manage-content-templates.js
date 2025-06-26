#!/usr/bin/env node

/**
 * Twilio Content Template Builder Management Script
 * Based on: https://www.twilio.com/docs/content
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

// Fini AI Template Configurations
const FINI_TEMPLATE_CONFIGS = {
  OTP_VERIFICATION: {
    friendlyName: 'fini_otp_verification_v3',
    language: 'es',
    category: 'AUTHENTICATION',
    variables: {
      '1': 'Código OTP (6 dígitos)',
      '2': 'Minutos de expiración'
    },
    content: {
      body: '🔐 *Código de Verificación Fini AI*\n\nTu código es: {{1}}\n\n⏰ Expira en {{2}} minutos.\n\n⚠️ No compartas este código.'
    }
  },
  WELCOME_MESSAGE: {
    friendlyName: 'fini_welcome_v3',
    language: 'es',
    category: 'MARKETING',
    variables: {
      '1': 'Nombre del usuario',
      '2': 'Nombre de la tienda'
    },
    content: {
      body: '¡Hola {{1}}! 👋\n\n🎉 ¡Bienvenido a Fini AI para {{2}}!\n\n🤖 Tu asistente está listo. Pregúntame:\n• 📊 "¿Cuáles fueron mis ventas?"\n• 🚀 "Dame ideas de marketing"\n• ❓ "¿Qué puedes hacer?"\n\n¡Escríbeme ahora! 📈'
    }
  },
  ANALYTICS_REPORT: {
    friendlyName: 'fini_analytics_v3',
    language: 'es',
    category: 'UTILITY',
    variables: {
      '1': 'Ventas totales',
      '2': 'Número de pedidos',
      '3': 'Nombre de la tienda'
    },
    content: {
      body: '📊 *Analytics - {{3}}*\n\n💰 Ventas: {{1}}\n📦 Pedidos: {{2}}\n\n¿Te gustaría ver más detalles?'
    }
  }
};

class ContentTemplateManager {
  constructor(accountSid, authToken) {
    this.client = twilio(accountSid, authToken);
  }

  async listTemplates() {
    try {
      log.info('Fetching all content templates...');
      const contents = await this.client.content.v1.contents.list({ limit: 50 });
      
      log.success(`Found ${contents.length} templates\n`);
      
      contents.forEach(content => {
        console.log(`📄 ${content.friendlyName || 'Unknown'}`);
        console.log(`   SID: ${content.sid}`);
        console.log(`   Language: ${content.language || 'unknown'}`);
        console.log('');
      });
      
      return contents;
    } catch (error) {
      log.error(`Failed to list templates: ${error.message}`);
      throw error;
    }
  }

  async createTemplate(templateConfig) {
    try {
      log.info(`Creating template: ${templateConfig.friendlyName}`);
      
      const content = await this.client.content.v1.contents.create({
        friendlyName: templateConfig.friendlyName,
        language: templateConfig.language,
        variables: templateConfig.variables || {},
        types: {
          'twilio/text': {
            body: templateConfig.content.body
          }
        }
      });
      
      log.success(`Template created: ${content.sid}`);
      return content;
    } catch (error) {
      log.error(`Failed to create template: ${error.message}`);
      throw error;
    }
  }

  async submitForApproval(contentSid, templateName, category) {
    try {
      log.info(`Submitting for WhatsApp approval...`);
      
      const approvalRequest = await this.client.content.v1.contents(contentSid)
        .approvalRequests.create({
          name: templateName,
          category: category,
          allowCategoryChange: false
        });
      
      log.success(`Approval request submitted: ${approvalRequest.sid}`);
      return approvalRequest;
    } catch (error) {
      log.error(`Failed to submit for approval: ${error.message}`);
      throw error;
    }
  }

  async createAllFiniTemplates() {
    log.title('Creating all Fini AI Content Templates\n');
    
    const results = {};
    let created = 0;
    let failed = 0;

    for (const [templateKey, templateConfig] of Object.entries(FINI_TEMPLATE_CONFIGS)) {
      try {
        console.log(`\n📋 Processing ${templateKey}...`);
        
        // Create content template
        const content = await this.createTemplate(templateConfig);
        results[templateKey] = { contentSid: content.sid };
        created++;

        // Submit for WhatsApp approval
        try {
          const approvalRequest = await this.submitForApproval(
            content.sid,
            templateConfig.friendlyName,
            templateConfig.category
          );
          results[templateKey].approvalSid = approvalRequest.sid;
        } catch (approvalError) {
          log.warning(`Could not submit for approval: ${approvalError.message}`);
        }

        // Wait between requests
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        log.error(`Failed to create ${templateKey}: ${error.message}`);
        results[templateKey] = { error: error.message };
        failed++;
      }
    }

    console.log('\n' + '='.repeat(50));
    log.success(`✅ Created: ${created}`);
    if (failed > 0) log.error(`❌ Failed: ${failed}`);
    
    return results;
  }

  async generateEnvVars() {
    try {
      log.info('Generating environment variables...\n');
      
      const contents = await this.client.content.v1.contents.list({ limit: 50 });
      
      const templateMapping = {
        'fini_otp_verification': 'TWILIO_OTP_CONTENTSID',
        'fini_otp': 'TWILIO_OTP_CONTENTSID',
        'copy_fini_otp': 'TWILIO_OTP_CONTENTSID',
        'fini_welcome': 'TWILIO_WELCOME_CONTENTSID',
        'es_fini_welcome': 'TWILIO_WELCOME_CONTENTSID',
        'fini_analytics': 'TWILIO_ANALYTICS_CONTENTSID',
        'es_fini_analytics': 'TWILIO_ANALYTICS_CONTENTSID',
        'fini_marketing': 'TWILIO_MARKETING_CONTENTSID',
        'es_fini_marketing': 'TWILIO_MARKETING_CONTENTSID',
        'fini_error': 'TWILIO_ERROR_CONTENTSID',
        'es_fini_error': 'TWILIO_ERROR_CONTENTSID'
      };

      console.log('# WhatsApp Content Template SIDs\n');

      contents.forEach(content => {
        const friendlyName = content.friendlyName || '';
        const baseName = friendlyName.replace(/_v\d+$/, '');
        const envVarName = templateMapping[baseName];
        
        if (envVarName) {
          console.log(`${envVarName}=${content.sid}`);
        }
      });
      
    } catch (error) {
      log.error(`Failed to generate env vars: ${error.message}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Show help without requiring credentials
  if (!command || command === 'help' || command === '--help') {
    console.log('🚀 Fini AI - Content Template Builder Manager\n');
    console.log('Based on: https://www.twilio.com/docs/content\n');
    console.log('Usage:');
    console.log('  node scripts/manage-content-templates.js list        # List all templates');
    console.log('  node scripts/manage-content-templates.js create-all  # Create all Fini templates');
    console.log('  node scripts/manage-content-templates.js env-vars    # Generate environment variables');
    console.log('  node scripts/manage-content-templates.js help       # Show this help\n');
    console.log('📋 Prerequisites:');
    console.log('  - Set TWILIO_ACCOUNT_SID in .env.local');
    console.log('  - Set TWILIO_AUTH_TOKEN in .env.local');
    console.log('  - Ensure Twilio account has WhatsApp Business API access\n');
    console.log('🎯 Features:');
    console.log('  ✅ Create message templates programmatically');
    console.log('  ✅ Submit templates for WhatsApp approval automatically');
    console.log('  ✅ Generate environment variables dynamically');
    console.log('  ✅ Maintain consistent template versioning');
    return;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || 
      accountSid.includes('your-') || authToken.includes('your-') ||
      !accountSid.startsWith('AC')) {
    log.error('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN need to be configured in .env.local');
    console.log('\n📋 Current status:');
    console.log(`   TWILIO_ACCOUNT_SID: ${accountSid || 'Not set'}`);
    console.log(`   TWILIO_AUTH_TOKEN: ${authToken ? '[SET]' : 'Not set'}`);
    console.log('\n💡 To set up:');
    console.log('  1. Get credentials from https://console.twilio.com/');
    console.log('  2. Update .env.local with real values:');
    console.log('     TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('     TWILIO_AUTH_TOKEN=your-real-auth-token');
    console.log('  3. Run this script again');
    console.log('\n🔗 Twilio Console: https://console.twilio.com/us1/account/keys-credentials/api-keys');
    process.exit(1);
  }

  const manager = new ContentTemplateManager(accountSid, authToken);

  try {
    switch (command) {
      case 'list':
        await manager.listTemplates();
        break;
      case 'create-all':
        await manager.createAllFiniTemplates();
        break;
      case 'env-vars':
        await manager.generateEnvVars();
        break;
      default:
        log.error(`Unknown command: ${command}`);
        console.log('Run "node scripts/manage-content-templates.js help" for usage info');
        process.exit(1);
        break;
    }
  } catch (error) {
    log.error(`Command failed: ${error.message}`);
    if (error.message.includes('authenticate')) {
      console.log('\n💡 Check your Twilio credentials in .env.local');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ContentTemplateManager, FINI_TEMPLATE_CONFIGS };
