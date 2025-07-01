const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Fixing user profile updated_at column issue...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function fixUpdatedAtColumn() {
  try {
    console.log('🔍 Checking users table schema...');
    
    console.log('🔄 Ensuring updated_at column and trigger exist...');
    
    const fixSQL = `
      -- Add updated_at column if it doesn't exist
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE public.users 
          ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
          RAISE NOTICE 'Added updated_at column to users table';
        ELSE
          RAISE NOTICE 'updated_at column already exists';
        END IF;
      END $$;

      -- Ensure the trigger function exists
      CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER
      SECURITY DEFINER
      SET search_path = public
      LANGUAGE plpgsql
      AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$;

      -- Drop and recreate the trigger to ensure it works
      DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
      CREATE TRIGGER update_users_updated_at 
        BEFORE UPDATE ON public.users 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();

      -- Update existing rows without updated_at
      UPDATE public.users 
      SET updated_at = created_at 
      WHERE updated_at IS NULL;

      -- Add missing profile columns while we're at it
      DO $$
      BEGIN
        -- Add profile columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'full_name') THEN
          ALTER TABLE public.users ADD COLUMN full_name TEXT;
          RAISE NOTICE 'Added full_name column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_name') THEN
          ALTER TABLE public.users ADD COLUMN business_name TEXT;
          RAISE NOTICE 'Added business_name column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_type') THEN
          ALTER TABLE public.users ADD COLUMN business_type TEXT;
          RAISE NOTICE 'Added business_type column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'business_description') THEN
          ALTER TABLE public.users ADD COLUMN business_description TEXT;
          RAISE NOTICE 'Added business_description column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'target_audience') THEN
          ALTER TABLE public.users ADD COLUMN target_audience TEXT;
          RAISE NOTICE 'Added target_audience column';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'competitors') THEN
          ALTER TABLE public.users ADD COLUMN competitors JSONB DEFAULT '[]'::jsonb;
          RAISE NOTICE 'Added competitors column';
        END IF;
      END $$;
    `;

    const { error: fixError } = await supabase.rpc('exec_sql', { sql: fixSQL });

    if (fixError) {
      console.log('❌ Error applying fix:', fixError.message);
      return;
    }

    console.log('✅ Successfully fixed updated_at column and trigger');

    // Test the fix
    console.log('🧪 Testing the fix...');
    
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email, updated_at, full_name, business_name')
      .limit(1);

    if (testError) {
      console.log('❌ Test failed:', testError.message);
    } else {
      console.log('✅ Test successful - users table accessible with updated_at column');
      if (testData && testData.length > 0) {
        console.log('📊 Sample columns available:', Object.keys(testData[0]));
      }
    }

  } catch (error) {
    console.log('❌ Fix error:', error.message);
  }
}

fixUpdatedAtColumn(); 