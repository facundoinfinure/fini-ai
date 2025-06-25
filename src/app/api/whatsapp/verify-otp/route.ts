import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';

/**
 * Verify OTP code for WhatsApp number
 * POST /api/whatsapp/verify-otp
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Authentication check
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { whatsapp_number_id, otp_code } = body;

    if (!whatsapp_number_id || !otp_code) {
      return NextResponse.json(
        { success: false, error: 'ID de número y código OTP requeridos' },
        { status: 400 }
      );
    }

    // Get WhatsApp number and verification record
    const { data: whatsappNumber, error: fetchError } = await supabase
      .from('whatsapp_numbers')
      .select('*')
      .eq('id', whatsapp_number_id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !whatsappNumber) {
      return NextResponse.json(
        { success: false, error: 'Número de WhatsApp no encontrado' },
        { status: 404 }
      );
    }

    // Get verification record
    const { data: verification, error: verificationError } = await supabase
      .from('whatsapp_verifications')
      .select('*')
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('is_verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (verificationError || !verification) {
      return NextResponse.json(
        { success: false, error: 'Código de verificación no encontrado o expirado' },
        { status: 404 }
      );
    }

    // Check if OTP is expired
    const expiresAt = new Date(verification.expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Código de verificación expirado. Solicita uno nuevo.' },
        { status: 400 }
      );
    }

    // Check attempts limit
    if (verification.attempts >= 3) {
      return NextResponse.json(
        { success: false, error: 'Máximo número de intentos excedido. Solicita un nuevo código.' },
        { status: 400 }
      );
    }

    // Verify OTP code
    if (verification.otp_code !== otp_code) {
      // Increment attempts
      await supabase
        .from('whatsapp_verifications')
        .update({ attempts: verification.attempts + 1 })
        .eq('id', verification.id);

      const remainingAttempts = 3 - verification.attempts - 1;
      return NextResponse.json(
        { 
          success: false, 
          error: `Código incorrecto. Te quedan ${remainingAttempts} intentos.` 
        },
        { status: 400 }
      );
    }

    // Mark verification as successful
    const { error: markVerifiedError } = await supabase
      .from('whatsapp_verifications')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id);

    if (markVerifiedError) {
      console.error('[ERROR] Failed to mark verification as complete:', markVerifiedError);
      return NextResponse.json(
        { success: false, error: 'Error al completar verificación' },
        { status: 500 }
      );
    }

    // Update WhatsApp number as verified
    const { error: updateNumberError } = await supabase
      .from('whatsapp_numbers')
      .update({ 
        is_verified: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', whatsapp_number_id);

    if (updateNumberError) {
      console.error('[ERROR] Failed to mark WhatsApp number as verified:', updateNumberError);
      return NextResponse.json(
        { success: false, error: 'Error al verificar número' },
        { status: 500 }
      );
    }

    // Get store name for welcome message
    const { data: storeConnections } = await supabase
      .from('whatsapp_store_connections')
      .select(`
        stores (
          name
        )
      `)
      .eq('whatsapp_number_id', whatsapp_number_id)
      .eq('is_active', true)
      .limit(1);

    const storeName = (storeConnections?.[0]?.stores as any)?.name;

    // Send welcome message via Twilio
    const twilioService = createTwilioWhatsAppService();
    const welcomeResult = await twilioService.sendVerificationSuccessMessage(
      whatsappNumber.phone_number,
      whatsappNumber.display_name,
      storeName
    );

    if (!welcomeResult.success) {
      console.warn('[WARNING] Failed to send welcome message:', welcomeResult.error);
      // Don't fail the verification if welcome message fails
    }

    console.log('[INFO] WhatsApp number verified successfully:', whatsappNumber.phone_number);

    return NextResponse.json({
      success: true,
      data: {
        message: 'Número verificado exitosamente',
        is_verified: true,
        welcome_sent: welcomeResult.success
      }
    });

  } catch (error) {
    console.error('[ERROR] Verify OTP failed:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 