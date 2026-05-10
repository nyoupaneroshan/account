import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    // Check organization exists
    const org = await db.organization.findUnique({ where: { id: orgId } })
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get all accounts with their journal lines for the org
    const accounts = await db.account.findMany({
      where: { organizationId: orgId, isActive: true },
      include: { group: true },
    })

    // Calculate totals by account type
    let totalIncome = 0
    let totalExpense = 0
    let totalReceivable = 0
    let totalPayable = 0
    let cashBalance = 0
    let bankBalance = 0

    for (const account of accounts) {
      switch (account.accountType) {
        case 'income':
          totalIncome += account.currentBalance
          break
        case 'expense':
          totalExpense += account.currentBalance
          break
      }
      if (account.subType === 'receivable') {
        totalReceivable += account.currentBalance
      }
      if (account.subType === 'payable') {
        totalPayable += account.currentBalance
      }
      if (account.subType === 'cash') {
        cashBalance += account.currentBalance
      }
      if (account.subType === 'bank') {
        bankBalance += account.currentBalance
      }
    }

    const netProfit = totalIncome - totalExpense

    // Recent transactions (last 10 journal entries)
    const recentTransactions = await db.journalEntry.findMany({
      where: { organizationId: orgId, isCancelled: false },
      include: {
        lines: {
          include: {
            account: {
              include: { group: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
      take: 10,
    })

    // VAT Summary
    const vatOutputAccount = accounts.find((a) => a.subType === 'vat_output')
    const vatInputAccount = accounts.find((a) => a.subType === 'vat_input')

    const vatSummary = {
      outputVAT: vatOutputAccount?.currentBalance || 0,
      inputVAT: vatInputAccount?.currentBalance || 0,
      netVATPayable: (vatOutputAccount?.currentBalance || 0) - (vatInputAccount?.currentBalance || 0),
    }

    // Top parties by balance
    const topParties = await db.party.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { currentBalance: 'desc' },
      take: 5,
    })

    // Monthly data for last 6 months
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    const journalLines = await db.journalEntryLine.findMany({
      where: {
        journalEntry: {
          organizationId: orgId,
          isCancelled: false,
          date: { gte: sixMonthsAgo },
        },
        account: { isActive: true },
      },
      include: {
        journalEntry: { select: { date: true } },
        account: { select: { accountType: true } },
      },
    })

    // Group by month
    const monthlyMap: Record<string, { income: number; expense: number }> = {}
    for (const line of journalLines) {
      const d = new Date(line.journalEntry.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

      if (!monthlyMap[key]) {
        monthlyMap[key] = { income: 0, expense: 0 }
      }

      if (line.account.accountType === 'income') {
        monthlyMap[key].income += line.credit - line.debit
      } else if (line.account.accountType === 'expense') {
        monthlyMap[key].expense += line.debit - line.credit
      }
    }

    // Generate last 6 months keys
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' })
      monthlyData.push({
        month: monthName,
        key,
        income: monthlyMap[key]?.income || 0,
        expense: monthlyMap[key]?.expense || 0,
      })
    }

    return NextResponse.json({
      totalIncome,
      totalExpense,
      totalReceivable,
      totalPayable,
      netProfit,
      cashBalance,
      bankBalance,
      recentTransactions,
      vatSummary,
      topParties,
      monthlyData,
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: String(error) },
      { status: 500 }
    )
  }
}
