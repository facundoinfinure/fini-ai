import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTwilioWhatsAppService } from '@/lib/integrations/twilio-whatsapp';

/**
 * Send OTP code to WhatsApp number for verification
 * POST /api/whatsapp/send-otp
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
    const { whatsapp_number_id } = body;

    if (!whatsapp_number_id) {
      return NextResponse.json(
        { success: false, error: 'ID de número de WhatsApp requerido' },
        { status: 400 }
      );
    }

    // Get WhatsApp number from database
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

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in database
    const { error: otpError } = await supabase
      .from('whatsapp_verifications')
      .upsert({
        whatsapp_number_id,
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

    // Send OTP via WhatsApp using templates (required for business-initiated messages)
    console.log('[INFO] Using WhatsApp templates for OTP delivery');
    console.log('[DEBUG] Twilio config check:', {
      hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
      hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
      hasPhoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      hasOtpContentSid: !!process.env.TWILIO_OTP_CONTENTSID
    });
    
    const twilioService = createTwilioWhatsAppService();
    
    try {
      const sendResult = await twilioService.sendOTPCode(whatsappNumber.phone_number, otpCode);
      
      if (!sendResult.success) {
        console.error('[ERROR] Failed to send OTP via Twilio:', sendResult.error);
        
        // Cleanup the stored OTP if send failed
        await supabase
          .from('whatsapp_verifications')
          .delete()
          .eq('whatsapp_number_id', whatsapp_number_id)
          .eq('otp_code', otpCode);
          
        return NextResponse.json(
          { success: false, error: `Error al enviar código: ${sendResult.error}` },
          { status: 500 }
        );
      }
      
      console.log('[SUCCESS] OTP sent successfully to:', whatsappNumber.phone_number);
      console.log('[SUCCESS] Twilio message SID:', sendResult.messageSid);
      
    } catch (twilioError) {
      console.error('[ERROR] Twilio service exception:', twilioError);
      
      // Cleanup the stored OTP if send failed
      await supabase
        .from('whatsapp_verifications')
        .delete()
        .eq('whatsapp_number_id', whatsapp_number_id)
        .eq('otp_code', otpCode);
        
      return NextResponse.json(
        { success: false, error: 'Error interno del servicio de mensajería' },
                 { status: 500 }
       );
     }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Código de verificación enviado',
        expires_in: 600 // 10 minutes in seconds
      }
    });

  } catch (error) {
    console.error('[ERROR] Send OTP failed:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
} 