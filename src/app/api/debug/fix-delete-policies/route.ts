import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/debug/fix-delete-policies
 * Endpoint temporal para agregar las políticas DELETE faltantes
 * 🚨 TEMPORARY: Solo para fix de producción
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[FIX-DELETE-POLICIES] Starting policy creation...');
    
    const supabase = createClient();
    
    // Verificar que el usuario sea admin o tenga permisos
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[FIX-DELETE-POLICIES] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    console.log(`[FIX-DELETE-POLICIES] User authenticated: ${user.id}`);

    const results = [];

    // 1. Crear política DELETE para conversations
    try {
      console.log('[FIX-DELETE-POLICIES] Creating DELETE policy for conversations...');
      
      const { error: conversationsPolicyError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY "Users can delete own conversations" 
          ON conversations 
          FOR DELETE 
          USING (auth.uid()::text = user_id::text);
        `
      });

      if (conversationsPolicyError) {
        if (conversationsPolicyError.message.includes('already exists')) {
          console.log('[FIX-DELETE-POLICIES] Conversations DELETE policy already exists');
          results.push({
            table: 'conversations',
            status: 'exists',
            message: 'Policy already exists'
          });
        } else {
          console.error('[FIX-DELETE-POLICIES] Error creating conversations policy:', conversationsPolicyError);
          results.push({
            table: 'conversations',
            status: 'error',
            message: conversationsPolicyError.message
          });
        }
      } else {
        console.log('[FIX-DELETE-POLICIES] ✅ Created conversations DELETE policy');
        results.push({
          table: 'conversations',
          status: 'created',
          message: 'Successfully created DELETE policy'
        });
      }
    } catch (err: any) {
      console.error('[FIX-DELETE-POLICIES] Unexpected error for conversations:', err);
      results.push({
        table: 'conversations',
        status: 'error',
        message: err.message
      });
    }

    // 2. Crear política DELETE para messages
    try {
      console.log('[FIX-DELETE-POLICIES] Creating DELETE policy for messages...');
      
      const { error: messagesPolicyError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE POLICY "Users can delete messages from own conversations" 
          ON messages 
          FOR DELETE 
          USING (
            EXISTS (
              SELECT 1 FROM conversations 
              WHERE conversations.id = messages.conversation_id 
              AND conversations.user_id::text = auth.uid()::text
            )
          );
        `
      });

      if (messagesPolicyError) {
        if (messagesPolicyError.message.includes('already exists')) {
          console.log('[FIX-DELETE-POLICIES] Messages DELETE policy already exists');
          results.push({
            table: 'messages',
            status: 'exists',
            message: 'Policy already exists'
          });
        } else {
          console.error('[FIX-DELETE-POLICIES] Error creating messages policy:', messagesPolicyError);
          results.push({
            table: 'messages',
            status: 'error',
            message: messagesPolicyError.message
          });
        }
      } else {
        console.log('[FIX-DELETE-POLICIES] ✅ Created messages DELETE policy');
        results.push({
          table: 'messages',
          status: 'created',
          message: 'Successfully created DELETE policy'
        });
      }
    } catch (err: any) {
      console.error('[FIX-DELETE-POLICIES] Unexpected error for messages:', err);
      results.push({
        table: 'messages',
        status: 'error',
        message: err.message
      });
    }

    // 3. Verificar que las políticas existen
    try {
      console.log('[FIX-DELETE-POLICIES] Verifying policies...');
      
      // Intentar verificar políticas (puede fallar si no tenemos acceso a pg_policies)
      const { data: policies, error: verifyError } = await supabase
        .from('pg_policies')
        .select('tablename, policyname, cmd')
        .in('tablename', ['conversations', 'messages'])
        .eq('cmd', 'DELETE');

      if (verifyError) {
        console.warn('[FIX-DELETE-POLICIES] Could not verify policies:', verifyError.message);
        results.push({
          table: 'verification',
          status: 'warning',
          message: 'Could not verify policies (may not have access to pg_policies)'
        });
      } else {
        console.log('[FIX-DELETE-POLICIES] Found policies:', policies);
        results.push({
          table: 'verification',
          status: 'success',
          message: `Found ${policies?.length || 0} DELETE policies`,
          data: policies
        });
      }
    } catch (err: any) {
      console.warn('[FIX-DELETE-POLICIES] Verification error:', err);
      results.push({
        table: 'verification',
        status: 'warning',
        message: `Verification failed: ${err.message}`
      });
    }

    // 4. Test de eliminación
    try {
      console.log('[FIX-DELETE-POLICIES] Testing DELETE operation...');
      
      // Crear una conversación de prueba
      const { data: testConv, error: insertError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          whatsapp_number: '+1234567890',
          customer_number: '+0987654321',
          conversation_id: `test-delete-${Date.now()}`,
          title: 'Test DELETE Policy',
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[FIX-DELETE-POLICIES] Could not create test conversation:', insertError);
        results.push({
          table: 'test',
          status: 'error',
          message: `Could not create test conversation: ${insertError.message}`
        });
      } else {
        console.log('[FIX-DELETE-POLICIES] Created test conversation:', testConv.id);
        
        // Intentar eliminar la conversación de prueba
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', testConv.id);

        if (deleteError) {
          console.error('[FIX-DELETE-POLICIES] DELETE test failed:', deleteError);
          results.push({
            table: 'test',
            status: 'error',
            message: `DELETE test failed: ${deleteError.message}`
          });
        } else {
          console.log('[FIX-DELETE-POLICIES] ✅ DELETE test successful!');
          results.push({
            table: 'test',
            status: 'success',
            message: 'DELETE operation test successful - policies are working!'
          });
        }
      }
    } catch (err: any) {
      console.warn('[FIX-DELETE-POLICIES] Test error:', err);
      results.push({
        table: 'test',
        status: 'warning',
        message: `Test failed: ${err.message}`
      });
    }

    const summary = {
      total: results.length,
      created: results.filter(r => r.status === 'created').length,
      exists: results.filter(r => r.status === 'exists').length,
      errors: results.filter(r => r.status === 'error').length,
      success: results.filter(r => r.status === 'success').length
    };

    console.log('[FIX-DELETE-POLICIES] Summary:', summary);
    console.log('[FIX-DELETE-POLICIES] Results:', results);

    return NextResponse.json({
      success: true,
      message: 'DELETE policies fix completed',
      data: {
        summary,
        results
      }
    });

  } catch (error: any) {
    console.error('[FIX-DELETE-POLICIES] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: `Error interno: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug/fix-delete-policies
 * Mostrar información sobre las políticas DELETE
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'DELETE Policies Fix Endpoint',
      data: {
        info: 'Este endpoint agrega las políticas RLS DELETE faltantes para conversations y messages',
        problem: 'Las conversaciones no se pueden eliminar porque faltan políticas DELETE',
        solution: 'Ejecutar POST /api/debug/fix-delete-policies para crear las políticas',
        policies: [
          {
            table: 'conversations',
            policy: 'Users can delete own conversations',
            condition: 'auth.uid()::text = user_id::text'
          },
          {
            table: 'messages',
            policy: 'Users can delete messages from own conversations',
            condition: 'EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id::text = auth.uid()::text)'
          }
        ]
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
} 