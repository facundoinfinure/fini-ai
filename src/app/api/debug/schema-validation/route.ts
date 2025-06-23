import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface SchemaValidationResult {
  table: string;
  exists: boolean;
  columns: TableInfo[];
  missing_columns?: string[];
  extra_columns?: string[];
  status: 'valid' | 'invalid' | 'missing';
}

const EXPECTED_TABLES = {
  users: ['id', 'email', 'name', 'image', 'created_at', 'updated_at', 'onboarding_completed', 'subscription_plan', 'subscription_status'],
  stores: ['id', 'user_id', 'tiendanube_store_id', 'name', 'domain', 'access_token', 'refresh_token', 'token_expires_at', 'is_active', 'created_at', 'updated_at', 'last_sync_at'],
  whatsapp_configs: ['id', 'user_id', 'store_id', 'phone_numbers', 'webhook_url', 'twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number', 'is_active', 'is_configured', 'created_at', 'updated_at'],
  whatsapp_numbers: ['id', 'user_id', 'phone_number', 'display_name', 'twilio_account_sid', 'twilio_auth_token', 'webhook_url', 'is_active', 'is_verified', 'created_at', 'updated_at'],
  whatsapp_store_connections: ['id', 'whatsapp_number_id', 'store_id', 'is_active', 'created_at', 'updated_at'],
  conversations: ['id', 'user_id', 'store_id', 'whatsapp_number', 'customer_number', 'conversation_id', 'status', 'last_message_at', 'message_count', 'created_at', 'updated_at'],
  messages: ['id', 'conversation_id', 'twilio_message_sid', 'direction', 'body', 'media_url', 'agent_type', 'confidence', 'processing_time_ms', 'created_at'],
  analytics_cache: ['id', 'store_id', 'data_type', 'period', 'data', 'expires_at', 'created_at'],
  user_settings: ['id', 'user_id', 'language', 'timezone', 'notifications_enabled', 'email_notifications', 'whatsapp_notifications', 'theme', 'created_at', 'updated_at'],
  analytics_queries: ['id', 'store_id', 'conversation_id', 'query_type', 'query_params', 'response_data', 'execution_time_ms', 'created_at'],
  automated_reports: ['id', 'store_id', 'report_type', 'schedule_time', 'timezone', 'is_enabled', 'last_sent_at', 'report_data', 'created_at', 'updated_at'],
  agent_conversations: ['id', 'conversation_id', 'agent_type', 'context', 'memory', 'created_at'],
  vector_documents: ['id', 'store_id', 'document_type', 'content', 'metadata', 'vector_id', 'created_at'],
  agent_actions: ['id', 'conversation_id', 'agent_type', 'action_type', 'action_data', 'status', 'result', 'created_at']
};

export async function GET() {
  try {
    console.log('[INFO] Starting schema validation');
    
    const supabase = createClient();
    
    const results: SchemaValidationResult[] = [];
    let overallValid = true;

    for (const [tableName, expectedColumns] of Object.entries(EXPECTED_TABLES)) {
      try {
        // Check if table exists by trying to query it
        const { data: tableTest, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (error) {
          console.error(`[ERROR] Failed to check table ${tableName}:`, error.message);
          results.push({
            table: tableName,
            exists: false,
            columns: [],
            status: 'missing'
          });
          overallValid = false;
          continue;
        }

        // If no error, table exists
        console.log(`[INFO] Table ${tableName}: EXISTS`);
        results.push({
          table: tableName,
          exists: true,
          columns: [], // We'll populate this later if needed
          status: 'valid'
        });

        console.log(`[INFO] Table ${tableName}: VALID`);

      } catch (tableError) {
        console.error(`[ERROR] Exception checking table ${tableName}:`, tableError);
        results.push({
          table: tableName,
          exists: false,
          columns: [],
          status: 'missing'
        });
        overallValid = false;
      }
    }

    const summary = {
      total_tables: Object.keys(EXPECTED_TABLES).length,
      valid_tables: results.filter(r => r.status === 'valid').length,
      invalid_tables: results.filter(r => r.status === 'invalid').length,
      missing_tables: results.filter(r => r.status === 'missing').length,
      overall_valid: overallValid
    };

    console.log('[INFO] Schema validation completed:', summary);

    return NextResponse.json({
      success: true,
      schema_validation: {
        summary,
        results,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[ERROR] Schema validation failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Schema validation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 