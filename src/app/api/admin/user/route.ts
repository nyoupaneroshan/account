import { db } from '@/lib/db'
import { getSessionUserId } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Plan hierarchy for determining "best" plan
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

/**
 * GET - Fetch users belonging to a specific organization with security filtering
 * 
 * Security model:
 * - Requesting user must be authenticated
 * - Requesting user must be a member of the specified org (or super_admin)
 * - Sensitive data (email, phone) is only visible to:
 *   1. The user themselves
 *   2. Super admin (platform admin)
 *   3. Organization admin (for users within the same org)
 * - Other users can see: name, role, isActive, lastLoginAt
 * - Other users see email as masked (e.g. "r***@example.com") and phone as hidden
 * 
 * Query params: orgId (required)
 */
export async function GET(request: Request) {
  try {
    const requestingUserId = await getSessionUserId(request)
    if (!requestingUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      )
    }

    // Get the requesting user's details and their role in this org
    const requestingUser = await db.user.findUnique({
      where: { id: requestingUserId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!requestingUser || !requestingUser.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 403 }
      )
    }

    // Check if the requesting user is a member of this org (or super_admin)
    const requestingUserOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: requestingUserId,
          organizationId: orgId,
        },
      },
    })

    const isSuperAdmin = requestingUser.role === 'super_admin'
    const isOrgMember = requestingUserOrg !== null
    const isOrgAdmin = requestingUserOrg?.role === 'admin'

    // Only allow access if: super_admin OR member of the org
    if (!isSuperAdmin && !isOrgMember) {
      return NextResponse.json(
        { error: 'You do not have access to this organization\'s users' },
        { status: 403 }
      )
    }

    // Fetch all users belonging to this org
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
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Apply security filtering based on requesting user's permissions
    const canSeeFullEmail = isSuperAdmin || isOrgAdmin
    const members = userOrgs.map(uo => {
      const isSelf = uo.user.id === requestingUserId
      // User can always see their own full data
      // Org admins and super_admins can see full data for all users in their org
      const showFullData = isSelf || canSeeFullEmail

      return {
        id: uo.id,
        userId: uo.user.id,
        name: uo.user.name,
        nameNepali: uo.user.nameNepali,
        // Security: mask email unless the user is self, org admin, or super_admin
        email: showFullData
          ? uo.user.email
          : maskEmail(uo.user.email),
        // Security: hide phone unless the user is self, org admin, or super_admin
        phone: showFullData
          ? uo.user.phone
          : null,
        role: uo.role,
        userGlobalRole: uo.user.role,
        isActive: uo.user.isActive,
        lastLoginAt: uo.user.lastLoginAt ? uo.user.lastLoginAt.toISOString() : null,
        organizationName: uo.organization.name,
        isSelf,
        canSeeFullData: showFullData,
      }
    })

    // Audit log for sensitive data access (when full emails are visible)
    if (canSeeFullEmail) {
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: requestingUserId,
          action: 'read',
          module: 'user',
          recordType: 'user_list',
          details: JSON.stringify({
            action: 'view_org_users',
            orgId,
            viewerRole: requestingUserOrg?.role || 'super_admin',
            viewerIsSuperAdmin: isSuperAdmin,
            fullEmailAccess: true,
            userCount: members.length,
            performedBy: requestingUser.email,
          }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      members,
      viewerRole: requestingUserOrg?.role || (isSuperAdmin ? 'super_admin' : null),
      canManageUsers: isSuperAdmin || isOrgAdmin,
    })

  } catch (error) {
    console.error('Admin user GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization users', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * Mask an email address for privacy
 * e.g. "ramesh@sharma.com.np" -> "r***@sharma.com.np"
 */
function maskEmail(email: string): string {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return email
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`
}

/**
 * PUT - Toggle user active/inactive status (super_admin only)
 */
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { userId, isActive, adminUserId } = body

    // Validate required fields
    if (!userId || typeof isActive !== 'boolean' || !adminUserId) {
      return NextResponse.json(
        { error: 'userId, isActive (boolean), and adminUserId are required' },
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

    // Prevent deactivating yourself
    if (userId === adminUserId && !isActive) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Verify the target user exists
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deactivating other super admins (only super admins can manage super admins)
    if (targetUser.role === 'super_admin' && !isActive) {
      // Count remaining active super admins
      const activeSuperAdmins = await db.user.count({
        where: {
          role: 'super_admin',
          isActive: true,
        },
      })

      if (activeSuperAdmins <= 1) {
        return NextResponse.json(
          { error: 'Cannot deactivate the last super admin' },
          { status: 400 }
        )
      }
    }

    // Update user status
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { isActive: isActive },
    })

    // Create audit log for each organization the user belongs to
    for (const userOrg of targetUser.organizations) {
      await db.auditLog.create({
        data: {
          organizationId: userOrg.organization.id,
          userId: adminUserId,
          action: isActive ? 'update' : 'delete',
          module: 'user',
          recordId: userId,
          recordType: 'user',
          details: JSON.stringify({
            action: isActive ? 'activate' : 'deactivate',
            targetUser: targetUser.email,
            targetUserName: targetUser.name,
            performedBy: adminUser.email,
          }),
        },
      })
    }

    // Return updated user (exclude passwordHash)
    const { passwordHash: _, ...userSafe } = updatedUser

    return NextResponse.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: userSafe,
    })

  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user status', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST - Add a new user to an organization (org admin or super_admin only)
 */
export async function POST(request: Request) {
  try {
    const requestingUserId = await getSessionUserId(request)
    if (!requestingUserId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { orgId, name, email, role } = body

    if (!orgId || !name || !email || !role) {
      return NextResponse.json(
        { error: 'orgId, name, email, and role are required' },
        { status: 400 }
      )
    }

    // Validate role
    const VALID_ORG_ROLES = ['admin', 'accountant', 'staff', 'viewer']
    if (!VALID_ORG_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${VALID_ORG_ROLES.join(', ')}` },
        { status: 400 }
      )
    }

    // Check requesting user's permissions
    const requestingUser = await db.user.findUnique({
      where: { id: requestingUserId },
    })

    if (!requestingUser || !requestingUser.isActive) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 403 }
      )
    }

    const isSuperAdmin = requestingUser.role === 'super_admin'

    // Check if user is org admin for this org
    const requestingUserOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: requestingUserId,
          organizationId: orgId,
        },
      },
    })

    const isOrgAdmin = requestingUserOrg?.role === 'admin'

    if (!isSuperAdmin && !isOrgAdmin) {
      return NextResponse.json(
        { error: 'Only organization admins or super admins can add users' },
        { status: 403 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({ where: { email } })

    if (existingUser) {
      // Check if already in this org
      const existingMembership = await db.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: existingUser.id,
            organizationId: orgId,
          },
        },
      })

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this organization', existingRole: existingMembership.role },
          { status: 409 }
        )
      }

      // Add existing user to org
      const userOrg = await db.userOrganization.create({
        data: {
          userId: existingUser.id,
          organizationId: orgId,
          role,
        },
      })

      // Audit log
      await db.auditLog.create({
        data: {
          organizationId: orgId,
          userId: requestingUserId,
          action: 'create',
          module: 'user',
          recordId: userOrg.id,
          recordType: 'user_organization',
          details: JSON.stringify({
            action: 'add_existing_user_to_org',
            targetUser: existingUser.email,
            targetUserName: existingUser.name,
            role,
            performedBy: requestingUser.email,
          }),
        },
      })

      return NextResponse.json({
        success: true,
        message: `${existingUser.name} added to organization with role: ${role}`,
        member: {
          id: userOrg.id,
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: userOrg.role,
        },
      }, { status: 201 })
    }

    // Create new user (without password — they'll need to set one later)
    const newUser = await db.user.create({
      data: {
        email,
        name,
        role: 'user',
        isActive: true,
        language: 'en',
      },
    })

    // Add to org
    const userOrg = await db.userOrganization.create({
      data: {
        userId: newUser.id,
        organizationId: orgId,
        role,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        organizationId: orgId,
        userId: requestingUserId,
        action: 'create',
        module: 'user',
        recordId: userOrg.id,
        recordType: 'user_organization',
        details: JSON.stringify({
          action: 'add_new_user_to_org',
          targetUser: newUser.email,
          targetUserName: newUser.name,
          role,
          performedBy: requestingUser.email,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: `${newUser.name} added to organization with role: ${role}`,
      member: {
        id: userOrg.id,
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userOrg.role,
      },
    }, { status: 201 })

  } catch (error) {
    console.error('Admin user POST error:', error)
    return NextResponse.json(
      { error: 'Failed to add user to organization', details: String(error) },
      { status: 500 }
    )
  }
}
