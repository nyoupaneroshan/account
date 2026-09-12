'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
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
  BarChart3,
  Activity,
  Sparkles,
  ArrowRight,
  LayoutDashboard,
  Clock,
  Send,
  Banknote,
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

// ── Animated Number Counter Hook ──────────────────────────────
function useCountUp(target: number, duration: number = 800, enabled: boolean = true) {
  const [count, setCount] = useState(0)
  const prevTarget = useRef(0)

  // When disabled, directly reflect target value
  useEffect(() => {
    if (!enabled) return

    const start = prevTarget.current
    const diff = target - start
    if (diff === 0) return

    const startTime = Date.now()
    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(start + diff * eased)
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        prevTarget.current = target
      }
    }
    requestAnimationFrame(animate)
  }, [target, duration, enabled])

  // Separate sync for disabled state
  const displayCount = enabled ? count : target

  return displayCount
}

// ── Premium Skeletons ──────────────────────────────────────────
function StatCardSkeleton() {
  return (
    <Card className="glass-card hover-lift">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="skeleton skeleton-text w-20" />
            <div className="skeleton skeleton-text w-14 h-2" />
          </div>
          <div className="skeleton skeleton-avatar !h-9 !w-9 !rounded-lg" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="skeleton skeleton-heading w-28" />
        <div className="skeleton skeleton-text w-16 mt-2 h-2.5" />
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="skeleton skeleton-heading w-36" />
        <div className="skeleton skeleton-text w-48 mt-1.5" />
      </CardHeader>
      <CardContent>
        <div className="h-[280px] flex items-center justify-center gap-3 px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="skeleton w-full rounded-t-sm" style={{ height: `${Math.random() * 80 + 40}px` }} />
              <div className="skeleton skeleton-text w-6" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Premium Stat Card with Animated Counter ───────────────────
function StatCard({
  title,
  titleNepali,
  value,
  icon: Icon,
  trend,
  trendLabel,
  colorClass,
  iconBgClass,
  accentGradient,
  variant = 'default',
  delay = 0,
}: {
  title: string
  titleNepali: string
  value: number
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  colorClass: string
  iconBgClass: string
  accentGradient?: string
  variant?: 'income' | 'expense' | 'profit' | 'loss' | 'balance' | 'default'
  delay?: number
}) {
  const [visible, setVisible] = useState(false)
  const animatedValue = useCountUp(value, 1000, visible)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const variantClass = variant === 'income' ? 'stat-card-income'
    : variant === 'expense' ? 'stat-card-expense'
    : variant === 'profit' ? 'stat-card-profit'
    : variant === 'loss' ? 'stat-card-loss'
    : variant === 'balance' ? 'stat-card-balance'
    : ''

  return (
    <Card className={cn(
      "relative overflow-hidden glass-card hover-lift group cursor-default grain-texture",
      variantClass
    )}>
      {/* Refined gradient accent line at top */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-[2px] opacity-70",
          accentGradient || 'bg-gradient-to-r from-emerald-500 to-emerald-400'
        )}
      />
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className={cn(
          "absolute top-0 left-0 right-0 h-20 blur-xl opacity-20",
          accentGradient || 'bg-gradient-to-r from-emerald-500 to-emerald-400'
        )} />
      </div>
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              {title}
            </CardTitle>
            <CardDescription className="text-[10px] text-zinc-600 font-normal">
              {titleNepali}
            </CardDescription>
          </div>
          <div className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center transition-all duration-300',
            'group-hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]',
            iconBgClass
          )}>
            <Icon className={cn('h-4 w-4 transition-colors duration-300', colorClass)} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <div className="flex items-baseline gap-2">
          <p className={cn(
            'text-xl font-bold tracking-tight stat-number animate-count-up',
            colorClass
          )}>
            {formatNPR(Math.round(animatedValue))}
          </p>
        </div>
        {trend && trendLabel && (
          <div className="flex items-center gap-1.5 mt-2">
            {trend === 'up' && (
              <span className={cn(
                "flex items-center justify-center h-4 w-4 rounded-full",
                variant === 'expense' ? 'bg-red-500/10' : 'bg-emerald-500/10'
              )}>
                <ArrowUpRight className={cn(
                  'h-2.5 w-2.5',
                  variant === 'expense' ? 'text-red-400' : 'text-emerald-400'
                )} />
              </span>
            )}
            {trend === 'down' && (
              <span className={cn(
                "flex items-center justify-center h-4 w-4 rounded-full",
                variant === 'income' ? 'bg-red-500/10' : variant === 'expense' ? 'bg-emerald-500/10' : 'bg-red-500/10'
              )}>
                <ArrowDownRight className={cn(
                  'h-2.5 w-2.5',
                  variant === 'income' ? 'text-red-400' : variant === 'expense' ? 'text-emerald-400' : 'text-red-400'
                )} />
              </span>
            )}
            {trend === 'neutral' && (
              <span className="flex items-center justify-center h-4 w-4 rounded-full bg-white/5">
                <Activity className="h-2.5 w-2.5 text-zinc-500" />
              </span>
            )}
            <span
              className={cn(
                'text-[11px] font-medium',
                trend === 'up'
                  ? (variant === 'expense' ? 'text-red-400' : 'text-emerald-400')
                  : trend === 'down'
                    ? (variant === 'expense' ? 'text-emerald-400' : 'text-red-400')
                    : 'text-zinc-500'
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

// ── Premium Transaction Row ────────────────────────────────────
function TransactionRow({ tx, index }: { tx: RecentTransaction; index: number }) {
  const txType = getTransactionType(tx)
  const amount = getTransactionAmount(tx)
  return (
    <div
      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium group/tx"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
            txType === 'income'
              ? 'bg-emerald-500/10 group-hover/tx:bg-emerald-500/15 group-hover/tx:shadow-[0_0_8px_rgba(16,185,129,0.15)]'
              : txType === 'expense'
                ? 'bg-red-500/10 group-hover/tx:bg-red-500/15 group-hover/tx:shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                : 'bg-white/[0.03] group-hover/tx:bg-white/[0.06]'
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
          <p className="text-sm font-medium text-zinc-200 truncate group-hover/tx:text-zinc-100 transition-colors">
            {tx.narration}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5 text-zinc-600" />
              {new Date(tx.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-zinc-700">&middot;</span>
            <span className="text-zinc-600 font-mono">{tx.entryNumber}</span>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 border-white/[0.06] transition-colors",
                txType === 'income'
                  ? 'text-emerald-500/70 group-hover/tx:text-emerald-400 group-hover/tx:border-emerald-500/20'
                  : txType === 'expense'
                    ? 'text-red-500/70 group-hover/tx:text-red-400 group-hover/tx:border-red-500/20'
                    : 'text-zinc-500'
              )}
            >
              {tx.voucherType}
            </Badge>
          </div>
        </div>
      </div>
      <div className="text-right ml-3">
        <p
          className={cn(
            'text-sm font-semibold stat-number',
            txType === 'income'
              ? 'financial-positive'
              : txType === 'expense'
                ? 'financial-negative'
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

// ── Empty State Component ──────────────────────────────────────
function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType
  title: string
  subtitle: string
}) {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
          <Icon className="h-7 w-7 text-zinc-700" />
        </div>
        <p className="text-sm font-medium text-zinc-500">{title}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ── Quick Action Card ─────────────────────────────────────────
function QuickActionCard({
  icon: Icon,
  label,
  labelNepali,
  description,
  onClick,
  variant = 'default',
}: {
  icon: React.ElementType
  label: string
  labelNepali: string
  description: string
  onClick: () => void
  variant?: 'primary' | 'default' | 'danger'
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left w-full",
        "hover:-translate-y-0.5 hover:shadow-lg group",
        variant === 'primary'
          ? "bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-emerald-500/10"
          : variant === 'danger'
            ? "bg-red-500/[0.04] border-red-500/10 hover:border-red-500/30 hover:shadow-red-500/5"
            : "bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:shadow-white/[0.02]"
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
        variant === 'primary'
          ? "bg-emerald-500/15 group-hover:bg-emerald-500/20 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.2)]"
          : variant === 'danger'
            ? "bg-red-500/10 group-hover:bg-red-500/15"
            : "bg-white/[0.04] group-hover:bg-white/[0.06]"
      )}>
        <Icon className={cn(
          "h-4.5 w-4.5 transition-colors",
          variant === 'primary' ? "text-emerald-400" : variant === 'danger' ? "text-red-400" : "text-zinc-400 group-hover:text-zinc-300"
        )} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm font-medium transition-colors",
          variant === 'primary' ? "text-emerald-300 group-hover:text-emerald-200" : variant === 'danger' ? "text-red-300 group-hover:text-red-200" : "text-zinc-300 group-hover:text-zinc-200"
        )}>
          {label}
          <span className="text-[10px] text-zinc-600 ml-1.5">{labelNepali}</span>
        </p>
        <p className="text-[10px] text-zinc-600 truncate">{description}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-zinc-600 group-hover:text-zinc-400 transition-all group-hover:translate-x-0.5 shrink-0" />
    </button>
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
      <div className="p-4 md:p-6 space-y-6 fade-in-up">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: mode === 'advanced' ? 8 : 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartSkeleton />
          <Card className="glass-card">
            <CardHeader>
              <div className="skeleton skeleton-heading w-32" />
              <div className="skeleton skeleton-text w-44 mt-1.5" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="skeleton skeleton-avatar !h-9 !w-9 !rounded-lg" />
                    <div className="space-y-1.5">
                      <div className="skeleton skeleton-text w-28" />
                      <div className="skeleton skeleton-text w-20 h-2" />
                    </div>
                  </div>
                  <div className="skeleton skeleton-text w-20" />
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
        <Card className="max-w-md w-full glass-card">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-2xl bg-red-500/10 border border-red-500/10 flex items-center justify-center mb-3">
              <Receipt className="h-7 w-7 text-red-400" />
            </div>
            <CardTitle className="text-lg text-zinc-200">ड्यासबोर्ड लोड गर्न सकिएन</CardTitle>
            <CardDescription className="text-zinc-500">Could not load dashboard data</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-zinc-500 mb-4">{error}</p>
            <Button
              onClick={fetchDashboard}
              variant="outline"
              size="sm"
              className="gap-2 border-white/[0.08] text-zinc-300 hover:text-zinc-100 hover:bg-white/[0.04] hover:border-emerald-500/20 transition-premium"
            >
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
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto fade-in-up">
      {/* ── Fiscal Year Progress Bar ── */}
      <Card className="overflow-hidden glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Calendar className="h-3.5 w-3.5 text-emerald-500/70" />
              </div>
              <span className="text-sm font-medium text-zinc-300">
                आर्थिक वर्ष / {t('fiscal_year')}: {currentFiscalYear}
              </span>
            </div>
            <span className="text-xs text-zinc-500 stat-number">
              {fiscalYearProgress}% elapsed
            </span>
          </div>
          <div className="relative">
            <Progress
              value={fiscalYearProgress}
              className="h-2 bg-white/[0.04] rounded-full overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-emerald-600 [&>div]:via-emerald-500 [&>div]:to-emerald-400 [&>div]:rounded-full [&>div]:shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Actions Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-3.5 w-3.5 text-emerald-500/60" />
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            द्रुत कार्य / Quick Actions
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {mode === 'simple' ? (
            <>
              <QuickActionCard
                icon={PlusCircle}
                label="Add Income"
                labelNepali="आम्दानी"
                description="Record new income"
                onClick={() => router.push('/income')}
                variant="primary"
              />
              <QuickActionCard
                icon={MinusCircle}
                label="Add Expense"
                labelNepali="खर्च"
                description="Record new expense"
                onClick={() => router.push('/expense')}
                variant="danger"
              />
              <QuickActionCard
                icon={BookOpen}
                label="Udharo Khata"
                labelNepali="उधारो खाता"
                description="Customer & supplier credit"
                onClick={() => router.push('/khata')}
                variant="primary"
              />
            </>
          ) : (
            <QuickActionCard
              icon={BookOpen}
              label="Journal Entry"
              labelNepali="जर्नल"
              description="New double entry"
              onClick={() => router.push('/journal/new')}
              variant="primary"
            />
          )}
          <QuickActionCard
            icon={FileText}
            label="New Invoice"
            labelNepali="इनभ्वाइस"
            description="Create sales invoice"
            onClick={() => router.push('/invoices/new')}
          />
          <QuickActionCard
            icon={ShoppingCart}
            label="New Purchase"
            labelNepali="खरिद"
            description="Record a purchase"
            onClick={() => router.push('/purchases/new')}
          />
          <QuickActionCard
            icon={Users}
            label="Add Party"
            labelNepali="पक्ष"
            description="Customer or supplier"
            onClick={() => router.push('/parties/new')}
          />
          <QuickActionCard
            icon={Banknote}
            label="View Reports"
            labelNepali="रिपोर्ट"
            description="P&L, Balance Sheet"
            onClick={() => router.push('/reports')}
          />
          {mode === 'advanced' && (
            <QuickActionCard
              icon={Send}
              label="Payment"
              labelNepali="भुक्तानी"
              description="Record payment"
              onClick={() => router.push('/journal/new')}
            />
          )}
        </div>
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
          accentGradient="bg-gradient-to-r from-emerald-500 to-teal-400"
          variant="income"
          delay={0}
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
          accentGradient="bg-gradient-to-r from-red-500 to-rose-400"
          variant="expense"
          delay={100}
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
          accentGradient={data.netProfit >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}
          variant={data.netProfit >= 0 ? 'profit' : 'loss'}
          delay={200}
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
          accentGradient="bg-gradient-to-r from-emerald-500 to-cyan-400"
          variant="balance"
          delay={300}
        />
      </div>

      {/* ── SIMPLE MODE: Udharo Khata Summary Bar ── */}
      {mode === 'simple' && (
        <Card className="glass-card bg-gradient-to-r from-emerald-500/[0.05] via-transparent to-red-500/[0.05] border-white/[0.08]">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-200">
                  उधारो खाता सारांश (Khata Summary)
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  ग्राहकबाट लिन बाँकी:{' '}
                  <strong className="text-emerald-400 font-semibold">
                    {formatNPR(data.totalReceivable)}
                  </strong>
                  &nbsp;&nbsp;|&nbsp;&nbsp;साहुलाई तिर्न बाँकी:{' '}
                  <strong className="text-red-400 font-semibold">
                    {formatNPR(data.totalPayable)}
                  </strong>
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => router.push('/khata')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 gap-1.5 shrink-0"
            >
              उधारो खाता हेर्नुहोस्
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

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
            accentGradient="bg-gradient-to-r from-emerald-500 to-teal-400"
            variant="income"
            delay={400}
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
            accentGradient="bg-gradient-to-r from-red-500 to-rose-400"
            variant="expense"
            delay={500}
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
            accentGradient={data.vatSummary.netVATPayable > 0 ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}
            variant={data.vatSummary.netVATPayable > 0 ? 'expense' : 'income'}
            delay={600}
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
            accentGradient={netWorth >= 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-red-500 to-rose-400'}
            variant={netWorth >= 0 ? 'profit' : 'loss'}
            delay={700}
          />
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Income vs Expense Bar Chart */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-500/60" />
                  मासिक सारांश / Monthly Summary
                </CardTitle>
                <CardDescription className="text-zinc-500 mt-1">
                  Last 6 months income vs expense overview
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {data.monthlyData.length > 0 &&
            data.monthlyData.some((m) => m.income > 0 || m.expense > 0) ? (
              <div className="space-y-4">
                {/* Refined Legend */}
                <div className="flex items-center gap-5 text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400" />
                    <span className="text-zinc-400">आम्दानी / Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-sm bg-gradient-to-r from-red-500 to-red-400" />
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
                    <div className="relative">
                      {/* Subtle grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between pointer-events-none py-0">
                        {[25, 50, 75, 100].map((pct) => (
                          <div
                            key={pct}
                            className="border-t border-white/[0.03] w-full"
                            style={{ height: `${100 / 4}%` }}
                          />
                        ))}
                      </div>
                      <div className="flex items-end gap-3 h-48 relative">
                        {data.monthlyData.map((m) => {
                          const incomeH = Math.max((m.income / maxVal) * 100, 1)
                          const expenseH = Math.max((m.expense / maxVal) * 100, 1)
                          return (
                            <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                              {/* Amounts on hover */}
                              <div className="text-[10px] text-zinc-600 font-mono mb-0.5 stat-number">
                                {m.income > 0 ? `${(m.income / 1000).toFixed(0)}k` : '-'}
                              </div>
                              <div className="w-full flex items-end gap-0.5 h-32">
                                {/* Income bar */}
                                <div
                                  className="flex-1 rounded-t-sm min-h-[2px] transition-all duration-500 relative group/bar"
                                  style={{ height: `${incomeH}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/80 to-emerald-400/80 rounded-t-sm group-hover/bar:from-emerald-500 group-hover/bar:to-emerald-300 transition-colors" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/40 to-emerald-400/40 rounded-t-sm opacity-0 group-hover/bar:opacity-100 blur-sm transition-opacity" />
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800/95 border border-white/[0.06] text-emerald-400 text-[9px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-lg shadow-black/30 stat-number font-medium">
                                    {formatNPR(m.income)}
                                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-zinc-800/95 border-r border-b border-white/[0.06] rotate-45" />
                                  </div>
                                </div>
                                {/* Expense bar */}
                                <div
                                  className="flex-1 rounded-t-sm min-h-[2px] transition-all duration-500 relative group/bar"
                                  style={{ height: `${expenseH}%` }}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-t from-red-600/80 to-red-400/80 rounded-t-sm group-hover/bar:from-red-500 group-hover/bar:to-red-300 transition-colors" />
                                  <div className="absolute inset-0 bg-gradient-to-t from-red-600/40 to-red-400/40 rounded-t-sm opacity-0 group-hover/bar:opacity-100 blur-sm transition-opacity" />
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-zinc-800/95 border border-white/[0.06] text-red-400 text-[9px] px-2 py-1 rounded-md opacity-0 group-hover/bar:opacity-100 transition-all duration-200 whitespace-nowrap z-10 shadow-lg shadow-black/30 stat-number font-medium">
                                    {formatNPR(m.expense)}
                                    <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-zinc-800/95 border-r border-b border-white/[0.06] rotate-45" />
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] text-zinc-500 mt-1 font-medium">{m.month.slice(0, 3)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No monthly data yet"
                subtitle="Start adding transactions to see trends"
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions (last 5) */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-500/60" />
                  हालको गतिविधि / Recent Activity
                </CardTitle>
                <CardDescription className="text-zinc-500 mt-1">
                  {mode === 'simple' ? 'Latest transactions' : 'Latest journal entries'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 transition-premium"
                onClick={() => router.push('/journal')}
              >
                <Eye className="h-3 w-3" />
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentTransactions.length > 0 ? (
              <div className="space-y-0.5 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                {data.recentTransactions.slice(0, 5).map((tx, idx) => (
                  <TransactionRow key={tx.id} tx={tx} index={idx} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Receipt}
                title="कुनै लेनदेन भएको छैन"
                subtitle="No transactions yet"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Parties */}
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500/60" />
                  शीर्ष पक्षहरू / Top Parties
                </CardTitle>
                <CardDescription className="text-zinc-500 mt-1">
                  {mode === 'simple'
                    ? 'Customers & suppliers with highest balances'
                    : 'Key parties by outstanding balance'}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10 transition-premium"
                onClick={() => router.push('/parties')}
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.topParties.length > 0 ? (
              <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar">
                {data.topParties.map((party) => {
                  const isReceivable = party.currentBalance > 0
                  return (
                    <div
                      key={party.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium group/party"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'h-9 w-9 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300',
                            isReceivable
                              ? 'bg-emerald-500/10 group-hover/party:bg-emerald-500/15 group-hover/party:shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                              : 'bg-red-500/10 group-hover/party:bg-red-500/15 group-hover/party:shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                          )}
                        >
                          <Users className={cn(
                            'h-4 w-4 transition-colors',
                            isReceivable ? 'text-emerald-400' : 'text-red-400'
                          )} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-200 truncate group-hover/party:text-zinc-100 transition-colors">
                            {party.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 mt-0.5 border-white/[0.06] transition-colors",
                              isReceivable
                                ? 'text-emerald-500/70 group-hover/party:text-emerald-400 group-hover/party:border-emerald-500/20'
                                : 'text-red-500/70 group-hover/party:text-red-400 group-hover/party:border-red-500/20'
                            )}
                          >
                            {party.partyType}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right ml-3">
                        <p
                          className={cn(
                            'text-sm font-semibold stat-number',
                            isReceivable ? 'financial-positive' : 'financial-negative'
                          )}
                        >
                          {isReceivable ? '↑ ' : '↓ '}
                          {formatNPR(Math.abs(party.currentBalance))}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {isReceivable ? 'प्राप्य / Receivable' : 'देय / Payable'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="कुनै पक्ष भेटिएन"
                subtitle="No parties found"
              />
            )}
          </CardContent>
        </Card>

        {/* Advanced: Account Balance Summary / Simple: VAT Summary */}
        {mode === 'advanced' && hasFeature(currentPlan, 'advancedMode') ? (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500/60" />
                खाता मौज्दात / Account Balance Summary
              </CardTitle>
              <CardDescription className="text-zinc-500 mt-1">Key accounts with current balances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-emerald-500/70" />
                    </div>
                    <div>
                      <span className="text-sm text-zinc-300">Cash in Hand</span>
                      <span className="text-[10px] text-zinc-600 block">(हातमा नगद)</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold stat-number financial-positive">
                    {formatNPR(data.cashBalance || 0)}
                  </span>
                </div>
                <Separator className="bg-white/[0.04] mx-3" />
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Landmark className="h-4 w-4 text-emerald-500/70" />
                    </div>
                    <div>
                      <span className="text-sm text-zinc-300">Bank Balance</span>
                      <span className="text-[10px] text-zinc-600 block">(बैंक मौज्दात)</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold stat-number financial-positive">
                    {formatNPR(data.bankBalance || 0)}
                  </span>
                </div>
                <Separator className="bg-white/[0.04] mx-3" />
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <HandCoins className="h-4 w-4 text-emerald-500/70" />
                    </div>
                    <div>
                      <span className="text-sm text-zinc-300">Accounts Receivable</span>
                      <span className="text-[10px] text-zinc-600 block">(प्राप्य)</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold stat-number financial-positive">
                    {formatNPR(data.totalReceivable)}
                  </span>
                </div>
                <Separator className="bg-white/[0.04] mx-3" />
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-red-500/70" />
                    </div>
                    <div>
                      <span className="text-sm text-zinc-300">Accounts Payable</span>
                      <span className="text-[10px] text-zinc-600 block">(देय)</span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold stat-number financial-negative">
                    {formatNPR(data.totalPayable)}
                  </span>
                </div>
                <Separator className="bg-white/[0.04] mx-3" />
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center',
                      data.vatSummary.netVATPayable > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'
                    )}>
                      <Receipt className={cn(
                        'h-4 w-4',
                        data.vatSummary.netVATPayable > 0 ? 'text-red-500/70' : 'text-emerald-500/70'
                      )} />
                    </div>
                    <div>
                      <span className="text-sm text-zinc-300">Net VAT</span>
                      <span className="text-[10px] text-zinc-600 block">(भ्याट)</span>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-sm font-semibold stat-number',
                      data.vatSummary.netVATPayable > 0 ? 'financial-negative' : 'financial-positive'
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
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base text-zinc-200 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-500/60" />
                भ्याट सारांश / VAT Summary
              </CardTitle>
              <CardDescription className="text-zinc-500 mt-1">Value Added Tax breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4 text-red-500/70" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-300">Output VAT (निर्गत भ्याट)</p>
                      <p className="text-[10px] text-zinc-600">VAT collected on sales</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold stat-number financial-negative">
                    {formatNPR(data.vatSummary.outputVAT)}
                  </span>
                </div>
                <Separator className="bg-white/[0.04] mx-3" />
                <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-premium">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <ArrowDownRight className="h-4 w-4 text-emerald-500/70" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-300">Input VAT (आगत भ्याट)</p>
                      <p className="text-[10px] text-zinc-600">VAT paid on purchases</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold stat-number financial-positive">
                    {formatNPR(data.vatSummary.inputVAT)}
                  </span>
                </div>
                <Separator className="bg-white/[0.04] mx-3" />
                <div
                  className={cn(
                    'flex items-center justify-between p-4 rounded-xl mt-2 transition-premium',
                    data.vatSummary.netVATPayable > 0
                      ? 'financial-negative-bg border'
                      : data.vatSummary.netVATPayable < 0
                        ? 'financial-positive-bg border'
                        : 'bg-white/[0.02] border border-white/[0.04]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center',
                      data.vatSummary.netVATPayable > 0
                        ? 'bg-red-500/10'
                        : 'bg-emerald-500/10'
                    )}>
                      <Sparkles className={cn(
                        'h-4 w-4',
                        data.vatSummary.netVATPayable > 0
                          ? 'text-red-400'
                          : 'text-emerald-400'
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200">
                        Net VAT{' '}
                        {data.vatSummary.netVATPayable > 0
                          ? 'Payable'
                          : data.vatSummary.netVATPayable < 0
                            ? 'Refund'
                            : ''}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {data.vatSummary.netVATPayable > 0
                          ? 'खातामा बुझाउनुपर्ने भ्याट'
                          : data.vatSummary.netVATPayable < 0
                            ? 'फिर्ता पाउनुपर्ने भ्याट'
                            : 'कुनै भ्याट बक्यौता छैन'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-lg font-bold stat-number',
                      data.vatSummary.netVATPayable > 0 ? 'financial-negative' : 'financial-positive'
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
