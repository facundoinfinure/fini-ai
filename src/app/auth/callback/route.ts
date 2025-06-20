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
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('[ERROR] Auth callback error:', error)
        return NextResponse.redirect(
          `${requestUrl.origin}/auth/signin?message=${encodeURIComponent('Error de autenticación. Intenta nuevamente.')}`
        )
      }
      
      console.log('[INFO] Auth callback successful')
    } catch (error) {
      console.error('[ERROR] Auth callback exception:', error)
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/signin?message=${encodeURIComponent('Error inesperado. Intenta nuevamente.')}`
      )
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
} 