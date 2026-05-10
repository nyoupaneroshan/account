import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Since we're using a simple token-based approach (no server sessions),
    // logout is handled client-side by clearing the stored credentials.
    // This endpoint exists for API completeness and future session management.

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Failed to logout', details: String(error) },
      { status: 500 }
    )
  }
}
