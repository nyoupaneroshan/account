'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, NEPAL_VAT_RATE, TDS_RATES } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { hasFeature, getPlan, PLANS } from '@/lib/plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart3,
  Scale,
  TrendingUp,
  Layers,
  DollarSign,
  Calculator,
  ClipboardList,
  Printer,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react'

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

interface TDSReportRow {
  category: string
  rate: number
  totalAmount: number
  tdsDeducted: number
  count: number
}

interface TDSReportData {
  fromDate: string
  toDate: string
  rows: TDSReportRow[]
  grandTotalAmount: number
  grandTotalTDS: number
}

// ============================================================
// Helpers
// ============================================================
function getDefaultDateRange() {
  const toDate = new Date().toISOString().split('T')[0]
  const d = new Date()
  d.setMonth(d.getMonth() - 3)
  const fromDate = d.toISOString().split('T')[0]
  return { fromDate, toDate }
}

// ============================================================
// Loading & Empty States
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

function EmptyReportState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-3 opacity-40" />
      <p className="font-medium">{title}</p>
      <p className="text-xs mt-1">{description}</p>
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent className="p-6 text-center">
        <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive" />
        <p className="text-destructive font-medium">{message}</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================================
// Date Range Picker
// ============================================================
function DateRangePicker({
  fromDate,
  toDate,
  onFromChange,
  onToDateChange,
  onApply,
  loading,
  showAsOfDate = false,
  asOfDate,
  onAsOfDateChange,
}: {
  fromDate: string
  toDate: string
  onFromChange: (v: string) => void
  onToDateChange: (v: string) => void
  onApply: () => void
  loading: boolean
  showAsOfDate?: boolean
  asOfDate?: string
  onAsOfDateChange?: (v: string) => void
}) {
  const { language } = useAppStore()
  return (
    <div className="flex flex-wrap items-end gap-3 print:hidden">
      {showAsOfDate && asOfDate !== undefined && onAsOfDateChange ? (
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            {t('from_date', language as 'en' | 'ne' | 'hi')}
          </label>
          <Input type="date" value={asOfDate} onChange={(e) => onAsOfDateChange(e.target.value)} className="w-40" />
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {t('from_date', language as 'en' | 'ne' | 'hi')}
            </label>
            <Input type="date" value={fromDate} onChange={(e) => onFromChange(e.target.value)} className="w-36" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              {t('to_date', language as 'en' | 'ne' | 'hi')}
            </label>
            <Input type="date" value={toDate} onChange={(e) => onToDateChange(e.target.value)} className="w-36" />
          </div>
        </>
      )}
      <Button onClick={onApply} size="sm" disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
        {t('generate_report', language as 'en' | 'ne' | 'hi')}
      </Button>
    </div>
  )
}

// ============================================================
// Report Header Actions
// ============================================================
function ReportActions({ onPrint, onExport }: { onPrint: () => void; onExport: () => void }) {
  const { language } = useAppStore()
  return (
    <div className="flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        {t('export', language as 'en' | 'ne' | 'hi')}
      </Button>
      <Button variant="outline" size="sm" onClick={onPrint}>
        <Printer className="h-3.5 w-3.5 mr-1.5" />
        {t('print', language as 'en' | 'ne' | 'hi')}
      </Button>
    </div>
  )
}

// ============================================================
// Trial Balance Tab
// ============================================================
function TrialBalanceTab() {
  const { currentOrgId, language } = useAppStore()
  const defaults = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
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

  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (loading && !data) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateRangePicker fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} loading={loading} />
        <ReportActions onPrint={() => window.print()} onExport={() => {}} />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('trial_balance', language as 'en' | 'ne' | 'hi')}</CardTitle>
          <CardDescription>{fromDate} — {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data || data.rows.length === 0 ? (
            <EmptyReportState icon={Scale} title="No transactions in this period" description="Try adjusting the date range" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">{t('code', language as 'en' | 'ne' | 'hi')}</TableHead>
                      <TableHead>{t('account', language as 'en' | 'ne' | 'hi')}</TableHead>
                      <TableHead className="text-right w-36">{t('debit', language as 'en' | 'ne' | 'hi')}</TableHead>
                      <TableHead className="text-right w-36">{t('credit', language as 'en' | 'ne' | 'hi')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell className="font-mono text-xs">{row.accountCode}</TableCell>
                        <TableCell>
                          <span>{row.accountName}</span>
                          {row.accountNameNepali && (
                            <span className="text-xs text-muted-foreground ml-2">({row.accountNameNepali})</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalDebit > 0 ? formatNPR(row.totalDebit) : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {row.totalCredit > 0 ? formatNPR(row.totalCredit) : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.groupSubtotals.map((g) => (
                      <TableRow key={g.groupCode} className="bg-muted/30 font-medium">
                        <TableCell colSpan={2} className="text-sm">
                          {g.groupName} ({g.groupCode})
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNPR(g.totalDebit)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNPR(g.totalCredit)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold border-t-2">
                      <TableCell colSpan={2} className="text-base">{t('total', language as 'en' | 'ne' | 'hi')}</TableCell>
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
// Profit & Loss Tab
// ============================================================
function ProfitLossTab() {
  const { currentOrgId, language } = useAppStore()
  const defaults = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
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

  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (loading && !data) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateRangePicker fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} loading={loading} />
        <ReportActions onPrint={() => window.print()} onExport={() => {}} />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('profit_loss', language as 'en' | 'ne' | 'hi')}</CardTitle>
          <CardDescription>{fromDate} — {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              {/* Income Section */}
              <div>
                <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider mb-3">
                  {t('income', language as 'en' | 'ne' | 'hi')} / आम्दानी
                </h3>
                {data.income.accounts.length === 0 || data.income.accounts.every(a => a.balance === 0) ? (
                  <p className="text-sm text-muted-foreground py-2">No income in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">{t('code', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead>{t('account', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead className="text-right w-40">{t('amount', language as 'en' | 'ne' | 'hi')}</TableHead>
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
                <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider mb-3">
                  {t('expense', language as 'en' | 'ne' | 'hi')} / खर्च
                </h3>
                {data.expense.accounts.length === 0 || data.expense.accounts.every(a => a.balance === 0) ? (
                  <p className="text-sm text-muted-foreground py-2">No expenses in this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">{t('code', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead>{t('account', language as 'en' | 'ne' | 'hi')}</TableHead>
                          <TableHead className="text-right w-40">{t('amount', language as 'en' | 'ne' | 'hi')}</TableHead>
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
                  <span className="font-bold">Net Profit / Loss</span>
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
// Balance Sheet Tab
// ============================================================
function BalanceSheetTab() {
  const { currentOrgId, language } = useAppStore()
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

  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (loading && !data) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateRangePicker
          fromDate={asOfDate} toDate={asOfDate}
          onFromChange={setAsOfDate} onToDateChange={setAsOfDate}
          onApply={fetchData} loading={loading}
          showAsOfDate asOfDate={asOfDate} onAsOfDateChange={setAsOfDate}
        />
        <ReportActions onPrint={() => window.print()} onExport={() => {}} />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('balance_sheet', language as 'en' | 'ne' | 'hi')}</CardTitle>
          <CardDescription>As of {asOfDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Assets */}
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">{t('asset', language as 'en' | 'ne' | 'hi')} / सम्पत्ति</h3>
                <div className="space-y-4">
                  <BSAccountSection title="Current Assets" accounts={data.assets.current} total={data.assets.totalCurrent} />
                  <BSAccountSection title="Non-Current Assets" accounts={data.assets.nonCurrent} total={data.assets.totalNonCurrent} />
                  <Separator />
                  <div className="flex justify-between py-1 text-base font-bold">
                    <span>Total Assets</span>
                    <span className="font-mono">{formatNPR(data.assets.total)}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div>
                <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
                  {t('liability', language as 'en' | 'ne' | 'hi')} & {t('equity', language as 'en' | 'ne' | 'hi')}
                </h3>
                <div className="space-y-4">
                  <BSAccountSection title="Current Liabilities" accounts={data.liabilities.current} total={data.liabilities.totalCurrent} />
                  <BSAccountSection title="Non-Current Liabilities" accounts={data.liabilities.nonCurrent} total={data.liabilities.totalNonCurrent} />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">{t('equity', language as 'en' | 'ne' | 'hi')}</h4>
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

          {data && (
            <div className="mt-6 pt-4 border-t">
              {data.isBalanced ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Balanced (Assets = Liabilities + Equity)
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

function BSAccountSection({ title, accounts, total }: { title: string; accounts: BSAccount[]; total: number }) {
  return (
    <div>
      <h4 className="text-xs font-medium text-muted-foreground mb-2">{title}</h4>
      {accounts.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">No {title.toLowerCase()}</p>
      ) : (
        accounts.map((a) => (
          <div key={a.accountId} className="flex justify-between py-1 text-sm">
            <span className="text-muted-foreground">{a.accountCode} - {a.accountName}</span>
            <span className="font-mono">{formatNPR(a.balance)}</span>
          </div>
        ))
      )}
      <div className="flex justify-between py-1.5 text-sm font-medium border-t mt-1">
        <span>Total {title}</span>
        <span className="font-mono">{formatNPR(total)}</span>
      </div>
    </div>
  )
}

// ============================================================
// Cash Flow Tab
// ============================================================
function CashFlowTab() {
  const { currentOrgId, language } = useAppStore()
  const defaults = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
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

  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (loading && !data) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateRangePicker fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} loading={loading} />
        <ReportActions onPrint={() => window.print()} onExport={() => {}} />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('cash_flow', language as 'en' | 'ne' | 'hi')}</CardTitle>
          <CardDescription>{fromDate} — {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              <CashFlowSection title="Operating Activities" nepali="सञ्चालन गतिविधि" section={data.operating} />
              <Separator />
              <CashFlowSection title="Investing Activities" nepali="लगानी गतिविधि" section={data.investing} />
              <Separator />
              <CashFlowSection title="Financing Activities" nepali="वित्तीय गतिविधि" section={data.financing} />
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

function CashFlowSection({ title, nepali, section }: { title: string; nepali: string; section: CashFlowData['operating'] }) {
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

// ============================================================
// VAT Report Tab
// ============================================================
function VATReportTab() {
  const { currentOrgId, language } = useAppStore()
  const defaults = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
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

  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (loading && !data) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateRangePicker fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} loading={loading} />
        <ReportActions onPrint={() => window.print()} onExport={() => {}} />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('vat_report', language as 'en' | 'ne' | 'hi')} / भ्याट रिपोर्ट</CardTitle>
          <CardDescription>{fromDate} — {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              {/* Output VAT */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-green-700 dark:text-green-400">
                  Output VAT (Sales) / निर्गत भ्याट
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Taxable Sales</p>
                    <p className="font-mono font-medium text-sm mt-1">{formatNPR(data.sales.totalTaxableAmount)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Output VAT</p>
                    <p className="font-mono font-medium text-sm mt-1 text-green-700 dark:text-green-400">{formatNPR(data.outputVAT.total)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Sales Count</p>
                    <p className="font-mono font-medium text-sm mt-1">{data.sales.count}</p>
                  </div>
                </div>
                {data.outputVAT.details.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Entry #</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Narration</TableHead>
                          <TableHead className="text-xs text-right">VAT Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.outputVAT.details.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{d.entryNumber}</TableCell>
                            <TableCell className="text-xs">{new Date(d.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{d.narration}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-green-700 dark:text-green-400">{formatNPR(d.credit || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Input VAT */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3 text-amber-700 dark:text-amber-400">
                  Input VAT (Purchases) / आगत भ्याट
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Taxable Purchases</p>
                    <p className="font-mono font-medium text-sm mt-1">{formatNPR(data.purchases.totalTaxableAmount)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Input VAT</p>
                    <p className="font-mono font-medium text-sm mt-1 text-amber-700 dark:text-amber-400">{formatNPR(data.inputVAT.total)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground">Purchase Count</p>
                    <p className="font-mono font-medium text-sm mt-1">{data.purchases.count}</p>
                  </div>
                </div>
                {data.inputVAT.details.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Entry #</TableHead>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Narration</TableHead>
                          <TableHead className="text-xs text-right">VAT Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.inputVAT.details.map((d, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{d.entryNumber}</TableCell>
                            <TableCell className="text-xs">{new Date(d.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{d.narration}</TableCell>
                            <TableCell className="text-right font-mono text-xs text-amber-700 dark:text-amber-400">{formatNPR(d.debit || 0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <Separator />

              {/* Net VAT Payable */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold">{data.isRefund ? 'Net VAT Refundable' : 'Net VAT Payable'}</span>
                  <span className={`font-mono font-bold ${data.isRefund ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {formatNPR(Math.abs(data.netVATPayable))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT Rate</span>
                  <span className="font-mono">{Math.round(NEPAL_VAT_RATE * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Output VAT</span>
                  <span className="font-mono">{formatNPR(data.outputVAT.total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Less: Input VAT</span>
                  <span className="font-mono">({formatNPR(data.inputVAT.total)})</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>{data.isRefund ? 'Refund Due' : 'Amount Payable'}</span>
                  <span className="font-mono">{formatNPR(Math.abs(data.netVATPayable))}</span>
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
// TDS Report Tab
// ============================================================
function TDSReportTab() {
  const { currentOrgId, language } = useAppStore()
  const defaults = getDefaultDateRange()
  const [fromDate, setFromDate] = useState(defaults.fromDate)
  const [toDate, setToDate] = useState(defaults.toDate)
  const [data, setData] = useState<TDSReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      // TDS report is generated client-side from journal entries
      // We'll generate mock data based on TDS_RATES for now
      const rows: TDSReportRow[] = Object.entries(TDS_RATES).map(([category, rate]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        rate: rate * 100,
        totalAmount: 0,
        tdsDeducted: 0,
        count: 0,
      }))
      setData({ fromDate, toDate, rows, grandTotalAmount: 0, grandTotalTDS: 0 })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, fromDate, toDate])

  useEffect(() => { fetchData() }, [fetchData])

  if (error) return <ErrorState message={error} onRetry={fetchData} />
  if (loading && !data) return <ReportSkeleton />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <DateRangePicker fromDate={fromDate} toDate={toDate} onFromChange={setFromDate} onToDateChange={setToDate} onApply={fetchData} loading={loading} />
        <ReportActions onPrint={() => window.print()} onExport={() => {}} />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t('tds_report', language as 'en' | 'ne' | 'hi')} / टीडीएस रिपोर्ट</CardTitle>
          <CardDescription>{fromDate} — {toDate}</CardDescription>
        </CardHeader>
        <CardContent>
          {!data ? (
            <ReportSkeleton />
          ) : (
            <div className="space-y-6">
              {/* TDS Rates Reference */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">TDS Rates by Category / टीडीएस दर</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">TDS Rate</TableHead>
                        <TableHead className="text-right">Total Amount</TableHead>
                        <TableHead className="text-right">TDS Deducted</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.rows.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="font-medium">{row.category}</TableCell>
                          <TableCell className="text-right font-mono">{row.rate}%</TableCell>
                          <TableCell className="text-right font-mono">{row.totalAmount > 0 ? formatNPR(row.totalAmount) : '-'}</TableCell>
                          <TableCell className="text-right font-mono">{row.tdsDeducted > 0 ? formatNPR(row.tdsDeducted) : '-'}</TableCell>
                          <TableCell className="text-right">{row.count > 0 ? row.count : '-'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/5 font-bold border-t-2">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right font-mono">—</TableCell>
                        <TableCell className="text-right font-mono">{data.grandTotalAmount > 0 ? formatNPR(data.grandTotalAmount) : '-'}</TableCell>
                        <TableCell className="text-right font-mono">{data.grandTotalTDS > 0 ? formatNPR(data.grandTotalTDS) : '-'}</TableCell>
                        <TableCell className="text-right">—</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {data.grandTotalTDS === 0 && (
                <EmptyReportState
                  icon={ClipboardList}
                  title="No TDS transactions in this period"
                  description="TDS deductions will appear here when you create TDS-applicable payments"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================
export function ReportView() {
  const { language, currentOrgId } = useAppStore()
  const [activeTab, setActiveTab] = useState('trial-balance')

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {t('reports', language as 'en' | 'ne' | 'hi')}
          </h1>
          <p className="text-sm text-muted-foreground">रिपोर्टहरू — Financial reports and compliance statements</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="trial-balance" className="gap-1.5 text-xs sm:text-sm">
            <Scale className="h-3.5 w-3.5 hidden sm:block" />
            Trial Balance
          </TabsTrigger>
          <TabsTrigger value="profit-loss" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="h-3.5 w-3.5 hidden sm:block" />
            P&L
          </TabsTrigger>
          <TabsTrigger value="balance-sheet" className="gap-1.5 text-xs sm:text-sm">
            <Layers className="h-3.5 w-3.5 hidden sm:block" />
            Balance Sheet
          </TabsTrigger>
          <TabsTrigger value="cash-flow" className="gap-1.5 text-xs sm:text-sm">
            <DollarSign className="h-3.5 w-3.5 hidden sm:block" />
            Cash Flow
          </TabsTrigger>
          <TabsTrigger value="vat-report" className="gap-1.5 text-xs sm:text-sm">
            <Calculator className="h-3.5 w-3.5 hidden sm:block" />
            VAT
          </TabsTrigger>
          <TabsTrigger value="tds-report" className="gap-1.5 text-xs sm:text-sm">
            <ClipboardList className="h-3.5 w-3.5 hidden sm:block" />
            TDS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trial-balance"><TrialBalanceTab /></TabsContent>
        <TabsContent value="profit-loss"><ProfitLossTab /></TabsContent>
        <TabsContent value="balance-sheet"><BalanceSheetTab /></TabsContent>
        <TabsContent value="cash-flow"><CashFlowTab /></TabsContent>
        <TabsContent value="vat-report"><VATReportTab /></TabsContent>
        <TabsContent value="tds-report"><TDSReportTab /></TabsContent>
      </Tabs>
    </div>
  )
}
