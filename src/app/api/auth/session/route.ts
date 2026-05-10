import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Find user with their organizations and subscription info
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                subscription: true,
                fiscalYears: {
                  where: { isCurrent: true },
                  take: 1,
                },
                settings: true,
                _count: {
                  select: {
                    accounts: true,
                    parties: true,
                    products: true,
                    journalEntries: true,
                    invoices: true,
                    users: true,
                  },
                },
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

    // Return comprehensive session info (exclude passwordHash)
    const { passwordHash: _, ...userSafe } = user

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
      subscription: uo.organization.subscription,
      currentFiscalYear: uo.organization.fiscalYears[0] || null,
      settings: uo.organization.settings,
      counts: uo.organization._count,
    }))

    return NextResponse.json({
      user: userSafe,
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
