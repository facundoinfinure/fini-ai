import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService, StoreService } from '@/lib/database/client';
// import { segmentServerAnalytics } from '@/lib/analytics';

export async function POST(_request: NextRequest) {
  try {
    console.log('[INFO] Completing user onboarding');
    
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
    console.log('[INFO] Completing onboarding for user:', userId);

    // Update user onboarding status
    const { data: user, error: updateError } = await supabase
      .from('users')
      .update({
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('[ERROR] Failed to update user onboarding status:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to complete onboarding'
      }, { status: 500 });
    }

    console.log('[INFO] User onboarding completed successfully');

    // Track onboarding completion - DISABLED TEMPORARILY FOR VERCEL BUILD
    /*
    try {
      // Get user's stores and WhatsApp status for tracking
      const storesResult = await StoreService.getStoresByUserId(userId);
      const whatsappResult = await WhatsAppConfigService.getConfigByUserId(userId);
      
      await segmentServerAnalytics.trackOnboardingCompleted(userId, {
        totalSteps: 6,
        timeSpent: 0, // Could be calculated if we track start time
        planSelected: 'free', // Default plan
        storeConnected: storesResult.success && storesResult.stores && storesResult.stores.length > 0,
        whatsappConnected: whatsappResult.success && whatsappResult.config !== null
      });
    } catch (trackingError) {
      console.error('[WARNING] Failed to track onboarding completion:', trackingError);
      // Don't fail the main request if tracking fails
    }
    */

    return NextResponse.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('[ERROR] Failed to complete onboarding:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  try {
    console.log('[INFO] Checking onboarding status');
    
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

    // Check ONLY the actual onboarding_completed flag from database
    // Do NOT infer completion from other factors like stores or profile
    let onboardingCompleted = false;
    let userProfile = null;
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, onboarding_completed')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        userProfile = userData;
        // ONLY use the explicit onboarding_completed flag
        onboardingCompleted = userData.onboarding_completed === true;
      }
    } catch (schemaError) {
      console.log('[WARNING] Schema error checking onboarding_completed, defaulting to false:', schemaError);
      
      // Fallback: Check if user exists, but default to onboarding NOT completed
      try {
        const { data: basicUser, error: basicError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .eq('id', userId)
          .single();

        if (!basicError && basicUser) {
          userProfile = basicUser;
          // Default to FALSE - user must explicitly complete onboarding
          onboardingCompleted = false;
        }
      } catch (fallbackError) {
        console.error('[ERROR] Fallback user check failed:', fallbackError);
        return NextResponse.json({
          success: false,
          error: 'Failed to get user data'
        }, { status: 500 });
      }
    }

    // Get stores for reference (but don't use for completion logic)
    const storesResult = await StoreService.getStoresByUserId(userId);
    
    if (!storesResult.success) {
      console.error('[ERROR] Failed to get stores:', storesResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get stores data'
      }, { status: 500 });
    }

    console.log('[INFO] Onboarding status determined:', {
      userId,
      onboardingCompleted,
      hasStores: !!(storesResult.stores && storesResult.stores.length > 0),
      explicitFlag: onboardingCompleted
    });

    return NextResponse.json({
      success: true,
      data: {
        completed: onboardingCompleted, // Only based on explicit flag
        user: userProfile,
        stores: storesResult.stores
      }
    });

  } catch (error) {
    console.error('[ERROR] Failed to check onboarding status:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 