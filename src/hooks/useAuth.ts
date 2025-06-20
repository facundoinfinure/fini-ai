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
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${location.origin}/auth/callback`,
        },
      })
      return { success: !error, error: error?.message }
    } catch (error) {
      return { success: false, error: 'Error inesperado' }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      })
      return { success: !error, error: error?.message }
    } catch (error) {
      return { success: false, error: 'Error inesperado' }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { success: !error, error: error?.message }
    } catch (error) {
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