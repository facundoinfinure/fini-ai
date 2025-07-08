import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG-AUTH] Checking authentication status');
    
    const supabase = createClient();
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('[DEBUG-AUTH] Session check result:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      sessionError: sessionError?.message,
      accessToken: session?.access_token ? 'EXISTS' : 'MISSING'
    });
    
    // Get user profile if session exists
    let userProfile = null;
    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      console.log('[DEBUG-AUTH] Profile check result:', {
        hasProfile: !!profile,
        profileError: profileError?.message,
        onboardingCompleted: profile?.onboarding_completed
      });
      
      userProfile = profile;
    }
    
    // Check cookies manually
    const cookies = request.headers.get('cookie') || '';
    const hasCookies = cookies.length > 0;
    const cookieNames = cookies.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
    
    console.log('[DEBUG-AUTH] Cookie analysis:', {
      hasCookies,
      cookieCount: cookieNames.length,
      cookieNames: cookieNames.slice(0, 5), // First 5 to avoid logging sensitive data
      hasSupabaseCookies: cookieNames.some(name => name.includes('supabase'))
    });
    
    return NextResponse.json({
      success: true,
      data: {
        authenticated: !!session?.user,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
        hasProfile: !!userProfile,
        onboardingCompleted: userProfile?.onboarding_completed,
        sessionExists: !!session,
        accessTokenExists: !!session?.access_token,
        cookieAnalysis: {
          hasCookies,
          cookieCount: cookieNames.length,
          hasSupabaseCookies: cookieNames.some(name => name.includes('supabase'))
        }
      }
    });
    
  } catch (error) {
    console.error('[DEBUG-AUTH] Error checking auth status:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {
        authenticated: false,
        userId: null,
        userEmail: null,
        hasProfile: false,
        onboardingCompleted: false,
        sessionExists: false,
        accessTokenExists: false
      }
    });
  }
} 