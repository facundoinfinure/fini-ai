import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  // Validar variables de entorno
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log('[DEBUG] Supabase config check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length,
    keyLength: supabaseAnonKey?.length,
    urlPrefix: supabaseUrl?.substring(0, 20),
    keyPrefix: supabaseAnonKey?.substring(0, 20)
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[ERROR] Missing Supabase environment variables:', {
      url: supabaseUrl ? 'SET' : 'MISSING',
      key: supabaseAnonKey ? 'SET' : 'MISSING'
    })
    throw new Error('Supabase configuration is incomplete')
  }

  try {
    const client = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    console.log('[DEBUG] Supabase client created successfully')
    return client
  } catch (error) {
    console.error('[ERROR] Failed to create Supabase client:', error)
    throw error
  }
}

// Service client for admin operations (bypasses RLS)
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service configuration')
  }

  try {
    const client = createServerClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        cookies: {
          get() { return undefined },
          set() {},
          remove() {},
        },
      }
    )
    
    console.log('[DEBUG] Supabase service client created successfully')
    return client
  } catch (error) {
    console.error('[ERROR] Failed to create Supabase service client:', error)
    throw error
  }
} 