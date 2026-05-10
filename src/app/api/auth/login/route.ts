import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

const SALT = 'hisab-pro-salt'

function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      )
    }

    // Verify password
    const passwordHash = hashPassword(password)
    if (user.passwordHash !== passwordHash) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Update lastLoginAt
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    // Return user data with their organizations (exclude passwordHash)
    const { passwordHash: _, ...userSafe } = user

    return NextResponse.json({
      success: true,
      user: {
        id: userSafe.id,
        email: userSafe.email,
        name: userSafe.name,
        role: userSafe.role,
        language: userSafe.language,
      },
      organizations: user.organizations.map(uo => ({
        id: uo.organization.id,
        name: uo.organization.name,
        role: uo.role,
        plan: uo.organization.plan,
      })),
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Failed to login', details: String(error) },
      { status: 500 }
    )
  }
}
