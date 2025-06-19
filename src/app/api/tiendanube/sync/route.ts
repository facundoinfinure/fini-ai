import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth/config";
import { ragEngine } from "@/lib/rag";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET method for health check
export async function GET() {
  try {
    console.warn('[INFO] Tienda Nube API health check');
    
    // Basic configuration check
    const config = {
      clientId: process.env.TIENDANUBE_CLIENT_ID ? 'configured' : 'missing',
      clientSecret: process.env.TIENDANUBE_CLIENT_SECRET ? 'configured' : 'missing',
      redirectUri: process.env.TIENDANUBE_REDIRECT_URI || 'not configured',
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY
    };

    // Basic Supabase connection test (without specific tables)
    try {
      const { error: dbError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (dbError && dbError.message.includes('does not exist')) {
        return NextResponse.json({
          status: 'warning',
          service: 'Tienda Nube API',
          configuration: config,
          database: 'tables_not_created',
          message: 'Database connection OK, but tables need to be created',
          timestamp: new Date().toISOString(),
          action: 'Run database migrations',
          endpoints: {
            sync: '/api/tiendanube/sync (POST)',
            oauth: '/api/auth/signin/tiendanube',
            callback: '/api/auth/callback/tiendanube'
          }
        });
      }
    } catch (dbTestError: any) {
      console.warn('[DEBUG] Database test result:', dbTestError.message);
    }

    return NextResponse.json({
      status: 'healthy',
      service: 'Tienda Nube API',
      configuration: config,
      database: 'connected',
      timestamp: new Date().toISOString(),
      endpoints: {
        sync: '/api/tiendanube/sync (POST)',
        oauth: '/api/auth/signin/tiendanube',
        callback: '/api/auth/callback/tiendanube'
      }
    });

  } catch (error: any) {
    console.error('[ERROR] Tienda Nube API health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        service: 'Tienda Nube API',
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, syncType = "full" } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: "Store ID required" }, { status: 400 });
    }

    // Get store details
    const { data: store, error: storeError } = await supabase
      .from("tienda_nube_stores")
      .select("*")
      .eq("id", storeId)
      .eq("user_id", session.user.id)
      .single();

    if (storeError || !store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Start sync
    const { data: syncRecord } = await supabase
      .from("sync_history")
      .insert({
        store_id: storeId,
        sync_type: syncType,
        status: "started",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.warn(`[TIENDANUBE] Starting ${syncType} sync for store:`, store.store_id);

    let totalProcessed = 0;
    let totalFailed = 0;

    try {
      // Update store status
      await supabase
        .from("tienda_nube_stores")
        .update({ sync_status: "syncing" })
        .eq("id", storeId);

      // Use the singleton ragEngine instance

      // Sync products
      if (syncType === "full" || syncType === "products") {
        const { processed, failed } = await syncProducts(store, ragEngine);
        totalProcessed += processed;
        totalFailed += failed;
      }

      // Sync orders
      if (syncType === "full" || syncType === "orders") {
        const { processed, failed } = await syncOrders(store, ragEngine);
        totalProcessed += processed;
        totalFailed += failed;
      }

      // Sync customers
      if (syncType === "full" || syncType === "customers") {
        const { processed, failed } = await syncCustomers(store, ragEngine);
        totalProcessed += processed;
        totalFailed += failed;
      }

      // Update sync completion
      await supabase
        .from("sync_history")
        .update({
          status: "completed",
          records_processed: totalProcessed,
          records_failed: totalFailed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", syncRecord?.id);

      // Update store status and last sync
      await supabase
        .from("tienda_nube_stores")
        .update({ 
          sync_status: "completed",
          last_sync_at: new Date().toISOString()
        })
        .eq("id", storeId);

      console.warn(`[TIENDANUBE] Sync completed. Processed: ${totalProcessed}, Failed: ${totalFailed}`);

      return NextResponse.json({
        success: true,
        totalProcessed,
        totalFailed,
        syncId: syncRecord?.id,
      });

    } catch (syncError) {
      console.error("[TIENDANUBE] Sync error:", syncError);

      // Update sync as failed
      if (syncRecord?.id) {
        await supabase
          .from("sync_history")
          .update({
            status: "failed",
            error_message: syncError instanceof Error ? syncError.message : "Unknown error",
            completed_at: new Date().toISOString(),
          })
          .eq("id", syncRecord.id);
      }

      // Update store status
      await supabase
        .from("tienda_nube_stores")
        .update({ sync_status: "error" })
        .eq("id", storeId);

      return NextResponse.json(
        { error: "Sync failed", details: syncError instanceof Error ? syncError.message : "Unknown error" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("[TIENDANUBE] Sync API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function syncProducts(store: any, ragEngine: any) {
  let processed = 0;
  let failed = 0;
  let page = 1;
  const perPage = 50;

  try {
    while (true) {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${store.store_id}/products?page=${page}&per_page=${perPage}`,
        {
          headers: {
            "Authorization": `bearer ${store.access_token}`,
            "User-Agent": "Fini AI (fini-ai@example.com)",
          },
        }
      );

      if (!response.ok) break;

      const products = await response.json();
      if (!products || products.length === 0) break;

      for (const product of products) {
        try {
          await ragEngine.indexDocument({
            id: product.id.toString(),
            type: "product",
            storeId: store.store_id,
            content: `${product.name?.es || product.name?.pt || product.name?.en || ""} ${product.description?.es || product.description?.pt || product.description?.en || ""}`,
            metadata: {
              name: product.name,
              price: product.variants?.[0]?.price || 0,
              stock: product.variants?.reduce((total: number, v: any) => total + (v.stock || 0), 0) || 0,
              category: product.category,
              published: product.published,
              images: product.images?.map((img: any) => img.src) || [],
            },
          });

          // Update RAG document tracking
          await supabase
            .from("rag_documents")
            .upsert({
              store_id: store.id,
              document_type: "product",
              external_id: product.id.toString(),
              vector_namespace: `store-${store.store_id}-products`,
              chunk_count: 1,
              indexed_at: new Date().toISOString(),
              metadata: {
                name: product.name?.es || product.name?.pt || product.name?.en,
                price: product.variants?.[0]?.price || 0,
                stock: product.variants?.reduce((total: number, v: any) => total + (v.stock || 0), 0) || 0,
              },
            }, {
              onConflict: "store_id,document_type,external_id"
            });

          processed++;
        } catch (error) {
          console.error(`[TIENDANUBE] Failed to sync product ${product.id}:`, error);
          failed++;
        }
      }

      page++;
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error("[TIENDANUBE] Products sync error:", error);
  }

  return { processed, failed };
}

async function syncOrders(store: any, ragEngine: any) {
  let processed = 0;
  let failed = 0;
  let page = 1;
  const perPage = 50;

  try {
    while (true) {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${store.store_id}/orders?page=${page}&per_page=${perPage}`,
        {
          headers: {
            "Authorization": `bearer ${store.access_token}`,
            "User-Agent": "Fini AI (fini-ai@example.com)",
          },
        }
      );

      if (!response.ok) break;

      const orders = await response.json();
      if (!orders || orders.length === 0) break;

      for (const order of orders) {
        try {
          const orderContent = `Order ${order.number} - Total: ${order.total} - Status: ${order.payment_status} - Customer: ${order.customer?.name || order.customer?.email || "Unknown"}`;

          await ragEngine.indexDocument({
            id: order.id.toString(),
            type: "order",
            storeId: store.store_id,
            content: orderContent,
            metadata: {
              number: order.number,
              total: order.total,
              status: order.payment_status,
              customer_email: order.customer?.email,
              customer_name: order.customer?.name,
              created_at: order.created_at,
              products: order.products?.map((p: any) => ({
                name: p.name,
                quantity: p.quantity,
                price: p.price,
              })) || [],
            },
          });

          await supabase
            .from("rag_documents")
            .upsert({
              store_id: store.id,
              document_type: "order",
              external_id: order.id.toString(),
              vector_namespace: `store-${store.store_id}-orders`,
              chunk_count: 1,
              indexed_at: new Date().toISOString(),
              metadata: {
                number: order.number,
                total: order.total,
                status: order.payment_status,
                customer_email: order.customer?.email,
              },
            }, {
              onConflict: "store_id,document_type,external_id"
            });

          processed++;
        } catch (error) {
          console.error(`[TIENDANUBE] Failed to sync order ${order.id}:`, error);
          failed++;
        }
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error("[TIENDANUBE] Orders sync error:", error);
  }

  return { processed, failed };
}

async function syncCustomers(store: any, ragEngine: any) {
  let processed = 0;
  let failed = 0;
  let page = 1;
  const perPage = 50;

  try {
    while (true) {
      const response = await fetch(
        `https://api.tiendanube.com/v1/${store.store_id}/customers?page=${page}&per_page=${perPage}`,
        {
          headers: {
            "Authorization": `bearer ${store.access_token}`,
            "User-Agent": "Fini AI (fini-ai@example.com)",
          },
        }
      );

      if (!response.ok) break;

      const customers = await response.json();
      if (!customers || customers.length === 0) break;

      for (const customer of customers) {
        try {
          const customerContent = `Customer ${customer.name || customer.email} - Email: ${customer.email} - Total orders: ${customer.total_spent || 0}`;

          await ragEngine.indexDocument({
            id: customer.id.toString(),
            type: "customer",
            storeId: store.store_id,
            content: customerContent,
            metadata: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
              total_spent: customer.total_spent || 0,
              orders_count: customer.orders_count || 0,
              created_at: customer.created_at,
            },
          });

          await supabase
            .from("rag_documents")
            .upsert({
              store_id: store.id,
              document_type: "customer",
              external_id: customer.id.toString(),
              vector_namespace: `store-${store.store_id}-customers`,
              chunk_count: 1,
              indexed_at: new Date().toISOString(),
              metadata: {
                name: customer.name,
                email: customer.email,
                total_spent: customer.total_spent || 0,
              },
            }, {
              onConflict: "store_id,document_type,external_id"
            });

          processed++;
        } catch (error) {
          console.error(`[TIENDANUBE] Failed to sync customer ${customer.id}:`, error);
          failed++;
        }
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error("[TIENDANUBE] Customers sync error:", error);
  }

  return { processed, failed };
} 