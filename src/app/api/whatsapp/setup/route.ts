import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';

export const dynamic = 'force-dynamic';

/**
 * Setup WhatsApp number for onboarding
 * POST /api/whatsapp/setup
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authentication check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] No authenticated user found:', userError);
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { phoneNumber } = body;

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Número de teléfono requerido' },
        { status: 400 }
      );
    }

    console.log('[INFO] Setting up WhatsApp for onboarding with number:', phoneNumber);

    // Get user's store(s) - use the first active store for onboarding
    const { data: stores, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (storeError || !stores || stores.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontró ninguna tienda activa' },
        { status: 400 }
      );
    }

    const store = stores[0]; // Use first store for onboarding

    // Check if number already exists for this user
    const { data: existingNumber } = await supabase
      .from('whatsapp_numbers')
      .select('id, is_verified')
      .eq('phone_number', phoneNumber)
      .eq('user_id', user.id)
      .single();

    let whatsappNumberId: string;

    if (existingNumber) {
      // Update existing number
      whatsappNumberId = existingNumber.id;
      console.log('[INFO] Updating existing WhatsApp number:', whatsappNumberId);
      
      // Reset verification status
      await supabase
        .from('whatsapp_numbers')
        .update({
          display_name: `Mi Tienda ${store.name}`,
          is_verified: false,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', whatsappNumberId);
    } else {
      // Create new WhatsApp number
      const { data: newNumber, error: createError } = await supabase
        .from('whatsapp_numbers')
        .insert({
          user_id: user.id,
          phone_number: phoneNumber,
          display_name: `Mi Tienda ${store.name}`,
          is_verified: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[ERROR] Failed to create WhatsApp number:', createError);
        return NextResponse.json(
          { success: false, error: 'Error al crear número de WhatsApp' },
          { status: 500 }
        );
      }

      whatsappNumberId = newNumber.id;
      console.log('[INFO] Created new WhatsApp number:', whatsappNumberId);
    }

    // Connect to store if not already connected
    const { data: existingConnection } = await supabase
      .from('whatsapp_store_connections')
      .select('id')
      .eq('whatsapp_number_id', whatsappNumberId)
      .eq('store_id', store.id)
      .single();

    if (!existingConnection) {
      await supabase
        .from('whatsapp_store_connections')
        .insert({
          whatsapp_number_id: whatsappNumberId,
          store_id: store.id,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      console.log('[INFO] Connected WhatsApp number to store:', store.id);
    }

    // Generate and send OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('whatsapp_verifications')
      .upsert({
        whatsapp_number_id: whatsappNumberId,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        attempts: 0,
        is_verified: false,
        created_at: new Date().toISOString()
      });

    if (otpError) {
      console.error('[ERROR] Failed to store OTP:', otpError);
      return NextResponse.json(
        { success: false, error: 'Error al generar código de verificación' },
        { status: 500 }
      );
    }

    // Send OTP via WhatsApp
    const twilioService = createTwilioWhatsAppService();
    
    try {
      const sendResult = await twilioService.sendOTPCode(phoneNumber, otpCode);
      
      if (!sendResult.success) {
        console.error('[ERROR] Failed to send OTP via Twilio:', sendResult.error);
        
        // Cleanup the stored OTP if send failed
        await supabase
          .from('whatsapp_verifications')
          .delete()
          .eq('whatsapp_number_id', whatsappNumberId)
          .eq('otp_code', otpCode);
          
        return NextResponse.json(
          { success: false, error: `Error al enviar código de verificación: ${sendResult.error}` },
          { status: 500 }
        );
      }
      
      console.log('[SUCCESS] OTP sent successfully to:', phoneNumber);
      
    } catch (twilioError) {
      console.error('[ERROR] Twilio service exception:', twilioError);
      
      // Cleanup the stored OTP if send failed
      await supabase
        .from('whatsapp_verifications')
        .delete()
        .eq('whatsapp_number_id', whatsappNumberId)
        .eq('otp_code', otpCode);
        
      return NextResponse.json(
        { success: false, error: 'Error interno del servicio de mensajería' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'WhatsApp configurado. Código de verificación enviado.',
        whatsapp_number_id: whatsappNumberId,
        expires_in: 600, // 10 minutes in seconds
        phone_number: phoneNumber
      }
    });

  } catch (error) {
    console.error('[ERROR] WhatsApp setup failed:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 