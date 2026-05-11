'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, isDebitNature } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  BookOpen,
  Search,
  Download,
  ChevronsUpDown,
  Check,
  FileSpreadsheet,
  ArrowRightLeft,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────

interface AccountGroup {
  id: string
  name: string
  nature: string
}

interface Account {
  id: string
  name: string
  nameNepali?: string | null
  code: string
  accountType: string
  currentBalance: number
  openingBalance: number
  isActive: boolean
  group: AccountGroup
}

interface JournalEntryLine {
  id: string
  accountId: string
  debit: number
  credit: number
  narration?: string | null
  account: {
    id: string
    name: string
    code: string
  }
}

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  narration: string
  voucherType: string
  isCancelled: boolean
  totalDebit: number
  totalCredit: number
  lines: JournalEntryLine[]
}

interface LedgerRow {
  date: string
  entryNumber: string
  narration: string
  debit: number
  credit: number
  balance: number
  isCancelled: boolean
}

// ─── Component ─────────────────────────────────────────────────

export function LedgerView() {
  const { currentOrgId } = useAppStore()

  // Selected account
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false)

  // Date filters
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Data
  const [accounts, setAccounts] = useState<Account[]>([])
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch accounts ──────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    if (!currentOrgId) return
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/accounts?orgId=${currentOrgId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setAccounts(data)
    } catch (err) {
      setError('Failed to load accounts')
      toast.error('Failed to load accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // ─── Fetch journal entries ───────────────────────────────────

  const fetchEntries = useCallback(async () => {
    if (!currentOrgId) return
    setLoadingEntries(true)
    try {
      const params = new URLSearchParams({
        orgId: currentOrgId,
        limit: '500',
      })
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const res = await fetch(`/api/journal-entries?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEntries(data.data || [])
    } catch (err) {
      toast.error('Failed to load ledger data')
    } finally {
      setLoadingEntries(false)
    }
  }, [currentOrgId, fromDate, toDate])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // ─── Handle account selection ────────────────────────────────

  const handleSelectAccount = (account: Account) => {
    setSelectedAccountId(account.id)
    setSelectedAccount(account)
    setAccountDropdownOpen(false)
  }

  // ─── Build ledger rows ───────────────────────────────────────

  const { ledgerRows, openingBalance, closingBalance } = useMemo(() => {
    if (!selectedAccountId || !selectedAccount) {
      return { ledgerRows: [], openingBalance: 0, closingBalance: 0 }
    }

    const isDebit = isDebitNature(selectedAccount.accountType)

    const relevantEntries = entries.filter((entry) =>
      entry.lines.some((line) => line.accountId === selectedAccountId)
    )

    relevantEntries.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      return a.entryNumber.localeCompare(b.entryNumber)
    })

    const rows: LedgerRow[] = []
    let balance = selectedAccount.openingBalance || 0

    for (const entry of relevantEntries) {
      const line = entry.lines.find((l) => l.accountId === selectedAccountId)
      if (!line) continue

      if (isDebit) {
        balance += line.debit - line.credit
      } else {
        balance += line.credit - line.debit
      }

      rows.push({
        date: entry.date,
        entryNumber: entry.entryNumber,
        narration: line.narration || entry.narration,
        debit: line.debit,
        credit: line.credit,
        balance,
        isCancelled: entry.isCancelled,
      })
    }

    return {
      ledgerRows: rows,
      openingBalance: selectedAccount.openingBalance || 0,
      closingBalance: rows.length > 0 ? rows[rows.length - 1].balance : selectedAccount.currentBalance,
    }
  }, [selectedAccountId, selectedAccount, entries])

  // ─── Group accounts for dropdown ─────────────────────────────

  const groupedAccounts = accounts.reduce(
    (groups, account) => {
      const nature = account.group?.nature || 'other'
      if (!groups[nature]) groups[nature] = []
      groups[nature].push(account)
      return groups
    },
    {} as Record<string, Account[]>
  )

  const natureLabels: Record<string, string> = {
    asset: 'Assets (सम्पत्ति)',
    liability: 'Liabilities (दायित्व)',
    equity: 'Equity (इक्विटी)',
    income: 'Income (आम्दानी)',
    expense: 'Expenses (खर्च)',
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // ─── Loading ─────────────────────────────────────────────────

  if (loadingAccounts) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-36" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // ─── Error ───────────────────────────────────────────────────

  if (error) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <BookOpen className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={fetchAccounts} variant="outline" size="sm" className="mt-4 gap-2">
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
            <BookOpen className="size-6 text-primary" />
            {t('ledger')} / खाता
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View individual account transactions and running balance
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info('Export feature coming soon')}
          disabled={!selectedAccountId}
          className="gap-2"
        >
          <Download className="size-4" />
          {t('export')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Account selector */}
            <div className="space-y-1.5 lg:col-span-1">
              <Label>{t('account')}</Label>
              <Popover open={accountDropdownOpen} onOpenChange={setAccountDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={accountDropdownOpen}
                    className="w-full justify-between text-left font-normal h-9"
                  >
                    {selectedAccount ? (
                      <span className="truncate">
                        <span className="font-mono text-xs text-muted-foreground">
                          {selectedAccount.code}
                        </span>{' '}
                        - {selectedAccount.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Select account...</span>
                    )}
                    <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[320px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search accounts..." />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No account found.</CommandEmpty>
                      {Object.entries(groupedAccounts).map(([nature, accts]) => (
                        <CommandGroup key={nature} heading={natureLabels[nature] || nature}>
                          {accts.map((account) => (
                            <CommandItem
                              key={account.id}
                              value={`${account.code} ${account.name}`}
                              onSelect={() => handleSelectAccount(account)}
                            >
                              <Check
                                className={cn(
                                  'size-3.5 mr-1',
                                  selectedAccountId === account.id ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              <span className="font-mono text-xs text-muted-foreground">{account.code}</span>
                              <span className="ml-1.5 text-sm">{account.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* From date */}
            <div className="space-y-1.5">
              <Label>{t('from_date')}</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9"
              />
            </div>

            {/* To date */}
            <div className="space-y-1.5">
              <Label>{t('to_date')}</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      {!selectedAccountId ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileSpreadsheet className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Select an account to view its ledger</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Choose an account from the dropdown above
            </p>
          </CardContent>
        </Card>
      ) : loadingEntries ? (
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-full border-b" />
            ))}
          </CardContent>
        </Card>
      ) : ledgerRows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ArrowRightLeft className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">No transactions found for this account</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              {selectedAccount && `${t('current_balance')}: ${formatNPR(selectedAccount.currentBalance)}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">
                    {selectedAccount?.code}
                  </span>
                  {selectedAccount?.name}
                </CardTitle>
                {selectedAccount?.nameNepali && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedAccount.nameNepali}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="w-fit capitalize">
                {selectedAccount?.accountType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-28">{t('date')}</TableHead>
                    <TableHead className="w-24">Entry #</TableHead>
                    <TableHead>{t('narration')}</TableHead>
                    <TableHead className="text-right w-32">{t('debit')}</TableHead>
                    <TableHead className="text-right w-32">{t('credit')}</TableHead>
                    <TableHead className="text-right w-36">{t('balance')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Opening Balance Row */}
                  <TableRow className="bg-muted/20 font-medium">
                    <TableCell colSpan={5} className="text-sm">
                      {t('opening_balance')} / सुरु मौज्दात
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatNPR(openingBalance)}
                    </TableCell>
                  </TableRow>

                  {/* Transaction rows */}
                  {ledgerRows.map((row, idx) => (
                    <TableRow
                      key={`${row.entryNumber}-${idx}`}
                      className={cn(
                        row.isCancelled && 'opacity-50 line-through',
                        idx % 2 === 1 && 'bg-muted/10'
                      )}
                    >
                      <TableCell className="text-sm">
                        {formatDate(row.date)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.entryNumber}
                      </TableCell>
                      <TableCell className="text-sm max-w-48 truncate">
                        {row.narration}
                        {row.isCancelled && (
                          <Badge variant="destructive" className="text-[9px] ml-2 py-0">
                            Cancelled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.debit > 0 ? formatNPR(row.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {row.credit > 0 ? formatNPR(row.credit) : '—'}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-mono text-sm font-semibold',
                          row.balance > 0
                            ? 'text-green-600 dark:text-green-400'
                            : row.balance < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-muted-foreground'
                        )}
                      >
                        {formatNPR(row.balance)}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Closing Balance Row */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2">
                    <TableCell colSpan={5} className="text-sm">
                      {t('closing_balance')} / अन्तिम मौज्दात
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono text-sm',
                        closingBalance > 0
                          ? 'text-green-600 dark:text-green-400'
                          : closingBalance < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-muted-foreground'
                      )}
                    >
                      {formatNPR(closingBalance)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      {selectedAccountId && ledgerRows.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t flex-wrap">
          <span>
            Total {t('debit')}: <strong className="text-foreground">{formatNPR(ledgerRows.reduce((s, r) => s + r.debit, 0))}</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Total {t('credit')}: <strong className="text-foreground">{formatNPR(ledgerRows.reduce((s, r) => s + r.credit, 0))}</strong>
          </span>
          <span className="text-border">|</span>
          <span>
            Transactions: <strong className="text-foreground">{ledgerRows.filter((r) => !r.isCancelled).length}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
