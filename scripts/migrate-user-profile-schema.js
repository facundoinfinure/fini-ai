const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Migrating user profile schema...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

async function migrateSchema() {
  try {
    console.log('🔍 Checking current schema...');
    
    // First check if we can access the users table
    const { data: currentUsers, error: accessError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(1);
    
    if (accessError) {
      console.log('❌ Cannot access users table:', accessError.message);
      return;
    }
    
    console.log('✅ Users table accessible');
    
    // Try to run the SQL directly
    console.log('🔄 Adding missing columns...');
    
    const sqlCommands = [
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_name TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_type TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS business_description TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS target_audience TEXT;`,
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS competitors JSONB DEFAULT '[]'::jsonb;`,
      `UPDATE public.users SET subscription_plan = 'basic' WHERE subscription_plan = 'free';`,
      `ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_subscription_plan_check;`,
      `ALTER TABLE public.users ADD CONSTRAINT users_subscription_plan_check CHECK (subscription_plan IN ('basic', 'pro', 'enterprise'));`
    ];
    
    for (const sql of sqlCommands) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) {
          console.log(`⚠️ SQL command may have failed: ${sql.substring(0, 50)}...`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`✅ Executed: ${sql.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`⚠️ Exception for: ${sql.substring(0, 50)}...`);
      }
    }
    
    // Test the results
    console.log('🔍 Testing migration results...');
    
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email, full_name, business_name, business_type, business_description, target_audience, competitors')
      .limit(1);
      
    if (testError) {
      console.log('❌ Migration test failed:', testError.message);
      console.log('💡 Trying manual table update...');
      
      // Let's try to just execute the setup database endpoint SQL manually
      const setupSQL = `
        CREATE TABLE IF NOT EXISTS public.users_new (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          email TEXT UNIQUE NOT NULL,
          name TEXT,
          full_name TEXT,
          image TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          onboarding_completed BOOLEAN DEFAULT FALSE,
          subscription_plan TEXT DEFAULT 'basic' CHECK (subscription_plan IN ('basic', 'pro', 'enterprise')),
          subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled')),
          business_name TEXT,
          business_type TEXT,
          business_description TEXT,
          target_audience TEXT,
          competitors JSONB DEFAULT '[]'::jsonb
        );
        
        INSERT INTO public.users_new (id, email, name, image, created_at, updated_at, onboarding_completed, subscription_plan, subscription_status)
        SELECT id, email, name, image, created_at, updated_at, onboarding_completed, 
               CASE WHEN subscription_plan = 'free' THEN 'basic' ELSE subscription_plan END,
               subscription_status 
        FROM public.users
        ON CONFLICT (id) DO NOTHING;
        
        DROP TABLE IF EXISTS public.users_old;
        ALTER TABLE public.users RENAME TO users_old;
        ALTER TABLE public.users_new RENAME TO users;
      `;
      
      console.log('🔄 Trying complete table recreation...');
      
      const { error: recreateError } = await supabase.rpc('exec_sql', { query: setupSQL });
      
      if (recreateError) {
        console.log('❌ Table recreation failed:', recreateError.message);
      } else {
        console.log('✅ Table recreation completed');
      }
      
    } else {
      console.log('✅ Migration completed successfully!');
      console.log('📊 Available profile fields:', Object.keys(testData[0] || {}));
    }
    
  } catch (error) {
    console.log('❌ Migration error:', error.message);
  }
}

migrateSchema(); 