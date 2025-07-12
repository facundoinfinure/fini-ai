import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[ERROR] Failed to get session:', error)
        }
        setUser(session?.user ?? null)
        
        // For existing sessions, just ensure profile exists without creating
        if (session?.user) {
          console.log('[INFO] Existing session found for user:', session.user.email)
          // The auth callback handles profile creation, so we just verify here
          await ensureUserProfile()
          // Initialize auto-sync for existing user
          await initializeAutoSyncForUser(session.user.id)
        }
        
        setLoading(false)
      } catch (error) {
        console.error('[ERROR] Session error:', error)
        setLoading(false)
      }
    }

    const ensureUserProfile = async () => {
      try {
        const response = await fetch('/api/user/ensure-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          console.error('[ERROR] Failed to verify user profile:', response.statusText)
          // Don't throw error, just log it
          return
        }
        
        const result = await response.json()
        if (result.success) {
          console.log('[INFO] User profile verified:', result.created ? 'created' : 'exists')
        } else {
          console.error('[ERROR] Failed to verify user profile:', result.error)
        }
      } catch (error) {
        console.error('[ERROR] Exception verifying user profile:', error)
        // Don't throw error, just log it
      }
    }

    const initializeAutoSyncForUser = async (userId: string) => {
      try {
        console.log('[INFO] Auto-sync is now immediate - no initialization needed for user:', userId)
        // 🔥 NEW: Auto-sync is now immediate when stores are connected/reconnected
        // No need for separate initialization as SimpleStoreSync handles everything
      } catch (error) {
        console.error('[ERROR] Exception in auto-sync check:', error)
        // Don't throw error, just log it
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[INFO] Auth state changed:', event, session?.user?.email)
        setUser(session?.user ?? null)
        setLoading(false)

        // Profile creation is handled in auth callback for OAuth flows
        // For email/magic link flows, we still need to handle it here
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[INFO] User signed in, verifying profile exists')
          await ensureUserProfile()
          // Initialize auto-sync for new user session
          await initializeAutoSyncForUser(session.user.id)
        }

        // Only redirect on sign out, let individual pages handle sign in redirects
        if (event === 'SIGNED_OUT') {
          router.push('/auth/signin')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const getRedirectUrl = () => {
    let url =
      process?.env?.NEXT_PUBLIC_APP_URL ?? // Set this to your site URL in production env.
      process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000/')
    // Make sure to include `https://` when not localhost.
    url = url.includes('http') ? url : `https://${url}`
    // Make sure to include a trailing `/`.
    url = url.charAt(url.length - 1) === '/' ? url : `${url}/`
    return `${url}auth/callback`
  }

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      })
      
      if (error) {
        console.error('[ERROR] Email sign in error:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, error: null }
    } catch (error) {
      console.error('[ERROR] Email sign in exception:', error)
      return { success: false, error: 'Error inesperado' }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
        },
      })
      
      if (error) {
        console.error('[ERROR] Google sign in error:', error)
        return { success: false, error: error.message }
      }
      
      return { success: true, error: null }
    } catch (error) {
      console.error('[ERROR] Google sign in exception:', error)
      return { success: false, error: 'Error inesperado' }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('[ERROR] Sign out error:', error)
        return { success: false, error: error.message }
      }
      return { success: true, error: null }
    } catch (error) {
      console.error('[ERROR] Sign out exception:', error)
      return { success: false, error: 'Error inesperado' }
    }
  }

  return {
    user,
    loading,
    signInWithEmail,
    signInWithGoogle,
    signOut,
  }
} 