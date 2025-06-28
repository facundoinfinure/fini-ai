#!/usr/bin/env node

/**
 * Multi-Agent Template Management Script
 * Gestiona la creación, actualización y estado de todos los templates para el sistema multi-agente
 */

const twilio = require('twilio');
const { FINI_TEMPLATE_CONFIGS } = require('./template-configs.js');

// Configuración de Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ ERROR: Faltan variables de entorno TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorize(text, color) {
  return colors[color] + text + colors.reset;
}

// Mapeo de categorías de WhatsApp Business API para aprobación
const WHATSAPP_CATEGORIES = {
  'AUTHENTICATION': 'authentication',
  'MARKETING': 'marketing', 
  'UTILITY': 'utility'
};

/**
 * Crear Content Template en Twilio
 */
async function createContentTemplate(templateKey, config) {
  try {
    console.log(`\n📝 Creando template: ${colorize(templateKey, 'cyan')}`);
    
    const contentTemplate = await client.content.v1.contents.create({
      friendlyName: config.friendlyName,
      language: config.language,
      types: {
        'twilio/text': {
          body: config.content.body
        }
      }
    });

    console.log(`✅ Template creado: ${colorize(contentTemplate.sid, 'green')}`);
    console.log(`   Friendly Name: ${config.friendlyName}`);
    console.log(`   Language: ${config.language}`);
    console.log(`   Status: ${contentTemplate.status}`);
    
    return {
      success: true,
      contentSid: contentTemplate.sid,
      status: contentTemplate.status,
      friendlyName: config.friendlyName
    };
    
  } catch (error) {
    console.error(`❌ Error creando template ${templateKey}:`, error.message);
    return {
      success: false,
      error: error.message,
      friendlyName: config.friendlyName
    };
  }
}

/**
 * Solicitar aprobación para WhatsApp Business API
 */
async function requestWhatsAppApproval(contentSid, templateConfig) {
  try {
    console.log(`\n📱 Solicitando aprobación WhatsApp para: ${colorize(templateConfig.friendlyName, 'cyan')}`);
    
    const whatsappCategory = WHATSAPP_CATEGORIES[templateConfig.category] || 'utility';
    
    const approval = await client.content.v1.contentAndApprovals.create({
      contentSid: contentSid,
      name: templateConfig.friendlyName,
      category: whatsappCategory,
      allowCategoryChange: true
    });

    console.log(`✅ Aprobación solicitada: ${colorize(approval.sid, 'green')}`);
    console.log(`   Status: ${approval.status}`);
    console.log(`   Category: ${whatsappCategory}`);
    
    return {
      success: true,
      approvalSid: approval.sid,
      status: approval.status
    };
    
  } catch (error) {
    console.error(`❌ Error solicitando aprobación:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Verificar estado de templates existentes
 */
async function checkExistingTemplates() {
  try {
    console.log(`\n🔍 ${colorize('Verificando templates existentes...', 'yellow')}`);
    
    const contents = await client.content.v1.contents.list({ limit: 100 });
    const existingTemplates = contents.filter(content => 
      content.friendlyName.startsWith('fini_') && 
      content.friendlyName.includes('_v4')
    );
    
    console.log(`📊 Templates v4 encontrados: ${colorize(existingTemplates.length, 'cyan')}`);
    
    const templateMap = new Map();
    for (const template of existingTemplates) {
      templateMap.set(template.friendlyName, {
        sid: template.sid,
        status: template.status,
        dateCreated: template.dateCreated,
        language: template.language
      });
      
      console.log(`   ${colorize('●', 'green')} ${template.friendlyName} (${template.status})`);
    }
    
    return templateMap;
    
  } catch (error) {
    console.error(`❌ Error verificando templates existentes:`, error.message);
    return new Map();
  }
}

/**
 * Crear todos los templates multi-agente
 */
async function createAllTemplates() {
  console.log(`\n🚀 ${colorize('INICIANDO CREACIÓN DE TEMPLATES MULTI-AGENTE', 'bright')}`);
  console.log(`${colorize('=' * 60, 'blue')}`);
  
  // Verificar templates existentes
  const existingTemplates = await checkExistingTemplates();
  
  const results = {
    created: [],
    skipped: [],
    failed: [],
    approvals: []
  };
  
  // Procesar cada template
  for (const [templateKey, config] of Object.entries(FINI_TEMPLATE_CONFIGS)) {
    if (existingTemplates.has(config.friendlyName)) {
      console.log(`\n⏭️  Template ya existe: ${colorize(config.friendlyName, 'yellow')}`);
      results.skipped.push(config.friendlyName);
      continue;
    }
    
    // Crear template
    const createResult = await createContentTemplate(templateKey, config);
    
    if (createResult.success) {
      results.created.push(createResult);
      
      // Esperar un poco antes de solicitar aprobación
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Solicitar aprobación para WhatsApp
      const approvalResult = await requestWhatsAppApproval(createResult.contentSid, config);
      
      if (approvalResult.success) {
        results.approvals.push({
          templateName: config.friendlyName,
          contentSid: createResult.contentSid,
          approvalSid: approvalResult.approvalSid,
          status: approvalResult.status
        });
      }
      
    } else {
      results.failed.push(createResult);
    }
    
    // Pausa entre templates para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * Verificar estado de aprobaciones
 */
async function checkApprovalStatus() {
  try {
    console.log(`\n📱 ${colorize('Verificando estado de aprobaciones WhatsApp...', 'yellow')}`);
    
    const approvals = await client.content.v1.contentAndApprovals.list({ limit: 100 });
    const finiApprovals = approvals.filter(approval => 
      approval.name.startsWith('fini_') && 
      approval.name.includes('_v4')
    );
    
    console.log(`📊 Aprobaciones v4 encontradas: ${colorize(finiApprovals.length, 'cyan')}`);
    
    const statusCounts = { approved: 0, pending: 0, rejected: 0 };
    
    for (const approval of finiApprovals) {
      const statusColor = approval.status === 'approved' ? 'green' : 
                         approval.status === 'pending' ? 'yellow' : 'red';
      
      console.log(`   ${colorize('●', statusColor)} ${approval.name} (${approval.status})`);
      statusCounts[approval.status] = (statusCounts[approval.status] || 0) + 1;
    }
    
    console.log(`\n📈 ${colorize('Resumen de aprobaciones:', 'bright')}`);
    console.log(`   ✅ Aprobados: ${colorize(statusCounts.approved, 'green')}`);
    console.log(`   ⏳ Pendientes: ${colorize(statusCounts.pending, 'yellow')}`);
    console.log(`   ❌ Rechazados: ${colorize(statusCounts.rejected, 'red')}`);
    
    return finiApprovals;
    
  } catch (error) {
    console.error(`❌ Error verificando aprobaciones:`, error.message);
    return [];
  }
}

/**
 * Eliminar templates (útil para desarrollo)
 */
async function cleanupTemplates() {
  try {
    console.log(`\n🧹 ${colorize('Eliminando templates v4 para recrear...', 'yellow')}`);
    
    const contents = await client.content.v1.contents.list({ limit: 100 });
    const finiTemplates = contents.filter(content => 
      content.friendlyName.startsWith('fini_') && 
      content.friendlyName.includes('_v4')
    );
    
    for (const template of finiTemplates) {
      try {
        await client.content.v1.contents(template.sid).remove();
        console.log(`   ✅ Eliminado: ${template.friendlyName}`);
      } catch (error) {
        console.log(`   ❌ Error eliminando ${template.friendlyName}: ${error.message}`);
      }
      
      // Pausa para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`✅ Cleanup completado`);
    
  } catch (error) {
    console.error(`❌ Error en cleanup:`, error.message);
  }
}

/**
 * Mostrar resumen final
 */
function showSummary(results) {
  console.log(`\n${colorize('📋 RESUMEN FINAL', 'bright')}`);
  console.log(`${colorize('=' * 50, 'blue')}`);
  
  console.log(`\n✅ ${colorize('Templates creados:', 'green')} ${results.created.length}`);
  results.created.forEach(result => {
    console.log(`   ● ${result.friendlyName}`);
  });
  
  console.log(`\n⏭️  ${colorize('Templates omitidos (ya existían):', 'yellow')} ${results.skipped.length}`);
  results.skipped.forEach(name => {
    console.log(`   ● ${name}`);
  });
  
  console.log(`\n❌ ${colorize('Templates fallidos:', 'red')} ${results.failed.length}`);
  results.failed.forEach(result => {
    console.log(`   ● ${result.friendlyName}: ${result.error}`);
  });
  
  console.log(`\n📱 ${colorize('Aprobaciones solicitadas:', 'cyan')} ${results.approvals.length}`);
  results.approvals.forEach(approval => {
    console.log(`   ● ${approval.templateName} (${approval.status})`);
  });
  
  const totalTemplates = Object.keys(FINI_TEMPLATE_CONFIGS).length;
  const successRate = ((results.created.length + results.skipped.length) / totalTemplates * 100).toFixed(1);
  
  console.log(`\n📊 ${colorize('Tasa de éxito:', 'bright')} ${colorize(successRate + '%', 'green')}`);
  
  if (results.approvals.length > 0) {
    console.log(`\n💡 ${colorize('Próximos pasos:', 'yellow')}`);
    console.log(`   1. Esperar aprobación de Meta para templates de WhatsApp`);
    console.log(`   2. Verificar estado con: node scripts/manage-multi-agent-templates.js --check-approvals`);
    console.log(`   3. Actualizar variables de entorno con ContentSIDs aprobados`);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case '--check-existing':
        await checkExistingTemplates();
        break;
        
      case '--check-approvals':
        await checkApprovalStatus();
        break;
        
      case '--cleanup':
        await cleanupTemplates();
        break;
        
      case '--create':
      default:
        const results = await createAllTemplates();
        showSummary(results);
        break;
    }
    
  } catch (error) {
    console.error(`\n❌ ${colorize('Error ejecutando script:', 'red')}`, error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  createAllTemplates,
  checkExistingTemplates,
  checkApprovalStatus,
  cleanupTemplates
}; 