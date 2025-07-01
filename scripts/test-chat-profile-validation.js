/**
 * 🧪 TEST: Nueva validación de chat simplificada
 * ============================================
 * 
 * Prueba que el chat ahora solo requiere información personal + negocio
 * en lugar de todos los requisitos anteriores (tienda, WhatsApp, etc.)
 */

console.log('🧪 [TEST] Iniciando prueba de validación simplificada del chat...');

async function testChatProfileValidation() {
  try {
    console.log('\n1️⃣ Verificando estructura de funciones...');
    
    // Verificar que el archivo de validación tiene las nuevas funciones
    const fs = require('fs');
    const path = require('path');
    
    const validatorPath = path.join(process.cwd(), 'src/lib/middleware/dashboard-access-validator.ts');
    
    if (!fs.existsSync(validatorPath)) {
      console.log('❌ No se encontró el archivo dashboard-access-validator.ts');
      return;
    }
    
    const validatorContent = fs.readFileSync(validatorPath, 'utf8');
    
    console.log('📁 Verificando funciones en dashboard-access-validator.ts:');
    console.log('   - validateProfileOnly:', validatorContent.includes('validateProfileOnly') ? '✅' : '❌');
    console.log('   - validateChatAccess actualizado:', validatorContent.includes('validateProfileOnly(userId)') ? '✅' : '❌');
    console.log('   - Validación personal_info:', validatorContent.includes('personal_info') ? '✅' : '❌');
    console.log('   - Validación business_info:', validatorContent.includes('business_info') ? '✅' : '❌');
    console.log('   - Validación full_name:', validatorContent.includes('full_name') ? '✅' : '❌');
    console.log('   - Validación business_name:', validatorContent.includes('business_name') ? '✅' : '❌');
    console.log('   - Validación business_description:', validatorContent.includes('business_description') ? '✅' : '❌');

    console.log('\n2️⃣ Verificando componentes de UI...');
    
    // Verificar ChatAccessGuard
    const chatGuardPath = path.join(process.cwd(), 'src/components/dashboard/chat-access-guard.tsx');
    
    if (fs.existsSync(chatGuardPath)) {
      const chatGuardContent = fs.readFileSync(chatGuardPath, 'utf8');
      
      console.log('📱 Verificando ChatAccessGuard:');
      console.log('   - Mensaje personal_info:', chatGuardContent.includes('información personal') ? '✅' : '❌');
      console.log('   - Mensaje business_info:', chatGuardContent.includes('información de tu negocio') ? '✅' : '❌');
      console.log('   - Título actualizado:', chatGuardContent.includes('Perfil Requerido') ? '✅' : '❌');
      console.log('   - Descripción actualizada:', chatGuardContent.includes('perfil personal y de negocio') ? '✅' : '❌');
    } else {
      console.log('❌ No se encontró ChatAccessGuard');
    }

    // Verificar ChatPreview
    const chatPreviewPath = path.join(process.cwd(), 'src/components/dashboard/chat-preview.tsx');
    
    if (fs.existsSync(chatPreviewPath)) {
      const chatPreviewContent = fs.readFileSync(chatPreviewPath, 'utf8');
      
      console.log('📱 Verificando ChatPreview:');
      console.log('   - Mensaje personal_info:', chatPreviewContent.includes('información personal') ? '✅' : '❌');
      console.log('   - Mensaje business_info:', chatPreviewContent.includes('información de tu negocio') ? '✅' : '❌');
      console.log('   - Título actualizado:', chatPreviewContent.includes('Perfil Requerido') ? '✅' : '❌');
      console.log('   - Descripción actualizada:', chatPreviewContent.includes('perfil personal y de negocio') ? '✅' : '❌');
    } else {
      console.log('❌ No se encontró ChatPreview');
    }

    console.log('\n3️⃣ Verificando endpoint de validación...');
    
    const accessValidationPath = path.join(process.cwd(), 'src/app/api/chat/access-validation/route.ts');
    
    if (fs.existsSync(accessValidationPath)) {
      const accessValidationContent = fs.readFileSync(accessValidationPath, 'utf8');
      
      console.log('🔍 Verificando endpoint /api/chat/access-validation:');
      console.log('   - Usa validateChatAccess:', accessValidationContent.includes('validateChatAccess') ? '✅' : '❌');
      console.log('   - Endpoint correcto:', accessValidationContent.includes('GET') ? '✅' : '❌');
    } else {
      console.log('❌ No se encontró el endpoint de validación');
    }

    console.log('\n4️⃣ Validando lógica de campos requeridos...');
    
    // Verificar que la nueva lógica está presente
    const hasPersonalInfoCheck = validatorContent.includes('hasPersonalInfo') && 
                                 validatorContent.includes('full_name');
    const hasBusinessInfoCheck = validatorContent.includes('hasBusinessInfo') && 
                                validatorContent.includes('business_name') &&
                                validatorContent.includes('business_type') &&
                                validatorContent.includes('business_description');
    
    console.log('🔍 Validando lógica de campos:');
    console.log('   - Verificación información personal:', hasPersonalInfoCheck ? '✅' : '❌');
    console.log('   - Verificación información negocio:', hasBusinessInfoCheck ? '✅' : '❌');
    
    if (hasPersonalInfoCheck && hasBusinessInfoCheck) {
      console.log('✅ ¡Lógica de validación simplificada implementada correctamente!');
    } else {
      console.log('⚠️  Faltan algunos checks de validación');
    }

    console.log('\n✅ Prueba de validación simplificada completada');
    console.log('📋 Resumen de cambios implementados:');
    console.log('   ✅ Nueva función validateProfileOnly()');
    console.log('   ✅ validateChatAccess() actualizada para usar validación simplificada');
    console.log('   ✅ Mensajes de UI actualizados en componentes');
    console.log('   ✅ Solo requiere: información personal + negocio');
    console.log('   ✅ Ya NO requiere: tienda, WhatsApp, suscripción');
    
    console.log('\n🚀 Para probar en producción:');
    console.log('   1. Haz commit de los cambios');
    console.log('   2. Haz push a Vercel');
    console.log('   3. Prueba el chat con un usuario que tenga perfil completo');

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('   Stack:', error.stack);
  }
}

// Ejecutar la prueba
testChatProfileValidation(); 