import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    console.log('[INFO] Fetching conversations from database');
    
    const supabase = createClient();
    
    // Obtener el usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[ERROR] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // 🔥 BACKGROUND RAG SYNC: Non-blocking, fail-safe
    // This runs in the background and doesn't affect the main response
    setImmediate(async () => {
      try {
        // Get user's stores for RAG sync
        const { data: stores } = await supabase
          .from('stores')
          .select('id, tiendanube_store_id, access_token')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (stores && stores.length > 0) {
          const { ragEngine } = await import('@/lib/rag');
          
          // Sync only the first store to avoid overwhelming the system
          const store = stores[0];
          if (store.access_token && ragEngine) {
            console.log(`[RAG:background] Starting background sync for store: ${store.id}`);
            await ragEngine.indexStoreData(store.id, store.access_token);
          }
        }
      } catch (ragError) {
        // 🔥 CRITICAL: RAG errors should not affect conversation loading
        console.warn('[WARNING] Background RAG sync failed (non-critical):', ragError instanceof Error ? ragError.message : ragError);
      }
    });

    // Obtener conversaciones del usuario con sus mensajes
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select(`
        id,
        whatsapp_number,
        customer_number,
        conversation_id,
        title,
        status,
        last_message_at,
        message_count,
        created_at,
        messages (
          id,
          body,
          direction,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false })
      .limit(20);

    if (conversationsError) {
      console.error('[ERROR] Failed to fetch conversations:', conversationsError.message);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch conversations' },
        { status: 500 }
      );
    }

    // Formatear conversaciones
    const formattedConversations = (conversations || []).map(conv => ({
      id: conv.id,
      title: conv.title || `Cliente ${conv.customer_number?.slice(-4) || 'Desconocido'}`,
      customerName: `Cliente ${conv.customer_number?.slice(-4) || 'Desconocido'}`,
      customerPhone: conv.customer_number || '',
      status: conv.status || 'active',
      lastMessageTime: conv.last_message_at,
      messageCount: conv.message_count || 0,
      messages: (conv.messages || []).map((msg: any) => ({
        id: msg.id,
        body: msg.body,
        direction: msg.direction,
        created_at: msg.created_at
      }))
    }));

    console.log(`[INFO] Successfully fetched ${formattedConversations.length} conversations`);

    return NextResponse.json({
      success: true,
      data: formattedConversations
    });

  } catch (error) {
    console.error('[ERROR] Failed to fetch conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 