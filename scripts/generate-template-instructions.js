#!/usr/bin/env node

/**
 * Generador de Instruciones para Templates WhatsApp Business
 * Genera instrucciones completas para crear templates en la consola de Twilio
 */

const { FINI_TEMPLATE_CONFIGS } = require('./template-configs.js');

console.log(`
🚀 INSTRUCCIONES PARA CREAR TEMPLATES WHATSAPP BUSINESS
📱 Ve a: https://console.twilio.com/us1/develop/sms/content-manager

🎯 TOTAL DE TEMPLATES A CREAR: ${Object.keys(FINI_TEMPLATE_CONFIGS).length}

═══════════════════════════════════════════════════════════════
`);

let counter = 1;
let envVars = [];

for (const [key, config] of Object.entries(FINI_TEMPLATE_CONFIGS)) {
  console.log(`📝 TEMPLATE ${counter}/${Object.keys(FINI_TEMPLATE_CONFIGS).length}: ${config.friendlyName}`);
  console.log('─'.repeat(50));
  console.log(`🔹 Friendly Name: ${config.friendlyName}`);
  console.log(`🔹 Language: ${config.language}`);
  console.log(`🔹 Category: ${config.category}`);
  console.log(`🔹 Variables: ${Object.keys(config.variables).length}`);
  
  // Mostrar variables si existen
  if (Object.keys(config.variables).length > 0) {
    console.log(`\n📋 Variables a definir:`);
    for (const [varNum, description] of Object.entries(config.variables)) {
      console.log(`   {{${varNum}}} - ${description}`);
    }
  }
  
  console.log(`\n📄 Body Template:`);
  console.log('─'.repeat(30));
  console.log(config.content.body);
  console.log('─'.repeat(30));
  
  // Generar variable de entorno
  const envVarName = `TWILIO_${key}_CONTENTSID`;
  envVars.push(`${envVarName}=MMxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
  
  console.log(`\n✅ Después de crear, agrega esta variable a Vercel:`);
  console.log(`🔑 ${envVarName}=MMxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`);
  console.log(`\n${'═'.repeat(60)}\n`);
  
  counter++;
}

console.log(`
🎯 RESUMEN DE VARIABLES DE ENTORNO PARA VERCEL:
${'═'.repeat(60)}

Copia estas ${envVars.length} variables a tu dashboard de Vercel:

${envVars.join('\n')}

🚨 IMPORTANTE: Reemplaza "MMxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" con los Content SIDs reales

📋 PASOS FINALES:
1. ✅ Crear cada template en la consola de Twilio
2. ✅ Copiar el Content SID de cada template creado  
3. ✅ Agregar las ${envVars.length} variables a Vercel
4. ✅ Solicitar aprobación de WhatsApp Business para cada template
5. ✅ Testear el sistema multi-agente

⏱️  Tiempo estimado: 15-20 minutos para crear todos los templates

🎉 Una vez completado, tendrás el sistema multi-agente completo operativo!
`); 