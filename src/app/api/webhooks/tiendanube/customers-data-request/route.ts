import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Tienda Nube Customers Data Request Webhook
 * POST /api/webhooks/tiendanube/customers-data-request
 * 
 * Called when a customer requests a copy of their data (GDPR/LGPD compliance)
 */
export async function POST(request: NextRequest) {
  try {
    console.warn("[WEBHOOK] Customer data request received");
    
    const body = await request.json();
    const { store_id, customer_id, customer_email, customer_phone } = body;

    if (!store_id || !customer_id) {
      console.error("[WEBHOOK] Missing required fields in data request");
      return NextResponse.json({ error: "Missing store_id or customer_id" }, { status: 400 });
    }

    console.warn(`[WEBHOOK] Processing data request for customer: ${customer_id} in store: ${store_id}`);

    // Get customer conversations
    const { data: conversations } = await supabaseAdmin
      .from("conversations")
      .select(`
        id,
        created_at,
        updated_at,
        status,
        customer_phone,
        customer_name,
        customer_email,
        messages (
          id,
          content,
          sent_at,
          message_type,
          sender_type
        )
      `)
      .eq("store_id", store_id.toString())
      .or(`customer_id.eq.${customer_id},customer_email.eq.${customer_email},customer_phone.eq.${customer_phone}`);

    // Prepare customer data export
    const customerData = {
      customer_id,
      customer_email,
      customer_phone,
      store_id,
      data_requested_at: new Date().toISOString(),
      conversations: conversations || [],
      summary: {
        total_conversations: conversations?.length || 0,
        total_messages: conversations?.reduce((acc, conv: any) => acc + (conv.messages?.length || 0), 0) || 0,
        first_interaction: conversations?.[0]?.created_at || null,
        last_interaction: conversations?.[conversations.length - 1]?.updated_at || null
      }
    };

    // Log the data request
    await supabaseAdmin.from("usage_analytics").insert({
      user_id: "system",
      metric_type: "customer_data_requested",
      metric_value: 1,
      date: new Date().toISOString().split('T')[0],
      metadata: {
        store_id: store_id.toString(),
        customer_id: customer_id.toString(),
        customer_email,
        customer_phone,
        requested_at: new Date().toISOString(),
        ip: request.ip || "unknown"
      }
    });

    console.warn(`[WEBHOOK] Data request completed for customer: ${customer_id}`);

    return NextResponse.json({ 
      success: true,
      message: "Customer data successfully retrieved",
      data: customerData
    });

  } catch (error) {
    console.error("[WEBHOOK] Customer data request error:", error);
    return NextResponse.json({
      success: false,
      error: "Internal server error"
    }, { status: 500 });
  }
} 