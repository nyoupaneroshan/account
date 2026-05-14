import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

// PATCH /api/user/language - Update the current user's language preference
export async function PATCH(request: Request) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { language } = body

    if (!language) {
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      )
    }

    const validLanguages = ['en', 'ne', 'hi']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { language },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Language updated successfully',
      user: updatedUser,
    })

  } catch (error) {
    console.error('User language update error:', error)
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    )
  }
}

// PUT /api/user/language - Update the current user's language preference (alternative endpoint)
export async function PUT(request: Request) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { language } = body

    if (!language) {
      return NextResponse.json(
        { error: 'Language is required' },
        { status: 400 }
      )
    }

    const validLanguages = ['en', 'ne', 'hi']
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { language },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Language updated successfully',
      user: updatedUser,
    })

  } catch (error) {
    console.error('User language update error:', error)
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    )
  }
}
