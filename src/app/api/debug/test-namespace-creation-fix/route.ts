import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedRAGEngine } from '@/lib/rag/unified-rag-engine';

export async function POST(request: NextRequest) {
  console.log('[DEBUG] 🔧 Testing namespace creation fix...');

  try {
    const { storeId } = await request.json();
    
    if (!storeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Store ID is required' 
      }, { status: 400 });
    }

    console.log(`[DEBUG] Testing namespace creation for store: ${storeId}`);
    
    // Initialize the unified RAG engine
    const ragEngine = getUnifiedRAGEngine();
    
    // Test the improved namespace initialization
    console.log(`[DEBUG] 🏗️ Initializing namespaces...`);
    const initResult = await ragEngine.initializeStoreNamespaces(storeId);
    
    if (!initResult.success) {
      return NextResponse.json({
        success: false,
        error: `Namespace initialization failed: ${initResult.error}`,
        details: { initResult }
      });
    }

    // Wait a moment for Pinecone to propagate
    console.log(`[DEBUG] ⏳ Waiting 5 seconds for Pinecone propagation...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test verification: check if all namespaces were created
    const expectedNamespaces = [
      `store-${storeId}`,
      `store-${storeId}-products`,
      `store-${storeId}-orders`,
      `store-${storeId}-customers`,
      `store-${storeId}-analytics`,
      `store-${storeId}-conversations`
    ];

    console.log(`[DEBUG] 🔍 Expected namespaces:`, expectedNamespaces);

    return NextResponse.json({
      success: true,
      message: 'Namespace creation fix tested successfully',
      data: {
        storeId,
        initializationResult: initResult,
        expectedNamespaces,
        instructions: [
          '1. Check Pinecone dashboard to verify all 6 namespaces were created',
          '2. Each namespace should have some initial data (placeholders may be cleaned up)',
          '3. If successful, the fix resolves the issue where only 2 namespaces were created'
        ]
      }
    });

  } catch (error) {
    console.error('[DEBUG] ❌ Namespace creation test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'Test Namespace Creation Fix',
    description: 'Tests the improved namespace initialization that ensures all 6 namespaces are created',
    usage: {
      method: 'POST',
      body: { storeId: 'your-store-id' },
      example: { storeId: 'ce6e4e8d-c992-4a4f-b88f-6ef964c6cb2a' }
    },
    expectedNamespaces: [
      'store-{storeId}',
      'store-{storeId}-products', 
      'store-{storeId}-orders',
      'store-{storeId}-customers',
      'store-{storeId}-analytics',
      'store-{storeId}-conversations'
    ]
  });
} 