import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createClient()
    
    try {
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[ERROR] Auth callback error:', error)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/signin?message=${encodeURIComponent('Error de autenticación. Intenta nuevamente.')}`
        )
      }
      
      console.log('[INFO] Auth callback successful for user:', data.user?.email)

      // Ensure user profile exists in public.users
      const { id, email, user_metadata } = data.user

      // Check if user exists in public.users
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (!existingUser || userError) {
        console.log('[INFO] Creating new user profile for:', email)

        // Create the user in public.users
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id,
            email: email || '',
            name: user_metadata?.name || user_metadata?.full_name || '',
            full_name: user_metadata?.full_name || user_metadata?.name || '',
            image: user_metadata?.avatar_url || user_metadata?.picture || '',
            onboarding_completed: false,
            subscription_plan: 'basic',
            subscription_status: 'active'
          })

        if (insertError) {
          console.error('[ERROR] Failed to create user profile:', insertError)
          return NextResponse.redirect(
            `${requestUrl.origin}/auth/signin?message=${encodeURIComponent('Error creando perfil de usuario.')}`
          )
        }

        console.log('[INFO] User profile created successfully')
      } else {
        console.log('[INFO] Existing user profile found for:', email)
        
        try {
          // Check if user has completed onboarding and has stores
          const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .eq('user_id', id)
            .limit(1)

          // If user has completed onboarding AND has stores, redirect to dashboard
          if (existingUser.onboarding_completed && stores && stores.length > 0) {
            console.log('[INFO] User has completed onboarding and has stores, redirecting to dashboard')
            return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
          }
        } catch (schemaError) {
          console.log('[WARNING] Schema error checking onboarding_completed, using fallback logic:', schemaError)
          
          // Fallback: If user has stores, consider them ready for dashboard
          try {
            const { data: stores } = await supabase
              .from('stores')
              .select('id')
              .eq('user_id', id)
              .limit(1)

            if (stores && stores.length > 0) {
              console.log('[INFO] User has stores, redirecting to dashboard despite schema issues')
              return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
            }
          } catch (fallbackError) {
            console.error('[ERROR] Fallback logic failed in auth callback:', fallbackError)
            // Continue to onboarding as fallback
          }
        }
      }

      // For new users or users who haven't completed onboarding, redirect to onboarding
      console.log('[INFO] Redirecting to onboarding')
      return NextResponse.redirect(`${requestUrl.origin}/onboarding`)
      
    } catch (error) {
      console.error('[ERROR] Auth callback exception:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/signin?message=${encodeURIComponent('Error inesperado. Intenta nuevamente.')}`
      )
    }
  }

  // No code provided, redirect to sign in
  return NextResponse.redirect(`${requestUrl.origin}/auth/signin`)
} 