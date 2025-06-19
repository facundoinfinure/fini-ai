import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[WARN] Supabase URL or ANON KEY missing. Database functionality will be limited.');
}

// Client-side Supabase client
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// Server-side admin client (only for API routes)
export const supabaseAdmin = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-service-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Utility function to handle Supabase errors
 */
export function handleSupabaseError(error: any): { success: false; error: string } {
  console.error('[ERROR] Supabase operation failed:', error);
  return {
    success: false,
    error: error.message || 'Database operation failed',
  };
}

/**
 * Type-safe wrapper for Supabase operations
 */
export async function executeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T; error: any }>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const { data, error } = await queryFn();
    
    if (error) {
      return handleSupabaseError(error);
    }
    
    return { success: true, data };
  } catch (error) {
    return handleSupabaseError(error);
  }
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');
} 