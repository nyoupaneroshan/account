'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, NEPAL_FISCAL_YEARS, calculateVAT } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { hasFeature } from '@/lib/plans'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/session'
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
  Zap,
  FileText,
  ShoppingCart,
  Package,
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
    <Card className="bg-white/[0.02] border-white/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24 bg-white/5" />
          <Skeleton className="h-8 w-8 rounded-lg bg-white/5" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32 mb-1 bg-white/5" />
        <Skeleton className="h-3 w-20 bg-white/5" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="bg-white/[0.02] border-white/5">
      <CardHeader>
        <Skeleton className="h-5 w-40 bg-white/5" />
        <Skeleton className="h-3 w-56 bg-white/5" />
      </CardHeader>
      <CardContent>
        <div className="h-[280px] flex items-center justify-center">
          <Skeleton className="h-full w-full rounded-md bg-white/5" />
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
  accentColor,
}: {
  title: string
  titleNepali: string
  value: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  colorClass: string
  iconBgClass: string
  accentColor?: string
}) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:border-white/10 bg-white/[0.02] border-white/5 backdrop-blur-sm group",
    )}>
      {/* Gradient accent line at top */}
      <div className={cn("absolute top-0 left-0 right-0 h-[2px] opacity-60", accentColor || 'bg-emerald-500')} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {title}
            </CardTitle>
            <CardDescription className="text-[10px] text-zinc-600">{titleNepali}</CardDescription>
          </div>
          <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center transition-colors', iconBgClass)}>
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
          <div className="flex items-center gap-1 mt-1.5">
            {trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-400" />}
            {trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-400" />}
            <span
              className={cn(
                'text-[11px] font-medium',
                trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-zinc-500'
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
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
            txType === 'income'
              ? 'bg-emerald-500/10'
              : txType === 'expense'
                ? 'bg-red-500/10'
                : 'bg-white/5'
          )}
        >
          {txType === 'income' ? (
            <ArrowUpRight className="h-4 w-4 text-emerald-400" />
          ) : txType === 'expense' ? (
            <ArrowDownRight className="h-4 w-4 text-red-400" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-zinc-500" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-200 truncate">{tx.narration}</p>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <span>
              {new Date(tx.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-zinc-700">&middot;</span>
            <span>{tx.entryNumber}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-700 text-zinc-400">
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
              ? 'text-emerald-400'
              : txType === 'expense'
                ? 'text-red-400'
                : 'text-zinc-300'
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
      const res = await authFetch(`/api/dashboard?orgId=${currentOrgId}`)
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
          <Card className="bg-white/[0.02] border-white/5">
            <CardHeader>
              <Skeleton className="h-5 w-36 bg-white/5" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32 bg-white/5" />
                  <Skeleton className="h-4 w-24 bg-white/5" />
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
        <Card className="max-w-md w-full bg-white/[0.02] border-white/5">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-2">
              <Receipt className="h-6 w-6 text-red-400" />
            </div>
            <CardTitle className="text-lg text-zinc-200">ड्यासबोर्ड लोड गर्न सकिएन</CardTitle>
            <CardDescription className="text-zinc-500">Could not load dashboard data</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-zinc-500 mb-4">{error}</p>
            <Button onClick={fetchDashboard} variant="outline" size="sm" className="gap-2 border-zinc-700 text-zinc-300 hover:text-zinc-100 hover:bg-white/5">
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
      <Card className="overflow-hidden bg-white/[0.02] border-white/5 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500/60" />
              <span className="text-sm font-medium text-zinc-300">
                आर्थिक वर्ष / {t('fiscal_year')}: {currentFiscalYear}
              </span>
            </div>
            <span className="text-xs text-zinc-500">
              {fiscalYearProgress}% elapsed
            </span>
          </div>
          <Progress value={fiscalYearProgress} className="h-1.5 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:to-emerald-400" />
        </CardContent>
      </Card>

      {/* ── Quick Actions Row ── */}
      <div className="flex flex-wrap gap-2">
        {mode === 'simple' ? (
          <>
            <Button
              onClick={() => router.push('/income')}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              size="sm"
            >
              <PlusCircle className="h-4 w-4" />
              {t('add_income')} / Add Income
            </Button>
            <Button
              onClick={() => router.push('/expense')}
              className="gap-2 bg-red-600/80 hover:bg-red-700 text-white shadow-lg shadow-red-500/10"
              size="sm"
            >
              <MinusCircle className="h-4 w-4" />
              {t('add_expense')} / Add Expense
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => router.push('/journal/new')}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
              size="sm"
            >
              <BookOpen className="h-4 w-4" />
              New Journal Entry
            </Button>
          </>
        )}
        <Button variant="ghost" size="sm" onClick={() => router.push('/invoices')} className="gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/5">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">New Invoice</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push('/purchases')} className="gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/5">
          <ShoppingCart className="h-4 w-4" />
          <span className="hidden sm:inline">New Purchase</span>
        </Button>
        <Button variant="ghost" size="sm" onClick={() => router.push('/parties')} className="gap-2 text-zinc-400 hover:text-zinc-200 hover:bg-white/5">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Add Party</span>
        </Button>
      </div>

      {/* ── Top Stats (4 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Income"
          titleNepali="कुल आम्दानी"
          value={data.totalIncome}
          icon={TrendingUp}
          trend={data.totalIncome > 0 ? 'up' : 'neutral'}
          trendLabel={data.totalIncome > 0 ? 'Active' : 'No income yet'}
          colorClass="text-emerald-400"
          iconBgClass="bg-emerald-500/10"
          accentColor="bg-emerald-500"
        />
        <StatCard
          title="Total Expense"
          titleNepali="कुल खर्च"
          value={data.totalExpense}
          icon={TrendingDown}
          trend={data.totalExpense > 0 ? 'down' : 'neutral'}
          trendLabel={data.totalExpense > 0 ? 'Active' : 'No expenses yet'}
          colorClass="text-red-400"
          iconBgClass="bg-red-500/10"
          accentColor="bg-red-500"
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
              ? 'text-emerald-400'
              : 'text-red-400'
          }
          iconBgClass={
            data.netProfit >= 0
              ? 'bg-emerald-500/10'
              : 'bg-red-500/10'
          }
          accentColor={data.netProfit >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
        />
        <StatCard
          title="Cash Balance"
          titleNepali="नगद मौज्दात"
          value={data.cashBalance || 0}
          icon={Wallet}
          trend="neutral"
          trendLabel="Cash in hand"
          colorClass="text-emerald-300"
          iconBgClass="bg-emerald-500/10"
          accentColor="bg-gradient-to-r from-emerald-500 to-teal-400"
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
            colorClass="text-emerald-400"
            iconBgClass="bg-emerald-500/10"
            accentColor="bg-emerald-500"
          />
          <StatCard
            title="Payable"
            titleNepali="कुल देय"
            value={data.totalPayable}
            icon={CreditCard}
            trend={data.totalPayable > 0 ? 'down' : 'neutral'}
            trendLabel={data.totalPayable > 0 ? 'To pay' : 'None'}
            colorClass="text-red-400"
            iconBgClass="bg-red-500/10"
            accentColor="bg-red-500"
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
                ? 'text-red-400'
                : 'text-emerald-400'
            }
            iconBgClass={
              data.vatSummary.netVATPayable > 0
                ? 'bg-red-500/10'
                : 'bg-emerald-500/10'
            }
            accentColor={data.vatSummary.netVATPayable > 0 ? 'bg-red-500' : 'bg-emerald-500'}
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
                ? 'text-emerald-400'
                : 'text-red-400'
            }
            iconBgClass={
              netWorth >= 0
                ? 'bg-emerald-500/10'
                : 'bg-red-500/10'
            }
            accentColor={netWorth >= 0 ? 'bg-emerald-500' : 'bg-red-500'}
          />
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expense Bar Chart */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base text-zinc-200">
              मासिक सारांश / Monthly Summary
            </CardTitle>
            <CardDescription className="text-zinc-500">
              Last 6 months income vs expense overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.monthlyData.length > 0 &&
            data.monthlyData.some((m) => m.income > 0 || m.expense > 0) ? (
              <div className="space-y-4">
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs mb-2">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-emerald-500" />
                    <span className="text-zinc-400">आम्दानी / Income</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm bg-red-500" />
                    <span className="text-zinc-400">खर्च / Expense</span>
                  </div>
                </div>
                {/* CSS bar chart with vertical bars */}
                {(() => {
                  const maxVal = Math.max(
                    ...data.monthlyData.map((m) => Math.max(m.income, m.expense)),
                    1
                  )
                  return (
                    <div className="flex items-end gap-3 h-48">
                      {data.monthlyData.map((m) => {
                        const incomeH = Math.max((m.income / maxVal) * 100, 1)
                        const expenseH = Math.max((m.expense / maxVal) * 100, 1)
                        return (
                          <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                            {/* Amounts on hover */}
                            <div className="text-[10px] text-zinc-500 font-mono mb-0.5">
                              {m.income > 0 ? `${(m.income / 1000).toFixed(0)}k` : '-'}
                            </div>
                            <div className="w-full flex items-end gap-0.5 h-32">
                              {/* Income bar */}
                              <div
                                className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm min-h-[2px] transition-all duration-500 hover:from-emerald-500 hover:to-emerald-300 relative group"
                                style={{ height: `${incomeH}%` }}
                              >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {formatNPR(m.income)}
                                </div>
                              </div>
                              {/* Expense bar */}
                              <div
                                className="flex-1 bg-gradient-to-t from-red-600 to-red-400 rounded-t-sm min-h-[2px] transition-all duration-500 hover:from-red-500 hover:to-red-300 relative group"
                                style={{ height: `${expenseH}%` }}
                              >
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-red-400 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                  {formatNPR(m.expense)}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-500 mt-1">{m.month.slice(0, 3)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Receipt className="h-10 w-10 mx-auto mb-2 text-zinc-700" />
                  <p className="text-sm">No monthly data yet</p>
                  <p className="text-xs text-zinc-600">
                    Start adding transactions to see trends
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions (last 5) */}
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-200">
                  हालको गतिविधि / Recent Activity
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  {mode === 'simple' ? 'Latest transactions' : 'Latest journal entries'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                onClick={() => router.push('/journal')}
              >
                <Eye className="h-3 w-3" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length > 0 ? (
              <div className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                {data.recentTransactions.slice(0, 5).map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Receipt className="h-10 w-10 mx-auto mb-2 text-zinc-700" />
                  <p className="text-sm">कुनै लेनदेन भएको छैन</p>
                  <p className="text-xs text-zinc-600">
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
        <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-200">
                  शीर्ष पक्षहरू / Top Parties
                </CardTitle>
                <CardDescription className="text-zinc-500">
                  {mode === 'simple'
                    ? 'Customers & suppliers with highest balances'
                    : 'Key parties by outstanding balance'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
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
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                            isReceivable
                              ? 'bg-emerald-500/10'
                              : 'bg-red-500/10'
                          )}
                        >
                          <Users className={cn(
                            'h-4 w-4',
                            isReceivable ? 'text-emerald-400' : 'text-red-400'
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate">{party.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 border-zinc-700 text-zinc-400">
                            {party.partyType}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            isReceivable
                              ? 'text-emerald-400'
                              : 'text-red-400'
                          )}
                        >
                          {isReceivable ? '↑ ' : '↓ '}
                          {formatNPR(Math.abs(party.currentBalance))}
                        </p>
                        <p className="text-[10px] text-zinc-500">
                          {isReceivable ? 'प्राप्य / Receivable' : 'देय / Payable'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-zinc-500">
                <div className="text-center">
                  <Users className="h-10 w-10 mx-auto mb-2 text-zinc-700" />
                  <p className="text-sm">कुनै पक्ष भेटिएन</p>
                  <p className="text-xs text-zinc-600">No parties found</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Advanced: Account Balance Summary / Simple: VAT Summary */}
        {mode === 'advanced' && hasFeature(currentPlan, 'advancedMode') ? (
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">
                खाता मौज्दात / Account Balance Summary
              </CardTitle>
              <CardDescription className="text-zinc-500">Key accounts with current balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-emerald-500/60" />
                    <span className="text-sm text-zinc-300">Cash in Hand</span>
                    <span className="text-[10px] text-zinc-600">(हातमा नगद)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-400">
                    {formatNPR(data.cashBalance || 0)}
                  </span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-emerald-500/60" />
                    <span className="text-sm text-zinc-300">Bank Balance</span>
                    <span className="text-[10px] text-zinc-600">(बैंक मौज्दात)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-400">
                    {formatNPR(data.bankBalance || 0)}
                  </span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-4 w-4 text-emerald-500/60" />
                    <span className="text-sm text-zinc-300">Accounts Receivable</span>
                    <span className="text-[10px] text-zinc-600">(प्राप्य)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-400">
                    {formatNPR(data.totalReceivable)}
                  </span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-red-500/60" />
                    <span className="text-sm text-zinc-300">Accounts Payable</span>
                    <span className="text-[10px] text-zinc-600">(देय)</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-red-400">
                    {formatNPR(data.totalPayable)}
                  </span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-300">Net VAT</span>
                    <span className="text-[10px] text-zinc-600">(भ्याट)</span>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      data.vatSummary.netVATPayable > 0
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    )}
                  >
                    {formatNPR(data.vatSummary.netVATPayable)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Simple Mode: VAT Summary */
          <Card className="bg-white/[0.02] border-white/5 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200">
                भ्याट सारांश / VAT Summary
              </CardTitle>
              <CardDescription className="text-zinc-500">Value Added Tax breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Output VAT (निर्गत भ्याट)</p>
                    <p className="text-xs text-zinc-500">VAT collected on sales</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-red-400">
                    {formatNPR(data.vatSummary.outputVAT)}
                  </span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-zinc-300">Input VAT (आगत भ्याट)</p>
                    <p className="text-xs text-zinc-500">VAT paid on purchases</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-emerald-400">
                    {formatNPR(data.vatSummary.inputVAT)}
                  </span>
                </div>
                <Separator className="bg-white/5" />
                <div
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl',
                    data.vatSummary.netVATPayable > 0
                      ? 'bg-red-500/5 border border-red-500/10'
                      : data.vatSummary.netVATPayable < 0
                        ? 'bg-emerald-500/5 border border-emerald-500/10'
                        : 'bg-white/[0.02] border border-white/5'
                  )}
                >
                  <div>
                    <p className="text-sm font-bold text-zinc-200">
                      Net VAT{' '}
                      {data.vatSummary.netVATPayable > 0
                        ? 'Payable'
                        : data.vatSummary.netVATPayable < 0
                          ? 'Refund'
                          : ''}
                    </p>
                    <p className="text-xs text-zinc-500">
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
                        ? 'text-red-400'
                        : 'text-emerald-400'
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
