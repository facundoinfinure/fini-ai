import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { StoreService } from '@/lib/database/client';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Testing store UPSERT fix...');
    
    const supabase = createClient();
    
    // Get current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return NextResponse.json({
        success: false,
        error: 'No authenticated user found'
      }, { status: 401 });
    }

    const userId = session.user.id;

    // Test data - simula datos del OAuth callback
    const testStoreData = {
      user_id: userId,
      name: 'Test Store UPSERT Fix',
      domain: 'test-upsert-fix.mytienda.com',
      platform: 'tiendanube' as const,
      platform_store_id: `test_${Date.now()}`, // Unique ID para evitar conflictos
      access_token: 'test_access_token_' + Date.now(),
      refresh_token: null,
      token_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      currency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      language: 'es',
      is_active: true,
      last_sync_at: null
    };

    console.log('🔍 [DEBUG] Testing createOrUpdateStore with data:', {
      userId: testStoreData.user_id,
      platform: testStoreData.platform,
      platformStoreId: testStoreData.platform_store_id,
      name: testStoreData.name
    });

    // Test 1: Create new store
    const createResult = await StoreService.createOrUpdateStore(testStoreData);
    
    if (!createResult.success) {
      console.error('❌ [DEBUG] Store creation failed:', createResult.error);
      return NextResponse.json({
        success: false,
        error: `Store creation failed: ${createResult.error}`,
        step: 'creation'
      });
    }

    const store = createResult.store!;
    console.log('✅ [DEBUG] Store created successfully:', store.id);

    // Test 2: Update same store (simula reconnection)
    const updatedStoreData = {
      ...testStoreData,
      access_token: 'updated_access_token_' + Date.now(),
      name: 'Updated Test Store UPSERT Fix'
    };

    const updateResult = await StoreService.createOrUpdateStore(updatedStoreData);
    
    if (!updateResult.success) {
      console.error('❌ [DEBUG] Store update failed:', updateResult.error);
      return NextResponse.json({
        success: false,
        error: `Store update failed: ${updateResult.error}`,
        step: 'update'
      });
    }

    console.log('✅ [DEBUG] Store updated successfully:', updateResult.store!.id);

    // Verificar que el store fue actualizado, no duplicado
    const isSameStore = store.id === updateResult.store!.id;

    // Cleanup: Delete test store
    try {
      await supabase
        .from('stores')
        .delete()
        .eq('id', store.id);
      console.log('🧹 [DEBUG] Test store cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ [DEBUG] Cleanup failed:', cleanupError);
    }

    return NextResponse.json({
      success: true,
      message: 'Store UPSERT fix works correctly!',
      tests: {
        creation: {
          success: true,
          storeId: store.id,
          name: store.name
        },
        update: {
          success: true,
          storeId: updateResult.store!.id,
          name: updateResult.store!.name,
          sameStore: isSameStore,
          accessTokenUpdated: updateResult.store!.access_token !== store.access_token
        }
      },
      conclusion: isSameStore ? 
        'UPSERT working correctly - store was updated, not duplicated' :
        'WARNING: Store was duplicated instead of updated'
    });

  } catch (error) {
    console.error('❌ [DEBUG] Test failed with error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      step: 'setup'
    });
  }
} 