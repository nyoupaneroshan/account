import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'
import { syncInvoiceToCbms, syncCreditNoteToCbms, batchSyncPendingInvoices } from '@/lib/cbms'

// GET /api/cbms?orgId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        panNumber: true,
        cbmsEnabled: true,
        cbmsUrl: true,
        cbmsReturnUrl: true,
        cbmsUsername: true,
        cbmsIsSandbox: true,
        irdSoftwareCode: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Aggregations
    const [totalInvoices, syncedInvoices, pendingInvoices, failedInvoices] = await Promise.all([
      db.invoice.count({ where: { organizationId: orgId, status: { not: 'cancelled' } } }),
      db.invoice.count({ where: { organizationId: orgId, syncStatus: 'synced', status: { not: 'cancelled' } } }),
      db.invoice.count({ where: { organizationId: orgId, syncStatus: 'pending', status: { not: 'cancelled' } } }),
      db.invoice.count({ where: { organizationId: orgId, syncStatus: 'failed', status: { not: 'cancelled' } } }),
    ])

    const [totalCreditNotes, syncedCreditNotes] = await Promise.all([
      db.creditNote.count({ where: { organizationId: orgId } }),
      db.creditNote.count({ where: { organizationId: orgId, syncStatus: 'synced' } }),
    ])

    // Recent CBMS Logs
    const recentLogs = await db.cbmsSyncLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Failed or Pending Invoices
    const attentionInvoices = await db.invoice.findMany({
      where: {
        organizationId: orgId,
        status: { not: 'cancelled' },
        syncStatus: { in: ['pending', 'failed'] },
      },
      select: {
        id: true,
        invoiceNumber: true,
        date: true,
        dateBS: true,
        totalAmount: true,
        syncStatus: true,
        syncResponseCode: true,
        syncResponseMessage: true,
        syncAttempts: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    })

    return NextResponse.json({
      config: org,
      stats: {
        totalInvoices,
        syncedInvoices,
        pendingInvoices,
        failedInvoices,
        totalCreditNotes,
        syncedCreditNotes,
        syncRate: totalInvoices > 0 ? Math.round((syncedInvoices / totalInvoices) * 100) : 100,
      },
      recentLogs,
      attentionInvoices,
    })
  } catch (error) {
    console.error('CBMS GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch CBMS status', details: String(error) }, { status: 500 })
  }
}

// POST /api/cbms - Trigger sync
export async function POST(request: Request) {
  try {
    const userId = await getSessionUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { action, invoiceId, creditNoteId, orgId } = body

    if (action === 'sync_invoice' && invoiceId) {
      const result = await syncInvoiceToCbms(invoiceId)
      return NextResponse.json(result)
    }

    if (action === 'sync_credit_note' && creditNoteId) {
      const result = await syncCreditNoteToCbms(creditNoteId)
      return NextResponse.json(result)
    }

    if (action === 'batch_sync' && orgId) {
      const result = await batchSyncPendingInvoices(orgId)
      return NextResponse.json({
        success: true,
        message: `Batch sync complete: ${result.synced} synced, ${result.failed} failed out of ${result.total} bills.`,
        result,
      })
    }

    return NextResponse.json({ error: 'Invalid action or missing parameters' }, { status: 400 })
  } catch (error) {
    console.error('CBMS POST error:', error)
    return NextResponse.json({ error: 'CBMS sync error', details: String(error) }, { status: 500 })
  }
}
