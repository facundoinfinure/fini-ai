#!/usr/bin/env node

/**
 * 🔍 CHAT ACCESS DEBUG SCRIPT
 * ===========================
 * 
 * Diagnostica por qué el chat muestra "perfil incompleto" cuando parece estar completo
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const PRODUCTION_URL = 'https://fini-tn.vercel.app';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Service Key:', supabaseServiceKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('URL:', supabaseUrl || 'MISSING');
  console.error('Key:', supabaseServiceKey ? 'Set' : 'MISSING');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Debug del perfil de usuario específico
 */
async function debugUserProfile(email) {
  try {
    console.log(`\n🔍 DEBUGGING USER PROFILE: ${email}`);
    console.log('='.repeat(50));

    // 1. Buscar usuario por email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        full_name, 
        business_name, 
        business_type, 
        business_description,
        target_audience,
        competitors,
        onboarding_completed,
        subscription_status,
        subscription_plan,
        created_at,
        updated_at
      `)
      .eq('email', email)
      .single();

    if (userError || !user) {
      console.log('❌ Usuario no encontrado:', userError?.message);
      return;
    }

    console.log('\n📊 USER DATA:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Full Name:', user.full_name || '[MISSING]');
    console.log('Business Name:', user.business_name || '[MISSING]');
    console.log('Business Type:', user.business_type || '[MISSING]');
    console.log('Business Description:', user.business_description || '[MISSING]');
    console.log('Target Audience:', user.target_audience || '[MISSING]');
    console.log('Competitors:', user.competitors || '[MISSING]');
    console.log('Onboarding Completed:', user.onboarding_completed);
    console.log('Subscription Status:', user.subscription_status);
    console.log('Subscription Plan:', user.subscription_plan);

    // 2. Validar información personal
    const hasPersonalInfo = !!(user.full_name && user.full_name.trim());
    
    // 3. Validar información de negocio
    const hasBusinessInfo = !!(
      user.business_name && user.business_name.trim() &&
      user.business_type && user.business_type.trim() &&
      user.business_description && user.business_description.trim()
    );

    console.log('\n✅ VALIDATION RESULTS:');
    console.log('Has Personal Info:', hasPersonalInfo ? '✅' : '❌');
    console.log('Has Business Info:', hasBusinessInfo ? '✅' : '❌');
    console.log('Profile Complete:', (hasPersonalInfo && hasBusinessInfo) ? '✅' : '❌');

    // 4. Verificar tiendas del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name, status, access_token')
      .eq('user_id', user.id);

    if (storesError) {
      console.log('❌ Error fetching stores:', storesError.message);
    } else {
      console.log('\n🏪 STORES:');
      console.log('Total stores:', stores?.length || 0);
      const connectedStores = stores?.filter(s => s.status === 'connected' && s.access_token) || [];
      console.log('Connected stores:', connectedStores.length);
      
      stores?.forEach((store, i) => {
        console.log(`  ${i + 1}. ${store.name} - ${store.status} - ${store.access_token ? 'Has Token' : 'No Token'}`);
      });
    }

    // 5. Verificar números de WhatsApp
    const { data: whatsappNumbers, error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .select('id, phone_number, display_name, is_verified, status')
      .eq('user_id', user.id);

    if (whatsappError) {
      console.log('❌ Error fetching WhatsApp numbers:', whatsappError.message);
    } else {
      console.log('\n📱 WHATSAPP NUMBERS:');
      console.log('Total numbers:', whatsappNumbers?.length || 0);
      const verifiedNumbers = whatsappNumbers?.filter(w => w.is_verified) || [];
      console.log('Verified numbers:', verifiedNumbers.length);
      
      whatsappNumbers?.forEach((wp, i) => {
        console.log(`  ${i + 1}. ${wp.phone_number} (${wp.display_name}) - ${wp.is_verified ? 'Verified' : 'Not Verified'} - ${wp.status}`);
      });
    }

    // 6. Simular validación del endpoint
    console.log('\n🔄 SIMULATING VALIDATION LOGIC:');
    
    const missing = [];
    if (!hasPersonalInfo) missing.push('personal_info');
    if (!hasBusinessInfo) missing.push('business_info');
    
    const canAccess = missing.length === 0;
    
    console.log('Missing requirements:', missing.length > 0 ? missing.join(', ') : 'None');
    console.log('Can access chat:', canAccess ? '✅' : '❌');

    return user.id;

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

/**
 * Test del endpoint de validación en producción
 */
async function testValidationEndpoint(userId) {
  try {
    console.log('\n🌐 TESTING PRODUCTION ENDPOINT');
    console.log('='.repeat(50));

    // Nota: No podemos autenticarnos directamente, pero podemos hacer una prueba básica
    const response = await fetch(`${PRODUCTION_URL}/api/chat/access-validation`, {
      headers: {
        'User-Agent': 'Fini-AI-Debug/1.0'
      }
    });

    console.log('Status:', response.status);
    const text = await response.text();
    
    try {
      const data = JSON.parse(text);
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Raw response:', text);
    }

  } catch (error) {
    console.error('❌ Endpoint test failed:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  const email = process.argv[2];
  
  if (!email) {
    console.log('❌ Usage: node test-chat-access-debug.js <user-email>');
    console.log('Example: node test-chat-access-debug.js facundo@infinure.com');
    process.exit(1);
  }

  console.log('🚀 CHAT ACCESS DEBUG STARTED');
  console.log(`📧 User: ${email}`);
  
  const userId = await debugUserProfile(email);
  
  if (userId) {
    await testValidationEndpoint(userId);
  }

  console.log('\n✅ DEBUG COMPLETED');
}

// Ejecutar script
main().catch(console.error); 