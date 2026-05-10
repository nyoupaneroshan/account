import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

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
