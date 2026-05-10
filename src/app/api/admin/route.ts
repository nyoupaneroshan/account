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

    // Verify the requesting user is a super_admin
    const adminUser = await db.user.findUnique({ where: { id: userId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      )
    }

    // Fetch all users (exclude passwordHash)
    const rawUsers = await db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        language: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: { organizations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch all organizations
    const rawOrgs = await db.organization.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Fetch all subscriptions for revenue calc
    const subscriptions = await db.subscription.findMany()

    // Compute stats
    const totalUsers = rawUsers.length
    const activeUsers = rawUsers.filter(u => u.isActive).length
    const activeSubscriptions = subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length
    const proCount = subscriptions.filter(s => s.plan === 'pro').length
    const enterpriseCount = subscriptions.filter(s => s.plan === 'enterprise').length
    const revenueEstimate = (proCount * 10) + (enterpriseCount * 50) // rough estimate

    // Format users for the admin portal
    const users = rawUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      language: u.language,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
      createdAt: u.createdAt.toISOString(),
      organizations: u._count.organizations,
    }))

    // Format organizations for the admin portal
    const organizations = rawOrgs.map(o => ({
      id: o.id,
      name: o.name,
      plan: o.plan,
      subscriptionStatus: o.subscriptionStatus,
      language: o.language,
      industry: o.industry,
      createdAt: o.createdAt.toISOString(),
      users: o._count.users,
    }))

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        totalOrganizations: rawOrgs.length,
        activeSubscriptions,
        revenueEstimate,
      },
      users,
      organizations,
    })

  } catch (error) {
    console.error('Admin GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin data' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { action, userId: adminUserId } = body

    // Verify admin
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (action === 'toggle_user') {
      const { userId, isActive } = body
      if (userId === adminUserId) {
        return NextResponse.json({ error: 'Cannot deactivate yourself' }, { status: 400 })
      }
      await db.user.update({
        where: { id: userId },
        data: { isActive },
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'update_plan') {
      const { orgId, plan } = body
      if (!['free', 'pro', 'enterprise'].includes(plan)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }

      // Update organization plan
      await db.organization.update({
        where: { id: orgId },
        data: {
          plan,
          subscriptionStatus: plan === 'free' ? 'active' : 'active',
        },
      })

      // Update or create subscription
      const existing = await db.subscription.findUnique({ where: { organizationId: orgId } })
      if (existing) {
        await db.subscription.update({
          where: { id: existing.id },
          data: {
            plan,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      } else {
        await db.subscription.create({
          data: {
            organizationId: orgId,
            plan,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Admin PATCH error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
