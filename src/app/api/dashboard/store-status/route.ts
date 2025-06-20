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
    const { data: store, error } = await supabase
      .from('stores')
      .select(
        `
        tiendanube_store_id,
        store_name,
        store_url,
        last_sync_at
        `
      )
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is not an error in this case
      console.error('[ERROR] Fetching store data:', error)
      return NextResponse.json({ error: 'Error fetching store data' }, { status: 500 })
    }

    if (!store) {
      return NextResponse.json({ isConnected: false, store: null })
    }
    
    return NextResponse.json({
      isConnected: true,
      store: {
        platform: 'Tienda Nube',
        storeId: store.tiendanube_store_id,
        name: store.store_name,
        url: store.store_url,
        lastSync: store.last_sync_at,
      },
    })
  } catch (error) {
    console.error('[ERROR] API get-store-status:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 