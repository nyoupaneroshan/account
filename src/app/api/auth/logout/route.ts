import { NextResponse } from 'next/server'
import { clearSessionCookieOptions } from '@/lib/auth'

export async function POST() {
  try {
    // Create the response first, then clear the cookie on it
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear the session cookie
    const cookieConfig = clearSessionCookieOptions()
    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options)

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout', details: String(error) },
      { status: 500 }
    )
  }
}
