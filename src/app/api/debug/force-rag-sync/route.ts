import { NextRequest, NextResponse } from 'next/server';
import { TiendaNubeTokenManager } from '@/lib/integrations/tiendanube-token-manager';
import { TiendaNubeAPI } from '@/lib/integrations/tiendanube';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { storeId = 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a' } = body;

    console.log('[DEBUG-FORCE-SYNC] Starting forced sync for store:', storeId);

    // 1. Get valid token and store data
    const storeData = await TiendaNubeTokenManager.getValidTokenWithStoreData(storeId);

    if (!storeData) {
      return NextResponse.json({
        success: false,
        error: 'Store not found or token invalid',
        storeId
      });
    }

    console.log('[DEBUG-FORCE-SYNC] Store data found:', {
      name: storeData.storeName,
      platformStoreId: storeData.platformStoreId,
      hasToken: !!storeData.token
    });

    // 2. Initialize TiendaNube API
    const tiendanubeAPI = new TiendaNubeAPI(
      storeData.token,
      storeData.platformStoreId
    );

    // 3. Fetch fresh data from TiendaNube
    console.log('[DEBUG-FORCE-SYNC] Fetching fresh data from TiendaNube...');
    
    const [storeInfo, products] = await Promise.all([
      tiendanubeAPI.getStore(),
      tiendanubeAPI.getProducts()
    ]);

    console.log('[DEBUG-FORCE-SYNC] Data fetched:', {
      storeInfo: !!storeInfo,
      products: products?.length || 0
    });

    // 4. Format product data for inspection
    const productData = products?.map(product => {
      const mainVariant = product.variants?.[0];
      return {
        id: product.id,
        name: product.name || 'Sin nombre',
        price: mainVariant?.price || '0',
        variants: product.variants?.map(v => ({
          id: v.id,
          price: v.price,
          stock: v.stock
        })) || []
      };
    }) || [];

    // 5. Show raw data that would be used for RAG
    const formattedProducts = productData.map(p => 
      `Producto: ${p.name} - Precio: $${p.price} (ID: ${p.id})`
    ).join('\n');

    return NextResponse.json({
      success: true,
      message: 'Data sync inspection completed',
      data: {
        storeId: storeData.storeId,
        storeName: storeData.storeName,
        platformStoreId: storeData.platformStoreId,
        fetchedData: {
          storeInfo: !!storeInfo,
          products: productData.length
        },
        rawProductData: productData,
        formattedForRAG: formattedProducts,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('[DEBUG-FORCE-SYNC] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Sync failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug force RAG sync endpoint is ready',
    usage: {
      endpoint: '/api/debug/force-rag-sync',
      method: 'POST',
      body: {
        storeId: 'Optional store ID (defaults to test store)'
      }
    }
  });
} 