import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// NOTE: In Next.js 16, middleware is deprecated in favor of "proxy".
// Auth protection is handled client-side in the (app)/layout.tsx
// This middleware only adds security headers.

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
