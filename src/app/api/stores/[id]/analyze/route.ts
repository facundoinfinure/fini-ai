import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { storeAnalysisService } from '@/lib/services/store-analysis';

/**
 * 🤖 Store Analysis API
 * POST /api/stores/[id]/analyze - Analiza tienda automáticamente con AI
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`[STORE-ANALYSIS-API] Starting analysis for store: ${params.id}`);

    const supabase = createClient();
    
    // 1. Validar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('[STORE-ANALYSIS-API] Authentication failed:', userError?.message);
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // 2. Validar parámetros
    if (!params.id) {
      return NextResponse.json(
        { success: false, error: 'Store ID requerido' },
        { status: 400 }
      );
    }

    // 3. Obtener store de la base de datos
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (storeError) {
      console.error('[STORE-ANALYSIS-API] Error fetching store:', storeError);
      return NextResponse.json(
        { success: false, error: 'Error al obtener información de la tienda' },
        { status: 500 }
      );
    }

    if (!store) {
      return NextResponse.json(
        { success: false, error: 'Tienda no encontrada' },
        { status: 404 }
      );
    }

    // 4. Validar que la tienda tenga tokens válidos
    if (!store.access_token || !store.platform_store_id) {
      return NextResponse.json(
        { success: false, error: 'Tienda no está conectada correctamente' },
        { status: 400 }
      );
    }

    // 5. Ejecutar análisis automático
    console.log(`[STORE-ANALYSIS-API] Analyzing store: ${store.name}`);
    const analysisResult = await storeAnalysisService.analyzeStore(
      store.access_token,
      store.platform_store_id
    );

    if (!analysisResult.success) {
      console.error('[STORE-ANALYSIS-API] Analysis failed:', analysisResult.error);
      return NextResponse.json(
        { 
          success: false, 
          error: analysisResult.error || 'Error al analizar la tienda' 
        },
        { status: 500 }
      );
    }

    // 6. Respuesta exitosa
    console.log(`[STORE-ANALYSIS-API] Analysis completed successfully for store: ${store.name}`);
    
    return NextResponse.json({
      success: true,
      data: {
        profile: analysisResult.profile,
        store: {
          id: store.id,
          name: store.name,
          platform: store.platform
        },
        debug: analysisResult.debugInfo
      }
    });

  } catch (error) {
    console.error('[STORE-ANALYSIS-API] Unexpected error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor' 
      },
      { status: 500 }
    );
  }
} 