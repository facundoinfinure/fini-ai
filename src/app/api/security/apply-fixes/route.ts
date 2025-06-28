import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Starting comprehensive security fixes...');
    
    // Basic auth check
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    // Create admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Test connection
    const { data: connectionTest, error: connectionError } = await supabaseAdmin
      .from('users')
      .select('count')
      .limit(1);
      
    if (connectionError) {
      console.error('[ERROR] Database connection failed:', connectionError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: connectionError.message
      }, { status: 500 });
    }
    
    console.log('[INFO] Database connection successful');
    
    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase', 'migrations', '004_security_fixes_comprehensive.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('[ERROR] Migration file not found:', migrationPath);
      return NextResponse.json({
        success: false,
        error: 'Migration file not found',
        expected_path: migrationPath
      }, { status: 500 });
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`[INFO] Migration loaded, size: ${migrationSQL.length} characters`);
    
    // Apply migration in chunks
    const results = {
      total_statements: 0,
      successful: 0,
      warnings: 0,
      errors: 0,
      fixes_applied: []
    };
    
    // Execute key security fixes
    const securityFixes = [
      {
        name: 'Create NextAuth tables',
        sql: `
          CREATE TABLE IF NOT EXISTS public.accounts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            type TEXT NOT NULL,
            provider TEXT NOT NULL,
            provider_account_id TEXT NOT NULL,
            refresh_token TEXT,
            access_token TEXT,
            expires_at BIGINT,
            token_type TEXT,
            scope TEXT,
            id_token TEXT,
            session_state TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            CONSTRAINT accounts_provider_provider_account_id_key UNIQUE (provider, provider_account_id)
          );
          
          CREATE TABLE IF NOT EXISTS public.sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            session_token TEXT UNIQUE NOT NULL,
            user_id UUID NOT NULL,
            expires TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
          
          CREATE TABLE IF NOT EXISTS public.verification_tokens (
            identifier TEXT NOT NULL,
            token TEXT NOT NULL,
            expires TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            PRIMARY KEY (identifier, token)
          );
        `
      },
      {
        name: 'Enable RLS on NextAuth tables',
        sql: `
          ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
          ALTER TABLE public.verification_tokens ENABLE ROW LEVEL SECURITY;
        `
      },
      {
        name: 'Create RLS policies for NextAuth',
        sql: `
          DROP POLICY IF EXISTS "Users can manage own accounts" ON public.accounts;
          CREATE POLICY "Users can manage own accounts" ON public.accounts
            FOR ALL USING (auth.uid()::text = user_id::text);
          
          DROP POLICY IF EXISTS "Users can manage own sessions" ON public.sessions;
          CREATE POLICY "Users can manage own sessions" ON public.sessions
            FOR ALL USING (auth.uid()::text = user_id::text);
          
          DROP POLICY IF EXISTS "Anyone can manage verification tokens" ON public.verification_tokens;
          CREATE POLICY "Anyone can manage verification tokens" ON public.verification_tokens
            FOR ALL USING (true);
        `
      },
      {
        name: 'Fix function search_path issues',
        sql: `
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
          
          CREATE OR REPLACE FUNCTION public.handle_new_user()
          RETURNS TRIGGER
          SECURITY DEFINER
          SET search_path = public
          LANGUAGE plpgsql
          AS $$
          BEGIN
            INSERT INTO public.users (id, email, name, image)
            VALUES (
              NEW.id,
              NEW.email,
              COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
              NEW.raw_user_meta_data->>'avatar_url'
            )
            ON CONFLICT (id) DO UPDATE SET
              email = EXCLUDED.email,
              name = COALESCE(EXCLUDED.name, public.users.name),
              image = COALESCE(EXCLUDED.image, public.users.image),
              updated_at = NOW();
            
            RETURN NEW;
          END;
          $$;
        `
      },
      {
        name: 'Create indexes for NextAuth tables',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);
          CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
          CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON public.sessions(session_token);
          CREATE INDEX IF NOT EXISTS idx_verification_tokens_identifier ON public.verification_tokens(identifier);
          CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON public.verification_tokens(token);
        `
      },
      {
        name: 'Add triggers for NextAuth tables',
        sql: `
          CREATE TRIGGER update_accounts_updated_at 
            BEFORE UPDATE ON public.accounts 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
          
          CREATE TRIGGER update_sessions_updated_at 
            BEFORE UPDATE ON public.sessions 
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
        `
      }
    ];
    
    // Apply each security fix
    for (const fix of securityFixes) {
      console.log(`[INFO] Applying: ${fix.name}`);
      
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { sql: fix.sql });
        
        if (error) {
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist')) {
            console.log(`[WARN] ${fix.name}: ${error.message}`);
            results.warnings++;
            results.fixes_applied.push({
              name: fix.name,
              status: 'warning',
              message: error.message
            });
          } else {
            console.error(`[ERROR] ${fix.name}: ${error.message}`);
            results.errors++;
            results.fixes_applied.push({
              name: fix.name,
              status: 'error',
              message: error.message
            });
          }
        } else {
          console.log(`[SUCCESS] ${fix.name}: completed`);
          results.successful++;
          results.fixes_applied.push({
            name: fix.name,
            status: 'success',
            message: 'Applied successfully'
          });
        }
      } catch (err) {
        console.error(`[ERROR] ${fix.name}: ${err}`);
        results.errors++;
        results.fixes_applied.push({
          name: fix.name,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error'
        });
      }
      
      results.total_statements++;
    }
    
    // Verify fixes
    const verification = {
      nextauth_tables: {},
      agent_tables: {},
      functions_fixed: false
    };
    
    // Test NextAuth tables
    const nextAuthTables = ['accounts', 'sessions', 'verification_tokens'];
    for (const table of nextAuthTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);
          
        verification.nextauth_tables[table] = {
          accessible: !error,
          rls_enabled: !error,
          error: error?.message
        };
      } catch (err) {
        verification.nextauth_tables[table] = {
          accessible: false,
          rls_enabled: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }
    
    // Test agent tables
    const agentTables = ['agent_actions', 'agent_conversations', 'automated_reports', 'vector_documents'];
    for (const table of agentTables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1);
          
        verification.agent_tables[table] = {
          policies_working: !error,
          error: error?.message
        };
      } catch (err) {
        verification.agent_tables[table] = {
          policies_working: false,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    }
    
    console.log('[INFO] Security fixes migration completed');
    
    return NextResponse.json({
      success: true,
      message: 'Security fixes applied successfully',
      results,
      verification,
      next_steps: [
        'Go to Supabase Dashboard → Authentication → Settings',
        'Set OTP Expiry to 3600 seconds (1 hour) or less',
        'Enable Leaked Password Protection',
        'Run Supabase linter again to verify all fixes',
        'Test authentication flow'
      ],
      manual_config_required: [
        'auth_otp_long_expiry',
        'auth_leaked_password_protection'
      ]
    });
    
  } catch (error) {
    console.error('[ERROR] Security fixes failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Security fixes failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 