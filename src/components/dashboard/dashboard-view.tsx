'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, NEPAL_FISCAL_YEARS, calculateVAT } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { hasFeature } from '@/lib/plans'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
// recharts removed - using simple CSS-based bars instead
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  MinusCircle,
  Wallet,
  HandCoins,
  CreditCard,
  Landmark,
  Receipt,
  Calendar,
  Users,
  RefreshCw,
  BookOpen,
  Eye,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────
interface DashboardData {
  totalIncome: number
  totalExpense: number
  totalReceivable: number
  totalPayable: number
  netProfit: number
  recentTransactions: RecentTransaction[]
  vatSummary: {
    outputVAT: number
    inputVAT: number
    netVATPayable: number
  }
  topParties: TopParty[]
  monthlyData: MonthlyData[]
  cashBalance?: number
  bankBalance?: number
  accountBalances?: AccountBalance[]
}

interface RecentTransaction {
  id: string
  entryNumber: string
  date: string
  narration: string
  voucherType: string
  totalDebit: number
  totalCredit: number
  lines: {
    id: string
    accountId: string
    debit: number
    credit: number
    account: {
      id: string
      name: string
      code: string
      accountType: string
      subType?: string
    }
  }[]
}

interface TopParty {
  id: string
  name: string
  nameNepali?: string
  currentBalance: number
  partyType: string
}

interface MonthlyData {
  month: string
  key: string
  income: number
  expense: number
}

interface AccountBalance {
  name: string
  nameNepali?: string
  code: string
  balance: number
  subType: string
}

// recharts config removed - using CSS-based bars

// ── Helpers ────────────────────────────────────────────────────
function getTransactionType(tx: RecentTransaction): 'income' | 'expense' | 'neutral' {
  const incomeTypes = ['receipt', 'sales']
  const expenseTypes = ['payment', 'purchase']
  if (incomeTypes.includes(tx.voucherType)) return 'income'
  if (expenseTypes.includes(tx.voucherType)) return 'expense'
  const hasIncomeCredit = tx.lines.some(
    (l) => l.account.accountType === 'income' && l.credit > 0
  )
  const hasExpenseDebit = tx.lines.some(
    (l) => l.account.accountType === 'expense' && l.debit > 0
  )
  if (hasIncomeCredit) return 'income'
  if (hasExpenseDebit) return 'expense'
  return 'neutral'
}

function getTransactionAmount(tx: RecentTransaction): number {
  const type = getTransactionType(tx)
  if (type === 'income') {
    const incomeLine = tx.lines.find(
      (l) => l.account.accountType === 'income' && l.credit > 0
    )
    return incomeLine?.credit || tx.totalCredit
  }
  if (type === 'expense') {
    const expenseLine = tx.lines.find(
      (l) => l.account.accountType === 'expense' && l.debit > 0
    )
    return expenseLine?.debit || tx.totalDebit
  }
  return tx.totalDebit
}

// ── Skeletons ──────────────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-56" />
      </CardHeader>
      <CardContent>
        <div className="h-[280px] flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Stat Card ──────────────────────────────────────────────────
function StatCard({
  title,
  titleNepali,
  value,
  icon: Icon,
  trend,
  trendLabel,
  colorClass,
  iconBgClass,
}: {
  title: string
  titleNepali: string
  value: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  colorClass: string
  iconBgClass: string
}) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-[10px]">{titleNepali}</CardDescription>
          </div>
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', iconBgClass)}>
            <Icon className={cn('h-4 w-4', colorClass)} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <p className={cn('text-xl font-bold tracking-tight', colorClass)}>
            {formatNPR(value)}
          </p>
        </div>
        {trend && trendLabel && (
          <div className="flex items-center gap-1 mt-1">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-green-600" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-600" />}
            <span
              className={cn(
                'text-xs font-medium',
                trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
              )}
            >
              {trendLabel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Transaction Row ────────────────────────────────────────────
function TransactionRow({ tx }: { tx: RecentTransaction }) {
  const txType = getTransactionType(tx)
  const amount = getTransactionAmount(tx)
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            txType === 'income'
              ? 'bg-green-100 dark:bg-green-900/30'
              : txType === 'expense'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-muted'
          )}
        >
          {txType === 'income' ? (
            <ArrowUpRight className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : txType === 'expense' ? (
            <ArrowDownRight className="h-4 w-4 text-red-600 dark:text-red-400" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{tx.narration}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {new Date(tx.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span>&middot;</span>
            <span>{tx.entryNumber}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {tx.voucherType}
            </Badge>
          </div>
        </div>
      </div>
      <div className="text-right ml-3">
        <p
          className={cn(
            'text-sm font-semibold tabular-nums',
            txType === 'income'
              ? 'text-green-600 dark:text-green-400'
              : txType === 'expense'
                ? 'text-red-600 dark:text-red-400'
                : 'text-foreground'
          )}
        >
          {txType === 'income' ? '+' : txType === 'expense' ? '-' : ''}
          {formatNPR(amount)}
        </p>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export function DashboardView() {
  const { currentOrgId, mode, currentFiscalYear, userOrganizations } = useAppStore()
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentPlan = userOrganizations.find(o => o.id === currentOrgId)?.plan || 'free'

  const fetchDashboard = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/dashboard?orgId=${currentOrgId}`)
      if (!res.ok) throw new Error('Failed to fetch dashboard data')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Fiscal Year Progress ──
  const fiscalYearProgress = (() => {
    const currentFY = NEPAL_FISCAL_YEARS.find(fy => fy.label === currentFiscalYear) || NEPAL_FISCAL_YEARS[0]
    if (!currentFY) return 0
    const start = new Date(currentFY.start).getTime()
    const end = new Date(currentFY.end).getTime()
    const now = Date.now()
    if (now < start) return 0
    if (now > end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  })()

  // ── Derived data ──
  const netWorth = data
    ? (data.totalReceivable + (data.cashBalance || 0) + (data.bankBalance || 0)) -
      data.totalPayable
    : 0

  // ── LOADING STATE ──
  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: mode === 'advanced' ? 8 : 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // ── ERROR STATE ──
  if (error) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-2">
              <Receipt className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-lg">ड्यासबोर्ड लोड गर्न सकिएन</CardTitle>
            <CardDescription>Could not load dashboard data</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDashboard} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              पुनः प्रयास गर्नुहोस् / Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  // ── RENDER ──
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* ── Fiscal Year Progress Bar ── */}
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                आर्थिक वर्ष / {t('fiscal_year')}: {currentFiscalYear}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {fiscalYearProgress}% elapsed
            </span>
          </div>
          <Progress value={fiscalYearProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* ── SIMPLE MODE: Top Stats (4 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          titleNepali="कुल आम्दानी"
          value={data.totalIncome}
          icon={TrendingUp}
          trend={data.totalIncome > 0 ? 'up' : 'neutral'}
          trendLabel={data.totalIncome > 0 ? 'Active' : 'No income yet'}
          colorClass="text-green-600 dark:text-green-400"
          iconBgClass="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          title="Total Expense"
          titleNepali="कुल खर्च"
          value={data.totalExpense}
          icon={TrendingDown}
          trend={data.totalExpense > 0 ? 'down' : 'neutral'}
          trendLabel={data.totalExpense > 0 ? 'Active' : 'No expenses yet'}
          colorClass="text-red-600 dark:text-red-400"
          iconBgClass="bg-red-100 dark:bg-red-900/30"
        />
        <StatCard
          title="Net Profit"
          titleNepali="खुद नाफा"
          value={data.netProfit}
          icon={DollarSign}
          trend={data.netProfit >= 0 ? 'up' : 'down'}
          trendLabel={data.netProfit >= 0 ? 'Profitable' : 'Loss'}
          colorClass={
            data.netProfit >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }
          iconBgClass={
            data.netProfit >= 0
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
          }
        />
        <StatCard
          title="Cash Balance"
          titleNepali="नगद मौज्दात"
          value={data.cashBalance || 0}
          icon={Wallet}
          trend="neutral"
          trendLabel="Cash in hand"
          colorClass="text-primary"
          iconBgClass="bg-primary/10"
        />
      </div>

      {/* ── ADVANCED MODE: Additional Stats (4 cards) ── */}
      {mode === 'advanced' && hasFeature(currentPlan, 'advancedMode') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Receivable"
            titleNepali="कुल प्राप्य"
            value={data.totalReceivable}
            icon={HandCoins}
            trend={data.totalReceivable > 0 ? 'up' : 'neutral'}
            trendLabel={data.totalReceivable > 0 ? 'To collect' : 'None'}
            colorClass="text-green-600 dark:text-green-400"
            iconBgClass="bg-green-100 dark:bg-green-900/30"
          />
          <StatCard
            title="Payable"
            titleNepali="कुल देय"
            value={data.totalPayable}
            icon={CreditCard}
            trend={data.totalPayable > 0 ? 'down' : 'neutral'}
            trendLabel={data.totalPayable > 0 ? 'To pay' : 'None'}
            colorClass="text-red-600 dark:text-red-400"
            iconBgClass="bg-red-100 dark:bg-red-900/30"
          />
          <StatCard
            title="VAT Payable"
            titleNepali="भ्याट देय"
            value={data.vatSummary.netVATPayable}
            icon={Landmark}
            trend={data.vatSummary.netVATPayable > 0 ? 'down' : 'neutral'}
            trendLabel={
              data.vatSummary.netVATPayable > 0
                ? 'Payable to IRD'
                : data.vatSummary.netVATPayable < 0
                  ? 'Refund expected'
                  : 'No VAT dues'
            }
            colorClass={
              data.vatSummary.netVATPayable > 0
                ? 'text-red-600 dark:text-red-400'
                : 'text-green-600 dark:text-green-400'
            }
            iconBgClass={
              data.vatSummary.netVATPayable > 0
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-green-100 dark:bg-green-900/30'
            }
          />
          <StatCard
            title="Net Worth"
            titleNepali="खुद मूल्य"
            value={netWorth}
            icon={DollarSign}
            trend={netWorth >= 0 ? 'up' : 'down'}
            trendLabel={netWorth >= 0 ? 'Positive' : 'Negative'}
            colorClass={
              netWorth >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
            iconBgClass={
              netWorth >= 0
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
            }
          />
        </div>
      )}

      {/* ── Quick Action Buttons (Simple Mode) ── */}
      {mode === 'simple' && (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => router.push('/income')}
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
          >
            <PlusCircle className="h-4 w-4" />
            {t('add_income')} / Add Income
          </Button>
          <Button
            onClick={() => router.push('/expense')}
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
          >
            <MinusCircle className="h-4 w-4" />
            {t('add_expense')} / Add Expense
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/journal/new')}
            className="gap-2"
          >
            <BookOpen className="h-4 w-4" />
            New Journal Entry
          </Button>
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expense Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              मासिक सारांश / Monthly Summary
            </CardTitle>
            <CardDescription>
              Last 6 months income vs expense overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyData.length > 0 &&
            data.monthlyData.some((m) => m.income > 0 || m.expense > 0) ? (
              <div className="space-y-3">
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-green-500" />
                    <span>आम्दानी / Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-red-500" />
                    <span>खर्च / Expense</span>
                  </div>
                </div>
                {/* Simple CSS-based bar chart */}
                {(() => {
                  const maxVal = Math.max(
                    ...data.monthlyData.map((m) => Math.max(m.income, m.expense)),
                    1
                  )
                  return data.monthlyData.map((m) => (
                    <div key={m.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium w-20">{m.month}</span>
                        <span className="text-green-600 dark:text-green-400 font-mono">
                          {formatNPR(m.income)}
                        </span>
                        <span className="text-red-600 dark:text-red-400 font-mono">
                          {formatNPR(m.expense)}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div
                          className="h-4 bg-green-500/80 rounded-sm"
                          style={{ width: `${Math.max((m.income / maxVal) * 100, 0.5)}%` }}
                        />
                        <div
                          className="h-4 bg-red-500/80 rounded-sm"
                          style={{ width: `${Math.max((m.expense / maxVal) * 100, 0.5)}%` }}
                        />
                      </div>
                    </div>
                  ))
                })()}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No monthly data yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Start adding transactions to see trends
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions (last 5) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  हालको गतिविधि / Recent Activity
                </CardTitle>
                <CardDescription>
                  {mode === 'simple' ? 'Latest transactions' : 'Latest journal entries'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1"
                onClick={() => router.push('/journal')}
              >
                <Eye className="h-3 w-3" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length > 0 ? (
              <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
                {data.recentTransactions.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">कुनै लेनदेन भएको छैन</p>
                  <p className="text-xs text-muted-foreground/60">
                    No transactions yet
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Parties */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  शीर्ष पक्षहरू / Top Parties
                </CardTitle>
                <CardDescription>
                  {mode === 'simple'
                    ? 'Customers & suppliers with highest balances'
                    : 'Key parties by outstanding balance'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => router.push('/parties')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.topParties.length > 0 ? (
              <div className="space-y-1">
                {data.topParties.map((party) => {
                  const isReceivable = party.currentBalance > 0
                  return (
                    <div
                      key={party.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                            isReceivable
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          )}
                        >
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{party.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">
                            {party.partyType}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            isReceivable
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          )}
                        >
                          {isReceivable ? '↑ ' : '↓ '}
                          {formatNPR(Math.abs(party.currentBalance))}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {isReceivable ? 'प्राप्य / Receivable' : 'देय / Payable'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">कुनै पक्ष भेटिएन</p>
                  <p className="text-xs text-muted-foreground/60">No parties found</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced: Account Balance Summary / Simple: Quick Overview */}
        {mode === 'advanced' && hasFeature(currentPlan, 'advancedMode') ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                खाता मौज्दात / Account Balance Summary
              </CardTitle>
              <CardDescription>Key accounts with current balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Cash in Hand</span>
                    <span className="text-[10px] text-muted-foreground">(हातमा नगद)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                    {formatNPR(data.cashBalance || 0)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Bank Balance</span>
                    <span className="text-[10px] text-muted-foreground">(बैंक मौज्दात)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                    {formatNPR(data.bankBalance || 0)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Accounts Receivable</span>
                    <span className="text-[10px] text-muted-foreground">(प्राप्य)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                    {formatNPR(data.totalReceivable)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Accounts Payable</span>
                    <span className="text-[10px] text-muted-foreground">(देय)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {formatNPR(data.totalPayable)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Net VAT</span>
                    <span className="text-[10px] text-muted-foreground">(भ्याट)</span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      data.vatSummary.netVATPayable > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {formatNPR(data.vatSummary.netVATPayable)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Simple Mode: VAT Summary mini */
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                भ्याट सारांश / VAT Summary
              </CardTitle>
              <CardDescription>Value Added Tax breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Output VAT (निर्गत भ्याट)</p>
                    <p className="text-xs text-muted-foreground">VAT collected on sales</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                    {formatNPR(data.vatSummary.outputVAT)}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Input VAT (आगत भ्याट)</p>
                    <p className="text-xs text-muted-foreground">VAT paid on purchases</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-green-600 dark:text-green-400">
                    {formatNPR(data.vatSummary.inputVAT)}
                  </span>
                </div>
                <Separator />
                <div
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    data.vatSummary.netVATPayable > 0
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : data.vatSummary.netVATPayable < 0
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : 'bg-muted/50'
                  )}
                >
                  <div>
                    <p className="text-sm font-bold">
                      Net VAT{' '}
                      {data.vatSummary.netVATPayable > 0
                        ? 'Payable'
                        : data.vatSummary.netVATPayable < 0
                          ? 'Refund'
                          : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {data.vatSummary.netVATPayable > 0
                        ? 'खातामा बुझाउनुपर्ने भ्याट'
                        : data.vatSummary.netVATPayable < 0
                          ? 'फिर्ता पाउनुपर्ने भ्याट'
                          : 'कुनै भ्याट बक्यौता छैन'}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'text-lg font-bold tabular-nums',
                      data.vatSummary.netVATPayable > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    )}
                  >
                    {formatNPR(Math.abs(data.vatSummary.netVATPayable))}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
