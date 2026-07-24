import { db } from '@/lib/db'
import { NEPAL_COA_GROUPS, DEFAULT_ACCOUNTS } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

// Plan hierarchy for determining "best" plan
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

// Plan limits for number of organizations
const PLAN_ORG_LIMITS: Record<string, number> = {
  free: 1,
  pro: 5,
  enterprise: 999,
}

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Find all organizations the user belongs to
    const userOrgs = await db.userOrganization.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            subscription: true,
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
      orderBy: { createdAt: 'desc' },
    })

    const organizations = userOrgs.map(uo => ({
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
      fiscalYear: uo.organization.fiscalYear,
      role: uo.role,
      subscription: uo.organization.subscription,
      counts: uo.organization._count,
    }))

    return NextResponse.json({
      organizations,
    })

  } catch (error) {
    console.error('Organizations GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, userId: bodyUserId } = body

    // Use the authenticated user's ID (from cookie) as the primary, but allow body override for admin actions
    const effectiveUserId = bodyUserId || userId

    if (!name) {
      return NextResponse.json(
        { error: 'Organization name is required' },
        { status: 400 }
      )
    }

    // Check the user's plan limits and find their best plan
    const user = await db.user.findUnique({
      where: { id: effectiveUserId },
      include: {
        organizations: {
          include: {
            organization: {
              select: { plan: true },
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

    // Determine the highest plan among user's organizations
    const currentOrgCount = user.organizations.length
    let bestPlan = 'free'
    let bestPlanLevel = PLAN_HIERARCHY['free']

    for (const uo of user.organizations) {
      const planLevel = PLAN_HIERARCHY[uo.organization.plan] || 0
      if (planLevel > bestPlanLevel) {
        bestPlanLevel = planLevel
        bestPlan = uo.organization.plan
      }
    }

    // Enforce plan limits based on the best plan
    const orgLimit = PLAN_ORG_LIMITS[bestPlan] || PLAN_ORG_LIMITS['free']
    if (currentOrgCount >= orgLimit) {
      return NextResponse.json(
        {
          error: `Organization limit reached. Your ${bestPlan} plan allows up to ${orgLimit} organization(s). Upgrade to create more.`,
          currentCount: currentOrgCount,
          limit: orgLimit,
        },
        { status: 403 }
      )
    }

    // Determine the new org's plan — inherit the best plan from user's existing orgs
    const newOrgPlan = bestPlan

    // Determine subscription details based on the inherited plan
    const now = new Date()
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    const subscriptionStatus = newOrgPlan === 'free' ? 'trialing' : 'active'
    const subscriptionEnd = newOrgPlan === 'free' ? thirtyDays : oneYear
    const trialEndsAt = newOrgPlan === 'free' ? thirtyDays : null

    // Create the organization with the inherited plan
    const org = await db.organization.create({
      data: {
        name,
        currency: 'NPR',
        vatEnabled: true,
        tdsEnabled: true,
        ssfEnabled: false,
        mode: 'simple',
        fiscalYear: '2081/82',
        plan: newOrgPlan,
        subscriptionStatus,
        subscriptionStart: now,
        subscriptionEnd,
        trialEndsAt,
      },
    })

    // Create UserOrganization link with admin role
    await db.userOrganization.create({
      data: {
        userId: effectiveUserId,
        organizationId: org.id,
        role: 'admin',
      },
    })

    // Create FiscalYear for the org
    await db.fiscalYear.create({
      data: {
        organizationId: org.id,
        name: '2081/82',
        startDate: new Date('2024-07-16'),
        endDate: new Date('2025-07-15'),
        isCurrent: true,
      },
    })

    // Seed Nepal COA - Create Account Groups
    const groupMap: Record<string, string> = {}
    for (const group of NEPAL_COA_GROUPS) {
      const created = await db.accountGroup.create({
        data: {
          organizationId: org.id,
          name: group.name,
          nameNepali: group.nameNepali,
          code: group.code,
          nature: group.nature,
          parentGroupId: group.parent ? groupMap[group.parent] : null,
          isSystem: ['1', '2', '3', '4', '5'].includes(group.code),
          sortOrder: parseInt(group.code) || 0,
        },
      })
      groupMap[group.code] = created.id
    }

    // Seed Nepal COA - Create Default Accounts
    for (const account of DEFAULT_ACCOUNTS) {
      const groupId = groupMap[account.groupCode]
      if (!groupId) continue

      await db.account.create({
        data: {
          organizationId: org.id,
          groupId: groupId,
          name: account.name,
          nameNepali: account.nameNepali,
          code: account.code,
          accountType: NEPAL_COA_GROUPS.find(g => g.code === account.groupCode)?.nature || 'asset',
          subType: account.subType,
          isSystem: account.isSystem,
          isActive: true,
          allowsDirectPosting: true,
          openingBalance: 0,
          currentBalance: 0,
        },
      })
    }

    // Create default tax rates
    await db.taxRate.createMany({
      data: [
        { organizationId: org.id, name: 'VAT 13%', taxType: 'vat', rate: 13, isDefault: true, isActive: true },
        { organizationId: org.id, name: 'TDS - Contract 1.5%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'TDS - Rent 15%', taxType: 'tds', rate: 15, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'TDS - Consultancy 15%', taxType: 'tds', rate: 15, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'TDS - Transport 1.5%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'SSF Total 31%', taxType: 'ssf', rate: 31, isDefault: false, isActive: false },
      ],
    })

    // Create default warehouse
    await db.warehouse.create({
      data: {
        organizationId: org.id,
        name: 'Main Warehouse',
        nameNepali: 'मुख्य गोदाम',
        isDefault: true,
      },
    })

    // Create Subscription record — inherit the best plan from user's existing orgs
    await db.subscription.create({
      data: {
        organizationId: org.id,
        plan: newOrgPlan,
        status: subscriptionStatus,
        currentPeriodStart: now,
        currentPeriodEnd: subscriptionEnd,
        trialEndsAt,
      },
    })

    // Audit log for org creation
    await db.auditLog.create({
      data: {
        organizationId: org.id,
        userId: effectiveUserId,
        action: 'create',
        module: 'organization',
        recordId: org.id,
        recordType: 'organization',
        details: JSON.stringify({
          action: 'create_organization',
          orgName: name,
          inheritedPlan: newOrgPlan,
          userBestPlan: bestPlan,
          performedBy: user.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan,
        mode: org.mode,
        language: org.language,
        currency: org.currency,
        vatEnabled: org.vatEnabled,
        tdsEnabled: org.tdsEnabled,
        ssfEnabled: org.ssfEnabled,
        fiscalYear: org.fiscalYear,
        subscriptionStatus: org.subscriptionStatus,
        inheritedPlan: newOrgPlan,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Organizations POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create organization', details: String(error) },
      { status: 500 }
    )
  }
}
