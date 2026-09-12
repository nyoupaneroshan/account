import { db } from '@/lib/db'
import { NEPAL_VAT_RATE, isDebitNature, adToBs } from '@/lib/nepal-accounting'
import { syncCreditNoteToCbms } from '@/lib/cbms'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

// GET /api/credit-notes?orgId=xxx&invoiceId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const invoiceId = searchParams.get('invoiceId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { organizationId: orgId }
    if (invoiceId) where.originalInvoiceId = invoiceId

    const creditNotes = await db.creditNote.findMany({
      where,
      include: {
        lines: {
          include: {
            product: { select: { id: true, name: true, code: true, unit: true } },
          },
        },
        invoice: {
          select: { id: true, invoiceNumber: true, date: true, totalAmount: true },
        },
      },
      orderBy: [{ date: 'desc' }, { creditNoteNumber: 'desc' }],
    })

    return NextResponse.json(creditNotes)
  } catch (error) {
    console.error('Credit Notes GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit notes', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/credit-notes - Issue official Credit Note
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { originalInvoiceId, reason, lines } = body

    if (!originalInvoiceId || !reason || !lines || !Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: originalInvoiceId, reason, lines' },
        { status: 400 }
      )
    }

    // Fetch original invoice
    const invoice = await db.invoice.findUnique({
      where: { id: originalInvoiceId },
      include: {
        organization: true,
        lines: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Original invoice not found' }, { status: 404 })
    }

    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot issue credit note against a cancelled invoice' },
        { status: 400 }
      )
    }

    const org = invoice.organization
    const now = new Date()
    const bsInfo = adToBs(now)
    const fiscalYear = invoice.fiscalYear || bsInfo.fiscalYear
    const dateBS = bsInfo.str

    // Calculate line totals
    let subtotal = 0
    let taxableAmount = 0
    let exemptAmount = 0
    let vatAmount = 0
    let totalAmount = 0

    const processedLines = lines.map(
      (line: {
        productId?: string
        description: string
        hsnCode?: string
        quantity: number
        unit?: string
        unitPrice: number
        vatRate?: number
        isExempt?: boolean
      }) => {
        const qty = line.quantity || 1
        const price = line.unitPrice || 0
        const isExempt = line.isExempt || line.vatRate === 0
        const lineNet = qty * price
        const vatRate = isExempt ? 0 : (line.vatRate !== undefined ? line.vatRate : NEPAL_VAT_RATE * 100)
        const lineVat = isExempt ? 0 : lineNet * (vatRate / 100)
        const lineTotal = lineNet + lineVat

        subtotal += lineNet
        if (isExempt) {
          exemptAmount += lineNet
        } else {
          taxableAmount += lineNet
        }
        vatAmount += lineVat
        totalAmount += lineTotal

        return {
          productId: line.productId || null,
          description: line.description,
          hsnCode: line.hsnCode || null,
          quantity: qty,
          unit: line.unit || null,
          unitPrice: price,
          taxableAmount: isExempt ? 0 : lineNet,
          vatRate,
          vatAmount: lineVat,
          totalAmount: lineTotal,
        }
      }
    )

    // Sequential Credit Note Numbering: CN-{FY_SHORT}-{00001}
    const prefix = org.creditNotePrefix || 'CN'
    const fyShort = fiscalYear.includes('/')
      ? fiscalYear.split('/')[0].slice(-2) + '/' + fiscalYear.split('/')[1]
      : fiscalYear
    const pattern = `${prefix}-${fyShort}-`

    const lastCN = await db.creditNote.findFirst({
      where: {
        organizationId: org.id,
        creditNoteNumber: { startsWith: pattern },
      },
      orderBy: { creditNoteNumber: 'desc' },
      select: { creditNoteNumber: true },
    })

    let nextNumber = 1
    if (lastCN) {
      const parts = lastCN.creditNoteNumber.split('-')
      const lastSeq = parseInt(parts[parts.length - 1], 10)
      if (!isNaN(lastSeq)) nextNumber = lastSeq + 1
    }
    const creditNoteNumber = `${pattern}${String(nextNumber).padStart(5, '0')}`

    const party = invoice.partyId
      ? await db.party.findUnique({
          where: { id: invoice.partyId },
          select: { id: true, name: true, panNumber: true },
        })
      : null
    const partyName = invoice.buyerName || party?.name || 'Cash Customer'
    const partyPan = invoice.panNumber || party?.panNumber || null

    // Create Credit Note in transaction with reverse journal entry & stock return
    const creditNote = await db.$transaction(async (tx) => {
      const cn = await tx.creditNote.create({
        data: {
          organizationId: org.id,
          creditNoteNumber,
          fiscalYear,
          originalInvoiceId: invoice.id,
          originalInvoiceNo: invoice.invoiceNumber,
          date: now,
          dateBS,
          partyId: invoice.partyId || null,
          partyName,
          partyPan,
          reason,
          subtotal,
          taxableAmount,
          exemptAmount,
          vatAmount,
          totalAmount,
          paymentMode: invoice.paymentMode || 'cash',
          syncStatus: org.cbmsEnabled ? 'pending' : 'not_applicable',
          lines: {
            create: processedLines,
          },
        },
        include: { lines: true },
      })

      // Create reversing Journal Entry:
      // Debit: Sales Revenue + Output VAT, Credit: Accounts Receivable (or Cash)
      const receivableAccount = await tx.account.findFirst({
        where: { organizationId: org.id, subType: 'receivable', isActive: true },
      })
      const cashAccount = await tx.account.findFirst({
        where: { organizationId: org.id, subType: 'cash', isActive: true },
      })
      const salesAccount = await tx.account.findFirst({
        where: { organizationId: org.id, subType: 'sales', isActive: true },
      })
      const vatOutputAccount = await tx.account.findFirst({
        where: { organizationId: org.id, subType: 'vat_output', isActive: true },
      })

      if (salesAccount && (receivableAccount || cashAccount)) {
        const creditAcc = invoice.partyId ? (receivableAccount || cashAccount!) : (cashAccount || receivableAccount!)

        const journalLines = [
          { accountId: salesAccount.id, debit: taxableAmount, credit: 0, narration: `Sales Return - CN ${creditNoteNumber}` },
          { accountId: creditAcc.id, debit: 0, credit: totalAmount, narration: `Credit Note ${creditNoteNumber}` },
        ]

        if (vatAmount > 0 && vatOutputAccount) {
          journalLines.push({
            accountId: vatOutputAccount.id,
            debit: vatAmount,
            credit: 0,
            narration: `Output VAT Credit - CN ${creditNoteNumber}`,
          })
        }

        const lastEntry = await tx.journalEntry.findFirst({
          where: { organizationId: org.id },
          orderBy: { entryNumber: 'desc' },
          select: { entryNumber: true },
        })

        let entryNext = 1
        if (lastEntry) {
          const match = lastEntry.entryNumber.match(/JE-(\d+)/)
          if (match) entryNext = parseInt(match[1]) + 1
        }
        const entryNumber = `JE-${String(entryNext).padStart(3, '0')}`

        const jeTotalDebit = journalLines.reduce((s, l) => s + l.debit, 0)
        const jeTotalCredit = journalLines.reduce((s, l) => s + l.credit, 0)

        const je = await tx.journalEntry.create({
          data: {
            organizationId: org.id,
            entryNumber,
            date: now,
            narration: `Credit Note ${creditNoteNumber} for Invoice ${invoice.invoiceNumber}`,
            voucherType: 'journal',
            referenceType: 'credit_note',
            referenceId: cn.id,
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

        // Link journal entry to Credit Note
        await tx.creditNote.update({
          where: { id: cn.id },
          data: { journalEntryId: je.id },
        })
      }

      // Return items to inventory
      for (const line of processedLines) {
        if (line.productId) {
          const warehouse = await tx.warehouse.findFirst({
            where: { organizationId: org.id, isDefault: true, isActive: true },
          })
          if (warehouse) {
            await tx.stockTransaction.create({
              data: {
                organizationId: org.id,
                productId: line.productId,
                warehouseId: warehouse.id,
                transactionType: 'return_in',
                quantity: line.quantity,
                referenceType: 'credit_note',
                referenceId: cn.id,
                costPrice: line.unitPrice,
                notes: `Credit Note ${creditNoteNumber}`,
              },
            })

            // Update stock level
            const stockLevel = await tx.stockLevel.findFirst({
              where: {
                productId: line.productId,
                warehouseId: warehouse.id,
              },
            })
            if (stockLevel) {
              await tx.stockLevel.update({
                where: { id: stockLevel.id },
                data: { quantity: { increment: line.quantity } },
              })
            }
          }
        }
      }

      // Adjust customer balance
      if (invoice.partyId) {
        await tx.party.update({
          where: { id: invoice.partyId },
          data: { currentBalance: { decrement: totalAmount } },
        })
      }

      return cn
    })

    // Real-time CBMS Sync to /api/billreturn
    if (org.cbmsEnabled) {
      try {
        await syncCreditNoteToCbms(creditNote.id)
      } catch (err) {
        console.error('CBMS billreturn sync error:', err)
      }
    }

    return NextResponse.json(creditNote, { status: 201 })
  } catch (error) {
    console.error('Credit Notes POST error:', error)
    return NextResponse.json(
      { error: 'Failed to issue credit note', details: String(error) },
      { status: 500 }
    )
  }
}
