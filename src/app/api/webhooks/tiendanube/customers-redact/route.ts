import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Tienda Nube Customers Redact Webhook
 * POST /api/webhooks/tiendanube/customers-redact
 * 
 * Called when a customer requests data deletion (GDPR/LGPD compliance)
 */
export async function POST(request: NextRequest) {
  try {
    console.warn("[WEBHOOK] Customer redact request received");
    
    const body = await request.json();
    const { store_id, customer_id, customer_email, customer_phone } = body;

    if (!store_id || !customer_id) {
      console.error("[WEBHOOK] Missing required fields in customer redact request");
      return NextResponse.json({ error: "Missing store_id or customer_id" }, { status: 400 });
    }

    console.warn(`[WEBHOOK] Processing customer redact for customer: ${customer_id} in store: ${store_id}`);

    // Find and delete customer conversations
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select("id")
      .eq("store_id", store_id.toString())
      .or(`customer_id.eq.${customer_id},customer_email.eq.${customer_email},customer_phone.eq.${customer_phone}`);

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id);

      // Delete messages first
      const { error: messagesError } = await supabaseAdmin
        .from("messages")
        .delete()
        .in("conversation_id", conversationIds);

      if (messagesError) {
        console.error("[WEBHOOK] Error deleting customer messages:", messagesError);
      }

      // Delete conversations
      const { error: conversationsError } = await supabaseAdmin
        .from("conversations")
        .delete()
        .in("id", conversationIds);

      if (conversationsError) {
        console.error("[WEBHOOK] Error deleting customer conversations:", conversationsError);
      }
    }

    // Log the redaction request
    await supabaseAdmin.from("usage_analytics").insert({
      user_id: "system",
      metric_type: "customer_redacted",
      metric_value: 1,
      date: new Date().toISOString().split('T')[0],
      metadata: {
        store_id: store_id.toString(),
        customer_id: customer_id.toString(),
        customer_email,
        customer_phone,
        redacted_at: new Date().toISOString(),
        ip: request.ip || "unknown"
      }
    });

    console.warn(`[WEBHOOK] Customer redact completed for customer: ${customer_id}`);

    return NextResponse.json({ 
      success: true,
      message: "Customer data successfully deleted",
      store_id,
      customer_id 
    });

  } catch (error) {
    console.error("[WEBHOOK] Customer redact error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
} 