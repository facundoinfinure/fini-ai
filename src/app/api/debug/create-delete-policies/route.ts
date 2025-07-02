import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/debug/create-delete-policies
 * Versión simplificada para crear políticas DELETE usando SQL básico
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[CREATE-DELETE-POLICIES] 🚀 Starting policy creation (simple version)...');
    
    const supabase = createClient();
    
    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[CREATE-DELETE-POLICIES] ❌ Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    console.log(`[CREATE-DELETE-POLICIES] ✅ User authenticated: ${user.id}`);

    // Mensaje para el usuario sobre cómo proceder
    const manualInstructions = {
      problem: "Las conversaciones no se pueden eliminar porque faltan políticas RLS DELETE",
      solution: "Necesitas ejecutar el siguiente SQL directamente en Supabase Dashboard",
      steps: [
        "1. Ir a Supabase Dashboard → SQL Editor",
        "2. Ejecutar el SQL que se muestra abajo",
        "3. Verificar que las políticas se crearon correctamente",
        "4. Probar eliminar una conversación en el dashboard"
      ],
      sql: `
-- Crear política DELETE para conversations
CREATE POLICY "Users can delete own conversations" 
ON conversations 
FOR DELETE 
USING (auth.uid()::text = user_id::text);

-- Crear política DELETE para messages  
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

-- Verificar que las políticas se crearon
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('conversations', 'messages')
  AND cmd = 'DELETE'
ORDER BY tablename, policyname;
      `.trim()
    };

    // Intento de test: crear y eliminar una conversación de prueba
    let testResult = null;
    try {
      console.log('[CREATE-DELETE-POLICIES] 🧪 Testing current DELETE functionality...');
      
      // Crear una conversación de prueba
      const { data: testConv, error: insertError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          whatsapp_number: '+1234567890',
          customer_number: '+0987654321',
          conversation_id: `test-delete-before-fix-${Date.now()}`,
          title: 'Test DELETE Before Fix',
          status: 'active'
        })
        .select()
        .single();

      if (insertError) {
        console.error('[CREATE-DELETE-POLICIES] ❌ Could not create test conversation:', insertError);
        testResult = {
          step: 'create',
          success: false,
          error: insertError.message
        };
      } else {
        console.log('[CREATE-DELETE-POLICIES] ✅ Created test conversation:', testConv.id);
        
        // Intentar eliminar la conversación de prueba
        const { error: deleteError } = await supabase
          .from('conversations')
          .delete()
          .eq('id', testConv.id);

        if (deleteError) {
          console.error('[CREATE-DELETE-POLICIES] ❌ DELETE failed (as expected):', deleteError);
          testResult = {
            step: 'delete',
            success: false,
            error: deleteError.message,
            note: 'This is expected - DELETE policies are missing',
            conversationId: testConv.id
          };
          
          // Cleanup: Intentar eliminar usando service role si es posible
          try {
            const { error: cleanupError } = await supabase
              .from('conversations')
              .delete()
              .eq('id', testConv.id);
            
            if (!cleanupError) {
              console.log('[CREATE-DELETE-POLICIES] ✅ Cleaned up test conversation');
            }
          } catch (cleanupErr) {
            console.warn('[CREATE-DELETE-POLICIES] ⚠️ Could not cleanup test conversation');
          }
          
        } else {
          console.log('[CREATE-DELETE-POLICIES] ✅ DELETE worked! Policies may already exist');
          testResult = {
            step: 'delete',
            success: true,
            note: 'DELETE worked - policies may already be in place'
          };
        }
      }
    } catch (err: any) {
      console.warn('[CREATE-DELETE-POLICIES] ⚠️ Test error:', err);
      testResult = {
        step: 'test',
        success: false,
        error: err.message
      };
    }

    console.log('[CREATE-DELETE-POLICIES] 📊 Test result:', testResult);

    return NextResponse.json({
      success: true,
      message: 'DELETE policies diagnosis completed',
      data: {
        diagnosis: {
          problem: "Conversaciones no se pueden eliminar",
          cause: "Faltan políticas RLS DELETE para tables 'conversations' y 'messages'",
          impact: "Los usuarios no pueden eliminar sus conversaciones desde el dashboard"
        },
        testResult,
        instructions: manualInstructions,
        nextSteps: [
          "Si el test DELETE falló → Ejecutar el SQL manualmente en Supabase",
          "Si el test DELETE funcionó → Las políticas ya están creadas",
          "Después de crear las políticas → Probar eliminar conversaciones en el dashboard"
        ]
      }
    });

  } catch (error: any) {
    console.error('[CREATE-DELETE-POLICIES] ❌ Fatal error:', error);
    return NextResponse.json(
      { success: false, error: `Error interno: ${error.message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/debug/create-delete-policies
 * Info sobre el problema y la solución
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'DELETE Policies Creation Info',
      data: {
        problem: "Las conversaciones no se pueden eliminar",
        cause: "Faltan políticas Row Level Security (RLS) para operaciones DELETE",
        affected_tables: ["conversations", "messages"],
        missing_policies: [
          {
            table: "conversations",
            policy_name: "Users can delete own conversations",
            condition: "auth.uid()::text = user_id::text"
          },
          {
            table: "messages", 
            policy_name: "Users can delete messages from own conversations",
            condition: "EXISTS (SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id::text = auth.uid()::text)"
          }
        ],
        solution: "Ejecutar POST a este endpoint para obtener instrucciones SQL",
        note: "Las políticas SELECT, INSERT, UPDATE existen pero DELETE no"
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `Error: ${error.message}` },
      { status: 500 }
    );
  }
} 