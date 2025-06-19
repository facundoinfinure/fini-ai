-- ================================================
-- NEXTAUTH.JS TABLES FOR SUPABASE ADAPTER
-- ================================================
-- Required tables for NextAuth.js Supabase adapter
-- Based on: https://next-auth.js.org/adapters/supabase

-- ================================================
-- ACCOUNTS TABLE (OAuth Providers)
-- ================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  provider_account_id VARCHAR NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  id_token TEXT,
  scope TEXT,
  session_state TEXT,
  token_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- ================================================
-- SESSIONS TABLE (User Sessions)
-- ================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token VARCHAR NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================
-- VERIFICATION TOKENS TABLE (Magic Links)
-- ================================================
CREATE TABLE verification_tokens (
  identifier VARCHAR NOT NULL,
  token VARCHAR NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (identifier, token)
);

-- ================================================
-- INDEXES FOR NEXTAUTH TABLES
-- ================================================

-- Accounts indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider ON accounts(provider);
CREATE INDEX idx_accounts_provider_account_id ON accounts(provider_account_id);

-- Sessions indexes
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires ON sessions(expires);

-- Verification tokens indexes
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX idx_verification_tokens_expires ON verification_tokens(expires);

-- ================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on NextAuth tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Accounts RLS policies
CREATE POLICY "accounts_policy" ON accounts FOR ALL USING (true);

-- Sessions RLS policies  
CREATE POLICY "sessions_policy" ON sessions FOR ALL USING (true);

-- Verification tokens RLS policies
CREATE POLICY "verification_tokens_policy" ON verification_tokens FOR ALL USING (true);

-- ================================================
-- UPDATE TRIGGERS
-- ================================================

-- Add update triggers for accounts and sessions
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- GRANTS (Service Role Permissions)
-- ================================================

-- Grant necessary permissions to service role for NextAuth operations
GRANT ALL ON accounts TO service_role;
GRANT ALL ON sessions TO service_role;
GRANT ALL ON verification_tokens TO service_role;

-- Grant usage on sequences if any
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role; 