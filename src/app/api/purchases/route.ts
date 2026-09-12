import { db } from '@/lib/db'
import { NEPAL_VAT_RATE, isDebitNature } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'

// GET /api/purchases?orgId=xxx&status=xxx&fromDate=xxx&toDate=xxx&partyId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const status = searchParams.get('status')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')
    const partyId = searchParams.get('partyId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
    }

    if (status) {
      where.status = status
    }

    if (partyId) {
      where.partyId = partyId
    }

    if (fromDate || toDate) {
      const dateFilter: Record<string, Date> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate)
      where.date = dateFilter
    }

    const purchaseBills = await db.purchaseBill.findMany({
      where,
      include: {
        lines: {
          include: {
            product: { select: { id: true, name: true, code: true, unit: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ date: 'desc' }, { billNumber: 'desc' }],
    })

    // Get party info separately
    const partyIds = [...new Set(purchaseBills.map((pb) => pb.partyId).filter(Boolean))] as string[]
    const parties = partyIds.length > 0
      ? await db.party.findMany({
          where: { id: { in: partyIds } },
          select: { id: true, name: true, nameNepali: true, panNumber: true, partyType: true },
        })
      : []

    const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]))

    const result = purchaseBills.map((pb) => ({
      ...pb,
      party: pb.partyId ? partyMap[pb.partyId] || null : null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Purchases GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase bills', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/purchases - Create purchase bill with lines
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orgId, date, dueDate, partyId, billType,
      warehouseId, supplierBillNo,
      lines, discountAmount, notes, tdsAmount,
    } = body

    if (!orgId || !date || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, date, lines' },
        { status: 400 }
      )
    }

    // Calculate line totals
    let subtotal = 0
    let totalTaxableAmount = 0
    let totalVatAmount = 0
    let totalAmount = 0

    const processedLines = lines.map(
      (line: {
        productId?: string
        description: string
        quantity?: number
        unit?: string
        unitPrice?: number
        vatRate?: number
        discountPercent?: number
        batchNumber?: string
        expiryDate?: string
      }, index: number) => {
        const qty = line.quantity || 1
        const price = line.unitPrice || 0
        const discountPct = line.discountPercent || 0

        const lineSubtotal = qty * price
        const lineDiscount = lineSubtotal * (discountPct / 100)
        const lineTaxableAmount = lineSubtotal - lineDiscount
        const vatRate = line.vatRate !== undefined ? line.vatRate : NEPAL_VAT_RATE * 100
        const lineVatAmount = lineTaxableAmount * (vatRate / 100)
        const lineTotalAmount = lineTaxableAmount + lineVatAmount

        subtotal += lineSubtotal
        totalTaxableAmount += lineTaxableAmount
        totalVatAmount += lineVatAmount
        totalAmount += lineTotalAmount

        return {
          productId: line.productId || null,
          description: line.description,
          quantity: qty,
          unit: line.unit || null,
          unitPrice: price,
          discountPercent: discountPct,
          discountAmount: lineDiscount,
          taxableAmount: lineTaxableAmount,
          vatRate: vatRate,
          vatAmount: lineVatAmount,
          totalAmount: lineTotalAmount,
          batchNumber: line.batchNumber || null,
          expiryDate: line.expiryDate ? new Date(line.expiryDate) : null,
          sortOrder: index,
        }
      }
    )

    // Apply bill-level discount
    const billDiscount = discountAmount || 0
    totalAmount -= billDiscount

    // Auto-generate bill number
    const lastBill = await db.purchaseBill.findFirst({
      where: { organizationId: orgId },
      orderBy: { billNumber: 'desc' },
      select: { billNumber: true },
    })

    let nextNumber = 1
    if (lastBill) {
      const match = lastBill.billNumber.match(/PUR-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    const billNumber = `PUR-${String(nextNumber).padStart(3, '0')}`

    // Determine warehouse
    let whId = warehouseId
    if (!whId) {
      const defaultWarehouse = await db.warehouse.findFirst({
        where: { organizationId: orgId, isDefault: true, isActive: true },
      })
      whId = defaultWarehouse?.id
    }

    // Create purchase bill with auto journal entry in a transaction
    const purchaseBill = await db.$transaction(async (tx) => {
      const pb = await tx.purchaseBill.create({
        data: {
          organizationId: orgId,
          billNumber,
          supplierBillNo: supplierBillNo || null,
          date: new Date(date),
          dueDate: dueDate ? new Date(dueDate) : null,
          partyId: partyId || null,
          billType: billType || 'purchase',
          status: 'draft',
          subtotal,
          discountAmount: billDiscount,
          taxableAmount: totalTaxableAmount,
          vatAmount: totalVatAmount,
          totalAmount,
          amountPaid: 0,
          amountDue: totalAmount,
          tdsAmount: tdsAmount || 0,
          warehouseId: whId || null,
          notes: notes || null,
          lines: {
            create: processedLines,
          },
        },
        include: {
          lines: {
            include: {
              product: { select: { id: true, name: true, code: true, unit: true } },
            },
          },
        },
      })

      // Auto-create journal entry
      // Debit: Inventory/Cost + Input VAT, Credit: Payable/Cash
      const inventoryAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'inventory', isActive: true },
      })
      const cogsAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'cogs', isActive: true },
      })
      const vatInputAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'vat_input', isActive: true },
      })
      const payableAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'payable', isActive: true },
      })
      const cashAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'cash', isActive: true },
      })

      if ((inventoryAccount || cogsAccount) && payableAccount) {
        const debitAccount = inventoryAccount || cogsAccount!
        const creditAccount = partyId ? payableAccount : (cashAccount || payableAccount)

        const journalLines: { accountId: string; debit: number; credit: number; narration: string }[] = [
          { accountId: debitAccount.id, debit: totalTaxableAmount, credit: 0, narration: `Purchase - ${billNumber}` },
        ]

        if (totalVatAmount > 0 && vatInputAccount) {
          journalLines.push({
            accountId: vatInputAccount.id,
            debit: totalVatAmount,
            credit: 0,
            narration: `Input VAT - ${billNumber}`,
          })
        }

        journalLines.push({
          accountId: creditAccount.id,
          debit: 0,
          credit: totalAmount,
          narration: `Payable - ${billNumber}`,
        })

        // Auto-generate entry number
        const lastEntry = await tx.journalEntry.findFirst({
          where: { organizationId: orgId },
          orderBy: { entryNumber: 'desc' },
          select: { entryNumber: true },
        })

        let entryNextNumber = 1
        if (lastEntry) {
          const match = lastEntry.entryNumber.match(/JE-(\d+)/)
          if (match) {
            entryNextNumber = parseInt(match[1]) + 1
          }
        }
        const entryNumber = `JE-${String(entryNextNumber).padStart(3, '0')}`

        const jeTotalDebit = journalLines.reduce((s, l) => s + l.debit, 0)
        const jeTotalCredit = journalLines.reduce((s, l) => s + l.credit, 0)

        const journalEntry = await tx.journalEntry.create({
          data: {
            organizationId: orgId,
            entryNumber,
            date: new Date(date),
            narration: `Purchase Bill ${billNumber}`,
            voucherType: 'purchase',
            referenceType: 'purchase_bill',
            referenceId: pb.id,
            totalDebit: jeTotalDebit,
            totalCredit: jeTotalCredit,
            lines: { create: journalLines },
          },
        })

        // Update account balances
        for (const line of journalLines) {
          const account = await tx.account.findUnique({ where: { id: line.accountId } })
          if (!account) continue

          let balanceAdjustment = 0
          if (isDebitNature(account.accountType)) {
            balanceAdjustment = line.debit - line.credit
          } else {
            balanceAdjustment = line.credit - line.debit
          }

          if (balanceAdjustment !== 0) {
            await tx.account.update({
              where: { id: account.id },
              data: { currentBalance: { increment: balanceAdjustment } },
            })
          }
        }

        // Link journal entry to purchase bill
        await tx.purchaseBill.update({
          where: { id: pb.id },
          data: { journalEntryId: journalEntry.id },
        })
      }

      // Create stock transactions for product lines
      if (whId) {
        for (const line of processedLines) {
          if (line.productId) {
            const product = await tx.product.findUnique({ where: { id: line.productId } })
            if (product && product.productType === 'goods') {
              await tx.stockTransaction.create({
                data: {
                  organizationId: orgId,
                  productId: line.productId,
                  warehouseId: whId,
                  transactionType: 'purchase',
                  quantity: line.quantity,
                  referenceType: 'purchase_bill',
                  referenceId: pb.id,
                  batchNumber: line.batchNumber,
                  expiryDate: line.expiryDate,
                  costPrice: line.unitPrice,
                  notes: `Purchase Bill ${billNumber}`,
                },
              })

              // Update or create stock level
              const existingStock = await tx.stockLevel.findFirst({
                where: {
                  productId: line.productId,
                  warehouseId: whId,
                  ...(line.batchNumber ? { batchNumber: line.batchNumber } : {}),
                },
              })

              if (existingStock) {
                await tx.stockLevel.update({
                  where: { id: existingStock.id },
                  data: {
                    quantity: { increment: line.quantity },
                    costPrice: line.unitPrice,
                  },
                })
              } else {
                await tx.stockLevel.create({
                  data: {
                    organizationId: orgId,
                    productId: line.productId,
                    warehouseId: whId,
                    quantity: line.quantity,
                    batchNumber: line.batchNumber,
                    expiryDate: line.expiryDate,
                    costPrice: line.unitPrice,
                  },
                })
              }
            }
          }
        }
      }

      // Update party balance (increase payable)
      if (partyId) {
        await tx.party.update({
          where: { id: partyId },
          data: { currentBalance: { increment: totalAmount } },
        })
      }

      return pb
    })

    // Fetch with party info
    let party: any = null
    if (partyId) {
      party = await db.party.findUnique({
        where: { id: partyId },
        select: { id: true, name: true, nameNepali: true, panNumber: true, partyType: true },
      })
    }

    return NextResponse.json({ ...purchaseBill, party }, { status: 201 })
  } catch (error) {
    console.error('Purchases POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase bill', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/purchases - Update purchase bill status
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, status, amountPaid } = body

    if (!id) {
      return NextResponse.json({ error: 'Purchase bill id is required' }, { status: 400 })
    }

    const existing = await db.purchaseBill.findUnique({
      where: { id },
      include: { lines: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Purchase bill not found' }, { status: 404 })
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot update a cancelled purchase bill' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}

    if (status) {
      const validStatuses = ['draft', 'received', 'paid', 'partial', 'cancelled']
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      data.status = status
    }

    if (amountPaid !== undefined) {
      data.amountPaid = amountPaid
      data.amountDue = existing.totalAmount - amountPaid

      // Auto-determine status based on payment
      if (amountPaid >= existing.totalAmount) {
        data.status = 'paid'
      } else if (amountPaid > 0) {
        data.status = 'partial'
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // If cancelling, reverse journal entry
    if (status === 'cancelled' && existing.journalEntryId) {
      await db.$transaction(async (tx) => {
        await tx.purchaseBill.update({ where: { id }, data: { status: 'cancelled' } })

        const je = await tx.journalEntry.findUnique({
          where: { id: existing.journalEntryId! },
          include: { lines: { include: { account: true } } },
        })

        if (je && !je.isCancelled) {
          await tx.journalEntry.update({
            where: { id: je.id },
            data: { isCancelled: true },
          })

          for (const line of je.lines) {
            const account = line.account
            let balanceAdjustment = 0
            if (isDebitNature(account.accountType)) {
              balanceAdjustment = -(line.debit - line.credit)
            } else {
              balanceAdjustment = -(line.credit - line.debit)
            }

            if (balanceAdjustment !== 0) {
              await tx.account.update({
                where: { id: account.id },
                data: { currentBalance: { increment: balanceAdjustment } },
              })
            }
          }
        }

        // Reverse stock transactions
        const stockTransactions = await tx.stockTransaction.findMany({
          where: { referenceType: 'purchase_bill', referenceId: id },
        })

        for (const st of stockTransactions) {
          await tx.stockTransaction.create({
            data: {
              organizationId: st.organizationId,
              productId: st.productId,
              warehouseId: st.warehouseId,
              transactionType: 'return_out',
              quantity: st.quantity,
              referenceType: 'purchase_bill',
              referenceId: id,
              costPrice: st.costPrice,
              notes: `Cancelled purchase bill - reversal`,
            },
          })

          const stockLevel = await tx.stockLevel.findFirst({
            where: {
              productId: st.productId,
              warehouseId: st.warehouseId,
            },
          })

          if (stockLevel) {
            await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: { quantity: { decrement: st.quantity } },
            })
          }
        }

        // Reverse party balance
        if (existing.partyId) {
          await tx.party.update({
            where: { id: existing.partyId },
            data: { currentBalance: { decrement: existing.totalAmount } },
          })
        }
      })

      return NextResponse.json({ message: 'Purchase bill cancelled successfully' })
    }

    const updated = await db.purchaseBill.update({
      where: { id },
      data,
      include: {
        lines: {
          include: {
            product: { select: { id: true, name: true, code: true, unit: true } },
          },
        },
      },
    })

    // If payment made, create payment journal entry
    if (amountPaid !== undefined && amountPaid > 0 && existing.partyId && status !== 'cancelled') {
      const cashAccount = await db.account.findFirst({
        where: { organizationId: existing.organizationId, subType: 'cash', isActive: true },
      })
      const payableAccount = await db.account.findFirst({
        where: { organizationId: existing.organizationId, subType: 'payable', isActive: true },
      })

      if (cashAccount && payableAccount) {
        await db.$transaction(async (tx) => {
          const lastEntry = await tx.journalEntry.findFirst({
            where: { organizationId: existing.organizationId },
            orderBy: { entryNumber: 'desc' },
            select: { entryNumber: true },
          })

          let entryNextNumber = 1
          if (lastEntry) {
            const match = lastEntry.entryNumber.match(/JE-(\d+)/)
            if (match) {
              entryNextNumber = parseInt(match[1]) + 1
            }
          }
          const entryNumber = `JE-${String(entryNextNumber).padStart(3, '0')}`

          await tx.journalEntry.create({
            data: {
              organizationId: existing.organizationId,
              entryNumber,
              date: new Date(),
              narration: `Payment made for Purchase Bill ${existing.billNumber}`,
              voucherType: 'payment',
              referenceType: 'purchase_bill',
              referenceId: id,
              totalDebit: amountPaid,
              totalCredit: amountPaid,
              lines: {
                create: [
                  { accountId: payableAccount.id, debit: amountPaid, credit: 0, narration: 'Payable cleared' },
                  { accountId: cashAccount.id, debit: 0, credit: amountPaid, narration: 'Cash paid' },
                ],
              },
            },
          })

          // Update account balances
          await tx.account.update({
            where: { id: payableAccount.id },
            data: { currentBalance: { decrement: amountPaid } },
          })
          await tx.account.update({
            where: { id: cashAccount.id },
            data: { currentBalance: { decrement: amountPaid } },
          })

          // Reduce party balance
          await tx.party.update({
            where: { id: existing.partyId! },
            data: { currentBalance: { decrement: amountPaid } },
          })
        })
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Purchases PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase bill', details: String(error) },
      { status: 500 }
    )
  }
}
