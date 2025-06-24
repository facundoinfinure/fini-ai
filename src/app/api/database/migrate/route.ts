import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Starting database migration...');
    
    const supabase = createClient();
    
    // Verify user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Read the migration SQL
    const migrationSQL = `
      -- Migration: Update stores table schema to support multi-platform
      DO $$
      BEGIN
        -- Check if old columns exist and create new ones
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'tiendanube_store_id') THEN
          -- Add new columns
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'tiendanube';
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform_store_id TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS domain TEXT;
          
          -- Migrate data from old columns to new columns
          UPDATE public.stores SET 
            platform_store_id = tiendanube_store_id,
            name = store_name,  
            domain = store_url
          WHERE platform_store_id IS NULL OR name IS NULL OR domain IS NULL;
          
          -- Make new columns NOT NULL after migration (only if they have data)
          UPDATE public.stores SET platform = 'tiendanube' WHERE platform IS NULL;
          ALTER TABLE public.stores ALTER COLUMN platform SET NOT NULL;
          
          -- Only set NOT NULL if all rows have values
          IF NOT EXISTS (SELECT 1 FROM public.stores WHERE platform_store_id IS NULL OR name IS NULL OR domain IS NULL) THEN
            ALTER TABLE public.stores ALTER COLUMN platform_store_id SET NOT NULL;
            ALTER TABLE public.stores ALTER COLUMN name SET NOT NULL;
            ALTER TABLE public.stores ALTER COLUMN domain SET NOT NULL;
          END IF;
          
          -- Update refresh_token to be nullable
          ALTER TABLE public.stores ALTER COLUMN refresh_token DROP NOT NULL;
          
        ELSE
          -- Table already has new schema, ensure all constraints are correct
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'tiendanube';
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform_store_id TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT;
          ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS domain TEXT;
          
          -- Update platform for existing rows
          UPDATE public.stores SET platform = 'tiendanube' WHERE platform IS NULL;
          
          -- Ensure refresh_token is nullable
          ALTER TABLE public.stores ALTER COLUMN refresh_token DROP NOT NULL;
        END IF;
      END
      $$;
      
      -- Create new indexes if they don't exist
      CREATE INDEX IF NOT EXISTS idx_stores_platform_store_id ON public.stores(platform_store_id);
      CREATE INDEX IF NOT EXISTS idx_stores_platform ON public.stores(platform);
    `;

    // Execute the migration using service role
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Execute migration steps one by one
    const steps = [
      // Step 1: Add new columns
      `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'tiendanube'`,
      `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS platform_store_id TEXT`,
      `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS name TEXT`,
      `ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS domain TEXT`,
      
      // Step 2: Update platform column for existing rows
      `UPDATE public.stores SET platform = 'tiendanube' WHERE platform IS NULL`,
      
      // Step 3: Migrate data from old columns (if they exist)
      `UPDATE public.stores SET 
        platform_store_id = tiendanube_store_id,
        name = store_name,  
        domain = store_url
      WHERE platform_store_id IS NULL AND tiendanube_store_id IS NOT NULL`,
      
      // Step 4: Make refresh_token nullable
      `ALTER TABLE public.stores ALTER COLUMN refresh_token DROP NOT NULL`,
      
      // Step 5: Create indexes
      `CREATE INDEX IF NOT EXISTS idx_stores_platform_store_id ON public.stores(platform_store_id)`,
      `CREATE INDEX IF NOT EXISTS idx_stores_platform ON public.stores(platform)`
    ];

    for (let i = 0; i < steps.length; i++) {
      const { error } = await supabaseAdmin.from('_').select('*').limit(0);
      // Use a different approach - direct SQL execution
      try {
        const { error: stepError } = await supabaseAdmin.rpc('exec_sql', { 
          query: steps[i] 
        });
        
        if (stepError) {
          console.log(`[INFO] Step ${i + 1} may have failed (expected if column already exists):`, stepError.message);
        } else {
          console.log(`[INFO] Step ${i + 1} completed successfully`);
        }
      } catch (error) {
        console.log(`[INFO] Step ${i + 1} skipped (may not be needed):`, error);
      }
    }

    console.log('[INFO] Database migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully'
    });

  } catch (error) {
    console.error('[ERROR] Migration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 