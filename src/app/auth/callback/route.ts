import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    // For now, we'll handle the code exchange in the client
    // This is a simplified version that will work with Supabase
    console.log('[INFO] Auth callback received code:', code)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
} 