import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // For now, let's create a simple middleware that doesn't interfere with auth
  // We'll handle auth redirects in the components themselves
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 