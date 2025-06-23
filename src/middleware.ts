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
  
  // Skip auth check for auth routes, API routes, static files, and public pages
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/' ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy')
  ) {
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
        // Check if user has stores
        const { data: stores } = await supabase
          .from('stores')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1);

        // Log user dashboard access info
        console.log('[INFO] User accessing dashboard with profile:', {
          onboarding_completed: userProfile.onboarding_completed,
          has_stores: stores && stores.length > 0
        });
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 