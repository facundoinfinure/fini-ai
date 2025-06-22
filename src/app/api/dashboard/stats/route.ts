import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService, StoreService, WhatsAppConfigService } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    console.log('[INFO] Getting dashboard stats');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.error('[ERROR] No authenticated user found:', sessionError);
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    console.log('[INFO] Getting stats for user:', { userId, userEmail });

    // Get user data
    const userResult = await UserService.getUserById(userId);
    
    if (!userResult.success) {
      console.error('[ERROR] Failed to get user:', userResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get user data'
      }, { status: 500 });
    }

    // Get stores data
    const storesResult = await StoreService.getStoresByUserId(userId);
    
    if (!storesResult.success) {
      console.error('[ERROR] Failed to get stores:', storesResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get stores data'
      }, { status: 500 });
    }

    // Get WhatsApp configs
    const whatsappResult = await WhatsAppConfigService.getConfigByUserId(userId);

    // Prepare stats
    const stats = {
      user: {
        exists: !!userResult.user,
        onboardingCompleted: userResult.user?.onboarding_completed || false,
        subscriptionPlan: userResult.user?.subscription_plan || 'free',
        subscriptionStatus: userResult.user?.subscription_status || 'active'
      },
      stores: {
        count: storesResult.stores?.length || 0,
        active: storesResult.stores?.filter(s => s.is_active).length || 0,
        data: storesResult.stores || []
      },
      whatsapp: {
        configured: whatsappResult.success && !!whatsappResult.config,
        config: whatsappResult.config || null
      },
      summary: {
        hasCompletedOnboarding: userResult.user?.onboarding_completed || false,
        hasStores: (storesResult.stores?.length || 0) > 0,
        hasWhatsAppConfigured: whatsappResult.success && !!whatsappResult.config
      }
    };

    console.log('[INFO] Dashboard stats:', stats);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('[ERROR] Failed to get dashboard stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 