'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Calendar } from '@/components/ui/calendar'
import {
  Plus,
  Trash2,
  ArrowLeft,
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Send,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Account {
  id: string
  name: string
  nameNepali?: string | null
  code: string
  accountType: string
  isActive: boolean
  allowsDirectPosting: boolean
  group: {
    id: string
    name: string
    nature: string
  }
}

interface JournalLine {
  id: string // local unique key
  accountId: string
  accountName: string
  debit: string
  credit: string
  narration: string
}

// ─── Component ───────────────────────────────────────────────────────────────

let lineIdCounter = 0
function generateLineId() {
  return `line-${++lineIdCounter}`
}

export function JournalEntryNew() {
  const { currentOrgId, setActiveModule } = useAppStore()

  // Form state
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [voucherType, setVoucherType] = useState<string>('journal')
  const [narration, setNarration] = useState('')
  const [lines, setLines] = useState<JournalLine[]>([
    { id: generateLineId(), accountId: '', accountName: '', debit: '', credit: '', narration: '' },
    { id: generateLineId(), accountId: '', accountName: '', debit: '', credit: '', narration: '' },
  ])

  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Calendar open state
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Account dropdown open state per line
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({})

  // ─── Fetch accounts ─────────────────────────────────────────────────────

  const fetchAccounts = useCallback(async () => {
    if (!currentOrgId) return
    setLoadingAccounts(true)
    try {
      const res = await fetch(`/api/accounts?orgId=${currentOrgId}`)
      if (!res.ok) throw new Error('Failed to fetch accounts')
      const data = await res.json()
      // Only show active accounts that allow direct posting
      const eligible = data.filter(
        (a: Account) => a.isActive && a.allowsDirectPosting
      )
      setAccounts(eligible)
    } catch (err) {
      console.error('Error fetching accounts:', err)
      toast.error('Failed to load accounts')
    } finally {
      setLoadingAccounts(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // ─── Line management ────────────────────────────────────────────────────

  const addLine = () => {
    setLines([
      ...lines,
      { id: generateLineId(), accountId: '', accountName: '', debit: '', credit: '', narration: '' },
    ])
  }

  const removeLine = (lineId: string) => {
    if (lines.length <= 2) {
      toast.error('At least two lines are required for a journal entry')
      return
    }
    setLines(lines.filter((l) => l.id !== lineId))
  }

  const updateLine = (lineId: string, field: keyof JournalLine, value: string) => {
    setLines(
      lines.map((l) => {
        if (l.id !== lineId) return l
        const updated = { ...l, [field]: value }
        // If setting debit, clear credit and vice versa
        if (field === 'debit' && value) {
          updated.credit = ''
        } else if (field === 'credit' && value) {
          updated.debit = ''
        }
        return updated
      })
    )
  }

  const selectAccount = (lineId: string, account: Account) => {
    setLines(
      lines.map((l) => {
        if (l.id !== lineId) return l
        return { ...l, accountId: account.id, accountName: `${account.code} - ${account.name}` }
      })
    )
    setOpenDropdowns({ ...openDropdowns, [lineId]: false })
  }

  // ─── Totals ─────────────────────────────────────────────────────────────

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0)
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0)
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0
  const hasAllAccounts = lines.every((l) => l.accountId)
  const hasAnyAmount = lines.some((l) => parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
  const canPost = isBalanced && hasAllAccounts && date && narration.trim() && hasAnyAmount

  // ─── Group accounts by nature for dropdown ──────────────────────────────

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
    asset: 'Assets',
    liability: 'Liabilities',
    equity: 'Equity',
    income: 'Income',
    expense: 'Expenses',
  }

  // ─── Submit ─────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!canPost || !currentOrgId) return

    setSubmitting(true)
    try {
      const payload = {
        orgId: currentOrgId,
        date: date!.toISOString().split('T')[0],
        narration: narration.trim(),
        voucherType,
        lines: lines
          .filter((l) => parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0)
          .map((l) => ({
            accountId: l.accountId,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            narration: l.narration || null,
          })),
      }

      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create journal entry')
      }

      toast.success(`Journal entry ${data.entryNumber} created successfully!`)
      setActiveModule('journal-entries')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create entry')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────

  if (loadingAccounts) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <Skeleton className="h-8 w-52" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setActiveModule('journal-entries')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Journal Entry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create a double-entry bookkeeping record
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Date, Voucher Type, Narration */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date */}
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="size-4 mr-2" />
                    {date ? date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      setDate(d)
                      setCalendarOpen(false)
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Voucher Type */}
            <div className="space-y-1.5">
              <Label>Voucher Type *</Label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="journal">Journal</SelectItem>
                  <SelectItem value="contra">Contra</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Narration */}
            <div className="space-y-1.5">
              <Label htmlFor="je-narration">Narration *</Label>
              <Textarea
                id="je-narration"
                placeholder="Describe this transaction..."
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Right: Lines */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Entry Lines</CardTitle>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="size-3.5" />
                Add Line
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Lines header */}
            <div className="grid grid-cols-[1fr_100px_100px_1fr_32px] gap-2 mb-2 px-1">
              <span className="text-xs font-medium text-muted-foreground">Account</span>
              <span className="text-xs font-medium text-muted-foreground text-right">Debit</span>
              <span className="text-xs font-medium text-muted-foreground text-right">Credit</span>
              <span className="text-xs font-medium text-muted-foreground">Line Narration</span>
              <span />
            </div>

            {/* Lines */}
            <div className="space-y-2">
              {lines.map((line) => (
                <div
                  key={line.id}
                  className="grid grid-cols-[1fr_100px_100px_1fr_32px] gap-2 items-start"
                >
                  {/* Account searchable select */}
                  <Popover
                    open={openDropdowns[line.id]}
                    onOpenChange={(open) =>
                      setOpenDropdowns({ ...openDropdowns, [line.id]: open })
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDropdowns[line.id]}
                        className="w-full justify-between text-left font-normal h-9"
                      >
                        {line.accountName || (
                          <span className="text-muted-foreground">Select account...</span>
                        )}
                        <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
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
                                  onSelect={() => selectAccount(line.id, account)}
                                >
                                  <Check
                                    className={`size-3.5 mr-1 ${
                                      line.accountId === account.id
                                        ? 'opacity-100'
                                        : 'opacity-0'
                                    }`}
                                  />
                                  <span className="font-mono text-xs text-muted-foreground">
                                    {account.code}
                                  </span>
                                  <span className="ml-1.5 text-sm">{account.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Debit */}
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="h-9 text-right font-mono"
                    value={line.debit}
                    onChange={(e) => updateLine(line.id, 'debit', e.target.value)}
                    min="0"
                    step="0.01"
                  />

                  {/* Credit */}
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="h-9 text-right font-mono"
                    value={line.credit}
                    onChange={(e) => updateLine(line.id, 'credit', e.target.value)}
                    min="0"
                    step="0.01"
                  />

                  {/* Line narration */}
                  <Input
                    placeholder="Optional..."
                    className="h-9"
                    value={line.narration}
                    onChange={(e) => updateLine(line.id, 'narration', e.target.value)}
                  />

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-red-500"
                    onClick={() => removeLine(line.id)}
                    title="Remove line"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="grid grid-cols-[1fr_100px_100px_1fr_32px] gap-2 mt-4 pt-4 border-t">
              <div className="text-sm font-semibold text-right pr-2">Total</div>
              <div
                className={`text-right font-mono text-sm font-semibold ${
                  totalDebit > 0 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {formatNPR(totalDebit)}
              </div>
              <div
                className={`text-right font-mono text-sm font-semibold ${
                  totalCredit > 0 ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {formatNPR(totalCredit)}
              </div>
              <div />
              <div />
            </div>

            {/* Balance validation */}
            {!isBalanced && hasAnyAmount && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <AlertCircle className="size-4 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    Debits must equal credits
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-500">
                    Difference: {formatNPR(Math.abs(totalDebit - totalCredit))}
                  </p>
                </div>
              </div>
            )}
            {isBalanced && hasAnyAmount && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md">
                <Check className="size-4 text-emerald-500 shrink-0" />
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Entry is balanced
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t">
        <Button
          variant="outline"
          onClick={() => setActiveModule('journal-entries')}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canPost || submitting}
          className="min-w-32"
        >
          <Send className="size-4" />
          {submitting ? 'Posting...' : 'Post Entry'}
        </Button>
      </div>
    </div>
  )
}
