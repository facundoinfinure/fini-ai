import { NextRequest, NextResponse } from 'next/server';
import { StoreService } from '@/lib/database/client';

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    console.log('[DEBUG] Testing store creation endpoint...');

    // Test data similar to what's sent from OAuth callback
    const testStoreData = {
      user_id: '12345678-1234-1234-1234-123456789012', // Fake UUID for testing
      platform: 'tiendanube' as const,
      platform_store_id: 'test-store-123',
      name: 'Test Store Debug',
      domain: 'https://test-store-debug.mitiendanube.com',
      access_token: 'test_access_token_debug',
      refresh_token: null,
      token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('[DEBUG] Test store data:', {
      ...testStoreData,
      access_token: '[REDACTED]'
    });

    // Attempt to create the store
    const result = await StoreService.createStore(testStoreData);

    return NextResponse.json({
      success: result.success,
      error: result.error,
      hasStore: !!result.store,
      storeId: result.store?.id,
      message: result.success ? 'Store creation test successful' : 'Store creation test failed'
    });

  } catch (error) {
    console.error('[ERROR] Debug endpoint failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 