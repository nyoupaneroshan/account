'use client'

import { useAppStore, AppModule } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  BarChart3,
  Scale,
  TrendingUp,
  Layers,
  DollarSign,
  Calculator,
  ClipboardList,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

// ============================================================
// Types
// ============================================================
interface TrialBalanceRow {
  accountId: string
  accountName: string
  accountNameNepali: string | null
  accountCode: string
  accountType: string
  subType: string | null
  group: { id: string; name: string; code: string; nature: string } | null
  totalDebit: number
  totalCredit: number
  closingBalance: number
  closingBalanceSide: string
}

interface GroupSubtotal {
  groupName: string
  groupCode: string
  totalDebit: number
  totalCredit: number
}

interface TrialBalanceData {
  reportType: string
  fromDate: string
  toDate: string
  rows: TrialBalanceRow[]
  groupSubtotals: GroupSubtotal[]
  grandTotalDebit: number
  grandTotalCredit: number
  isBalanced: boolean
}

interface PLAccount {
  accountId: string
  accountName: string
  accountNameNepali: string | null
  accountCode: string
  subType: string | null
  group: { id: string; name: string; code: string } | null
  balance: number
}

interface ProfitLossData {
  reportType: string
  fromDate: string
  toDate: string
  income: { accounts: PLAccount[]; total: number }
  expense: { accounts: PLAccount[]; total: number }
  grossProfit: number
  netProfit: number
  grossProfitMargin: number
  netProfitMargin: number
}

interface BSAccount {
  accountId: string
  accountName: string
  accountCode: string
  subType: string | null
  balance: number
}

interface BalanceSheetData {
  reportType: string
  asOfDate: string
  assets: {
    current: BSAccount[]
    nonCurrent: BSAccount[]
    totalCurrent: number
    totalNonCurrent: number
    total: number
  }
  liabilities: {
    current: BSAccount[]
    nonCurrent: BSAccount[]
    totalCurrent: number
    totalNonCurrent: number
    total: number
  }
  equity: {
    accounts: BSAccount[]
    retainedEarnings: number
    total: number
  }
  totalLiabilitiesAndEquity: number
  isBalanced: boolean
}

interface CashFlowData {
  reportType: string
  fromDate: string
  toDate: string
  operating: { inflow: number; outflow: number; net: number; details: { narration: string; amount: number; type: string }[] }
  investing: { inflow: number; outflow: number; net: number; details: { narration: string; amount: number; type: string }[] }
  financing: { inflow: number; outflow: number; net: number; details: { narration: string; amount: number; type: string }[] }
  netChangeInCash: number
  openingCashBalance: number
  closingCashBalance: number
}

interface VATDetail {
  entryNumber: string
  date: string
  narration: string
  credit?: number
  debit?: number
}

interface VATReportData {
  reportType: string
  fromDate: string
  toDate: string
  sales: { totalTaxableAmount: number; totalVAT: number; count: number }
  purchases: { totalTaxableAmount: number; totalVAT: number; count: number }
  outputVAT: { total: number; details: VATDetail[] }
  inputVAT: { total: number; details: VATDetail[] }
  netVATPayable: number
  isRefund: boolean
}

// ============================================================
// Report overview cards
// ============================================================
const REPORT_CARDS: { module: AppModule; title: string; nepali: string; description: string; icon: React.ElementType }[] = [
  { module: 'trial-balance', title: 'Trial Balance', nepali: 'ट्रायल ब्यालेन्स', description: 'Verify debit and credit balances match across all accounts', icon: Scale },
  { module: 'profit-loss', title: 'Profit & Loss', nepali: 'नाफा र घाटा', description: 'Income, expenses, and profitability analysis for the period', icon: TrendingUp },
  { module: 'balance-sheet', title: 'Balance Sheet', nepali: 'ब्यालेन्स सिट', description: 'Assets, liabilities, and equity position as of a date', icon: Layers },
  { module: 'cash-flow', title: 'Cash Flow', nepali: 'नगद प्रवाह', description: 'Cash inflows and outflows by operating, investing, financing', icon: DollarSign },
  { module: 'vat-report', title: 'VAT Report', nepali: 'भ्याट रिपोर्ट', description: 'Output VAT, Input VAT, and net VAT payable or refundable', icon: Calculator },
  { module: 'tds-report', title: 'TDS Report', nepali: 'टीडीएस रिपोर्ट', description: 'TDS deducted summary by party with applicable rates', icon: ClipboardList },
]

// ============================================================
// Main Component
// ============================================================
export function ReportView() {
  const { activeModule, setActiveModule, currentOrgId } = useAppStore()

  if (activeModule === 'reports') {
    return <ReportOverview />
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <ReportHeader activeModule={activeModule} />
      {activeModule === 'trial-balance' && <TrialBalanceReport />}
      {activeModule === 'profit-loss' && <ProfitLossReport />}
      {activeModule === 'balance-sheet' && <BalanceSheetReport />}
      {activeModule === 'cash-flow' && <CashFlowReport />}
      {activeModule === 'vat-report' && <VATReport />}
      {activeModule === 'tds-report' && <TDSReport />}
    </div>
  )
}

// ============================================================
// Report Overview
// ============================================================
function ReportOverview() {
  const { setActiveModule } = useAppStore()

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">रिपोर्टहरू — Financial reports and statements</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.module}
              className="cursor-pointer hover:shadow-md transition-shadow border-border/60"
              onClick={() => setActiveModule(card.module)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <CardDescription className="text-xs">{card.nepali}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// Report Header
// ============================================================
function ReportHeader({ activeModule }: { activeModule: AppModule }) {
  const { setActiveModule } = useAppStore()
  const title = REPORT_CARDS.find(c => c.module === activeModule)?.title || 'Report'
  const nepali = REPORT_CARDS.find(c => c.module === activeModule)?.nepali || ''

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setActiveModule('reports')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{nepali}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        Print
      </Button>
    </div>
  )
}

// ============================================================
// Date Range Filter
// ============================================================
function DateRangeFilter({ fromDate, toDate, onFromChange, onToDateChange, onApply }: {
  fromDate: string
  toDate: string
  onFromChange: (v: string) => void
  onToDateChange: (v: string) => void
  onApply: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">From Date</label>
        <Input type="date" value={fromDate} onChange={(e) => onFromChange(e.target.value)} className="w-40" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">To Date</label>
        <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="w-40" />
      </div>
      <Button onClick={onApply} size="sm">Apply</Button>
    </div>
  )
}

// ============================================================
// Loading Skeleton
// ============================================================
function ReportSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-8 w-32" />
      </CardContent>
    </Card>
  )
}

// ============================================================
// Trial Balance Report
// ============================================================
function TrialBalanceReport() {
  const { currentOrgId } = useAppStore()
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<TrialBalanceData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?orgId=${currentOrgId}&reportType=trial_balance&fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) throw new Error('Failed to fetch trial balance')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, fromDate, toDate])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return <ReportSkeleton />
  if (error) return <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>

  return (
    <div className="space-y-4">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} />
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Trial Balance</CardTitle>
          <CardDescription>From {fromDate} to {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data || data.rows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No transactions in this period</p>
              <p className="text-xs mt-1">Try adjusting the date range</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right w-36">Debit ({formatNPR(0).split('0.00')[0]})</TableHead>
                      <TableHead className="text-right w-36">Credit ({formatNPR(0).split('0.00')[0]})</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell className="font-mono text-xs">{row.accountCode}</TableCell>
                        <TableCell>
                          <span>{row.accountName}</span>
                          {row.accountNameNepali && <span className="text-xs text-muted-foreground ml-2">({row.accountNameNepali})</span>}
                        </TableCell>
                        <TableCell className="text-right font-mono">{row.totalDebit > 0 ? formatNPR(row.totalDebit) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{row.totalCredit > 0 ? formatNPR(row.totalCredit) : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {/* Group subtotals */}
                    {data.groupSubtotals.map((g) => (
                      <TableRow key={g.groupCode} className="bg-muted/30 font-medium">
                        <TableCell colSpan={2} className="text-sm">{g.groupName} (Group {g.groupCode})</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNPR(g.totalDebit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNPR(g.totalCredit)}</TableCell>
                      </TableRow>
                    ))}
                    {/* Grand Total */}
                    <TableRow className="bg-primary/5 font-bold border-t-2">
                      <TableCell colSpan={2} className="text-base">Grand Total</TableCell>
                      <TableCell className="text-right font-mono text-base">{formatNPR(data.grandTotalDebit)}</TableCell>
                      <TableCell className="text-right font-mono text-base">{formatNPR(data.grandTotalCredit)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {data.isBalanced ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" /> Not Balanced
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  Difference: {formatNPR(Math.abs(data.grandTotalDebit - data.grandTotalCredit))}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Profit & Loss Report
// ============================================================
function ProfitLossReport() {
  const { currentOrgId } = useAppStore()
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<ProfitLossData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?orgId=${currentOrgId}&reportType=profit_loss&fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) throw new Error('Failed to fetch P&L')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, fromDate, toDate])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return <ReportSkeleton />
  if (error) return <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>

  return (
    <div className="space-y-4">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} />
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Profit & Loss Statement</CardTitle>
          <CardDescription>From {fromDate} to {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              {/* Income Section */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3">Income / आम्दानी</h3>
                {data.income.accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No income in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Code</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right w-40">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.income.accounts.filter(a => a.balance > 0).map((a) => (
                          <TableRow key={a.accountId}>
                            <TableCell className="font-mono text-xs">{a.accountCode}</TableCell>
                            <TableCell>{a.accountName}</TableCell>
                            <TableCell className="text-right font-mono text-green-700 dark:text-green-400">{formatNPR(a.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-green-50 dark:bg-green-950/30 font-semibold">
                          <TableCell colSpan={2}>Total Income</TableCell>
                          <TableCell className="text-right font-mono">{formatNPR(data.income.total)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Expense Section */}
              <div>
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">Expenses / खर्च</h3>
                {data.expense.accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No expenses in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">Code</TableHead>
                          <TableHead>Account</TableHead>
                          <TableHead className="text-right w-40">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.expense.accounts.filter(a => a.balance > 0).map((a) => (
                          <TableRow key={a.accountId}>
                            <TableCell className="font-mono text-xs">{a.accountCode}</TableCell>
                            <TableCell>{a.accountName}</TableCell>
                            <TableCell className="text-right font-mono text-red-700 dark:text-red-400">{formatNPR(a.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-red-50 dark:bg-red-950/30 font-semibold">
                          <TableCell colSpan={2}>Total Expenses</TableCell>
                          <TableCell className="text-right font-mono">{formatNPR(data.expense.total)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Summary */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Gross Profit</span>
                  <span className={`font-mono font-bold ${data.grossProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {formatNPR(data.grossProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Gross Profit Margin</span>
                  <span className="font-mono text-sm">{data.grossProfitMargin}%</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">Net Profit</span>
                  <span className={`font-mono font-bold ${data.netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {formatNPR(data.netProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Net Profit Margin</span>
                  <span className="font-mono text-sm">{data.netProfitMargin}%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Balance Sheet Report
// ============================================================
function BalanceSheetReport() {
  const { currentOrgId } = useAppStore()
  const [asOfDate, setAsOfDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<BalanceSheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?orgId=${currentOrgId}&reportType=balance_sheet&fromDate=${asOfDate}&toDate=${asOfDate}`)
      if (!res.ok) throw new Error('Failed to fetch balance sheet')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, asOfDate])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return <ReportSkeleton />
  if (error) return <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">As of Date</label>
          <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-40" />
        </div>
        <Button onClick={fetchData} size="sm">Apply</Button>
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Balance Sheet</CardTitle>
          <CardDescription>As of {asOfDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assets */}
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Assets / सम्पत्ति</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Current Assets</h4>
                    {data.assets.current.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">No current assets</p>
                    ) : (
                      data.assets.current.map((a) => (
                        <div key={a.accountId} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground">{a.accountCode} - {a.accountName}</span>
                          <span className="font-mono">{formatNPR(a.balance)}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-1">
                      <span>Total Current Assets</span>
                      <span className="font-mono">{formatNPR(data.assets.totalCurrent)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Non-Current Assets</h4>
                    {data.assets.nonCurrent.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">No non-current assets</p>
                    ) : (
                      data.assets.nonCurrent.map((a) => (
                        <div key={a.accountId} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground">{a.accountCode} - {a.accountName}</span>
                          <span className="font-mono">{formatNPR(a.balance)}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-1">
                      <span>Total Non-Current Assets</span>
                      <span className="font-mono">{formatNPR(data.assets.totalNonCurrent)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1 text-base font-bold">
                    <span>Total Assets</span>
                    <span className="font-mono">{formatNPR(data.assets.total)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Liabilities & Equity / दायित्व र इक्विटी</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Current Liabilities</h4>
                    {data.liabilities.current.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">No current liabilities</p>
                    ) : (
                      data.liabilities.current.map((a) => (
                        <div key={a.accountId} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground">{a.accountCode} - {a.accountName}</span>
                          <span className="font-mono">{formatNPR(a.balance)}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-1">
                      <span>Total Current Liabilities</span>
                      <span className="font-mono">{formatNPR(data.liabilities.totalCurrent)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Non-Current Liabilities</h4>
                    {data.liabilities.nonCurrent.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-1">No non-current liabilities</p>
                    ) : (
                      data.liabilities.nonCurrent.map((a) => (
                        <div key={a.accountId} className="flex justify-between py-1 text-sm">
                          <span className="text-muted-foreground">{a.accountCode} - {a.accountName}</span>
                          <span className="font-mono">{formatNPR(a.balance)}</span>
                        </div>
                      ))
                    )}
                    <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-1">
                      <span>Total Non-Current Liabilities</span>
                      <span className="font-mono">{formatNPR(data.liabilities.totalNonCurrent)}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Equity</h4>
                    {data.equity.accounts.map((a) => (
                      <div key={a.accountId} className="flex justify-between py-1 text-sm">
                        <span className="text-muted-foreground">{a.accountCode} - {a.accountName}</span>
                        <span className="font-mono">{formatNPR(a.balance)}</span>
                      </div>
                    ))}
                    {data.equity.retainedEarnings !== 0 && (
                      <div className="flex justify-between py-1 text-sm">
                        <span className="text-muted-foreground">Retained Earnings</span>
                        <span className="font-mono">{formatNPR(data.equity.retainedEarnings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-1">
                      <span>Total Equity</span>
                      <span className="font-mono">{formatNPR(data.equity.total)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between py-1 text-base font-bold">
                    <span>Total Liabilities & Equity</span>
                    <span className="font-mono">{formatNPR(data.totalLiabilitiesAndEquity)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Balance validation */}
          {data && (
            <div className="mt-6 pt-4 border-t">
              {data.isBalanced ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Balance Sheet is Balanced (Assets = Liabilities + Equity)
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" /> Not Balanced — Difference: {formatNPR(Math.abs(data.assets.total - data.totalLiabilitiesAndEquity))}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Cash Flow Report
// ============================================================
function CashFlowReport() {
  const { currentOrgId } = useAppStore()
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<CashFlowData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?orgId=${currentOrgId}&reportType=cash_flow&fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) throw new Error('Failed to fetch cash flow')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, fromDate, toDate])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return <ReportSkeleton />
  if (error) return <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>

  function FlowSection({ title, nepali, section }: { title: string; nepali: string; section: CashFlowData['operating'] }) {
    return (
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">{title} <span className="text-muted-foreground font-normal">({nepali})</span></h3>
        <div className="space-y-1 mb-3">
          <div className="flex justify-between py-1 text-sm">
            <span>Inflow</span>
            <span className="font-mono text-green-700 dark:text-green-400">{formatNPR(section.inflow)}</span>
          </div>
          <div className="flex justify-between py-1 text-sm">
            <span>Outflow</span>
            <span className="font-mono text-red-700 dark:text-red-400">({formatNPR(section.outflow)})</span>
          </div>
        </div>
        {section.details.length > 0 && (
          <div className="bg-muted/30 rounded p-3 mb-3 max-h-32 overflow-y-auto">
            {section.details.map((d, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span className="text-muted-foreground truncate mr-2">{d.narration}</span>
                <span className={`font-mono shrink-0 ${d.type === 'inflow' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                  {d.type === 'inflow' ? '+' : '-'}{formatNPR(d.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-between py-1.5 text-sm font-medium border-t">
          <span>Net {title}</span>
          <span className={`font-mono ${section.net >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
            {formatNPR(section.net)}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} />
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Cash Flow Statement</CardTitle>
          <CardDescription>From {fromDate} to {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              <FlowSection title="Operating Activities" nepali="सञ्चालन गतिविधि" section={data.operating} />
              <Separator />
              <FlowSection title="Investing Activities" nepali="लगानी गतिविधि" section={data.investing} />
              <Separator />
              <FlowSection title="Financing Activities" nepali="वित्तीय गतिविधि" section={data.financing} />
              <Separator />

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center font-medium">
                  <span>Net Change in Cash</span>
                  <span className={`font-mono font-bold ${data.netChangeInCash >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {formatNPR(data.netChangeInCash)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Opening Cash Balance</span>
                  <span className="font-mono">{formatNPR(data.openingCashBalance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Closing Cash Balance</span>
                  <span className="font-mono font-medium">{formatNPR(data.closingCashBalance)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// VAT Report
// ============================================================
function VATReport() {
  const { currentOrgId } = useAppStore()
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [data, setData] = useState<VATReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/reports?orgId=${currentOrgId}&reportType=vat_report&fromDate=${fromDate}&toDate=${toDate}`)
      if (!res.ok) throw new Error('Failed to fetch VAT report')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, fromDate, toDate])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading && !data) return <ReportSkeleton />
  if (error) return <Card><CardContent className="p-6 text-center text-destructive">{error}</CardContent></Card>

  return (
    <div className="space-y-4">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} />
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">VAT Report / भ्याट रिपोर्ट</CardTitle>
          <CardDescription>From {fromDate} to {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              {/* Sales Summary */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-green-700 dark:text-green-400">Output VAT (Sales) / निर्गत भ्याट</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Taxable Sales</p>
                    <p className="font-mono font-medium text-sm mt-1">{formatNPR(data.sales.totalTaxableAmount)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Output VAT</p>
                    <p className="font-mono font-medium text-sm mt-1">{formatNPR(data.sales.totalVAT)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Sales Count</p>
                    <p className="font-mono font-medium text-sm mt-1">{data.sales.count}</p>
                  </div>
                </div>
                {data.outputVAT.details.length > 0 && (
                  <div className="overflow-x-auto max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entry</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.outputVAT.details.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{d.entryNumber}</TableCell>
                            <TableCell className="text-xs">{new Date(d.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs truncate max-w-48">{d.narration}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatNPR(d.credit || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Purchase Summary */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-orange-700 dark:text-orange-400">Input VAT (Purchases) / आगत भ्याट</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Taxable Purchases</p>
                    <p className="font-mono font-medium text-sm mt-1">{formatNPR(data.purchases.totalTaxableAmount)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Input VAT</p>
                    <p className="font-mono font-medium text-sm mt-1">{formatNPR(data.purchases.totalVAT)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Purchase Count</p>
                    <p className="font-mono font-medium text-sm mt-1">{data.purchases.count}</p>
                  </div>
                </div>
                {data.inputVAT.details.length > 0 && (
                  <div className="overflow-x-auto max-h-40 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Entry</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.inputVAT.details.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{d.entryNumber}</TableCell>
                            <TableCell className="text-xs">{new Date(d.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs truncate max-w-48">{d.narration}</TableCell>
                            <TableCell className="text-right font-mono text-xs">{formatNPR(d.debit || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Net VAT */}
              <div className={`rounded-lg p-4 ${data.isRefund ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-base">
                      {data.isRefund ? 'Net VAT Refundable' : 'Net VAT Payable'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.isRefund ? 'Input VAT exceeds Output VAT' : 'Output VAT exceeds Input VAT'}
                    </p>
                  </div>
                  <span className={`font-mono font-bold text-xl ${data.isRefund ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {formatNPR(Math.abs(data.netVATPayable))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// TDS Report
// ============================================================
function TDSReport() {
  const { currentOrgId } = useAppStore()
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0])
  const [parties, setParties] = useState<Array<{
    id: string; name: string; nameNepali: string | null; panNumber: string | null;
    partyType: string; isTdsApplicable: boolean; tdsRate: number | null; tdsPAN: string | null;
    currentBalance: number;
  }>>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/parties?orgId=${currentOrgId}`)
      if (res.ok) {
        const allParties = await res.json()
        const tdsParties = allParties.filter((p: { isTdsApplicable: boolean }) => p.isTdsApplicable)
        setParties(tdsParties)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <DateRangeFilter fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} />
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">TDS Report / टीडीएस रिपोर्ट</CardTitle>
          <CardDescription>TDS deducted summary — From {fromDate} to {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {parties.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No parties with TDS applicable</p>
              <p className="text-xs mt-1">Add TDS details to parties to see TDS report</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Party Name</TableHead>
                    <TableHead>PAN</TableHead>
                    <TableHead>Party Type</TableHead>
                    <TableHead className="text-right">TDS Rate</TableHead>
                    <TableHead>TDS PAN</TableHead>
                    <TableHead className="text-right">Current Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parties.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.name}
                        {p.nameNepali && <span className="text-xs text-muted-foreground ml-1">({p.nameNepali})</span>}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.panNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{p.partyType}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">{p.tdsRate ? `${p.tdsRate}%` : '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{p.tdsPAN || '-'}</TableCell>
                      <TableCell className={`text-right font-mono ${p.currentBalance > 0 ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                        {formatNPR(p.currentBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
