import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

// Valid roles for organization membership
const VALID_ROLES = ['admin', 'accountant', 'staff', 'viewer']

/**
 * GET - Fetch all UserOrganization records for a given org
 * Query params: orgId (required), userId (admin's userId for auth check)
 */
export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const adminUserId = searchParams.get('userId') || userId

    // Verify the requesting user is a super_admin
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      )
    }

    // If orgId is 'all', fetch all UserOrganization records across all orgs
    if (orgId === 'all') {
      const userOrgs = await db.userOrganization.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              isActive: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      })

      const members = userOrgs.map(uo => ({
        id: uo.id,
        userId: uo.user.id,
        userName: uo.user.name,
        userEmail: uo.user.email,
        orgId: uo.organization.id,
        orgName: uo.organization.name,
        role: uo.role,
        joinedAt: uo.createdAt.toISOString(),
      }))

      return NextResponse.json({
        success: true,
        members,
      })
    }

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      )
    }

    // Fetch all UserOrganization records for this org with user details
    const userOrgs = await db.userOrganization.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            nameNepali: true,
            phone: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const members = userOrgs.map(uo => ({
      id: uo.id,
      userId: uo.user.id,
      email: uo.user.email,
      name: uo.user.name,
      nameNepali: uo.user.nameNepali,
      phone: uo.user.phone,
      role: uo.role,
      isActive: uo.user.isActive,
      lastLoginAt: uo.user.lastLoginAt ? uo.user.lastLoginAt.toISOString() : null,
      joinedAt: uo.createdAt.toISOString(),
    }))

    return NextResponse.json({
      success: true,
      members,
    })

  } catch (error) {
    console.error('RBAC GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization members', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST - Add a user to an organization
 * Body: { adminUserId, email, organizationId, role }
 */
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { adminUserId, email, organizationId, role } = body

    // Validate required fields
    if (!adminUserId || !email || !organizationId || !role) {
      return NextResponse.json(
        { error: 'adminUserId, email, organizationId, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the requesting user is a super_admin
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      )
    }

    // Find user by email
    const targetUser = await db.user.findUnique({ where: { email } })
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found with this email address' },
        { status: 404 }
      )
    }

    if (!targetUser.isActive) {
      return NextResponse.json(
        { error: 'Cannot add an inactive user to an organization' },
        { status: 400 }
      )
    }

    // Check if user is already in this organization
    const existingMembership = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId,
        },
      },
    })

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User is already a member of this organization', existingRole: existingMembership.role },
        { status: 409 }
      )
    }

    // Verify organization exists
    const org = await db.organization.findUnique({ where: { id: organizationId } })
    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Create UserOrganization record
    const userOrg = await db.userOrganization.create({
      data: {
        userId: targetUser.id,
        organizationId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId,
        userId: adminUserId,
        action: 'create',
        module: 'user',
        recordId: userOrg.id,
        recordType: 'user_organization',
        details: JSON.stringify({
          action: 'add_user_to_org',
          targetUser: targetUser.email,
          targetUserName: targetUser.name,
          role,
          performedBy: adminUser.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `${targetUser.name} added to organization with role: ${role}`,
      member: {
        id: userOrg.id,
        userId: userOrg.user.id,
        email: userOrg.user.email,
        name: userOrg.user.name,
        role: userOrg.role,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('RBAC POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add user to organization', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update a user's role in an organization (alternative to PUT)
 * Body: { adminUserId, userId, organizationId, role }
 */
export async function PATCH(request: Request) {
  try {
    const currentUserId = await getSessionUserId()
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { adminUserId, userId, organizationId, role } = body

    // Validate required fields
    if (!adminUserId || !userId || !organizationId || !role) {
      return NextResponse.json(
        { error: 'adminUserId, userId, organizationId, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the requesting user is a super_admin
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      )
    }

    // Find the existing UserOrganization record
    const userOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 404 }
      )
    }

    const previousRole = userOrg.role

    // Update the UserOrganization record
    const updated = await db.userOrganization.update({
      where: { id: userOrg.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId,
        userId: adminUserId,
        action: 'update',
        module: 'user',
        recordId: updated.id,
        recordType: 'user_organization',
        details: JSON.stringify({
          action: 'update_role',
          targetUser: updated.user.email,
          targetUserName: updated.user.name,
          previousRole,
          newRole: role,
          performedBy: adminUser.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Role updated from ${previousRole} to ${role} for ${updated.user.name}`,
      member: {
        id: updated.id,
        userId: updated.user.id,
        email: updated.user.email,
        name: updated.user.name,
        role: updated.role,
      },
    })

  } catch (error) {
    console.error('RBAC PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update user role', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update a user's role in an organization
 * Body: { adminUserId, userId, organizationId, role }
 */
export async function PUT(request: Request) {
  try {
    const currentUserId = await getSessionUserId()
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { adminUserId, userId, organizationId, role } = body

    // Validate required fields
    if (!adminUserId || !userId || !organizationId || !role) {
      return NextResponse.json(
        { error: 'adminUserId, userId, organizationId, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify the requesting user is a super_admin
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      )
    }

    // Find the existing UserOrganization record
    const userOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: 'User is not a member of this organization' },
        { status: 404 }
      )
    }

    const previousRole = userOrg.role

    // Update the UserOrganization record
    const updated = await db.userOrganization.update({
      where: { id: userOrg.id },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId,
        userId: adminUserId,
        action: 'update',
        module: 'user',
        recordId: updated.id,
        recordType: 'user_organization',
        details: JSON.stringify({
          action: 'update_role',
          targetUser: updated.user.email,
          targetUserName: updated.user.name,
          previousRole,
          newRole: role,
          performedBy: adminUser.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `Role updated from ${previousRole} to ${role} for ${updated.user.name}`,
      member: {
        id: updated.id,
        userId: updated.user.id,
        email: updated.user.email,
        name: updated.user.name,
        role: updated.role,
      },
    })

  } catch (error) {
    console.error('RBAC PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update user role', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove a user from an organization
 * Body: { adminUserId, userId, organizationId }
 */
export async function DELETE(request: Request) {
  try {
    const currentUserId = await getSessionUserId()
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { adminUserId, userId, organizationId } = body

    // Validate required fields
    if (!adminUserId || !userId || !organizationId) {
      return NextResponse.json(
        { error: 'adminUserId, userId, and organizationId are required' },
        { status: 400 }
      )
    }

    // Verify the requesting user is a super_admin
    const adminUser = await db.user.findUnique({ where: { id: adminUserId } })
    if (!adminUser || adminUser.role !== 'super_admin' || !adminUser.isActive) {
      return NextResponse.json(
        { error: 'Unauthorized. Super admin access required.' },
        { status: 403 }
      )
    }

    // Find the existing UserOrganization record
    const userOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
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
        where: {
          organizationId,
          role: 'admin',
        },
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin from the organization. Assign another admin first.' },
          { status: 400 }
        )
      }
    }

    // Delete the UserOrganization record
    await db.userOrganization.delete({
      where: { id: userOrg.id },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        organizationId,
        userId: adminUserId,
        action: 'delete',
        module: 'user',
        recordId: userOrg.id,
        recordType: 'user_organization',
        details: JSON.stringify({
          action: 'remove_user_from_org',
          targetUser: userOrg.user.email,
          targetUserName: userOrg.user.name,
          previousRole: userOrg.role,
          performedBy: adminUser.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `${userOrg.user.name} removed from organization`,
    })

  } catch (error) {
    console.error('RBAC DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to remove user from organization', details: String(error) },
      { status: 500 }
    )
  }
}
