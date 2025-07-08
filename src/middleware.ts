import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  const { pathname } = request.nextUrl;
  
  // Skip auth for API routes and public endpoints
  if (pathname.startsWith('/api/') || 
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/public/') ||
      (!pathname.startsWith('/dashboard') && !pathname.startsWith('/onboarding'))) {
    return response;
  }

  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    // If no session exists and trying to access protected route
    if (!session || error) {
      console.log('[INFO] No valid session found, redirecting to signin');
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Check if user profile exists in public.users for protected routes
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, onboarding_completed')
          .eq('id', session.user.id)
          .single();

        // If user profile doesn't exist, allow the request to proceed
        // The page components will handle profile creation via ensure-profile endpoint
        if (!userProfile || profileError) {
          console.log('[INFO] User profile not found, but allowing request to proceed for profile creation');
          return response;
        }

        // Handle onboarding redirects for users with profiles
        if (pathname.startsWith('/dashboard')) {
          // 🎯 NEW LOGIC: Only check if user has NEVER completed onboarding
          // If they have completed onboarding before, they stay in dashboard regardless of missing configs
          if (userProfile.onboarding_completed === false || userProfile.onboarding_completed === null) {
            console.log('[INFO] User has never completed onboarding, redirecting from dashboard to onboarding');
            return NextResponse.redirect(`${request.nextUrl.origin}/onboarding`);
          } else {
            // User has completed onboarding before - let them access dashboard
            // Missing configurations (stores, whatsapp, etc.) should be handled within dashboard
            console.log('[INFO] User has completed onboarding before, allowing dashboard access');
            console.log('[INFO] Any missing configurations should be handled within dashboard, not onboarding');
            return response;
          }
        }

        // If user is trying to access onboarding
        if (pathname.startsWith('/onboarding')) {
          // 🎯 NEW LOGIC: If user has already completed onboarding, redirect to dashboard
          if (userProfile.onboarding_completed === true) {
            console.log('[INFO] User has already completed onboarding, redirecting to dashboard');
            console.log('[INFO] User should configure missing settings from dashboard, not onboarding');
            return NextResponse.redirect(`${request.nextUrl.origin}/dashboard`);
          } else {
            // User has never completed onboarding - allow onboarding access
            console.log('[INFO] User has never completed onboarding, allowing onboarding access');
            return response;
          }
        }
      } catch (schemaError) {
        console.log('[WARNING] Schema error when checking onboarding_completed, using fallback logic:', schemaError);
        
        // Fallback: Allow both dashboard and onboarding access if schema is broken
        if (pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')) {
          console.log('[INFO] Schema issues detected, allowing access to avoid blocking users');
          return response;
        }
      }
    }

    return response;
  } catch (error) {
    console.error('[ERROR] Middleware error:', error);
    // On error, allow the request to proceed
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth (auth pages)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|auth).*)',
  ],
}; 