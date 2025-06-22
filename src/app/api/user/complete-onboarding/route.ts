import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService, StoreService, WhatsAppConfigService, UserSettingsService } from '@/lib/database/client';

interface OnboardingData {
  storeUrl: string;
  storeName: string;
  whatsappNumber: string;
  selectedPlan: 'free' | 'pro' | 'enterprise';
}

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

export async function GET(request: NextRequest) {
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

    // Check if user has completed onboarding
    const userResult = await UserService.getUserById(userId);
    
    if (!userResult.success) {
      console.error('[ERROR] Failed to get user:', userResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get user data'
      }, { status: 500 });
    }

    // Check if user has stores
    const storesResult = await StoreService.getStoresByUserId(userId);
    
    if (!storesResult.success) {
      console.error('[ERROR] Failed to get stores:', storesResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to get stores data'
      }, { status: 500 });
    }

    const completed = userResult.user?.onboarding_completed && storesResult.stores && storesResult.stores.length > 0;

    return NextResponse.json({
      success: true,
      data: {
        completed,
        user: userResult.user,
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