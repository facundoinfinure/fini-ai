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
        setLoading(false)
      } catch (error) {
        console.error('[ERROR] Session error:', error)
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[INFO] Auth state changed:', event, session?.user?.email)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN') {
          router.push('/dashboard')
        } else if (event === 'SIGNED_OUT') {
          router.push('/auth/signin')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [router, supabase.auth])

  const signInWithEmail = async (email: string) => {
    try {
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
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
      const redirectTo = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
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