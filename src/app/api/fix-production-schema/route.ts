import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * API para aplicar fixes críticos de schema en producción
 * POST /api/fix-production-schema
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Schema fix information endpoint...');

    const supabase = createClient();

    // Check if user is authenticated (basic security)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Test current messages table structure
    const { data: testData, error: testError } = await supabase
      .from('messages')
      .select('agent_type')
      .limit(5);

    // Prepare migration SQL for manual execution
    const migrationSQL = `
-- Migration: Update agent_type constraint to include all new agent types
-- Date: 2025-06-28
-- Execute this SQL in Supabase SQL Editor:

-- Drop existing constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_agent_type_check;

-- Add updated constraint with all agent types
ALTER TABLE public.messages ADD CONSTRAINT messages_agent_type_check 
  CHECK (agent_type IN (
    'orchestrator', 
    'analytics', 
    'customer_service', 
    'marketing', 
    'stock_manager', 
    'financial_advisor', 
    'business_consultant', 
    'product_manager', 
    'operations_manager', 
    'sales_coach'
  ));
`;

    console.log('✅ Migration SQL prepared');
    console.log('🧪 Current agent types in database:', 
      testData?.map(m => m.agent_type).filter(Boolean) || []
    );

    return NextResponse.json({
      success: true,
      message: 'Schema fix information prepared',
      migrationSQL,
      currentAgentTypes: testData?.map(m => m.agent_type).filter(Boolean) || [],
      instructions: [
        '1. Copy the migrationSQL below',
        '2. Go to Supabase Dashboard > SQL Editor',
        '3. Execute the SQL to update the constraint',
        '4. Test the chat again'
      ]
    });

  } catch (error) {
    console.error('❌ Error in schema fix:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'API para fixes críticos de producción',
    usage: {
      method: 'POST',
      endpoint: '/api/fix-production-schema',
      description: 'Aplica fixes críticos para resolver errores de schema en producción'
    },
    fixes: [
      'Agregar columnas subscription_plan y subscription_status',
      'Actualizar schema de stores',
      'Limpiar datos de conversaciones',
      'Crear índices de performance'
    ]
  });
} 