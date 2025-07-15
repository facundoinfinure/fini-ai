import { NextRequest, NextResponse } from 'next/server';

/**
 * Endpoint para obtener información básica de una tienda de Tienda Nube
 * usando solo la URL de la tienda (sin OAuth)
 */
export async function POST(request: NextRequest) {
  try {
    const { storeUrl } = await request.json();

    if (!storeUrl) {
      return NextResponse.json({
        success: false,
        error: 'URL de tienda requerida'
      }, { status: 400 });
    }

    // Validar que sea una URL de Tienda Nube
    if (!storeUrl.includes('tiendanube.com') && !storeUrl.includes('mitiendanube.com')) {
      return NextResponse.json({
        success: false,
        error: 'La URL debe ser de Tienda Nube'
      }, { status: 400 });
    }

    // Extraer el store name de la URL como fallback
    let storeNameFromUrl = 'Mi Tienda';
    try {
      const urlParts = storeUrl.replace(/^https?:\/\//, '').split('.');
      if (urlParts.length >= 2) {
        storeNameFromUrl = urlParts[0]
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
    } catch (e) {
      console.log('[DEBUG] Could not extract store name from URL');
    }

    // Intentar obtener información de la tienda desde el sitio público
    try {
      // Método 1: Intentar obtener el título de la página
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
      
      const response = await fetch(storeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FiniAI-Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        
        // Intentar extraer el título de la página
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          let extractedName = titleMatch[1]
            .replace(/\s*-\s*Tienda Nube/gi, '')
            .replace(/\s*-\s*TiendaNube/gi, '')
            .replace(/\s*\|\s*Tienda Nube/gi, '')
            .replace(/\s*\|\s*TiendaNube/gi, '')
            .trim();
          
          if (extractedName && extractedName.length > 0 && extractedName.length < 100) {
            return NextResponse.json({
              success: true,
              data: {
                name: extractedName,
                url: storeUrl,
                source: 'title_extraction'
              }
            });
          }
        }

        // Intentar extraer de meta tags
        const metaTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"[^>]*>/i);
        if (metaTitleMatch && metaTitleMatch[1]) {
          let extractedName = metaTitleMatch[1]
            .replace(/\s*-\s*Tienda Nube/gi, '')
            .replace(/\s*-\s*TiendaNube/gi, '')
            .trim();
          
          if (extractedName && extractedName.length > 0 && extractedName.length < 100) {
            return NextResponse.json({
              success: true,
              data: {
                name: extractedName,
                url: storeUrl,
                source: 'meta_extraction'
              }
            });
          }
        }
      }
    } catch (fetchError) {
      console.log('[DEBUG] Could not fetch store page:', fetchError);
    }

    // Fallback: usar nombre extraído de la URL
    return NextResponse.json({
      success: true,
      data: {
        name: storeNameFromUrl,
        url: storeUrl,
        source: 'url_extraction'
      }
    });

  } catch (error) {
    console.error('[ERROR] Store info extraction failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al obtener información de la tienda'
    }, { status: 500 });
  }
} 