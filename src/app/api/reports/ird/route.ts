import { db } from '@/lib/db'
import { adToBs, toNepaliDigits } from '@/lib/bikram-sambat'
import { NextResponse } from 'next/server'

// GET /api/reports/ird?orgId=xxx&register=annex5|annex6|annex7|annex8|annex10|all&fiscalYear=xxx&fromDate=xxx&toDate=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const register = searchParams.get('register') || 'all'
    const fiscalYear = searchParams.get('fiscalYear')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    // 1. Fetch organization details
    const org = await db.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        nameNepali: true,
        panNumber: true,
        address: true,
        phone: true,
        email: true,
        cbmsEnabled: true,
        cbmsIsSandbox: true,
        irdSoftwareCode: true,
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 2. Date filters
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.gte = new Date(fromDate)
    if (toDate) dateFilter.lte = new Date(toDate)

    const hasDateFilter = fromDate || toDate

    // ─── Annex 5: बिक्री खाता (Sales Book) ───────────────────────────
    let annex5Data: any = null
    if (register === 'annex5' || register === 'all' || register === 'annex10') {
      const invoiceWhere: Record<string, unknown> = {
        organizationId: orgId,
      }
      if (fiscalYear) invoiceWhere.fiscalYear = fiscalYear
      if (hasDateFilter) invoiceWhere.date = dateFilter

      const invoices = await db.invoice.findMany({
        where: invoiceWhere,
        include: {
          lines: true,
        },
        orderBy: [{ date: 'asc' }, { invoiceNumber: 'asc' }],
      })

      // Fetch party info
      const partyIds = [...new Set(invoices.map((inv) => inv.partyId).filter(Boolean))] as string[]
      const parties = partyIds.length > 0
        ? await db.party.findMany({
            where: { id: { in: partyIds } },
            select: { id: true, name: true, nameNepali: true, panNumber: true },
          })
        : []
      const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]))

      let totalSales = 0
      let totalExempt = 0
      let totalTaxable = 0
      let totalVat = 0
      let totalExport = 0

      const rows = invoices.map((inv) => {
        const party = inv.partyId ? partyMap[inv.partyId] : null
        const buyerName = inv.buyerName || party?.name || 'Cash Customer'
        const buyerPan = inv.panNumber || party?.panNumber || '-'
        const isCancelled = inv.status === 'cancelled'

        const billDateBS = inv.dateBS || adToBs(inv.date).str
        const exemptAmt = isCancelled ? 0 : (inv.exemptAmount || 0)
        const taxableAmt = isCancelled ? 0 : inv.taxableAmount
        const vatAmt = isCancelled ? 0 : inv.vatAmount
        const totalAmt = isCancelled ? 0 : inv.totalAmount
        const exportAmt = 0 // In future, can flag export sales

        if (!isCancelled) {
          totalSales += totalAmt
          totalExempt += exemptAmt
          totalTaxable += taxableAmt
          totalVat += vatAmt
          totalExport += exportAmt
        }

        return {
          id: inv.id,
          dateAD: inv.date.toISOString().slice(0, 10),
          dateBS: billDateBS,
          invoiceNumber: inv.invoiceNumber,
          buyerName: isCancelled ? `${buyerName} (रद्द)` : buyerName,
          buyerPan,
          totalAmount: totalAmt,
          exemptAmount: exemptAmt,
          taxableAmount: taxableAmt,
          vatAmount: vatAmt,
          exportAmount: exportAmt,
          status: inv.status,
          isCancelled,
          syncStatus: inv.syncStatus,
          syncResponseCode: inv.syncResponseCode,
        }
      })

      annex5Data = {
        title: 'बिक्री खाता (अनुसूची ५)',
        titleEn: 'Sales Register (Annex 5)',
        vatRule: 'मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम २३ को उपनियम (१) को खण्ड (झ) सँग सम्बन्धित',
        rows,
        summary: {
          totalSales,
          totalExempt,
          totalTaxable,
          totalVat,
          totalExport,
          count: rows.length,
          activeCount: rows.filter((r) => !r.isCancelled).length,
        },
      }
    }

    // ─── Annex 6: खरिद खाता (Purchase Book) ─────────────────────────
    let annex6Data: any = null
    if (register === 'annex6' || register === 'all' || register === 'annex10') {
      const purchaseWhere: Record<string, unknown> = {
        organizationId: orgId,
        billType: 'purchase',
      }
      if (fiscalYear) purchaseWhere.fiscalYear = fiscalYear
      if (hasDateFilter) purchaseWhere.date = dateFilter

      const purchases = await db.purchaseBill.findMany({
        where: purchaseWhere,
        include: {
          lines: true,
        },
        orderBy: [{ date: 'asc' }, { billNumber: 'asc' }],
      })

      const partyIds = [...new Set(purchases.map((p) => p.partyId).filter(Boolean))] as string[]
      const parties = partyIds.length > 0
        ? await db.party.findMany({
            where: { id: { in: partyIds } },
            select: { id: true, name: true, nameNepali: true, panNumber: true },
          })
        : []
      const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]))

      let totalPurchase = 0
      let totalExempt = 0
      let totalTaxable = 0
      let totalVat = 0
      let totalCapital = 0
      let totalImport = 0

      const rows = purchases.map((p) => {
        const party = p.partyId ? partyMap[p.partyId] : null
        const supplierName = party?.name || 'Local Supplier'
        const supplierPan = party?.panNumber || '-'
        const isCancelled = p.status === 'cancelled'

        const billDateBS = p.dateBS || adToBs(p.date).str
        const exemptAmt = isCancelled ? 0 : (p.exemptAmount || 0)
        const taxableAmt = isCancelled ? 0 : p.taxableAmount
        const vatAmt = isCancelled ? 0 : p.vatAmount
        const totalAmt = isCancelled ? 0 : p.totalAmount
        const capitalAmt = isCancelled ? 0 : (p.capitalAmount || 0)
        const isImp = Boolean(p.isImport)

        if (!isCancelled) {
          totalPurchase += totalAmt
          totalExempt += exemptAmt
          totalTaxable += taxableAmt
          totalVat += vatAmt
          totalCapital += capitalAmt
          if (isImp) totalImport += totalAmt
        }

        return {
          id: p.id,
          dateAD: p.date.toISOString().slice(0, 10),
          dateBS: billDateBS,
          billNumber: p.billNumber,
          supplierBillNo: p.supplierBillNo || p.billNumber,
          supplierName: isCancelled ? `${supplierName} (रद्द)` : supplierName,
          supplierPan,
          totalAmount: totalAmt,
          exemptAmount: exemptAmt,
          taxableAmount: taxableAmt,
          vatAmount: vatAmt,
          capitalAmount: capitalAmt,
          isImport: isImp,
          pragyapanPatraNo: p.pragyapanPatraNo || '-',
          country: p.country || (isImp ? 'Import' : 'Nepal'),
          status: p.status,
          isCancelled,
        }
      })

      annex6Data = {
        title: 'खरिद खाता (अनुसूची ६)',
        titleEn: 'Purchase Register (Annex 6)',
        vatRule: 'मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम २३ को उपनियम (१) को खण्ड (ज) सँग सम्बन्धित',
        rows,
        summary: {
          totalPurchase,
          totalExempt,
          totalTaxable,
          totalVat,
          totalCapital,
          totalImport,
          count: rows.length,
          activeCount: rows.filter((r) => !r.isCancelled).length,
        },
      }
    }

    // ─── Annex 7: बिक्री फिर्ता खाता (Sales Return / Credit Notes) ────
    let annex7Data: any = null
    if (register === 'annex7' || register === 'all' || register === 'annex10') {
      const cnWhere: Record<string, unknown> = {
        organizationId: orgId,
      }
      if (fiscalYear) cnWhere.fiscalYear = fiscalYear
      if (hasDateFilter) cnWhere.date = dateFilter

      const creditNotes = await db.creditNote.findMany({
        where: cnWhere,
        include: {
          lines: true,
        },
        orderBy: [{ date: 'asc' }, { creditNoteNumber: 'asc' }],
      })

      let totalReturn = 0
      let totalExemptReturn = 0
      let totalTaxableReturn = 0
      let totalVatReturn = 0

      const rows = creditNotes.map((cn) => {
        const cnDateBS = cn.dateBS || adToBs(cn.date).str
        totalReturn += cn.totalAmount
        totalExemptReturn += cn.exemptAmount || 0
        totalTaxableReturn += cn.taxableAmount
        totalVatReturn += cn.vatAmount

        return {
          id: cn.id,
          dateAD: cn.date.toISOString().slice(0, 10),
          dateBS: cnDateBS,
          creditNoteNumber: cn.creditNoteNumber,
          originalInvoiceNo: cn.originalInvoiceNo,
          buyerName: cn.partyName,
          buyerPan: cn.partyPan || '-',
          reason: cn.reason,
          exemptAmount: cn.exemptAmount || 0,
          taxableAmount: cn.taxableAmount,
          vatAmount: cn.vatAmount,
          totalAmount: cn.totalAmount,
          syncStatus: cn.syncStatus,
          syncResponseCode: cn.syncResponseCode,
        }
      })

      annex7Data = {
        title: 'बिक्री फिर्ता खाता (अनुसूची ७)',
        titleEn: 'Sales Return Register / Credit Notes (Annex 7)',
        vatRule: 'मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम २३ को उपनियम (१) को खण्ड (ञ) सँग सम्बन्धित',
        rows,
        summary: {
          totalReturn,
          totalExemptReturn,
          totalTaxableReturn,
          totalVatReturn,
          count: rows.length,
        },
      }
    }

    // ─── Annex 8: खरिद फिर्ता खाता (Purchase Return / Debit Notes) ───
    let annex8Data: any = null
    if (register === 'annex8' || register === 'all' || register === 'annex10') {
      const prWhere: Record<string, unknown> = {
        organizationId: orgId,
        billType: 'purchase_return',
      }
      if (fiscalYear) prWhere.fiscalYear = fiscalYear
      if (hasDateFilter) prWhere.date = dateFilter

      const debitNotes = await db.purchaseBill.findMany({
        where: prWhere,
        include: {
          lines: true,
        },
        orderBy: [{ date: 'asc' }, { billNumber: 'asc' }],
      })

      const partyIds = [...new Set(debitNotes.map((p) => p.partyId).filter(Boolean))] as string[]
      const parties = partyIds.length > 0
        ? await db.party.findMany({
            where: { id: { in: partyIds } },
            select: { id: true, name: true, nameNepali: true, panNumber: true },
          })
        : []
      const partyMap = Object.fromEntries(parties.map((p) => [p.id, p]))

      let totalReturn = 0
      let totalExemptReturn = 0
      let totalTaxableReturn = 0
      let totalVatReturn = 0

      const rows = debitNotes.map((dn) => {
        const party = dn.partyId ? partyMap[dn.partyId] : null
        const supplierName = party?.name || 'Supplier'
        const supplierPan = party?.panNumber || '-'
        const dnDateBS = dn.dateBS || adToBs(dn.date).str

        totalReturn += dn.totalAmount
        totalExemptReturn += dn.exemptAmount || 0
        totalTaxableReturn += dn.taxableAmount
        totalVatReturn += dn.vatAmount

        return {
          id: dn.id,
          dateAD: dn.date.toISOString().slice(0, 10),
          dateBS: dnDateBS,
          debitNoteNumber: dn.billNumber,
          originalBillNo: dn.supplierBillNo || dn.billNumber,
          supplierName,
          supplierPan,
          reason: dn.notes || 'Purchase Return',
          exemptAmount: dn.exemptAmount || 0,
          taxableAmount: dn.taxableAmount,
          vatAmount: dn.vatAmount,
          totalAmount: dn.totalAmount,
        }
      })

      annex8Data = {
        title: 'खरिद फिर्ता खाता (अनुसूची ८)',
        titleEn: 'Purchase Return Register / Debit Notes (Annex 8)',
        vatRule: 'मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम २३ को उपनियम (१) को खण्ड (ट) सँग सम्बन्धित',
        rows,
        summary: {
          totalReturn,
          totalExemptReturn,
          totalTaxableReturn,
          totalVatReturn,
          count: rows.length,
        },
      }
    }

    // ─── Annex 10: मासिक कर विवरण (Monthly VAT Return / Maskewari) ─
    let annex10Data: any = null
    if (register === 'annex10' || register === 'all') {
      const s5 = annex5Data?.summary || { totalSales: 0, totalExempt: 0, totalTaxable: 0, totalVat: 0, totalExport: 0 }
      const s6 = annex6Data?.summary || { totalPurchase: 0, totalExempt: 0, totalTaxable: 0, totalVat: 0, totalCapital: 0, totalImport: 0 }
      const s7 = annex7Data?.summary || { totalReturn: 0, totalExemptReturn: 0, totalTaxableReturn: 0, totalVatReturn: 0 }
      const s8 = annex8Data?.summary || { totalReturn: 0, totalExemptReturn: 0, totalTaxableReturn: 0, totalVatReturn: 0 }

      // Sales Calculations
      const grossTaxableSales = s5.totalTaxable
      const salesReturnTaxable = s7.totalTaxableReturn
      const netTaxableSales = Math.max(0, grossTaxableSales - salesReturnTaxable)

      const grossOutputVat = s5.totalVat
      const salesReturnVat = s7.totalVatReturn
      const netOutputVat = Math.max(0, grossOutputVat - salesReturnVat)

      // Purchase Calculations
      const grossTaxablePurchase = s6.totalTaxable
      const purchaseReturnTaxable = s8.totalTaxableReturn
      const netTaxablePurchase = Math.max(0, grossTaxablePurchase - purchaseReturnTaxable)

      const grossInputVat = s6.totalVat
      const purchaseReturnVat = s8.totalVatReturn
      const netInputVat = Math.max(0, grossInputVat - purchaseReturnVat)

      // Capital Goods Purchase VAT
      const capitalGoodsVat = s6.totalCapital > 0 ? +(s6.totalCapital * 0.13).toFixed(2) : 0

      // Total Input VAT Claimable
      const totalInputTaxCredit = netInputVat + capitalGoodsVat

      // Net Tax Payable or Refundable (Carry Forward)
      const taxDifference = netOutputVat - totalInputTaxCredit
      const netVatPayable = taxDifference > 0 ? +taxDifference.toFixed(2) : 0
      const excessCreditToCarryForward = taxDifference < 0 ? +Math.abs(taxDifference).toFixed(2) : 0

      annex10Data = {
        title: 'मूल्य अभिवृद्धि कर विवरण (अनुसूची १०)',
        titleEn: 'Monthly VAT Return (Annex 10 / Maskewari)',
        vatRule: 'मूल्य अभिवृद्धि कर ऐन, २०५२ को दफा १७ तथा मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम २६ सँग सम्बन्धित',
        sales: {
          grossTotalSales: +(s5.totalSales).toFixed(2),
          exemptSales: +(s5.totalExempt).toFixed(2),
          grossTaxableSales: +grossTaxableSales.toFixed(2),
          salesReturnTaxable: +salesReturnTaxable.toFixed(2),
          netTaxableSales: +netTaxableSales.toFixed(2),
          grossOutputVat: +grossOutputVat.toFixed(2),
          salesReturnVat: +salesReturnVat.toFixed(2),
          netOutputVat: +netOutputVat.toFixed(2),
          exportSales: +(s5.totalExport).toFixed(2),
        },
        purchases: {
          grossTotalPurchases: +(s6.totalPurchase).toFixed(2),
          exemptPurchases: +(s6.totalExempt).toFixed(2),
          grossTaxablePurchases: +grossTaxablePurchase.toFixed(2),
          purchaseReturnTaxable: +purchaseReturnTaxable.toFixed(2),
          netTaxablePurchases: +netTaxablePurchase.toFixed(2),
          grossInputVat: +grossInputVat.toFixed(2),
          purchaseReturnVat: +purchaseReturnVat.toFixed(2),
          netInputVat: +netInputVat.toFixed(2),
          capitalGoodsPurchases: +(s6.totalCapital).toFixed(2),
          capitalGoodsVat,
          importPurchases: +(s6.totalImport).toFixed(2),
          totalInputTaxCredit: +totalInputTaxCredit.toFixed(2),
        },
        assessment: {
          netOutputVat: +netOutputVat.toFixed(2),
          totalInputTaxCredit: +totalInputTaxCredit.toFixed(2),
          previousMonthCredit: 0, // Can be pulled from historical fiscal record if available
          netVatPayable,
          excessCreditToCarryForward,
          isPayable: netVatPayable > 0,
        },
      }
    }

    return NextResponse.json({
      organization: org,
      fiscalYear: fiscalYear || 'All',
      period: {
        fromDate: fromDate || null,
        toDate: toDate || null,
        generatedAt: new Date().toISOString(),
        generatedAtBS: adToBs(new Date()).str,
      },
      annex5: annex5Data,
      annex6: annex6Data,
      annex7: annex7Data,
      annex8: annex8Data,
      annex10: annex10Data,
    })
  } catch (error) {
    console.error('IRD Reports GET error:', error)
    return NextResponse.json(
      { error: 'Failed to generate IRD statutory registers', details: String(error) },
      { status: 500 }
    )
  }
}
