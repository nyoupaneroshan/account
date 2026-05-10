'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, isDebitNature, VOUCHER_TYPE_LABELS } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Nature helpers ──────────────────────────────────────────────────────────

const NATURE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  asset: { label: 'Asset', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300', icon: Landmark },
  liability: { label: 'Liability', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300', icon: Wallet },
  equity: { label: 'Equity', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', icon: CircleDollarSign },
  income: { label: 'Income', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300', icon: TrendingUp },
  expense: { label: 'Expense', color: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', icon: TrendingDown },
}

function getBalanceColor(balance: number, accountType: string): string {
  if (balance === 0) return 'text-muted-foreground'
  // For debit-nature accounts (assets/expenses), positive is "natural" -> green
  // For credit-nature accounts (liabilities/equity/income), positive is "natural" -> green
  if (isDebitNature(accountType)) {
    return balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  } else {
    return balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChartOfAccounts() {
  const { currentOrgId } = useAppStore()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
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
    try {
      const res = await fetch(`/api/accounts?orgId=${currentOrgId}`)
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      setAccounts(data)
      // Expand all groups by default
      const groupIds = [...new Set(data.map((a: Account) => a.group.id))]
      setExpandedGroups(groupIds)
    } catch (err) {
      console.error('Error fetching accounts:', err)
      toast.error('Failed to load accounts')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // ─── Grouped accounts ────────────────────────────────────────────────────

  const filteredAccounts = accounts.filter((account) => {
    // Tab filter
    if (activeTab !== 'all' && account.accountType !== activeTab) return false
    // Search filter
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

  // Group accounts by their group
  const groupedAccounts: Record<string, Account[]> = {}
  const groups: Record<string, AccountGroup> = {}

  filteredAccounts.forEach((account) => {
    const groupId = account.group.id
    if (!groupedAccounts[groupId]) {
      groupedAccounts[groupId] = []
    }
    groupedAccounts[groupId].push(account)
    groups[groupId] = account.group
  })

  // Sort groups by code
  const sortedGroupIds = Object.keys(groups).sort(
    (a, b) => groups[a].code.localeCompare(groups[b].code)
  )

  // ─── Add account ─────────────────────────────────────────────────────────

  const availableGroups = Object.values(groups).sort((a, b) => a.code.localeCompare(b.code))

  const handleAddAccount = async () => {
    if (!currentOrgId || !newAccount.name || !newAccount.code || !newAccount.groupId) {
      toast.error('Please fill in all required fields')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/accounts', {
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
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account')
      }
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

  // ─── Summary stats ───────────────────────────────────────────────────────

  const totalAccounts = filteredAccounts.length
  const totalGroups = sortedGroupIds.length

  // ─── Loading skeleton ────────────────────────────────────────────────────

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

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderTree className="size-6 text-primary" />
            Chart of Accounts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your organization&apos;s account structure
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} size="sm">
          <Plus className="size-4" />
          Add Account
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search accounts by name, code..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="asset">Assets</TabsTrigger>
          <TabsTrigger value="liability">Liabilities</TabsTrigger>
          <TabsTrigger value="equity">Equity</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expenses</TabsTrigger>
        </TabsList>

        {/* All tabs share the same content, filtered differently */}
        {['all', 'asset', 'liability', 'equity', 'income', 'expense'].map((tab) => (
          <TabsContent key={tab} value={tab}>
            {sortedGroupIds.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderTree className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No accounts match your search' : 'No accounts found'}
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
                      <AccordionItem key={groupId} value={groupId} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`size-8 rounded-md flex items-center justify-center shrink-0 ${natureConf.color}`}>
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
                                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${natureConf.color}`}>
                                  {natureConf.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {groupAccounts.length} account{groupAccounts.length !== 1 ? 's' : ''}
                                </span>
                                <span className={`text-xs font-medium ${getBalanceColor(groupBalance, group.nature)}`}>
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
                                      <span className="text-sm truncate">
                                        {account.name}
                                      </span>
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
                                      className={`text-sm font-medium whitespace-nowrap ml-4 ${getBalanceColor(
                                        account.currentBalance,
                                        account.accountType
                                      )}`}
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
            <DialogTitle>Create New Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="acct-code">Code *</Label>
                <Input
                  id="acct-code"
                  placeholder="e.g. 11004"
                  value={newAccount.code}
                  onChange={(e) => setNewAccount({ ...newAccount, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acct-type">Type *</Label>
                <Select
                  value={newAccount.accountType}
                  onValueChange={(v) => setNewAccount({ ...newAccount, accountType: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">Asset</SelectItem>
                    <SelectItem value="liability">Liability</SelectItem>
                    <SelectItem value="equity">Equity</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-name">Account Name *</Label>
              <Input
                id="acct-name"
                placeholder="e.g. Office Equipment"
                value={newAccount.name}
                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acct-name-np">Name in Nepali</Label>
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
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.code} - {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
