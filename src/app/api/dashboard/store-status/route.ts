import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: stores, error } = await supabase
      .from('stores')
      .select(`
        id,
        name,
        domain,
        platform_store_id,
        is_active,
        last_sync_at,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) {
      console.error('[ERROR] Failed to fetch stores:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch stores' },
        { status: 500 }
      )
    }

    const storeStatus = stores?.map(store => ({
      id: store.id,
      name: store.name,
      url: store.domain,
      platform_store_id: store.platform_store_id,
      status: store.is_active ? 'active' : 'inactive',
      last_sync_at: store.last_sync_at,
      created_at: store.created_at
    })) || []

    return NextResponse.json({
      isConnected: true,
      store: storeStatus,
    })
  } catch (error) {
    console.error('[ERROR] API get-store-status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 