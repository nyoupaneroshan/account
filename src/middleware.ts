import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Minimal middleware — only adds basic security headers.
// Auth protection is handled client-side in layout components.
// No redirects here to avoid redirect loops.

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  return response
}

// Only match page routes, skip API and static files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|logo-generated.png|hero-dashboard.png).*)',
  ],
}
