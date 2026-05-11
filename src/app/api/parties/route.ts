import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/parties?orgId=xxx&partyType=customer&search=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const partyType = searchParams.get('partyType')
    const search = searchParams.get('search')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      isActive: true,
    }

    if (partyType) {
      where.partyType = partyType
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameNepali: { contains: search } },
        { panNumber: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const parties = await db.party.findMany({
      where,
      orderBy: [{ name: 'asc' }],
    })

    return NextResponse.json(parties)
  } catch (error) {
    console.error('Parties GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch parties', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/parties - Create party
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orgId, name, nameNepali, panNumber, partyType,
      email, phone, address, city, province, contactPerson,
      creditLimit, openingBalance, balanceType,
      isTdsApplicable, tdsCategory, tdsRate, tdsPAN, isSSFAplicable,
      bankName, bankAccount, notes,
    } = body

    if (!orgId || !name || !partyType) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, name, partyType' },
        { status: 400 }
      )
    }

    const validPartyTypes = ['customer', 'supplier', 'both', 'employee']
    if (!validPartyTypes.includes(partyType)) {
      return NextResponse.json(
        { error: `Invalid partyType. Must be one of: ${validPartyTypes.join(', ')}` },
        { status: 400 }
      )
    }

    const party = await db.party.create({
      data: {
        organizationId: orgId,
        name,
        nameNepali: nameNepali || null,
        panNumber: panNumber || null,
        partyType,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        province: province || null,
        contactPerson: contactPerson || null,
        creditLimit: creditLimit || null,
        openingBalance: openingBalance || 0,
        balanceType: balanceType || null,
        currentBalance: openingBalance || 0,
        isTdsApplicable: isTdsApplicable || false,
        tdsCategory: tdsCategory || null,
        tdsRate: tdsRate || null,
        tdsPAN: tdsPAN || null,
        isSSFAplicable: isSSFAplicable || false,
        bankName: bankName || null,
        bankAccount: bankAccount || null,
        notes: notes || null,
      },
    })

    return NextResponse.json(party, { status: 201 })
  } catch (error) {
    console.error('Parties POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create party', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/parties - Update party
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Party id is required' }, { status: 400 })
    }

    const existing = await db.party.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    const allowedFields = [
      'name', 'nameNepali', 'panNumber', 'partyType',
      'email', 'phone', 'address', 'city', 'province', 'contactPerson',
      'creditLimit', 'openingBalance', 'balanceType',
      'isTdsApplicable', 'tdsCategory', 'tdsRate', 'tdsPAN', 'isSSFAplicable',
      'bankName', 'bankAccount', 'notes',
    ]

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field]
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const updated = await db.party.update({
      where: { id },
      data,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Parties PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update party', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/parties - Soft delete
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Party id is required' }, { status: 400 })
    }

    const existing = await db.party.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Party not found' }, { status: 404 })
    }

    // Check if party has related invoices or purchase bills
    const [invoiceCount, purchaseBillCount] = await Promise.all([
      db.invoice.count({ where: { partyId: id } }),
      db.purchaseBill.count({ where: { partyId: id } }),
    ])

    if (invoiceCount > 0 || purchaseBillCount > 0) {
      // Soft delete
      await db.party.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        message: 'Party deactivated (has existing transactions)',
        deactivated: true,
      })
    }

    // Hard delete if no transactions
    await db.party.delete({ where: { id } })
    return NextResponse.json({ message: 'Party deleted successfully', deleted: true })
  } catch (error) {
    console.error('Parties DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete party', details: String(error) },
      { status: 500 }
    )
  }
}
