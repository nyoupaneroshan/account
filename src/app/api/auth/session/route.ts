import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const SESSION_HEADER = 'x-session-token'
const SESSION_COOKIE = 'hisab-session'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // Read userId from custom header first, then from cookie header
    let userId: string | null = null

    // Method 1: Check custom header (from localStorage-based session)
    userId = request.headers.get(SESSION_HEADER)

    // Method 2: Parse cookie header manually (avoid importing next/headers which is heavy)
    if (!userId) {
      const cookieHeader = request.headers.get('cookie')
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim())
        const sessionCookie = cookies.find(c => c.startsWith(`${SESSION_COOKIE}=`))
        if (sessionCookie) {
          userId = sessionCookie.split('=')[1]
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Find user with their organizations - keep query lean to avoid memory issues
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        isActive: true,
        organizations: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                nameNepali: true,
                panNumber: true,
                address: true,
                city: true,
                province: true,
                plan: true,
                mode: true,
                language: true,
                currency: true,
                vatEnabled: true,
                tdsEnabled: true,
                ssfEnabled: true,
                subscriptionStatus: true,
                subscriptionStart: true,
                subscriptionEnd: true,
                trialEndsAt: true,
                fiscalYear: true,
              },
            },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    const organizations = user.organizations.map(uo => ({
      id: uo.organization.id,
      name: uo.organization.name,
      nameNepali: uo.organization.nameNepali,
      panNumber: uo.organization.panNumber,
      address: uo.organization.address,
      city: uo.organization.city,
      province: uo.organization.province,
      plan: uo.organization.plan,
      mode: uo.organization.mode,
      language: uo.organization.language,
      currency: uo.organization.currency,
      vatEnabled: uo.organization.vatEnabled,
      tdsEnabled: uo.organization.tdsEnabled,
      ssfEnabled: uo.organization.ssfEnabled,
      subscriptionStatus: uo.organization.subscriptionStatus,
      subscriptionStart: uo.organization.subscriptionStart,
      subscriptionEnd: uo.organization.subscriptionEnd,
      trialEndsAt: uo.organization.trialEndsAt,
      fiscalYear: uo.organization.fiscalYear,
      role: uo.role,
    }))

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
      },
      organizations,
    })

  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session', details: String(error) },
      { status: 500 }
    )
  }
}
