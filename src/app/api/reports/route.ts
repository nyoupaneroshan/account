import { db } from '@/lib/db'
import { isDebitNature } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'

// GET /api/reports?orgId=xxx&reportType=trial_balance&fromDate=xxx&toDate=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const reportType = searchParams.get('reportType')
    const fromDate = searchParams.get('fromDate')
    const toDate = searchParams.get('toDate')

    if (!orgId || !reportType) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, reportType' },
        { status: 400 }
      )
    }

    const validReportTypes = ['trial_balance', 'profit_loss', 'balance_sheet', 'cash_flow', 'vat_report']
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: `Invalid reportType. Must be one of: ${validReportTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get current fiscal year dates if no date range specified
    let startDate: Date | null = fromDate ? new Date(fromDate) : null
    let endDate: Date | null = toDate ? new Date(toDate) : null

    if (!startDate || !endDate) {
      const currentFY = await db.fiscalYear.findFirst({
        where: { organizationId: orgId, isCurrent: true },
      })
      if (currentFY) {
        if (!startDate) startDate = currentFY.startDate
        if (!endDate) endDate = currentFY.endDate
      } else {
        // Default to current year
        const now = new Date()
        if (!startDate) startDate = new Date(now.getFullYear(), 0, 1)
        if (!endDate) endDate = new Date(now.getFullYear(), 11, 31)
      }
    }

    switch (reportType) {
      case 'trial_balance':
        return await generateTrialBalance(orgId, startDate!, endDate!)
      case 'profit_loss':
        return await generateProfitLoss(orgId, startDate!, endDate!)
      case 'balance_sheet':
        return await generateBalanceSheet(orgId, startDate!, endDate!)
      case 'vat_report':
        return await generateVATReport(orgId, startDate!, endDate!)
      case 'cash_flow':
        return await generateCashFlow(orgId, startDate!, endDate!)
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
    }
  } catch (error) {
    console.error('Reports GET error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report', details: String(error) },
      { status: 500 }
    )
  }
}

// ============================================================
// TRIAL BALANCE
// ============================================================
async function generateTrialBalance(orgId: string, fromDate: Date, toDate: Date) {
  // Get all journal entry lines within the date range
  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
    },
    include: {
      account: {
        include: { group: true },
      },
    },
  })

  // Aggregate by account
  const accountMap = new Map<string, {
    account: { id: string; name: string; nameNepali: string | null; code: string; accountType: string; subType: string | null; group: { id: string; name: string; code: string; nature: string } | null }
    totalDebit: number
    totalCredit: number
  }>()

  for (const line of journalLines) {
    const accountId = line.accountId
    if (!accountMap.has(accountId)) {
      accountMap.set(accountId, {
        account: {
          id: line.account.id,
          name: line.account.name,
          nameNepali: line.account.nameNepali,
          code: line.account.code,
          accountType: line.account.accountType,
          subType: line.account.subType,
          group: line.account.group ? {
            id: line.account.group.id,
            name: line.account.group.name,
            code: line.account.group.code,
            nature: line.account.group.nature,
          } : null,
        },
        totalDebit: 0,
        totalCredit: 0,
      })
    }
    const entry = accountMap.get(accountId)!
    entry.totalDebit += line.debit
    entry.totalCredit += line.credit
  }

  // Also include accounts with opening balances that have no transactions in the period
  const allAccounts = await db.account.findMany({
    where: { organizationId: orgId, isActive: true },
    include: { group: true },
  })

  for (const account of allAccounts) {
    if (!accountMap.has(account.id)) {
      accountMap.set(account.id, {
        account: {
          id: account.id,
          name: account.name,
          nameNepali: account.nameNepali,
          code: account.code,
          accountType: account.accountType,
          subType: account.subType,
          group: account.group ? {
            id: account.group.id,
            name: account.group.name,
            code: account.group.code,
            nature: account.group.nature,
          } : null,
        },
        totalDebit: 0,
        totalCredit: 0,
      })
    }
  }

  // Build report rows
  const rows = Array.from(accountMap.values()).map(({ account, totalDebit, totalCredit }) => {
    const closingBalance = isDebitNature(account.accountType)
      ? totalDebit - totalCredit
      : totalCredit - totalDebit

    return {
      accountId: account.id,
      accountName: account.name,
      accountNameNepali: account.nameNepali,
      accountCode: account.code,
      accountType: account.accountType,
      subType: account.subType,
      group: account.group,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      closingBalance: Math.round(closingBalance * 100) / 100,
      closingBalanceSide: isDebitNature(account.accountType)
        ? (closingBalance >= 0 ? 'debit' : 'credit')
        : (closingBalance >= 0 ? 'credit' : 'debit'),
    }
  }).sort((a, b) => a.accountCode.localeCompare(b.accountCode))

  // Group subtotals
  const groupSubtotals = new Map<string, { groupName: string; groupCode: string; totalDebit: number; totalCredit: number }>()
  for (const row of rows) {
    const groupCode = row.group?.code || row.accountCode.substring(0, 1)
    if (!groupSubtotals.has(groupCode)) {
      groupSubtotals.set(groupCode, {
        groupName: row.group?.name || 'Unknown',
        groupCode,
        totalDebit: 0,
        totalCredit: 0,
      })
    }
    const sub = groupSubtotals.get(groupCode)!
    sub.totalDebit += row.totalDebit
    sub.totalCredit += row.totalCredit
  }

  const grandTotalDebit = rows.reduce((sum, r) => sum + r.totalDebit, 0)
  const grandTotalCredit = rows.reduce((sum, r) => sum + r.totalCredit, 0)

  return NextResponse.json({
    reportType: 'trial_balance',
    fromDate,
    toDate,
    rows,
    groupSubtotals: Array.from(groupSubtotals.values()),
    grandTotalDebit: Math.round(grandTotalDebit * 100) / 100,
    grandTotalCredit: Math.round(grandTotalCredit * 100) / 100,
    isBalanced: Math.abs(grandTotalDebit - grandTotalCredit) < 0.01,
  })
}

// ============================================================
// PROFIT & LOSS
// ============================================================
async function generateProfitLoss(orgId: string, fromDate: Date, toDate: Date) {
  // Get income and expense accounts with their balances
  const accounts = await db.account.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      accountType: { in: ['income', 'expense'] },
    },
    include: { group: true },
  })

  // Get journal lines for the period to compute period-specific balances
  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
      account: { accountType: { in: ['income', 'expense'] } },
    },
    include: {
      account: { include: { group: true } },
    },
  })

  // Aggregate by account
  const periodBalances = new Map<string, number>()
  for (const line of journalLines) {
    const existing = periodBalances.get(line.accountId) || 0
    if (line.account.accountType === 'income') {
      periodBalances.set(line.accountId, existing + (line.credit - line.debit))
    } else {
      periodBalances.set(line.accountId, existing + (line.debit - line.credit))
    }
  }

  // Build income section
  const incomeAccounts = accounts
    .filter((a) => a.accountType === 'income')
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountNameNepali: a.nameNepali,
      accountCode: a.code,
      subType: a.subType,
      group: a.group ? { id: a.group.id, name: a.group.name, code: a.group.code } : null,
      balance: Math.round((periodBalances.get(a.id) || 0) * 100) / 100,
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))

  const totalIncome = incomeAccounts.reduce((sum, a) => sum + a.balance, 0)

  // Build expense section
  const expenseAccounts = accounts
    .filter((a) => a.accountType === 'expense')
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountNameNepali: a.nameNepali,
      accountCode: a.code,
      subType: a.subType,
      group: a.group ? { id: a.group.id, name: a.group.name, code: a.group.code } : null,
      balance: Math.round((periodBalances.get(a.id) || 0) * 100) / 100,
    }))
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode))

  const totalExpense = expenseAccounts.reduce((sum, a) => sum + a.balance, 0)

  // Calculate gross profit (Sales - COGS)
  const salesIncome = incomeAccounts
    .filter((a) => a.subType === 'sales' || a.subType === 'service_income')
    .reduce((sum, a) => sum + a.balance, 0)

  const cogsExpense = expenseAccounts
    .filter((a) => a.subType === 'cogs')
    .reduce((sum, a) => sum + a.balance, 0)

  const grossProfit = salesIncome - cogsExpense
  const netProfit = totalIncome - totalExpense

  return NextResponse.json({
    reportType: 'profit_loss',
    fromDate,
    toDate,
    income: {
      accounts: incomeAccounts,
      total: Math.round(totalIncome * 100) / 100,
    },
    expense: {
      accounts: expenseAccounts,
      total: Math.round(totalExpense * 100) / 100,
    },
    grossProfit: Math.round(grossProfit * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    grossProfitMargin: salesIncome > 0 ? Math.round((grossProfit / salesIncome) * 10000) / 100 : 0,
    netProfitMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 10000) / 100 : 0,
  })
}

// ============================================================
// BALANCE SHEET
// ============================================================
async function generateBalanceSheet(orgId: string, fromDate: Date, toDate: Date) {
  // Get asset, liability, equity accounts
  const accounts = await db.account.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      accountType: { in: ['asset', 'liability', 'equity'] },
    },
    include: { group: true },
  })

  // Get journal lines for the period
  const journalLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { lte: toDate },
      },
      account: { accountType: { in: ['asset', 'liability', 'equity'] } },
    },
    include: {
      account: true,
    },
  })

  // Calculate balances up to toDate
  const balances = new Map<string, number>()
  for (const line of journalLines) {
    const existing = balances.get(line.accountId) || 0
    if (isDebitNature(line.account.accountType)) {
      balances.set(line.accountId, existing + (line.debit - line.credit))
    } else {
      balances.set(line.accountId, existing + (line.credit - line.debit))
    }
  }

  // Also add opening balances for accounts not touched
  for (const account of accounts) {
    if (!balances.has(account.id) && account.openingBalance !== 0) {
      balances.set(account.id, account.openingBalance)
    }
  }

  // Build assets section
  const currentAssets = accounts
    .filter((a) => a.accountType === 'asset' && (!a.subType || ['cash', 'bank', 'receivable', 'inventory'].includes(a.subType)))
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountCode: a.code,
      subType: a.subType,
      balance: Math.round((balances.get(a.id) || 0) * 100) / 100,
    }))

  const nonCurrentAssets = accounts
    .filter((a) => a.accountType === 'asset' && a.subType && !['cash', 'bank', 'receivable', 'inventory'].includes(a.subType))
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountCode: a.code,
      subType: a.subType,
      balance: Math.round((balances.get(a.id) || 0) * 100) / 100,
    }))

  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + a.balance, 0)
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + a.balance, 0)
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets

  // Build liabilities section
  const currentLiabilities = accounts
    .filter((a) => a.accountType === 'liability' && (!a.subType || ['payable', 'vat', 'vat_input', 'vat_output', 'tds'].includes(a.subType)))
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountCode: a.code,
      subType: a.subType,
      balance: Math.round((balances.get(a.id) || 0) * 100) / 100,
    }))

  const nonCurrentLiabilities = accounts
    .filter((a) => a.accountType === 'liability' && a.subType && !['payable', 'vat', 'vat_input', 'vat_output', 'tds'].includes(a.subType))
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountCode: a.code,
      subType: a.subType,
      balance: Math.round((balances.get(a.id) || 0) * 100) / 100,
    }))

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + a.balance, 0)
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, a) => sum + a.balance, 0)
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities

  // Build equity section
  const equityAccounts = accounts
    .filter((a) => a.accountType === 'equity')
    .map((a) => ({
      accountId: a.id,
      accountName: a.name,
      accountCode: a.code,
      subType: a.subType,
      balance: Math.round((balances.get(a.id) || 0) * 100) / 100,
    }))

  // Calculate retained earnings from P&L
  const incomeLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
      account: { accountType: 'income' },
    },
  })

  const expenseLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
      account: { accountType: 'expense' },
    },
  })

  const periodIncome = incomeLines.reduce((sum, l) => sum + (l.credit - l.debit), 0)
  const periodExpense = expenseLines.reduce((sum, l) => sum + (l.debit - l.credit), 0)
  const retainedEarnings = periodIncome - periodExpense

  const totalEquity = equityAccounts.reduce((sum, a) => sum + a.balance, 0) + retainedEarnings

  return NextResponse.json({
    reportType: 'balance_sheet',
    asOfDate: toDate,
    assets: {
      current: currentAssets,
      nonCurrent: nonCurrentAssets,
      totalCurrent: Math.round(totalCurrentAssets * 100) / 100,
      totalNonCurrent: Math.round(totalNonCurrentAssets * 100) / 100,
      total: Math.round(totalAssets * 100) / 100,
    },
    liabilities: {
      current: currentLiabilities,
      nonCurrent: nonCurrentLiabilities,
      totalCurrent: Math.round(totalCurrentLiabilities * 100) / 100,
      totalNonCurrent: Math.round(totalNonCurrentLiabilities * 100) / 100,
      total: Math.round(totalLiabilities * 100) / 100,
    },
    equity: {
      accounts: equityAccounts,
      retainedEarnings: Math.round(retainedEarnings * 100) / 100,
      total: Math.round(totalEquity * 100) / 100,
    },
    totalLiabilitiesAndEquity: Math.round((totalLiabilities + totalEquity) * 100) / 100,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  })
}

// ============================================================
// VAT REPORT
// ============================================================
async function generateVATReport(orgId: string, fromDate: Date, toDate: Date) {
  // Get VAT accounts
  const vatOutputAccount = await db.account.findFirst({
    where: { organizationId: orgId, subType: 'vat_output', isActive: true },
  })
  const vatInputAccount = await db.account.findFirst({
    where: { organizationId: orgId, subType: 'vat_input', isActive: true },
  })

  // Get VAT-related journal lines for the period
  const outputVATLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
      accountId: vatOutputAccount?.id || 'nonexistent',
    },
    include: {
      journalEntry: { select: { entryNumber: true, date: true, narration: true, voucherType: true } },
    },
  })

  const inputVATLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
      accountId: vatInputAccount?.id || 'nonexistent',
    },
    include: {
      journalEntry: { select: { entryNumber: true, date: true, narration: true, voucherType: true } },
    },
  })

  // Calculate totals
  const outputVAT = outputVATLines.reduce((sum, l) => sum + (l.credit - l.debit), 0)
  const inputVAT = inputVATLines.reduce((sum, l) => sum + (l.debit - l.credit), 0)
  const netVATPayable = outputVAT - inputVAT

  // Also get sales and purchase totals for the period (taxable amounts)
  const salesInPeriod = await db.invoice.findMany({
    where: {
      organizationId: orgId,
      date: { gte: fromDate, lte: toDate },
      status: { not: 'cancelled' },
    },
  })

  const purchaseInPeriod = await db.purchaseBill.findMany({
    where: {
      organizationId: orgId,
      date: { gte: fromDate, lte: toDate },
      status: { not: 'cancelled' },
    },
  })

  const totalSales = salesInPeriod.reduce((sum, inv) => sum + inv.taxableAmount, 0)
  const totalSalesVAT = salesInPeriod.reduce((sum, inv) => sum + inv.vatAmount, 0)
  const totalPurchases = purchaseInPeriod.reduce((sum, pb) => sum + pb.taxableAmount, 0)
  const totalPurchaseVAT = purchaseInPeriod.reduce((sum, pb) => sum + pb.vatAmount, 0)

  return NextResponse.json({
    reportType: 'vat_report',
    fromDate,
    toDate,
    sales: {
      totalTaxableAmount: Math.round(totalSales * 100) / 100,
      totalVAT: Math.round(totalSalesVAT * 100) / 100,
      count: salesInPeriod.length,
    },
    purchases: {
      totalTaxableAmount: Math.round(totalPurchases * 100) / 100,
      totalVAT: Math.round(totalPurchaseVAT * 100) / 100,
      count: purchaseInPeriod.length,
    },
    outputVAT: {
      total: Math.round(outputVAT * 100) / 100,
      details: outputVATLines.map((l) => ({
        entryNumber: l.journalEntry.entryNumber,
        date: l.journalEntry.date,
        narration: l.journalEntry.narration,
        credit: l.credit,
        debit: l.debit,
      })),
    },
    inputVAT: {
      total: Math.round(inputVAT * 100) / 100,
      details: inputVATLines.map((l) => ({
        entryNumber: l.journalEntry.entryNumber,
        date: l.journalEntry.date,
        narration: l.journalEntry.narration,
        debit: l.debit,
        credit: l.credit,
      })),
    },
    netVATPayable: Math.round(netVATPayable * 100) / 100,
    isRefund: netVATPayable < 0,
  })
}

// ============================================================
// CASH FLOW (Simplified)
// ============================================================
async function generateCashFlow(orgId: string, fromDate: Date, toDate: Date) {
  // Get cash and bank accounts
  const cashAccounts = await db.account.findMany({
    where: {
      organizationId: orgId,
      isActive: true,
      subType: { in: ['cash', 'bank'] },
    },
  })

  const cashAccountIds = cashAccounts.map((a) => a.id)

  // Get all cash/bank journal lines in the period
  const cashLines = await db.journalEntryLine.findMany({
    where: {
      journalEntry: {
        organizationId: orgId,
        isCancelled: false,
        date: { gte: fromDate, lte: toDate },
      },
      accountId: { in: cashAccountIds },
    },
    include: {
      journalEntry: { select: { voucherType: true, narration: true } },
    },
  })

  // Categorize cash flows
  // Operating: receipts from customers, payments to suppliers, salary, rent, etc.
  // Investing: purchase/sale of fixed assets
  // Financing: capital introduced, loans, drawings

  let operatingInflow = 0
  let operatingOutflow = 0
  let investingInflow = 0
  let investingOutflow = 0
  let financingInflow = 0
  let financingOutflow = 0

  const operatingDetails: { narration: string; amount: number; type: string }[] = []
  const investingDetails: { narration: string; amount: number; type: string }[] = []
  const financingDetails: { narration: string; amount: number; type: string }[] = []

  for (const line of cashLines) {
    const amount = line.debit - line.credit // positive = cash inflow, negative = outflow
    const voucherType = line.journalEntry.voucherType
    const narration = line.journalEntry.narration.toLowerCase()

    // Simple categorization based on voucher type and narration
    if (voucherType === 'receipt') {
      if (narration.includes('capital') || narration.includes('loan') || narration.includes('financ')) {
        financingInflow += Math.abs(amount)
        financingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'inflow' })
      } else {
        operatingInflow += Math.abs(amount)
        operatingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'inflow' })
      }
    } else if (voucherType === 'payment') {
      if (narration.includes('asset') || narration.includes('equipment') || narration.includes('machine') || narration.includes('property')) {
        investingOutflow += Math.abs(amount)
        investingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'outflow' })
      } else if (narration.includes('loan') || narration.includes('drawing') || narration.includes('dividend')) {
        financingOutflow += Math.abs(amount)
        financingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'outflow' })
      } else {
        operatingOutflow += Math.abs(amount)
        operatingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'outflow' })
      }
    } else if (voucherType === 'sales') {
      operatingInflow += Math.abs(amount)
      operatingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'inflow' })
    } else if (voucherType === 'purchase') {
      if (narration.includes('asset') || narration.includes('equipment')) {
        investingOutflow += Math.abs(amount)
        investingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'outflow' })
      } else {
        operatingOutflow += Math.abs(amount)
        operatingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'outflow' })
      }
    } else {
      // Journal/contra entries - classify as operating by default
      if (amount > 0) {
        operatingInflow += Math.abs(amount)
        operatingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'inflow' })
      } else {
        operatingOutflow += Math.abs(amount)
        operatingDetails.push({ narration: line.journalEntry.narration, amount: Math.abs(amount), type: 'outflow' })
      }
    }
  }

  // Calculate opening and closing cash balances
  const openingCashBalance = cashAccounts.reduce((sum, a) => {
    // Balance before the period
    return sum + a.openingBalance
  }, 0)

  // Get closing balances from current account balances
  const closingCashBalance = cashAccounts.reduce((sum, a) => sum + a.currentBalance, 0)

  const netOperatingCash = operatingInflow - operatingOutflow
  const netInvestingCash = investingInflow - investingOutflow
  const netFinancingCash = financingInflow - financingOutflow
  const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash

  return NextResponse.json({
    reportType: 'cash_flow',
    fromDate,
    toDate,
    operating: {
      inflow: Math.round(operatingInflow * 100) / 100,
      outflow: Math.round(operatingOutflow * 100) / 100,
      net: Math.round(netOperatingCash * 100) / 100,
      details: operatingDetails,
    },
    investing: {
      inflow: Math.round(investingInflow * 100) / 100,
      outflow: Math.round(investingOutflow * 100) / 100,
      net: Math.round(netInvestingCash * 100) / 100,
      details: investingDetails,
    },
    financing: {
      inflow: Math.round(financingInflow * 100) / 100,
      outflow: Math.round(financingOutflow * 100) / 100,
      net: Math.round(netFinancingCash * 100) / 100,
      details: financingDetails,
    },
    netChangeInCash: Math.round(netChangeInCash * 100) / 100,
    openingCashBalance: Math.round(openingCashBalance * 100) / 100,
    closingCashBalance: Math.round(closingCashBalance * 100) / 100,
  })
}
