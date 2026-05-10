import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/accounts?orgId=xxx&type=asset&search=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const type = searchParams.get('type')
    const search = searchParams.get('search')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      isActive: true,
    }

    if (type) {
      where.accountType = type
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameNepali: { contains: search } },
        { code: { contains: search } },
      ]
    }

    const accounts = await db.account.findMany({
      where,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            nameNepali: true,
            code: true,
            nature: true,
          },
        },
      },
      orderBy: [{ code: 'asc' }],
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Accounts GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch accounts', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/accounts - Create account
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orgId, name, nameNepali, code, groupId, accountType, subType, openingBalance } = body

    if (!orgId || !name || !code || !groupId || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, name, code, groupId, accountType' },
        { status: 400 }
      )
    }

    // Validate account type
    const validTypes = ['asset', 'liability', 'equity', 'income', 'expense']
    if (!validTypes.includes(accountType)) {
      return NextResponse.json(
        { error: `Invalid accountType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check for duplicate code within organization
    const existing = await db.account.findUnique({
      where: { organizationId_code: { organizationId: orgId, code } },
    })
    if (existing) {
      return NextResponse.json(
        { error: `Account with code "${code}" already exists in this organization` },
        { status: 409 }
      )
    }

    // Verify group exists and belongs to org
    const group = await db.accountGroup.findFirst({
      where: { id: groupId, organizationId: orgId },
    })
    if (!group) {
      return NextResponse.json({ error: 'Account group not found in this organization' }, { status: 404 })
    }

    const balance = openingBalance || 0

    const account = await db.account.create({
      data: {
        organizationId: orgId,
        name,
        nameNepali: nameNepali || null,
        code,
        groupId,
        accountType,
        subType: subType || null,
        openingBalance: balance,
        currentBalance: balance,
        isSystem: false,
        isActive: true,
        allowsDirectPosting: true,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            nameNepali: true,
            code: true,
            nature: true,
          },
        },
      },
    })

    return NextResponse.json(account, { status: 201 })
  } catch (error) {
    console.error('Accounts POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create account', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/accounts - Update account
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    // Check account exists
    const existing = await db.account.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (existing.isSystem) {
      // Allow only limited updates on system accounts
      const allowedFields = ['name', 'nameNepali']
      const filteredData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          filteredData[field] = updateData[field]
        }
      }
      if (Object.keys(filteredData).length === 0) {
        return NextResponse.json(
          { error: 'System accounts can only have name and nameNepali updated' },
          { status: 400 }
        )
      }

      const updated = await db.account.update({
        where: { id },
        data: filteredData,
        include: {
          group: {
            select: {
              id: true,
              name: true,
              nameNepali: true,
              code: true,
              nature: true,
            },
          },
        },
      })

      return NextResponse.json(updated)
    }

    // Build update data, excluding protected fields
    const allowedUpdateFields = [
      'name', 'nameNepali', 'code', 'groupId', 'accountType',
      'subType', 'openingBalance', 'allowsDirectPosting',
    ]
    const data: Record<string, unknown> = {}
    for (const field of allowedUpdateFields) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field]
      }
    }

    // If code is being changed, check for duplicates
    if (data.code && data.code !== existing.code) {
      const duplicate = await db.account.findUnique({
        where: { organizationId_code: { organizationId: existing.organizationId, code: data.code as string } },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `Account with code "${data.code}" already exists` },
          { status: 409 }
        )
      }
    }

    const updated = await db.account.update({
      where: { id },
      data,
      include: {
        group: {
          select: {
            id: true,
            name: true,
            nameNepali: true,
            code: true,
            nature: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Accounts PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update account', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/accounts - Soft delete
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    const existing = await db.account.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (existing.isSystem) {
      return NextResponse.json(
        { error: 'System accounts cannot be deleted' },
        { status: 403 }
      )
    }

    // Check if account has journal lines
    const lineCount = await db.journalEntryLine.count({
      where: { accountId: id },
    })

    if (lineCount > 0) {
      // Soft delete only
      await db.account.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ message: 'Account deactivated (has existing transactions)', deactivated: true })
    }

    // Hard delete if no transactions
    await db.account.delete({ where: { id } })
    return NextResponse.json({ message: 'Account deleted successfully', deleted: true })
  } catch (error) {
    console.error('Accounts DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account', details: String(error) },
      { status: 500 }
    )
  }
}
