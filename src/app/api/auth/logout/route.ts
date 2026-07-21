import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Create the response first, then clear the cookie on it
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })

    // Clear the session cookie directly (no need for shared auth module)
    response.cookies.set('hisab-session', '', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout', details: String(error) },
      { status: 500 }
    )
  }
}
