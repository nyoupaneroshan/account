import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = await getSessionUserId(request)

    const invoice = await db.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        organizationId: true,
        printCount: true,
      },
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    const updated = await db.invoice.update({
      where: { id },
      data: {
        printCount: { increment: 1 },
        lastPrintedAt: new Date(),
      },
      select: {
        id: true,
        invoiceNumber: true,
        printCount: true,
        lastPrintedAt: true,
      },
    })

    // Record audit log entry
    await db.auditLog.create({
      data: {
        organizationId: invoice.organizationId,
        userId: userId || null,
        action: 'print',
        module: 'invoice',
        recordId: invoice.id,
        recordType: 'Invoice',
        details: JSON.stringify({
          invoiceNumber: invoice.invoiceNumber,
          printCount: updated.printCount,
          isReprint: updated.printCount > 1,
          timestamp: updated.lastPrintedAt,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      printCount: updated.printCount,
      isReprint: updated.printCount > 1,
      lastPrintedAt: updated.lastPrintedAt,
    })
  } catch (error) {
    console.error('Invoice print count error:', error)
    return NextResponse.json({ error: 'Failed to record print', details: String(error) }, { status: 500 })
  }
}
