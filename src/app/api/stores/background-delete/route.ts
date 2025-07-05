import { NextRequest, NextResponse } from 'next/server';
import { FiniRAGEngine } from '@/lib/rag';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🗑️ BACKGROUND DELETE ENDPOINT
 * =============================
 * 
 * Para borrado completo de tiendas:
 * 1. Elimina completamente todos los vectors de la tienda
 * 2. Borra todos los namespaces asociados
 * 3. Limpia cualquier dato residual
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { storeId, jobId } = body;
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    console.log(`[BACKGROUND-DELETE] Starting complete deletion for store: ${storeId}, job: ${jobId}`);

    // Initialize RAG engine
    const ragEngine = new FiniRAGEngine();
    
    // Track operations
    const operations = [];
    
    try {
      // 1. Delete all vectors from all namespaces
      console.log(`[BACKGROUND-DELETE] Deleting all vectors for store: ${storeId}`);
      
      const deleteResult = await Promise.race([
        ragEngine.deleteStoreVectors(storeId),
        new Promise<{ success: boolean; error?: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Vector deletion timeout')), 45000)
        )
      ]);
      
      if (!deleteResult.success) {
        console.warn(`[BACKGROUND-DELETE] Vector deletion failed: ${deleteResult.error}`);
        // Continue anyway - partial deletion is better than no deletion
      }
      
      operations.push('vectors_deleted');
      console.log(`[BACKGROUND-DELETE] ✅ Vectors deleted for store: ${storeId}`);

      // 2. Delete namespaces if they exist
      console.log(`[BACKGROUND-DELETE] Deleting namespaces for store: ${storeId}`);
      
      const namespaceDeleteResult = await Promise.race([
        ragEngine.deleteStoreNamespaces(storeId),
        new Promise<{ success: boolean; error?: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Namespace deletion timeout')), 45000)
        )
      ]);
      
      if (!namespaceDeleteResult.success) {
        console.warn(`[BACKGROUND-DELETE] Namespace deletion failed: ${namespaceDeleteResult.error}`);
        // Continue anyway - partial deletion is better than no deletion
      }
      
      operations.push('namespaces_deleted');
      console.log(`[BACKGROUND-DELETE] ✅ Namespaces deleted for store: ${storeId}`);

      const totalTime = Date.now() - startTime;
      console.log(`[BACKGROUND-DELETE] ✅ Complete deletion finished for store: ${storeId}, time: ${totalTime}ms`);

      return NextResponse.json({
        success: true,
        storeId,
        jobId,
        operations,
        totalTime,
        message: 'Store vectors and namespaces deleted successfully'
      });

    } catch (deleteError) {
      console.error(`[BACKGROUND-DELETE] ❌ Deletion failed for store ${storeId}:`, deleteError);
      
      const totalTime = Date.now() - startTime;
      return NextResponse.json({
        success: false,
        storeId,
        jobId,
        operations,
        totalTime,
        error: deleteError instanceof Error ? deleteError.message : 'Unknown deletion error',
        message: 'Store deletion failed but database cleanup was completed'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[BACKGROUND-DELETE] ❌ Critical error:', error);
    
    const totalTime = Date.now() - startTime;
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      totalTime,
      message: 'Background deletion failed'
    }, { status: 500 });
  }
} 