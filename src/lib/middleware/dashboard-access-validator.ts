/**
 * 🔒 DASHBOARD ACCESS VALIDATOR
 * ============================
 * 
 * Sistema de validación completo para acceso al dashboard.
 * Verifica que usuarios tengan:
 * 1. Al menos una tienda conectada
 * 2. WhatsApp verificado 
 * 3. Suscripción activa
 * 4. Onboarding completado
 */

import { createClient } from '@/lib/supabase/server';

export interface DashboardAccessResult {
  canAccess: boolean;
  missing: string[];
  redirectTo?: string;
  details: {
    hasActiveStore: boolean;
    hasVerifiedWhatsApp: boolean;
    hasActiveSubscription: boolean;
    onboardingCompleted: boolean;
    userPlan?: 'basic' | 'pro';
    storeCount: number;
    whatsappNumbers: number;
  };
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

export interface StoreAccessSummary {
  totalStores: number;
  connectedStores: number;
  activeStores: number;
  storesWithWhatsApp: number;
  verifiedWhatsAppNumbers: number;
}

/**
 * Valida acceso completo al dashboard
 */
export async function validateDashboardAccess(userId: string): Promise<DashboardAccessResult> {
  const supabase = createClient();
  
  try {
    console.log('[DASHBOARD-ACCESS] Validating access for user:', userId);
    
    // 1. Verificar usuario y perfil
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, onboarding_completed, subscription_status, subscription_plan')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      console.log('[DASHBOARD-ACCESS] User profile not found:', userError);
      return {
        canAccess: false,
        missing: ['user_profile'],
        redirectTo: '/onboarding',
        details: {
          hasActiveStore: false,
          hasVerifiedWhatsApp: false,
          hasActiveSubscription: false,
          onboardingCompleted: false,
          storeCount: 0,
          whatsappNumbers: 0
        }
      };
    }

    // 2. Verificar stores del usuario
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select(`
        id, 
        name, 
        status, 
        access_token,
        whatsapp_numbers (
          id,
          phone_number,
          display_name,
          is_verified,
          status
        )
      `)
      .eq('user_id', userId);

    if (storesError) {
      console.error('[DASHBOARD-ACCESS] Error fetching stores:', storesError);
    }

    const storesList = stores || [];
    const connectedStores = storesList.filter(store => 
      store.access_token && store.status === 'connected'
    );
    
    // 3. Verificar números de WhatsApp
    const { data: whatsappNumbers, error: whatsappError } = await supabase
      .from('whatsapp_numbers')
      .select('id, phone_number, is_verified, status')
      .eq('user_id', userId);

    if (whatsappError) {
      console.error('[DASHBOARD-ACCESS] Error fetching WhatsApp numbers:', whatsappError);
    }

    const whatsappList = whatsappNumbers || [];
    const verifiedWhatsApp = whatsappList.filter(wp => wp.is_verified && wp.status === 'active');

    // 4. Determinar estado de acceso
    const hasActiveStore = connectedStores.length > 0;
    const hasVerifiedWhatsApp = verifiedWhatsApp.length > 0;
    const hasActiveSubscription = userProfile.subscription_status === 'active';
    const onboardingCompleted = userProfile.onboarding_completed === true;

    // 5. Determinar qué falta
    const missing: string[] = [];
    
    if (!onboardingCompleted) {
      missing.push('onboarding');
    }
    if (!hasActiveStore) {
      missing.push('store_connection');
    }
    if (!hasVerifiedWhatsApp) {
      missing.push('whatsapp_verification');
    }
    if (!hasActiveSubscription) {
      missing.push('active_subscription');
    }

    // 6. Determinar redirección apropiada
    let redirectTo: string | undefined;
    
    if (!onboardingCompleted) {
      redirectTo = '/onboarding';
    } else if (missing.length > 0) {
      // Si el onboarding está completo pero faltan otros requisitos,
      // redirigir a dashboard pero mostrar alertas específicas
      redirectTo = undefined; // Permitir acceso con alertas
    }

    const canAccess = missing.length === 0 || onboardingCompleted; // Permitir acceso si onboarding está completo

    const result: DashboardAccessResult = {
      canAccess,
      missing,
      redirectTo,
      details: {
        hasActiveStore,
        hasVerifiedWhatsApp,
        hasActiveSubscription,
        onboardingCompleted,
        userPlan: (userProfile.subscription_plan as 'basic' | 'pro') || 'basic',
        storeCount: storesList.length,
        whatsappNumbers: whatsappList.length
      },
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.full_name
      }
    };

    console.log('[DASHBOARD-ACCESS] Validation result:', {
      userId,
      canAccess,
      missing,
      storeCount: storesList.length,
      connectedStores: connectedStores.length,
      verifiedWhatsApp: verifiedWhatsApp.length,
      subscriptionStatus: userProfile.subscription_status
    });

    return result;

  } catch (error) {
    console.error('[DASHBOARD-ACCESS] Validation error:', error);
    
    return {
      canAccess: false,
      missing: ['validation_error'],
      redirectTo: '/auth/signin',
      details: {
        hasActiveStore: false,
        hasVerifiedWhatsApp: false,
        hasActiveSubscription: false,
        onboardingCompleted: false,
        storeCount: 0,
        whatsappNumbers: 0
      }
    };
  }
}

/**
 * Valida específicamente acceso a la sección de chat
 */
export async function validateChatAccess(userId: string): Promise<DashboardAccessResult> {
  const dashboardAccess = await validateDashboardAccess(userId);
  
  // Para chat se requieren TODOS los requisitos
  const canAccessChat = dashboardAccess.details.hasActiveStore && 
                       dashboardAccess.details.hasVerifiedWhatsApp && 
                       dashboardAccess.details.hasActiveSubscription &&
                       dashboardAccess.details.onboardingCompleted;
  
  return {
    ...dashboardAccess,
    canAccess: canAccessChat,
    missing: canAccessChat ? [] : dashboardAccess.missing
  };
}

/**
 * Obtiene resumen de estado de stores y WhatsApp para un usuario
 */
export async function getStoreAccessSummary(userId: string): Promise<StoreAccessSummary> {
  const supabase = createClient();
  
  try {
    // Fetch stores with WhatsApp info
    const { data: stores } = await supabase
      .from('stores')
      .select(`
        id,
        status,
        access_token,
        whatsapp_numbers (id, is_verified)
      `)
      .eq('user_id', userId);

    const storesList = stores || [];
    const connectedStores = storesList.filter(store => 
      store.access_token && store.status === 'connected'
    );
    const activeStores = storesList.filter(store => store.status === 'connected');
    
    // Count WhatsApp numbers
    const { data: whatsappNumbers } = await supabase
      .from('whatsapp_numbers')
      .select('id, is_verified')
      .eq('user_id', userId);

    const whatsappList = whatsappNumbers || [];
    const verifiedWhatsApp = whatsappList.filter(wp => wp.is_verified);
    
    // Count stores with WhatsApp
    const storesWithWhatsApp = storesList.filter(store => 
      store.whatsapp_numbers && store.whatsapp_numbers.length > 0
    );

    return {
      totalStores: storesList.length,
      connectedStores: connectedStores.length,
      activeStores: activeStores.length,
      storesWithWhatsApp: storesWithWhatsApp.length,
      verifiedWhatsAppNumbers: verifiedWhatsApp.length
    };

  } catch (error) {
    console.error('[STORE-ACCESS] Error getting summary:', error);
    return {
      totalStores: 0,
      connectedStores: 0,
      activeStores: 0,
      storesWithWhatsApp: 0,
      verifiedWhatsAppNumbers: 0
    };
  }
} 