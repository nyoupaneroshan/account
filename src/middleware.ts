import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionCookie = request.cookies.get('hisab-session')

  // Public routes that don't require auth
  const publicRoutes = ['/', '/admin']
  if (publicRoutes.some(r => pathname === r) || pathname.startsWith('/api/') || pathname.startsWith('/_next')) {
    return NextResponse.next()
  }

  // If no session cookie and trying to access protected route
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|admin).*)'],
}
