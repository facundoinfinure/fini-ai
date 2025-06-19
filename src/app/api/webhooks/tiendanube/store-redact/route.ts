import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Tienda Nube Store Redact Webhook
 * POST /api/webhooks/tiendanube/store-redact
 * 
 * Called when a store requests data deletion (GDPR/LGPD compliance)
 */
export async function POST(request: NextRequest) {
  try {
    console.warn("[WEBHOOK] Store redact request received");
    
    const body = await request.json();
    const { store_id } = body;

    if (!store_id) {
      console.error("[WEBHOOK] Missing store_id in redact request");
      return NextResponse.json({ error: "Missing store_id" }, { status: 400 });
    }

    console.warn(`[WEBHOOK] Processing store redact for store: ${store_id}`);

    // Delete store data from our database
    const { error: storeError } = await supabaseAdmin
      .from("tiendanube_stores")
      .delete()
      .eq("store_id", store_id.toString());

    if (storeError) {
      console.error("[WEBHOOK] Error deleting store:", storeError);
    }

    // Delete related conversations
    const { error: conversationsError } = await supabaseAdmin
      .from("conversations")
      .delete()
      .eq("store_id", store_id.toString());

    if (conversationsError) {
      console.error("[WEBHOOK] Error deleting conversations:", conversationsError);
    }

    // Get conversation IDs first, then delete messages
    const { data: conversationIds } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("store_id", store_id.toString());

    if (conversationIds && conversationIds.length > 0) {
      const ids = conversationIds.map(c => c.id);
      const { error: messagesError } = await supabaseAdmin
        .from("messages")
        .delete()
        .in("conversation_id", ids);

      if (messagesError) {
        console.error("[WEBHOOK] Error deleting messages:", messagesError);
      }
    }

    // Log the redaction request
    await supabaseAdmin.from("usage_analytics").insert({
      user_id: "system",
      metric_type: "store_redacted",
      metric_value: 1,
      date: new Date().toISOString().split('T')[0],
      metadata: {
        store_id: store_id.toString(),
        redacted_at: new Date().toISOString(),
        ip: request.ip || "unknown"
      }
    });

    console.warn(`[WEBHOOK] Store redact completed for store: ${store_id}`);

    return NextResponse.json({ 
      success: true,
      message: "Store data successfully deleted",
      store_id 
    });

  } catch (error) {
    console.error("[WEBHOOK] Store redact error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
} 