import { NextRequest, NextResponse } from 'next/server';

interface ExtractStoreInfoRequest {
  storeUrl: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[INFO] Extracting store info from URL');
    
    const { storeUrl }: ExtractStoreInfoRequest = await request.json();

    if (!storeUrl) {
      return NextResponse.json({
        success: false,
        error: 'Store URL is required'
      }, { status: 400 });
    }

    // Extract store ID from URL
    // Tienda Nube URLs follow patterns like:
    // https://store-name.tiendanube.com
    // https://store-name.mitiendanube.com
    // https://subdomain.tiendanube.com
    
    let storeDomain: string;
    try {
      const url = new URL(storeUrl);
      storeDomain = url.hostname;
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid URL format'
      }, { status: 400 });
    }

    // Validate that it's a Tienda Nube URL
    if (!storeDomain.includes('tiendanube.com') && !storeDomain.includes('mitiendanube.com')) {
      return NextResponse.json({
        success: false,
        error: 'URL must be from Tienda Nube (tiendanube.com or mitiendanube.com)'
      }, { status: 400 });
    }

    // Extract store name from subdomain
    const subdomain = storeDomain.split('.')[0];
    
    // Make a simple HTTP request to get basic store information
    // We'll try to fetch the store's HTML page to extract basic info
    try {
      console.log('[INFO] Fetching store page:', storeUrl);
      
      const response = await fetch(storeUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'FiniAI/1.0 (Store Info Extraction)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        // Add timeout
        signal: AbortSignal.timeout(10000) // 10 seconds
      });

      if (!response.ok) {
        console.warn('[WARNING] Store page not accessible:', response.status);
        // Return subdomain as fallback name
        return NextResponse.json({
          success: true,
          data: {
            storeName: subdomain,
            storeUrl,
            extractedFrom: 'subdomain',
            note: 'Store page not accessible, using subdomain as name'
          }
        });
      }

      const html = await response.text();
      
      // Try to extract store name from HTML title tag
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      let extractedName = subdomain; // Default fallback
      
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1].trim();
        // Clean up common suffixes
        title = title.replace(/\s*-\s*Tienda Nube.*$/i, '');
        title = title.replace(/\s*\|\s*Tienda Nube.*$/i, '');
        title = title.replace(/\s*-\s*Mi Tienda Nube.*$/i, '');
        title = title.replace(/\s*\|\s*Mi Tienda Nube.*$/i, '');
        
        if (title.length > 0 && title.length < 100) {
          extractedName = title;
        }
      }

      console.log('[INFO] Successfully extracted store info:', {
        storeName: extractedName,
        extractedFrom: titleMatch ? 'title' : 'subdomain'
      });

      return NextResponse.json({
        success: true,
        data: {
          storeName: extractedName,
          storeUrl,
          subdomain,
          extractedFrom: titleMatch ? 'title' : 'subdomain'
        }
      });

    } catch (fetchError) {
      console.warn('[WARNING] Failed to fetch store page:', fetchError);
      
      // Return subdomain as fallback
      return NextResponse.json({
        success: true,
        data: {
          storeName: subdomain,
          storeUrl,
          extractedFrom: 'subdomain',
          note: 'Could not access store page, using subdomain as name'
        }
      });
    }

  } catch (error) {
    console.error('[ERROR] Failed to extract store info:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Tienda Nube Store Info Extraction API',
    usage: {
      method: 'POST',
      endpoint: '/api/tiendanube/extract-store-info',
      body: {
        storeUrl: 'https://your-store.tiendanube.com'
      }
    },
    features: [
      'Extract store name from URL',
      'Validate Tienda Nube domains',
      'Parse store title from HTML',
      'Fallback to subdomain if title not available',
      'Handle various Tienda Nube URL formats'
    ]
  });
} 