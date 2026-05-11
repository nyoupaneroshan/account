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

    if (action === 'assign_user_to_org') {
      const { userId, orgId, role } = body
      if (!userId || !orgId || !role) {
        return NextResponse.json(
          { error: 'userId, orgId, and role are required' },
          { status: 400 }
        )
      }
      if (!['admin', 'accountant', 'staff', 'viewer'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be one of: admin, accountant, staff, viewer' },
          { status: 400 }
        )
      }

      // Check user exists and is active
      const targetUser = await db.user.findUnique({ where: { id: userId } })
      if (!targetUser || !targetUser.isActive) {
        return NextResponse.json(
          { error: 'User not found or inactive' },
          { status: 404 }
        )
      }

      // Check org exists
      const org = await db.organization.findUnique({ where: { id: orgId } })
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      // Check if already a member
      const existing = await db.userOrganization.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
      })
      if (existing) {
        return NextResponse.json(
          { error: 'User is already a member of this organization', existingRole: existing.role },
          { status: 409 }
        )
      }

      const userOrg = await db.userOrganization.create({
        data: { userId, organizationId: orgId, role },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: adminUserId,
          action: 'create',
          module: 'user',
          recordId: userOrg.id,
          recordType: 'user_organization',
          details: JSON.stringify({
            action: 'assign_user_to_org',
            targetUser: targetUser.email,
            role,
            performedBy: adminUser.email,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: `${targetUser.name} assigned to organization with role: ${role}`,
      })
    }

    if (action === 'remove_user_from_org') {
      const { userId, orgId } = body
      if (!userId || !orgId) {
        return NextResponse.json(
          { error: 'userId and orgId are required' },
          { status: 400 }
        )
      }

      const userOrg = await db.userOrganization.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      })
      if (!userOrg) {
        return NextResponse.json(
          { error: 'User is not a member of this organization' },
          { status: 404 }
        )
      }

      // Don't allow removing the last admin
      if (userOrg.role === 'admin') {
        const adminCount = await db.userOrganization.count({
          where: { organizationId: orgId, role: 'admin' },
        })
        if (adminCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove the last admin from the organization. Assign another admin first.' },
            { status: 400 }
          )
        }
      }

      await db.userOrganization.delete({ where: { id: userOrg.id } })

      // Audit log
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: adminUserId,
          action: 'delete',
          module: 'user',
          recordId: userOrg.id,
          recordType: 'user_organization',
          details: JSON.stringify({
            action: 'remove_user_from_org',
            targetUser: userOrg.user.email,
            previousRole: userOrg.role,
            performedBy: adminUser.email,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: `${userOrg.user.name} removed from organization`,
      })
    }

    if (action === 'update_user_role') {
      const { userId, orgId, role } = body
      if (!userId || !orgId || !role) {
        return NextResponse.json(
          { error: 'userId, orgId, and role are required' },
          { status: 400 }
        )
      }
      if (!['admin', 'accountant', 'staff', 'viewer'].includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role. Must be one of: admin, accountant, staff, viewer' },
          { status: 400 }
        )
      }

      const userOrg = await db.userOrganization.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      })
      if (!userOrg) {
        return NextResponse.json(
          { error: 'User is not a member of this organization' },
          { status: 404 }
        )
      }

      const previousRole = userOrg.role
      const updated = await db.userOrganization.update({
        where: { id: userOrg.id },
        data: { role },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: adminUserId,
          action: 'update',
          module: 'user',
          recordId: updated.id,
          recordType: 'user_organization',
          details: JSON.stringify({
            action: 'update_user_role',
            targetUser: userOrg.user.email,
            previousRole,
            newRole: role,
            performedBy: adminUser.email,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: `Role updated from ${previousRole} to ${role} for ${userOrg.user.name}`,
      })
    }

    if (action === 'update_org') {
      const { orgId, name, plan, industry, language, address, city, province, phone, email: orgEmail, vatEnabled, mode } = body
      if (!orgId) {
        return NextResponse.json(
          { error: 'orgId is required' },
          { status: 400 }
        )
      }

      const org = await db.organization.findUnique({ where: { id: orgId } })
      if (!org) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }

      // Build update data from provided fields
      const updateData: Record<string, unknown> = {}
      if (name !== undefined) updateData.name = name
      if (plan !== undefined) {
        if (!['free', 'pro', 'enterprise'].includes(plan)) {
          return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
        }
        updateData.plan = plan
        updateData.subscriptionStatus = 'active'
      }
      if (industry !== undefined) updateData.industry = industry
      if (language !== undefined) updateData.language = language
      if (address !== undefined) updateData.address = address
      if (city !== undefined) updateData.city = city
      if (province !== undefined) updateData.province = province
      if (phone !== undefined) updateData.phone = phone
      if (orgEmail !== undefined) updateData.email = orgEmail
      if (vatEnabled !== undefined) updateData.vatEnabled = vatEnabled
      if (mode !== undefined) {
        if (!['simple', 'advanced'].includes(mode)) {
          return NextResponse.json({ error: 'Invalid mode. Must be simple or advanced' }, { status: 400 })
        }
        updateData.mode = mode
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No fields provided to update' },
          { status: 400 }
        )
      }

      await db.organization.update({
        where: { id: orgId },
        data: updateData,
      })

      // If plan changed, also update the Subscription record for consistency
      if (plan !== undefined) {
        const existingSub = await db.subscription.findUnique({ where: { organizationId: orgId } })
        if (existingSub) {
          await db.subscription.update({
            where: { id: existingSub.id },
            data: {
              plan: plan,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: plan === 'free'
                ? null
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              cancelledAt: null,
            },
          })
        } else {
          await db.subscription.create({
            data: {
              organizationId: orgId,
              plan: plan,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: plan === 'free'
                ? null
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          })
        }
      }

      // Audit log
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: adminUserId,
          action: 'update',
          module: 'organization',
          recordId: orgId,
          recordType: 'organization',
          details: JSON.stringify({
            action: 'update_org',
            updatedFields: Object.keys(updateData),
            performedBy: adminUser.email,
          }),
        },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Admin PATCH error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
