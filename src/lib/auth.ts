import { cookies } from 'next/headers'

const SESSION_COOKIE = 'hisab-session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days
export const SESSION_HEADER = 'x-session-token'

export function setSessionCookie(userId: string): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax' | 'strict'
    maxAge: number
    path: string
  }
} {
  return {
    name: SESSION_COOKIE,
    value: userId,
    options: {
      httpOnly: false,
      secure: false, // Must be false for sandbox/proxy environments
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    },
  }
}

/**
 * Get session userId from either:
 * 1. Custom header (x-session-token) - sent by client from localStorage
 * 2. Cookie (hisab-session) - traditional approach
 */
export async function getSessionUserId(request?: Request): Promise<string | null> {
  // Method 1: Check custom header (from localStorage-based session)
  if (request) {
    const headerToken = request.headers.get(SESSION_HEADER)
    if (headerToken) {
      return headerToken
    }
  }

  // Method 2: Check cookie
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)
    if (sessionCookie?.value) {
      return sessionCookie.value
    }
  } catch {
    // cookies() not available in this context
  }

  return null
}

export function clearSessionCookieOptions(): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax' | 'strict'
    maxAge: number
    path: string
  }
} {
  return {
    name: SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  }
}
