/**
 * WhatsApp Configuration
 * Configuration for WhatsApp Business API integration
 */

import type { WhatsAppConfig } from './types';

export const WHATSAPP_CONFIG: WhatsAppConfig = {
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886' // Twilio Sandbox number
  },
  webhook: {
    url: process.env.WHATSAPP_WEBHOOK_URL || 'https://your-domain.com/api/whatsapp/webhook',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'fini-ai-verify-token'
  },
  features: {
    enableMediaSupport: true,
    enableLocationSupport: true,
    enableFileSupport: false, // Disable for now
    maxMessageLength: 1600,
    rateLimitPerMinute: 60
  },
  businessHours: {
    enabled: false, // Disable business hours restrictions for 24/7 AI support
    timezone: 'America/Argentina/Buenos_Aires',
    schedule: {
      monday: { open: '09:00', close: '18:00', enabled: true },
      tuesday: { open: '09:00', close: '18:00', enabled: true },
      wednesday: { open: '09:00', close: '18:00', enabled: true },
      thursday: { open: '09:00', close: '18:00', enabled: true },
      friday: { open: '09:00', close: '18:00', enabled: true },
      saturday: { open: '10:00', close: '14:00', enabled: true },
      sunday: { open: '10:00', close: '14:00', enabled: false }
    }
  }
};

// WhatsApp message templates
export const WHATSAPP_TEMPLATES = {
  welcome: {
    es: `¡Hola! 👋 Soy tu asistente de analytics de Fini AI.

Puedo ayudarte con:
📊 Analytics de ventas
🛍️ Información de productos  
👥 Atención al cliente
📈 Estrategias de marketing

¿En qué puedo ayudarte hoy?`,
    en: `Hello! 👋 I'm your Fini AI analytics assistant.

I can help you with:
📊 Sales analytics
🛍️ Product information
👥 Customer service
📈 Marketing strategies

How can I help you today?`
  },
  
  businessHours: {
    es: `Gracias por contactarnos. Nuestro horario de atención es:
Lunes a Viernes: 9:00 - 18:00
Sábados: 10:00 - 14:00

Te responderemos tan pronto como sea posible. ¡Que tengas un buen día! 🌟`,
    en: `Thank you for contacting us. Our business hours are:
Monday to Friday: 9:00 AM - 6:00 PM
Saturdays: 10:00 AM - 2:00 PM

We'll get back to you as soon as possible. Have a great day! 🌟`
  },
  
  error: {
    es: `Lo siento, experimenté un problema técnico. 😅

Por favor intenta de nuevo en unos momentos. Si el problema persiste, puedes contactar a nuestro soporte.`,
    en: `Sorry, I experienced a technical issue. 😅

Please try again in a few moments. If the problem persists, you can contact our support team.`
  },
  
  typing: {
    es: `Estoy procesando tu consulta... 🤔`,
    en: `I'm processing your query... 🤔`
  },
  
  rateLimited: {
    es: `Has enviado muchos mensajes muy rápido. Por favor espera un momento antes de enviar otro mensaje. ⏰`,
    en: `You've sent too many messages too quickly. Please wait a moment before sending another message. ⏰`
  },
  
  invalidFormat: {
    es: `No pude entender tu mensaje. ¿Podrías reformularlo?

Ejemplos de consultas válidas:
• "¿Cuánto vendí ayer?"
• "Productos más vendidos"
• "Estrategias de marketing"`,
    en: `I couldn't understand your message. Could you rephrase it?

Examples of valid queries:
• "How much did I sell yesterday?"
• "Best selling products"
• "Marketing strategies"`
  }
};

// Rate limiting configuration
export const RATE_LIMITS = {
  messagesPerMinute: 60,
  messagesPerHour: 1000,
  messagesPerDay: 10000,
  burstAllowance: 5 // Allow short bursts
};

// Webhook validation
export const WEBHOOK_CONFIG = {
  validateSignature: true,
  maxBodySize: 10 * 1024 * 1024, // 10MB
  timeoutSeconds: 30,
  retryAttempts: 3,
  retryDelayMs: 1000
};

// Phone number utilities
export const PHONE_UTILS = {
  // Common country codes for Argentina and region
  defaultCountryCode: '+54',
  supportedCountryCodes: ['+54', '+1', '+52', '+55', '+56', '+57', '+58'],
  
  formatPhoneNumber: (phone: string): string => {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = `+${cleaned}`;
    }
    
    return cleaned;
  },
  
  isValidPhoneNumber: (phone: string): boolean => {
    const cleaned = PHONE_UTILS.formatPhoneNumber(phone);
    // Basic validation: should be between 10-15 digits with country code
    return /^\+\d{10,15}$/.test(cleaned);
  },
  
  extractCountryCode: (phone: string): string => {
    const cleaned = PHONE_UTILS.formatPhoneNumber(phone);
    // Extract country code (1-4 digits after +)
    const match = cleaned.match(/^\+(\d{1,4})/);
    return match ? `+${match[1]}` : '';
  }
};

// Message processing configuration
export const MESSAGE_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  timeoutMs: 30000,
  enableConversationContext: true,
  maxConversationHistory: 50,
  conversationTimeoutHours: 24,
  enableTypingIndicator: true,
  enableReadReceipts: true
};

// Analytics and logging
export const ANALYTICS_CONFIG = {
  trackMessageMetrics: true,
  trackResponseTimes: true,
  trackAgentUsage: true,
  trackErrorRates: true,
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  enableDebugLogs: process.env.NODE_ENV === 'development'
};

// Environment validation
export function validateWhatsAppConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!WHATSAPP_CONFIG.twilio.accountSid) {
    errors.push('TWILIO_ACCOUNT_SID is required');
  }
  
  if (!WHATSAPP_CONFIG.twilio.authToken) {
    errors.push('TWILIO_AUTH_TOKEN is required');
  }
  
  if (!WHATSAPP_CONFIG.twilio.whatsappNumber) {
    errors.push('TWILIO_WHATSAPP_NUMBER is required');
  }
  
  if (!WHATSAPP_CONFIG.webhook.verifyToken) {
    errors.push('WHATSAPP_VERIFY_TOKEN is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
} 