import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * DEBUG: Test conversation deletion directly
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG-DELETE] 🧪 Testing conversation deletion directly');
    
    const supabase = createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[DEBUG-DELETE] ❌ Authentication failed:', userError?.message);
      return NextResponse.json({
        success: false,
        error: 'Usuario no autenticado',
        details: userError?.message
      }, { status: 401 });
    }

    console.log('[DEBUG-DELETE] ✅ User authenticated:', user.id);

    // Get body with conversation ID to test
    const body = await request.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({
        success: false,
        error: 'conversationId required in request body'
      }, { status: 400 });
    }

    console.log('[DEBUG-DELETE] 🎯 Testing deletion for conversation:', conversationId);

    // Step 1: List all conversations for this user
    console.log('[DEBUG-DELETE] 📋 Step 1: Getting all conversations for user');
    const { data: allConversations, error: listError } = await supabase
      .from('conversations')
      .select('id, user_id, title, created_at')
      .eq('user_id', user.id);

    console.log('[DEBUG-DELETE] 📊 All conversations result:', {
      error: listError,
      count: allConversations?.length || 0,
      conversations: allConversations
    });

    // Step 2: Check if target conversation exists
    console.log('[DEBUG-DELETE] 🔍 Step 2: Checking if target conversation exists');
    const targetConversation = allConversations?.find(conv => conv.id === conversationId);
    
    console.log('[DEBUG-DELETE] 📊 Target conversation check:', {
      conversationId,
      found: !!targetConversation,
      targetConversation
    });

    if (!targetConversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found for this user',
        debug: {
          conversationId,
          userId: user.id,
          allConversationIds: allConversations?.map(c => c.id) || []
        }
      }, { status: 404 });
    }

    // Step 3: Check messages for this conversation
    console.log('[DEBUG-DELETE] 💬 Step 3: Checking messages for conversation');
    const { data: messages, error: messagesError, count: messageCount } = await supabase
      .from('messages')
      .select('id, conversation_id', { count: 'exact' })
      .eq('conversation_id', conversationId);

    console.log('[DEBUG-DELETE] 📊 Messages check result:', {
      error: messagesError,
      messageCount,
      messages: messages?.slice(0, 5) // Only show first 5 for brevity
    });

    // Step 4: Test DELETE messages (DRY RUN)
    console.log('[DEBUG-DELETE] 🧪 Step 4: Testing messages deletion (DRY RUN)');
    const { error: messagesDeleteTestError, count: messagesDeletedTest } = await supabase
      .from('messages')
      .delete({ count: 'exact' })
      .eq('conversation_id', conversationId);

    console.log('[DEBUG-DELETE] 📊 Messages deletion test result:', {
      error: messagesDeleteTestError,
      messagesDeletedTest,
      conversationId
    });

    // Step 5: Test DELETE conversation (DRY RUN)
    console.log('[DEBUG-DELETE] 🧪 Step 5: Testing conversation deletion (DRY RUN)');
    const { error: conversationDeleteTestError, count: conversationDeletedTest } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('id', conversationId)
      .eq('user_id', user.id);

    console.log('[DEBUG-DELETE] 📊 Conversation deletion test result:', {
      error: conversationDeleteTestError,
      conversationDeletedTest,
      conversationId,
      userId: user.id
    });

    // Step 6: Final verification
    console.log('[DEBUG-DELETE] 🔍 Step 6: Final verification - checking if conversation still exists');
    const { data: verifyConversation, error: verifyError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single();

    console.log('[DEBUG-DELETE] 📊 Final verification result:', {
      error: verifyError,
      stillExists: !!verifyConversation,
      verifyConversation
    });

    // Return comprehensive debug info
    return NextResponse.json({
      success: true,
      debug: {
        user_id: user.id,
        conversationId,
        steps: {
          step1_listConversations: {
            error: listError,
            count: allConversations?.length || 0,
            allIds: allConversations?.map(c => c.id) || []
          },
          step2_findTarget: {
            found: !!targetConversation,
            targetConversation
          },
          step3_checkMessages: {
            error: messagesError,
            messageCount
          },
          step4_deleteMessages: {
            error: messagesDeleteTestError,
            messagesDeleted: messagesDeletedTest
          },
          step5_deleteConversation: {
            error: conversationDeleteTestError,
            conversationsDeleted: conversationDeletedTest
          },
          step6_verify: {
            error: verifyError,
            stillExists: !!verifyConversation
          }
        }
      }
    });

  } catch (error: any) {
    console.error('[DEBUG-DELETE] ❌ Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error?.message,
      stack: error?.stack
    }, { status: 500 });
  }
} 