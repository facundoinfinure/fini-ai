import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserService, StoreService, WhatsAppConfigService, UserSettingsService } from '@/lib/database/client';

interface OnboardingData {
  storeUrl: string;
  storeName: string;
  whatsappNumber: string;
  selectedPlan: 'free' | 'pro' | 'enterprise';
}

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Processing onboarding completion request');
    
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
    const userName = session.user.user_metadata?.name || session.user.user_metadata?.full_name;

    console.log('[INFO] Processing onboarding for user:', { userId, userEmail, userName });

    // Parse request body
    const body: OnboardingData = await request.json();
    const { storeUrl, storeName, whatsappNumber, selectedPlan } = body;

    // Validate required fields
    if (!storeUrl || !storeName || !whatsappNumber) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: storeUrl, storeName, whatsappNumber'
      }, { status: 400 });
    }

    // 1. Check if user exists in public.users table, if not create it
    console.log('[INFO] Checking/creating user profile');
    let userResult = await UserService.getUserById(userId);
    
    if (!userResult.success || !userResult.user) {
      // User doesn't exist in public.users table, create it manually
      console.log('[INFO] User not found in public.users, creating manually');
      userResult = await UserService.createUser({
        id: userId,
        email: userEmail!,
        name: userName,
        image: session.user.user_metadata?.avatar_url,
        onboarding_completed: true,
        subscription_plan: selectedPlan,
        subscription_status: 'active'
      });

      if (!userResult.success) {
        console.error('[ERROR] Failed to create user profile:', userResult.error);
        return NextResponse.json({
          success: false,
          error: 'Failed to create user profile',
          details: userResult.error
        }, { status: 500 });
      }
    } else {
      // User exists, update it
      console.log('[INFO] User exists, updating profile');
      userResult = await UserService.updateUser(userId, {
        onboarding_completed: true,
        subscription_plan: selectedPlan,
        subscription_status: 'active'
      });

      if (!userResult.success) {
        console.error('[ERROR] Failed to update user profile:', userResult.error);
        return NextResponse.json({
          success: false,
          error: 'Failed to update user profile',
          details: userResult.error
        }, { status: 500 });
      }
    }

    // 2. Create store record
    console.log('[INFO] Creating store record');
    const storeResult = await StoreService.createStore({
      user_id: userId,
      tiendanube_store_id: `store_${Date.now()}`, // Placeholder - will be updated with real Tienda Nube integration
      store_name: storeName,
      store_url: storeUrl,
      access_token: 'placeholder_token', // Will be updated with real OAuth flow
      refresh_token: 'placeholder_refresh_token',
      token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      is_active: true,
      last_sync_at: new Date().toISOString()
    });

    if (!storeResult.success) {
      console.error('[ERROR] Failed to create store:', storeResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create store',
        details: storeResult.error
      }, { status: 500 });
    }

    // 3. Create WhatsApp configuration
    console.log('[INFO] Creating WhatsApp configuration');
    const whatsappResult = await WhatsAppConfigService.createConfig({
      user_id: userId,
      store_id: storeResult.store!.id,
      phone_numbers: [whatsappNumber],
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/whatsapp/webhook`,
      twilio_account_sid: process.env.TWILIO_ACCOUNT_SID || null,
      twilio_auth_token: process.env.TWILIO_AUTH_TOKEN || null,
      twilio_phone_number: process.env.TWILIO_PHONE_NUMBER || null,
      is_active: true,
      is_configured: true
    });

    if (!whatsappResult.success) {
      console.error('[ERROR] Failed to create WhatsApp config:', whatsappResult.error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create WhatsApp configuration',
        details: whatsappResult.error
      }, { status: 500 });
    }

    // 4. Create user settings
    console.log('[INFO] Creating user settings');
    const settingsResult = await UserSettingsService.updateSettings(userId, {
      language: 'es',
      timezone: 'America/Argentina/Buenos_Aires',
      notifications_enabled: true,
      email_notifications: true,
      whatsapp_notifications: true,
      theme: 'light'
    });

    if (!settingsResult.success) {
      console.error('[ERROR] Failed to create user settings:', settingsResult.error);
      // Don't fail the entire onboarding for settings
    }

    console.log('[INFO] Onboarding completed successfully for user:', userId);

    return NextResponse.json({
      success: true,
      data: {
        user: userResult.user,
        store: storeResult.store,
        whatsappConfig: whatsappResult.config,
        settings: settingsResult.settings
      },
      message: 'Onboarding completed successfully'
    });

  } catch (error) {
    console.error('[ERROR] Onboarding completion failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
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