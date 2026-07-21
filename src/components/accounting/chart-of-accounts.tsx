'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, isDebitNature, VOUCHER_TYPE_LABELS } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  FolderTree,
  Search,
  ChevronRight,
  Landmark,
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  RefreshCw,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────

interface AccountGroup {
  id: string
  name: string
  nameNepali?: string | null
  code: string
  nature: string
  parentGroupId?: string | null
  isSystem: boolean
}

interface Account {
  id: string
  name: string
  nameNepali?: string | null
  code: string
  accountType: string
  subType?: string | null
  currentBalance: number
  openingBalance: number
  isSystem: boolean
  isActive: boolean
  allowsDirectPosting: boolean
  group: AccountGroup
}

// ─── Color scheme per spec: Asset=green, Liability=red, Equity=purple, Income=blue, Expense=orange ──

const NATURE_CONFIG: Record<string, { label: string; labelNp: string; color: string; bgColor: string; icon: React.ElementType }> = {
  asset: {
    label: 'Asset',
    labelNp: 'सम्पत्ति',
    color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    bgColor: 'border-l-green-500',
    icon: Landmark,
  },
  liability: {
    label: 'Liability',
    labelNp: 'दायित्व',
    color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    bgColor: 'border-l-red-500',
    icon: Wallet,
  },
  equity: {
    label: 'Equity',
    labelNp: 'इक्विटी',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    bgColor: 'border-l-purple-500',
    icon: CircleDollarSign,
  },
  income: {
    label: 'Income',
    labelNp: 'आम्दानी',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    bgColor: 'border-l-blue-500',
    icon: TrendingUp,
  },
  expense: {
    label: 'Expense',
    labelNp: 'खर्च',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    bgColor: 'border-l-orange-500',
    icon: TrendingDown,
  },
}

function getBalanceColor(balance: number, accountType: string): string {
  if (balance === 0) return 'text-muted-foreground'
  return balance > 0
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
}

// ─── Component ─────────────────────────────────────────────────

export function ChartOfAccounts() {
  const { currentOrgId } = useAppStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  // Add account form
  const [newAccount, setNewAccount] = useState({
    name: '',
    nameNepali: '',
    code: '',
    accountType: 'asset',
    groupId: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchAccounts = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/accounts?orgId=${currentOrgId}`)
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data)
      const groupIds = [...new Set(data.map((a: Account) => a.group.id))]
      setExpandedGroups(groupIds)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load accounts'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // ─── Filtered & grouped accounts ──────────────────────────────

  const filteredAccounts = accounts.filter((account) => {
    if (activeTab !== 'all' && account.accountType !== activeTab) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        account.name.toLowerCase().includes(q) ||
        account.code.toLowerCase().includes(q) ||
        (account.nameNepali && account.nameNepali.toLowerCase().includes(q))
      )
    }
    return true
  })

  const groupedAccounts: Record<string, Account[]> = {}
  const groups: Record<string, AccountGroup> = {}

  filteredAccounts.forEach((account) => {
    const groupId = account.group.id
    if (!groupedAccounts[groupId]) groupedAccounts[groupId] = []
    groupedAccounts[groupId].push(account)
    groups[groupId] = account.group
  })

  const sortedGroupIds = Object.keys(groups).sort(
    (a, b) => groups[a].code.localeCompare(groups[b].code)
  )

  const availableGroups = Object.values(groups).sort((a, b) => a.code.localeCompare(b.code))

  // ─── Add account handler ──────────────────────────────────────

  const handleAddAccount = async () => {
    if (!currentOrgId || !newAccount.name || !newAccount.code || !newAccount.groupId) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const res = await authFetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          name: newAccount.name,
          nameNepali: newAccount.nameNepali || undefined,
          code: newAccount.code,
          groupId: newAccount.groupId,
          accountType: newAccount.accountType,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create account')
      toast.success(`Account "${newAccount.name}" created successfully`)
      setShowAddDialog(false)
      setNewAccount({ name: '', nameNepali: '', code: '', accountType: 'asset', groupId: '' })
      fetchAccounts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create account')
    } finally {
      setSubmitting(false)
    }
  }

  const totalAccounts = filteredAccounts.length
  const totalGroups = sortedGroupIds.length

  // ─── Loading ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-10 w-full max-w-lg" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent>
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-8 w-full mb-2" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-2">
              <FolderTree className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-lg">खाता योजना लोड गर्न सकिएन</CardTitle>
            <CardDescription>Could not load chart of accounts</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchAccounts} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="size-6 text-primary" />
            {t('chart_of_accounts')} / खाता योजना
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization&apos;s account structure
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-2">
          <Plus className="size-4" />
          Add Account
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder={`${t('search')} accounts by name, code...`}
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs by Account Type */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="asset" className="gap-1">
            <span className="size-2 rounded-full bg-green-500" />
            Assets
          </TabsTrigger>
          <TabsTrigger value="liability" className="gap-1">
            <span className="size-2 rounded-full bg-red-500" />
            Liabilities
          </TabsTrigger>
          <TabsTrigger value="equity" className="gap-1">
            <span className="size-2 rounded-full bg-purple-500" />
            Equity
          </TabsTrigger>
          <TabsTrigger value="income" className="gap-1">
            <span className="size-2 rounded-full bg-blue-500" />
            Income
          </TabsTrigger>
          <TabsTrigger value="expense" className="gap-1">
            <span className="size-2 rounded-full bg-orange-500" />
            Expenses
          </TabsTrigger>
        </TabsList>

        {['all', 'asset', 'liability', 'equity', 'income', 'expense'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {sortedGroupIds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderTree className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No accounts match your search' : 'No accounts found'}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {searchTerm ? 'Try a different search term' : 'Add accounts to get started'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <Accordion
                  type="multiple"
                  value={expandedGroups}
                  onValueChange={setExpandedGroups}
                >
                  {sortedGroupIds.map((groupId) => {
                    const group = groups[groupId]
                    const groupAccounts = groupedAccounts[groupId]
                    const natureConf = NATURE_CONFIG[group.nature] || NATURE_CONFIG.asset
                    const NatureIcon = natureConf.icon
                    const groupBalance = groupAccounts.reduce(
                      (sum, a) => sum + a.currentBalance,
                      0
                    )

                    return (
                      <AccordionItem
                        key={groupId}
                        value={groupId}
                        className={cn('border rounded-lg px-4 border-l-4', natureConf.bgColor)}
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={cn('size-8 rounded-md flex items-center justify-center shrink-0', natureConf.color)}>
                              <NatureIcon className="size-4" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-muted-foreground">
                                  {group.code}
                                </span>
                                <span className="font-semibold text-sm truncate">
                                  {group.name}
                                </span>
                                {group.nameNepali && (
                                  <span className="text-xs text-muted-foreground truncate">
                                    {group.nameNepali}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', natureConf.color)}>
                                  {natureConf.label} ({natureConf.labelNp})
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {groupAccounts.length} account{groupAccounts.length !== 1 ? 's' : ''}
                                </span>
                                <span className={cn('text-xs font-medium', getBalanceColor(groupBalance, group.nature))}>
                                  {formatNPR(groupBalance)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="border-t pt-2">
                            {groupAccounts.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2 text-center">
                                No accounts in this group
                              </p>
                            ) : (
                              <div className="space-y-0">
                                {groupAccounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <ChevronRight className="size-3 text-muted-foreground/50 shrink-0" />
                                      <span className="font-mono text-xs text-muted-foreground shrink-0">
                                        {account.code}
                                      </span>
                                      <span className="text-sm truncate">{account.name}</span>
                                      {account.nameNepali && (
                                        <span className="text-xs text-muted-foreground hidden sm:inline truncate">
                                          {account.nameNepali}
                                        </span>
                                      )}
                                      {account.isSystem && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          System
                                        </Badge>
                                      )}
                                      {account.subType && (
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                          {account.subType.replace(/_/g, ' ')}
                                        </Badge>
                                      )}
                                    </div>
                                    <span
                                      className={cn(
                                        'text-sm font-medium whitespace-nowrap ml-4',
                                        getBalanceColor(account.currentBalance, account.accountType)
                                      )}
                                    >
                                      {formatNPR(account.currentBalance)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
        <span>
          <strong className="text-foreground">{totalGroups}</strong> Group{totalGroups !== 1 ? 's' : ''}
        </span>
        <span className="text-border">|</span>
        <span>
          <strong className="text-foreground">{totalAccounts}</strong> Account{totalAccounts !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Account Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Account / नयाँ खाता सिर्जना</DialogTitle>
            <DialogDescription className="sr-only">Create a new account in the chart of accounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acct-code">{t('code')} *</Label>
                <Input
                  id="acct-code"
                  placeholder="e.g. 11004"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acct-type">{t('type')} *</Label>
                <Select
                  value={newAccount.accountType}
                  onValueChange={(v) => setNewAccount({ ...newAccount, accountType: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-green-500" />
                        Asset (सम्पत्ति)
                      </span>
                    </SelectItem>
                    <SelectItem value="liability">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-red-500" />
                        Liability (दायित्व)
                      </span>
                    </SelectItem>
                    <SelectItem value="equity">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-purple-500" />
                        Equity (इक्विटी)
                      </span>
                    </SelectItem>
                    <SelectItem value="income">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-blue-500" />
                        Income (आम्दानी)
                      </span>
                    </SelectItem>
                    <SelectItem value="expense">
                      <span className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-orange-500" />
                        Expense (खर्च)
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-name">Account {t('name')} *</Label>
              <Input
                id="acct-name"
                placeholder="e.g. Office Equipment"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-name-np">नेपाली नाम</Label>
              <Input
                id="acct-name-np"
                placeholder="e.g. कार्यालय उपकरण"
                value={newAccount.nameNepali}
                onChange={(e) => setNewAccount({ ...newAccount, nameNepali: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-group">Group *</Label>
              <Select
                value={newAccount.groupId}
                onValueChange={(v) => setNewAccount({ ...newAccount, groupId: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select group..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((g) => {
                    const natureConf = NATURE_CONFIG[g.nature] || NATURE_CONFIG.asset
                    return (
                      <SelectItem key={g.id} value={g.id}>
                        <span className="flex items-center gap-2">
                          <span className={cn('size-2 rounded-full', {
                            'bg-green-500': g.nature === 'asset',
                            'bg-red-500': g.nature === 'liability',
                            'bg-purple-500': g.nature === 'equity',
                            'bg-blue-500': g.nature === 'income',
                            'bg-orange-500': g.nature === 'expense',
                          })} />
                          {g.code} - {g.name}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddAccount} disabled={submitting}>
              {submitting ? 'Creating...' : `Create ${t('account')}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
