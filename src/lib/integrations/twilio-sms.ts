/**
 * Twilio SMS Integration for OTP verification
 * Alternative to WhatsApp when business account is not available
 */

import twilio from 'twilio';

export interface TwilioSMSConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

export class TwilioSMSService {
  private client: twilio.Twilio;
  private config: TwilioSMSConfig;

  constructor(config: TwilioSMSConfig) {
    this.config = config;
    this.client = twilio(config.accountSid, config.authToken);
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, body: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      console.log('[SMS] Sending SMS to:', to);

      const message = await this.client.messages.create({
        body,
        from: this.config.phoneNumber,
        to: to
      });

      console.log('[SMS] SMS sent successfully:', message.sid);

      return {
        success: true,
        messageSid: message.sid
      };
    } catch (error) {
      console.error('[ERROR] SMS send failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send OTP verification code via SMS
   */
  async sendOTPCode(phoneNumber: string, otpCode: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const otpMessage = `🔐 Código de Verificación Fini AI

Tu código de verificación es: ${otpCode}

Por favor, ingresa este código en la aplicación para completar la configuración.

Este código expira en 10 minutos.

⚠️ No compartas este código con nadie.`;

    return this.sendSMS(phoneNumber, otpMessage);
  }

  /**
   * Send verification success message via SMS
   */
  async sendVerificationSuccessMessage(phoneNumber: string, displayName: string, storeName?: string): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const successMessage = `✅ ¡Verificación Exitosa!

¡Hola ${displayName}! Tu número ha sido verificado correctamente para ${storeName || 'tu tienda'}.

🎉 ¡Bienvenido a Fini AI!

Visita tu dashboard para comenzar a usar todas las funciones.`;

    return this.sendSMS(phoneNumber, successMessage);
  }
}

/**
 * Create Twilio SMS service instance
 */
export function createTwilioSMSService(): TwilioSMSService {
  const config: TwilioSMSConfig = {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || ""
  };

  return new TwilioSMSService(config);
} 