import { cookies } from 'next/headers'

const SESSION_COOKIE = 'hisab-session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60 // 30 days

export function setSessionCookie(userId: string): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    maxAge: number
    path: string
  }
} {
  return {
    name: SESSION_COOKIE,
    value: userId,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    },
  }
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(SESSION_COOKIE)
    return sessionCookie?.value ?? null
  } catch {
    return null
  }
}

export function clearSessionCookieOptions(): {
  name: string
  value: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    maxAge: number
    path: string
  }
} {
  return {
    name: SESSION_COOKIE,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  }
}
