/**
 * 🎉 WELCOME MESSAGE SERVICE
 * =========================
 * 
 * Servicio para enviar mensajes automáticos de bienvenida
 * cuando usuarios completan el onboarding y realizan el pago
 */

import { createClient } from '@/lib/supabase/server';
// import { WhatsAppService } from '@/lib/integrations/whatsapp/twilio-service';
import { SmartTemplateService } from '@/lib/integrations/whatsapp/smart-template-service';

export interface WelcomeMessageResult {
  success: boolean;
  messageSent: boolean;
  message?: string;
  error?: string;
  templateUsed?: string;
}

export interface UserSubscriptionStatus {
  userId: string;
  planType: 'basic' | 'pro';
  subscriptionStatus: 'active' | 'inactive' | 'trialing';
  onboardingCompleted: boolean;
  welcomeMessageSent: boolean;
  stores: Array<{
    id: string;
    name: string;
    whatsappNumber?: string;
  }>;
}

/**
 * Envía mensaje de bienvenida después de completar onboarding + pago
 */
export async function sendWelcomeMessage(userId: string, subscriptionData?: {
  planType: 'basic' | 'pro';
  stripeCustomerId?: string;
  sessionId?: string;
}): Promise<WelcomeMessageResult> {
  const supabase = createClient();
  
  try {
    console.log('[WELCOME-MESSAGE] Processing welcome message for user:', userId);
    
    // 1. Verificar que el usuario existe y tiene onboarding completo
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, onboarding_completed, subscription_status, subscription_plan, welcome_message_sent')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('[WELCOME-MESSAGE] User not found:', userError);
      return {
        success: false,
        messageSent: false,
        error: 'Usuario no encontrado'
      };
    }

    // 2. Verificar si ya se envió el mensaje de bienvenida
    if (userProfile.welcome_message_sent) {
      console.log('[WELCOME-MESSAGE] Welcome message already sent for user:', userId);
      return {
        success: true,
        messageSent: false,
        message: 'Mensaje de bienvenida ya enviado previamente'
      };
    }

    // 3. Verificar que tenga onboarding completo y suscripción activa
    const hasActiveSubscription = userProfile.subscription_status === 'active';
    const onboardingCompleted = userProfile.onboarding_completed === true;

    if (!onboardingCompleted || !hasActiveSubscription) {
      console.log('[WELCOME-MESSAGE] Prerequisites not met:', {
        onboardingCompleted,
        hasActiveSubscription
      });
      return {
        success: false,
        messageSent: false,
        error: 'Onboarding no completado o suscripción no activa'
      };
    }

    // 4. Obtener stores y números de WhatsApp del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        whatsapp_numbers (
          id,
          phone_number,
          display_name,
          is_verified,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'connected');

    if (storesError || !stores || stores.length === 0) {
      console.error('[WELCOME-MESSAGE] No connected stores found:', storesError);
      return {
        success: false,
        messageSent: false,
        error: 'No se encontraron tiendas conectadas'
      };
    }

    // 5. Buscar un número de WhatsApp verificado
    let whatsappNumber: string | null = null;
    let whatsappDisplay: string | null = null;
    
    for (const store of stores) {
      if (store.whatsapp_numbers && store.whatsapp_numbers.length > 0) {
        const verifiedNumber = store.whatsapp_numbers.find(wp => 
          wp.is_verified && wp.status === 'active'
        );
        if (verifiedNumber) {
          whatsappNumber = verifiedNumber.phone_number;
          whatsappDisplay = verifiedNumber.display_name;
          break;
        }
      }
    }

    if (!whatsappNumber) {
      console.error('[WELCOME-MESSAGE] No verified WhatsApp number found');
      return {
        success: false,
        messageSent: false,
        error: 'No se encontró número de WhatsApp verificado'
      };
    }

    // 6. Preparar datos para el template
    const templateData = {
      userName: userProfile.full_name || userProfile.email.split('@')[0],
      planType: subscriptionData?.planType || userProfile.subscription_plan || 'basic',
      storeName: stores[0].name,
      storeCount: stores.length,
      whatsappNumber: whatsappDisplay || whatsappNumber
    };

    // 7. Enviar mensaje de bienvenida usando Smart Template Service
    const smartTemplateService = new SmartTemplateService();
    
    // Preparar contexto de conversación
    const context = {
      phoneNumber: whatsappNumber,
      storeId: stores[0].id,
      userId: userId
    };
    
    const templateResult = await smartTemplateService.sendProactiveNotification(
      context,
      'orchestrator',
      {
        title: `¡Bienvenido a Fini AI, ${templateData.userName}! 🎉`,
        details: `Tu plan ${templateData.planType} está activo y listo para ayudarte con analytics de ${templateData.storeName}.`,
        action: '¡Pregúntame lo que necesites!'
      }
    );

    let messageSent = false;
    let templateUsed = '';

    if (templateResult.success && templateResult.messageSid) {
      messageSent = true;
      templateUsed = 'welcome_notification';
      
      // 8. Marcar mensaje de bienvenida como enviado
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          welcome_message_sent: true,
          welcome_message_sent_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('[WELCOME-MESSAGE] Error updating welcome flag:', updateError);
      }

      console.log('[WELCOME-MESSAGE] Welcome message sent successfully:', {
        userId,
        whatsappNumber,
        templateUsed
      });

      return {
        success: true,
        messageSent: true,
        message: `Mensaje de bienvenida enviado a ${whatsappNumber}`,
        templateUsed
      };

    } else {
      console.error('[WELCOME-MESSAGE] Failed to send welcome message:', templateResult.error);
      return {
        success: false,
        messageSent: false,
        error: templateResult.error || 'Error al enviar mensaje de bienvenida'
      };
    }

  } catch (error) {
    console.error('[WELCOME-MESSAGE] Service error:', error);
    return {
      success: false,
      messageSent: false,
      error: error instanceof Error ? error.message : 'Error interno del servicio'
    };
  }
}

/**
 * Verifica el estado de suscripción y mensaje de bienvenida de un usuario
 */
export async function getUserSubscriptionStatus(userId: string): Promise<UserSubscriptionStatus | null> {
  const supabase = createClient();
  
  try {
    // Obtener perfil del usuario
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, onboarding_completed, subscription_status, subscription_plan, welcome_message_sent')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.error('[WELCOME-MESSAGE] Error fetching user profile:', userError);
      return null;
    }

    // Obtener stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        whatsapp_numbers (phone_number)
      `)
      .eq('user_id', userId);

    if (storesError) {
      console.error('[WELCOME-MESSAGE] Error fetching stores:', storesError);
    }

    const storesList = stores || [];
    const storesData = storesList.map(store => ({
      id: store.id,
      name: store.name,
      whatsappNumber: store.whatsapp_numbers?.[0]?.phone_number
    }));

    return {
      userId: userProfile.id,
      planType: (userProfile.subscription_plan as 'basic' | 'pro') || 'basic',
      subscriptionStatus: (userProfile.subscription_status as any) || 'inactive',
      onboardingCompleted: userProfile.onboarding_completed || false,
      welcomeMessageSent: userProfile.welcome_message_sent || false,
      stores: storesData
    };

  } catch (error) {
    console.error('[WELCOME-MESSAGE] Error getting subscription status:', error);
    return null;
  }
}

/**
 * Procesa automáticamente mensaje de bienvenida después de webhook de Stripe
 */
export async function processStripeWebhookWelcomeMessage(
  stripeCustomerId: string,
  subscriptionData: {
    planType: 'basic' | 'pro';
    status: 'active' | 'trialing';
    sessionId?: string;
  }
): Promise<WelcomeMessageResult> {
  const supabase = createClient();
  
  try {
    console.log('[WELCOME-MESSAGE] Processing Stripe webhook welcome message:', {
      stripeCustomerId,
      subscriptionData
    });

    // Buscar usuario por Stripe customer ID
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('stripe_customer_id', stripeCustomerId)
      .single();

    if (userError || !userProfile) {
      console.error('[WELCOME-MESSAGE] User not found for Stripe customer:', stripeCustomerId);
      return {
        success: false,
        messageSent: false,
        error: 'Usuario no encontrado para el customer de Stripe'
      };
    }

    // Enviar mensaje de bienvenida
    return await sendWelcomeMessage(userProfile.id, {
      planType: subscriptionData.planType,
      stripeCustomerId,
      sessionId: subscriptionData.sessionId
    });

  } catch (error) {
    console.error('[WELCOME-MESSAGE] Stripe webhook processing error:', error);
    return {
      success: false,
      messageSent: false,
      error: error instanceof Error ? error.message : 'Error procesando webhook de Stripe'
    };
  }
} 