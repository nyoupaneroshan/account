import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { organizationId, plan, userId } = body

    // Validate required fields
    if (!organizationId || !plan || !userId) {
      return NextResponse.json(
        { error: 'organizationId, plan, and userId are required' },
        { status: 400 }
      )
    }

    // Validate plan value
    const validPlans = ['free', 'pro', 'enterprise']
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Must be one of: ${validPlans.join(', ')}` },
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

    // Verify the organization exists
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Update the organization's plan
    const updatedOrg = await db.organization.update({
      where: { id: organizationId },
      data: {
        plan: plan,
        subscriptionStatus: 'active',
      },
    })

    // Update or create the subscription record
    let subscription
    if (org.subscription) {
      subscription = await db.subscription.update({
        where: { id: org.subscription.id },
        data: {
          plan: plan,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: plan === 'free'
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          cancelledAt: null,
        },
      })
    } else {
      subscription = await db.subscription.create({
        data: {
          organizationId: organizationId,
          plan: plan,
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: plan === 'free'
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId: organizationId,
        userId: userId,
        action: 'update',
        module: 'subscription',
        recordId: subscription.id,
        recordType: 'subscription',
        details: JSON.stringify({
          previousPlan: org.plan,
          newPlan: plan,
          updatedBy: adminUser.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Subscription updated to ${plan} plan`,
      organization: updatedOrg,
      subscription,
    })

  } catch (error) {
    console.error('Admin subscription update error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription', details: String(error) },
      { status: 500 }
    )
  }
}
