import { NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';

/**
 * TEST endpoint to verify Pinecone SDK update
 * GET /api/test-pinecone-fix
 */
export async function GET() {
  try {
    console.log('[TEST] Testing new Pinecone SDK v6.1.1...');
    
    // Test environment variables
    const apiKey = process.env.PINECONE_API_KEY;
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'PINECONE_API_KEY not configured',
        test: 'environment_check'
      }, { status: 500 });
    }
    
    if (!indexName) {
      return NextResponse.json({
        success: false,
        error: 'PINECONE_INDEX_NAME not configured',
        test: 'environment_check'
      }, { status: 500 });
    }
    
    // Test new SDK initialization (v6.1.1 style)
    console.log('[TEST] Initializing Pinecone client with new SDK...');
    
    const pinecone = new Pinecone({
      apiKey
    });
    
    console.log('[TEST] Pinecone client created successfully');
    
    // Test basic API call
    try {
      console.log('[TEST] Testing Pinecone API call...');
      const indexes = await pinecone.listIndexes();
      
      return NextResponse.json({
        success: true,
        message: 'Pinecone SDK v6.1.1 working correctly!',
        data: {
          sdkVersion: '6.1.1',
          initMethod: 'modern_sdk_version',
          indexesFound: indexes.indexes?.length || 0,
          targetIndex: indexName,
          targetIndexExists: indexes.indexes?.some(idx => idx.name === indexName) || false
        }
      });
      
    } catch (apiError) {
      console.error('[TEST] Pinecone API call failed:', apiError);
      
      return NextResponse.json({
        success: false,
        error: 'Pinecone API call failed',
        details: apiError instanceof Error ? apiError.message : 'Unknown error',
        data: {
          sdkVersion: '6.1.1',
          initMethod: 'modern_sdk_version',
          clientCreated: true
        }
      });
    }
    
  } catch (initError) {
    console.error('[TEST] Pinecone client initialization failed:', initError);
    
    return NextResponse.json({
      success: false,
      error: 'Pinecone client initialization failed', 
      details: initError instanceof Error ? initError.message : 'Unknown error',
      data: {
        sdkVersion: '6.1.1',
        initMethod: 'modern_sdk_version'
      }
    }, { status: 500 });
  }
} 