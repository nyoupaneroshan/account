import { db } from '@/lib/db'
import { NEPAL_VAT_RATE, isDebitNature } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'

// GET /api/invoices?orgId=xxx&status=xxx&fromDate=xxx&toDate=xxx&partyId=xxx
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

    const invoices = await db.invoice.findMany({
      where,
      include: {
        lines: {
          include: {
            product: { select: { id: true, name: true, code: true, unit: true } },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: [{ date: 'desc' }, { invoiceNumber: 'desc' }],
    })

    // Get party info separately
    const partyIds = [...new Set(invoices.map((inv) => inv.partyId).filter(Boolean))] as string[]
    const parties = partyIds.length > 0
      ? await db.party.findMany({
          where: { id: { in: partyIds } },
          select: { id: true, name: true, nameNepali: true, panNumber: true, partyType: true },
        })
      : []

    const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]))

    const result = invoices.map((inv) => ({
      ...inv,
      party: inv.partyId ? partyMap[inv.partyId] || null : null,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('Invoices GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/invoices - Create invoice with lines
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orgId, date, dueDate, partyId, invoiceType,
      lines, discountAmount, notes, terms,
      billingAddress, shippingAddress, panNumber,
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
      }, index: number) => {
        const qty = line.quantity || 1
        const price = line.unitPrice || 0
        const discountPct = line.discountPercent || 0

        const lineSubtotal = qty * price
        const lineDiscount = lineSubtotal * (discountPct / 100)
        const lineTaxableAmount = lineSubtotal - lineDiscount
        const vatRate = line.vatRate !== undefined ? line.vatRate : NEPAL_VAT_RATE * 100 // stored as percentage
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
          sortOrder: index,
        }
      }
    )

    // Apply invoice-level discount
    const invoiceDiscount = discountAmount || 0
    totalAmount -= invoiceDiscount

    // Auto-generate invoice number
    const lastInvoice = await db.invoice.findFirst({
      where: { organizationId: orgId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    })

    let nextNumber = 1
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/)
      if (match) {
        nextNumber = parseInt(match[1]) + 1
      }
    }
    const invoiceNumber = `INV-${String(nextNumber).padStart(3, '0')}`

    // Create invoice with auto journal entry in a transaction
    const invoice = await db.$transaction(async (tx) => {
      // Create invoice
      const inv = await tx.invoice.create({
        data: {
          organizationId: orgId,
          invoiceNumber,
          date: new Date(date),
          dueDate: dueDate ? new Date(dueDate) : null,
          partyId: partyId || null,
          invoiceType: invoiceType || 'sales',
          status: 'draft',
          subtotal,
          discountAmount: invoiceDiscount,
          taxableAmount: totalTaxableAmount,
          vatAmount: totalVatAmount,
          totalAmount,
          amountPaid: 0,
          amountDue: totalAmount,
          panNumber: panNumber || null,
          billingAddress: billingAddress || null,
          shippingAddress: shippingAddress || null,
          notes: notes || null,
          terms: terms || null,
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
      // Debit: Receivable (or Cash if no party), Credit: Sales Revenue + Output VAT
      const receivableAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'receivable', isActive: true },
      })
      const cashAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'cash', isActive: true },
      })
      const salesAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'sales', isActive: true },
      })
      const serviceAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'service_income', isActive: true },
      })
      const vatOutputAccount = await tx.account.findFirst({
        where: { organizationId: orgId, subType: 'vat_output', isActive: true },
      })

      if (receivableAccount && (salesAccount || serviceAccount) && vatOutputAccount) {
        const debitAccount = partyId ? receivableAccount : (cashAccount || receivableAccount)
        const revenueAccount = salesAccount || serviceAccount

        // Determine the revenue portion (total - VAT)
        const revenueAmount = totalTaxableAmount
        const vatAmount = totalVatAmount

        const journalLines = [
          { accountId: debitAccount.id, debit: totalAmount, credit: 0, narration: `Invoice ${invoiceNumber}` },
          { accountId: revenueAccount.id, debit: 0, credit: revenueAmount, narration: `Sales - ${invoiceNumber}` },
        ]

        if (vatAmount > 0) {
          journalLines.push({
            accountId: vatOutputAccount.id,
            debit: 0,
            credit: vatAmount,
            narration: `Output VAT - ${invoiceNumber}`,
          })
        }

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
            narration: `Sales Invoice ${invoiceNumber}`,
            voucherType: 'sales',
            referenceType: 'invoice',
            referenceId: inv.id,
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

        // Link journal entry to invoice
        await tx.invoice.update({
          where: { id: inv.id },
          data: { journalEntryId: journalEntry.id },
        })
      }

      // Create stock transactions for product lines
      for (const line of processedLines) {
        if (line.productId) {
          const product = await tx.product.findUnique({ where: { id: line.productId } })
          if (product && product.productType === 'goods') {
            // Find default warehouse
            const warehouse = await tx.warehouse.findFirst({
              where: { organizationId: orgId, isDefault: true, isActive: true },
            })

            if (warehouse) {
              await tx.stockTransaction.create({
                data: {
                  organizationId: orgId,
                  productId: line.productId,
                  warehouseId: warehouse.id,
                  transactionType: 'sale',
                  quantity: line.quantity,
                  referenceType: 'invoice',
                  referenceId: inv.id,
                  costPrice: line.unitPrice,
                  notes: `Invoice ${invoiceNumber}`,
                },
              })

              // Update stock level
              const stockLevel = await tx.stockLevel.findUnique({
                where: {
                  productId_warehouseId_batchNumber: {
                    productId: line.productId,
                    warehouseId: warehouse.id,
                    batchNumber: null,
                  },
                },
              })

              if (stockLevel) {
                await tx.stockLevel.update({
                  where: { id: stockLevel.id },
                  data: { quantity: { decrement: line.quantity } },
                })
              }
            }
          }
        }
      }

      // Update party balance
      if (partyId) {
        await tx.party.update({
          where: { id: partyId },
          data: { currentBalance: { increment: totalAmount } },
        })
      }

      return inv
    })

    // Fetch with party info
    let party = null
    if (partyId) {
      party = await db.party.findUnique({
        where: { id: partyId },
        select: { id: true, name: true, nameNepali: true, panNumber: true, partyType: true },
      })
    }

    return NextResponse.json({ ...invoice, party }, { status: 201 })
  } catch (error) {
    console.error('Invoices POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/invoices - Update invoice status
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, status, amountPaid } = body

    if (!id) {
      return NextResponse.json({ error: 'Invoice id is required' }, { status: 400 })
    }

    const existing = await db.invoice.findUnique({
      where: { id },
      include: { lines: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    if (existing.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot update a cancelled invoice' },
        { status: 400 }
      )
    }

    const data: Record<string, unknown> = {}

    if (status) {
      const validStatuses = ['draft', 'sent', 'paid', 'partial', 'overdue', 'cancelled']
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
        // Cancel the invoice
        await tx.invoice.update({ where: { id }, data: { status: 'cancelled' } })

        // Cancel the related journal entry
        const je = await tx.journalEntry.findUnique({
          where: { id: existing.journalEntryId! },
          include: { lines: { include: { account: true } } },
        })

        if (je && !je.isCancelled) {
          await tx.journalEntry.update({
            where: { id: je.id },
            data: { isCancelled: true },
          })

          // Reverse account balances
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
          where: { referenceType: 'invoice', referenceId: id },
        })

        for (const st of stockTransactions) {
          await tx.stockTransaction.create({
            data: {
              organizationId: st.organizationId,
              productId: st.productId,
              warehouseId: st.warehouseId,
              transactionType: 'return_in',
              quantity: st.quantity,
              referenceType: 'invoice',
              referenceId: id,
              costPrice: st.costPrice,
              notes: `Cancelled invoice - reversal`,
            },
          })

          // Update stock level
          const stockLevel = await tx.stockLevel.findUnique({
            where: {
              productId_warehouseId_batchNumber: {
                productId: st.productId,
                warehouseId: st.warehouseId,
                batchNumber: null,
              },
            },
          })

          if (stockLevel) {
            await tx.stockLevel.update({
              where: { id: stockLevel.id },
              data: { quantity: { increment: st.quantity } },
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

      return NextResponse.json({ message: 'Invoice cancelled successfully' })
    }

    const updated = await db.invoice.update({
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

    // If payment received, create receipt journal entry
    if (amountPaid !== undefined && amountPaid > 0 && existing.partyId && status !== 'cancelled') {
      const cashAccount = await db.account.findFirst({
        where: { organizationId: existing.organizationId, subType: 'cash', isActive: true },
      })
      const receivableAccount = await db.account.findFirst({
        where: { organizationId: existing.organizationId, subType: 'receivable', isActive: true },
      })

      if (cashAccount && receivableAccount) {
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
              narration: `Payment received for Invoice ${existing.invoiceNumber}`,
              voucherType: 'receipt',
              referenceType: 'invoice',
              referenceId: id,
              totalDebit: amountPaid,
              totalCredit: amountPaid,
              lines: {
                create: [
                  { accountId: cashAccount.id, debit: amountPaid, credit: 0, narration: 'Cash received' },
                  { accountId: receivableAccount.id, debit: 0, credit: amountPaid, narration: 'Receivable cleared' },
                ],
              },
            },
          })

          // Update account balances
          await tx.account.update({
            where: { id: cashAccount.id },
            data: { currentBalance: { increment: amountPaid } },
          })
          await tx.account.update({
            where: { id: receivableAccount.id },
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
    console.error('Invoices PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update invoice', details: String(error) },
      { status: 500 }
    )
  }
}
