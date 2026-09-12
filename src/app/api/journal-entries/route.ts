import { db } from '@/lib/db'
import { isDebitNature } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'

// GET /api/journal-entries?orgId=xxx&voucherType=xxx&fromDate=xxx&toDate=xxx&page=1&limit=20
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const voucherType = searchParams.get('voucherType')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      isCancelled: false,
    }

    if (voucherType) {
      where.voucherType = voucherType
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate)
      where.date = dateFilter
    }

    const skip = (page - 1) * limit

    const [entries, total] = await Promise.all([
      db.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                include: { group: true },
              },
            },
            orderBy: { id: 'asc' },
          },
          fiscalYear: { select: { id: true, name: true } },
        },
        orderBy: [{ date: 'desc' }, { entryNumber: 'desc' }],
        skip,
        take: limit,
      }),
      db.journalEntry.count({ where }),
    ])

    return NextResponse.json({
      data: entries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Journal entries GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch journal entries', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/journal-entries - Create journal entry with lines
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orgId, date, narration, voucherType, lines, referenceType, referenceId, fiscalYearId } = body

    if (!orgId || !date || !narration || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, date, narration, lines' },
        { status: 400 }
      )
    }

    // Validate double-entry: total debits must equal total credits
    const totalDebit = lines.reduce((sum: number, l: { debit?: number; credit?: number }) => sum + (l.debit || 0), 0)
    const totalCredit = lines.reduce((sum: number, l: { debit?: number; credit?: number }) => sum + (l.credit || 0), 0)

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Double-entry validation failed: Total debits (${totalDebit}) must equal total credits (${totalCredit})` },
        { status: 400 }
      )
    }

    // Validate each line has an accountId and at least one of debit/credit > 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.accountId) {
        return NextResponse.json(
          { error: `Line ${i + 1}: accountId is required` },
          { status: 400 }
        )
      }
      if ((line.debit || 0) < 0 || (line.credit || 0) < 0) {
        return NextResponse.json(
          { error: `Line ${i + 1}: Debit and credit must be non-negative` },
          { status: 400 }
        )
      }
      if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
        return NextResponse.json(
          { error: `Line ${i + 1}: A line cannot have both debit and credit` },
          { status: 400 }
        )
      }
    }

    // Verify all accounts exist and belong to the org
    const accountIds = lines.map((l: { accountId: string }) => l.accountId)
    const accounts = await db.account.findMany({
      where: {
        id: { in: accountIds },
        organizationId: orgId,
        isActive: true,
      },
    })

    if (accounts.length !== accountIds.length) {
      const foundIds = new Set(accounts.map((a) => a.id))
      const missing = accountIds.filter((id: string) => !foundIds.has(id))
      return NextResponse.json(
        { error: `Accounts not found or inactive: ${missing.join(', ')}` },
        { status: 400 }
      )
    }

    // Auto-generate entry number
    const lastEntry = await db.journalEntry.findFirst({
      where: { organizationId: orgId },
      orderBy: { entryNumber: 'desc' },
      select: { entryNumber: true },
    })

    let nextNumber = 1
    if (lastEntry) {
      const match = lastEntry.entryNumber.match(/JE-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    const entryNumber = `JE-${String(nextNumber).padStart(3, '0')}`

    // Get current fiscal year if not provided
    let fyId = fiscalYearId
    if (!fyId) {
      const currentFY = await db.fiscalYear.findFirst({
        where: { organizationId: orgId, isCurrent: true },
      })
      fyId = currentFY?.id || null
    }

    // Create journal entry with lines in a transaction
    const entry = await db.$transaction(async (tx) => {
      const journalEntry = await tx.journalEntry.create({
        data: {
          organizationId: orgId,
          fiscalYearId: fyId,
          entryNumber,
          date: new Date(date),
          narration,
          voucherType: voucherType || 'journal',
          referenceType: referenceType || null,
          referenceId: referenceId || null,
          totalDebit,
          totalCredit,
          lines: {
            create: lines.map((l: { accountId: string; debit?: number; credit?: number; narration?: string; partyId?: string }) => ({
              accountId: l.accountId,
              debit: l.debit || 0,
              credit: l.credit || 0,
              narration: l.narration || null,
              partyId: l.partyId || null,
            })),
          },
        },
        include: {
          lines: {
            include: {
              account: {
                include: { group: true },
              },
            },
          },
        },
      })

      // Update account current balances
      for (const line of lines) {
        const account = accounts.find((a) => a.id === line.accountId)
        if (!account) continue

        let balanceAdjustment = 0
        if (isDebitNature(account.accountType)) {
          balanceAdjustment = (line.debit || 0) - (line.credit || 0)
        } else {
          balanceAdjustment = (line.credit || 0) - (line.debit || 0)
        }

        if (balanceAdjustment !== 0) {
          await tx.account.update({
            where: { id: account.id },
            data: { currentBalance: { increment: balanceAdjustment } },
          })
        }

        // Update party current balance if partyId is provided
        if (line.partyId) {
          const party = await tx.party.findUnique({ where: { id: line.partyId } })
          if (party) {
            let partyAdjustment = 0
            if (party.partyType === 'supplier') {
              partyAdjustment = (line.credit || 0) - (line.debit || 0)
            } else {
              partyAdjustment = (line.debit || 0) - (line.credit || 0)
            }
            if (partyAdjustment !== 0) {
              await tx.party.update({
                where: { id: party.id },
                data: { currentBalance: { increment: partyAdjustment } },
              })
            }
          }
        }
      }

      return journalEntry
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error('Journal entries POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create journal entry', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/journal-entries - Update journal entry
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, lines, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Journal entry id is required' }, { status: 400 })
    }

    const existing = await db.journalEntry.findUnique({
      where: { id },
      include: {
        lines: { include: { account: true } },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Journal entry not found' }, { status: 404 })
    }

    if (existing.isCancelled) {
      return NextResponse.json(
        { error: 'Cannot update a cancelled journal entry' },
        { status: 400 }
      )
    }

    // If lines are provided, validate double-entry
    if (lines && Array.isArray(lines) && lines.length > 0) {
      const totalDebit = lines.reduce((sum: number, l: { debit?: number; credit?: number }) => sum + (l.debit || 0), 0)
      const totalCredit = lines.reduce((sum: number, l: { debit?: number; credit?: number }) => sum + (l.credit || 0), 0)

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json(
          { error: `Double-entry validation failed: Total debits (${totalDebit}) must equal total credits (${totalCredit})` },
          { status: 400 }
        )
      }

      // Validate each line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (!line.accountId) {
          return NextResponse.json(
            { error: `Line ${i + 1}: accountId is required` },
            { status: 400 }
          )
        }
        if ((line.debit || 0) < 0 || (line.credit || 0) < 0) {
          return NextResponse.json(
            { error: `Line ${i + 1}: Debit and credit must be non-negative` },
            { status: 400 }
          )
        }
        if ((line.debit || 0) > 0 && (line.credit || 0) > 0) {
          return NextResponse.json(
            { error: `Line ${i + 1}: A line cannot have both debit and credit` },
            { status: 400 }
          )
        }
      }

      // Update in transaction: reverse old balances, apply new
      const updated = await db.$transaction(async (tx) => {
        // Reverse old entry's effect on account balances
        for (const oldLine of existing.lines) {
          const account = oldLine.account
          let balanceAdjustment = 0
          if (isDebitNature(account.accountType)) {
            balanceAdjustment = -(oldLine.debit - oldLine.credit)
          } else {
            balanceAdjustment = -(oldLine.credit - oldLine.debit)
          }

          if (balanceAdjustment !== 0) {
            await tx.account.update({
              where: { id: account.id },
              data: { currentBalance: { increment: balanceAdjustment } },
            })
          }
        }

        // Delete old lines
        await tx.journalEntryLine.deleteMany({
          where: { journalEntryId: id },
        })

        // Calculate new totals
        const newTotalDebit = lines.reduce((sum: number, l: { debit?: number }) => sum + (l.debit || 0), 0)
        const newTotalCredit = lines.reduce((sum: number, l: { credit?: number }) => sum + (l.credit || 0), 0)

        // Update the entry
        const entry = await tx.journalEntry.update({
          where: { id },
          data: {
            ...updateData.date ? { date: new Date(updateData.date) } : {},
            ...updateData.narration ? { narration: updateData.narration } : {},
            ...updateData.voucherType ? { voucherType: updateData.voucherType } : {},
            totalDebit: newTotalDebit,
            totalCredit: newTotalCredit,
            lines: {
              create: lines.map((l: { accountId: string; debit?: number; credit?: number; narration?: string; partyId?: string }) => ({
                accountId: l.accountId,
                debit: l.debit || 0,
                credit: l.credit || 0,
                narration: l.narration || null,
                partyId: l.partyId || null,
              })),
            },
          },
          include: {
            lines: {
              include: {
                account: {
                  include: { group: true },
                },
              },
            },
          },
        })

        // Apply new entry's effect on account balances
        const newAccounts = await tx.account.findMany({
          where: {
            id: { in: lines.map((l: { accountId: string }) => l.accountId) },
          },
        })

        for (const line of lines) {
          const account = newAccounts.find((a) => a.id === line.accountId)
          if (!account) continue

          let balanceAdjustment = 0
          if (isDebitNature(account.accountType)) {
            balanceAdjustment = (line.debit || 0) - (line.credit || 0)
          } else {
            balanceAdjustment = (line.credit || 0) - (line.debit || 0)
          }

          if (balanceAdjustment !== 0) {
            await tx.account.update({
              where: { id: account.id },
              data: { currentBalance: { increment: balanceAdjustment } },
            })
          }
        }

        return entry
      })

      return NextResponse.json(updated)
    }

    // Simple field update without lines change
    const data: Record<string, unknown> = {}
    if (updateData.date) data.date = new Date(updateData.date)
    if (updateData.narration) data.narration = updateData.narration
    if (updateData.voucherType) data.voucherType = updateData.voucherType
    if (updateData.isCancelled !== undefined) {
      data.isCancelled = updateData.isCancelled
      // If cancelling, reverse the account balances
      if (updateData.isCancelled === true) {
        await db.$transaction(async (tx) => {
          await tx.journalEntry.update({
            where: { id },
            data: { isCancelled: true },
          })

          for (const oldLine of existing.lines) {
            const account = oldLine.account
            let balanceAdjustment = 0
            if (isDebitNature(account.accountType)) {
              balanceAdjustment = -(oldLine.debit - oldLine.credit)
            } else {
              balanceAdjustment = -(oldLine.credit - oldLine.debit)
            }

            if (balanceAdjustment !== 0) {
              await tx.account.update({
                where: { id: account.id },
                data: { currentBalance: { increment: balanceAdjustment } },
              })
            }
          }
        })

        return NextResponse.json({ message: 'Journal entry cancelled successfully' })
      }
    }

    if (Object.keys(data).length > 0) {
      const updated = await db.journalEntry.update({
        where: { id },
        data,
        include: {
          lines: {
            include: {
              account: {
                include: { group: true },
              },
            },
          },
        },
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ message: 'No changes to apply' })
  } catch (error) {
    console.error('Journal entries PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update journal entry', details: String(error) },
      { status: 500 }
    )
  }
}
