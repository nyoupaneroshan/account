'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR, VOUCHER_TYPE_LABELS, isDebitNature } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Search,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  Filter,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────────

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
    accountType: string
    group: { name: string; nature: string }
  }
}

interface JournalEntry {
  id: string
  entryNumber: string
  date: string
  narration: string
  voucherType: string
  isPosted: boolean
  isCancelled: boolean
  totalDebit: number
  totalCredit: number
  lines: JournalEntryLine[]
  createdAt: string
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

// ─── Voucher type badge colors ─────────────────────────────────

const VOUCHER_BADGE_COLORS: Record<string, string> = {
  payment: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  receipt: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  journal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  contra: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  sales: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  purchase: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
}

// ─── Component ─────────────────────────────────────────────────

export function JournalEntries() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()

  // Filters
  const [voucherType, setVoucherType] = useState<string>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [searchNarration, setSearchNarration] = useState('')

  // Data
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // View dialog
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null)

  // Cancel dialog
  const [cancelEntryId, setCancelEntryId] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

  // ─── Fetch entries ───────────────────────────────────────────

  const fetchEntries = useCallback(
    async (page = 1) => {
      if (!currentOrgId) return
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          orgId: currentOrgId,
          page: String(page),
          limit: '20',
        })
        if (voucherType && voucherType !== 'all') params.set('voucherType', voucherType)
        if (fromDate) params.set('fromDate', fromDate)
        if (toDate) params.set('toDate', toDate)

        const res = await fetch(`/api/journal-entries?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()

        setEntries(data.data || [])
        setPagination(data.pagination || { page, limit: 20, total: 0, totalPages: 0 })
      } catch (err) {
        const msg = 'Failed to load journal entries'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    },
    [currentOrgId, voucherType, fromDate, toDate]
  )

  useEffect(() => {
    fetchEntries(1)
  }, [fetchEntries])

  // ─── Cancel entry ────────────────────────────────────────────

  const handleCancelEntry = async () => {
    if (!cancelEntryId) return
    setCancelling(true)
    try {
      const res = await fetch('/api/journal-entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancelEntryId, isCancelled: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to cancel')
      toast.success('Journal entry cancelled successfully')
      setCancelEntryId(null)
      fetchEntries(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel entry')
    } finally {
      setCancelling(false)
    }
  }

  // Client-side narration search
  const displayedEntries = searchNarration
    ? entries.filter((e) =>
        e.narration.toLowerCase().includes(searchNarration.toLowerCase())
      )
    : entries

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // ─── Loading ─────────────────────────────────────────────────

  if (loading && entries.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="flex gap-3 flex-wrap">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-36" />
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-12 w-full border-b" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Error ───────────────────────────────────────────────────

  if (error && entries.length === 0) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <FileText className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => fetchEntries(1)} variant="outline" size="sm" className="mt-4 gap-2">
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
            {t('journal_entries')} / जर्नल प्रविष्टि
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Double-entry bookkeeping records
          </p>
        </div>
        <Button onClick={() => router.push('/journal/new')} size="sm" className="gap-2">
          <Plus className="size-4" />
          New {t('journal_entry')}
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('filter')}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('from_date')}</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('to_date')}</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('voucher')}</label>
              <Select value={voucherType} onValueChange={setVoucherType}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="journal">Journal</SelectItem>
                  <SelectItem value="contra">Contra</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="purchase">Purchase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Search {t('narration')}</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder={`${t('search')}...`}
                  className="h-9 pl-8"
                  value={searchNarration}
                  onChange={(e) => setSearchNarration(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {displayedEntries.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="size-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No journal entries found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create your first entry to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">Entry #</TableHead>
                    <TableHead className="w-28">{t('date')}</TableHead>
                    <TableHead className="w-36">{t('voucher')}</TableHead>
                    <TableHead>{t('narration')}</TableHead>
                    <TableHead className="text-right w-32">{t('debit')}</TableHead>
                    <TableHead className="text-right w-32">{t('credit')}</TableHead>
                    <TableHead className="w-24 text-center">{t('status')}</TableHead>
                    <TableHead className="w-24 text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedEntries.map((entry, idx) => (
                    <TableRow
                      key={entry.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        entry.isCancelled && 'opacity-50',
                        idx % 2 === 1 && 'bg-muted/20',
                        'hover:bg-accent/40'
                      )}
                      onClick={() => setViewEntry(entry)}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('text-[10px]', VOUCHER_BADGE_COLORS[entry.voucherType] || '')}
                        >
                          {VOUCHER_TYPE_LABELS[entry.voucherType] || entry.voucherType}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-48 truncate text-sm">
                        {entry.narration}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNPR(entry.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatNPR(entry.totalCredit)}
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.isCancelled ? (
                          <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>
                        ) : entry.isPosted ? (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Posted
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => setViewEntry(entry)}
                            title="View details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          {!entry.isCancelled && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => setCancelEntryId(entry.id)}
                              title="Cancel entry"
                            >
                              <Ban className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => fetchEntries(pagination.page - 1)}
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchEntries(pagination.page + 1)}
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Entry Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={(open) => !open && setViewEntry(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5" />
              {viewEntry?.entryNumber}
              {viewEntry?.isCancelled && (
                <Badge variant="destructive" className="text-xs">Cancelled</Badge>
              )}
              {viewEntry?.isPosted && !viewEntry?.isCancelled && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Posted
                </Badge>
              )}
              {!viewEntry?.isPosted && !viewEntry?.isCancelled && (
                <Badge variant="secondary" className="text-xs">Draft</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {viewEntry?.narration}
            </DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              {/* Entry metadata */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('date')}</span>
                  <p className="font-medium">{formatDate(viewEntry.date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('voucher')}</span>
                  <p>
                    <Badge
                      variant="outline"
                      className={cn('text-xs', VOUCHER_BADGE_COLORS[viewEntry.voucherType] || '')}
                    >
                      {VOUCHER_TYPE_LABELS[viewEntry.voucherType] || viewEntry.voucherType}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('status')}</span>
                  <p>
                    {viewEntry.isCancelled ? (
                      <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                    ) : viewEntry.isPosted ? (
                      <Badge variant="outline" className="text-xs bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Posted
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Draft</Badge>
                    )}
                  </p>
                </div>
              </div>

              {/* Lines table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('account')}</TableHead>
                    <TableHead className="text-right">{t('debit')}</TableHead>
                    <TableHead className="text-right">{t('credit')}</TableHead>
                    <TableHead>{t('narration')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewEntry.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {line.account.code}
                          </span>
                          <span className="ml-2 text-sm">{line.account.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {line.debit > 0 ? formatNPR(line.debit) : '—'}
                      </TableCell>
                      <TableCell className="font-mono text-right">
                        {line.credit > 0 ? formatNPR(line.credit) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                        {line.narration || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted/30">
                    <TableCell>{t('total')}</TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNPR(viewEntry.totalDebit)}
                    </TableCell>
                    <TableCell className="font-mono text-right">
                      {formatNPR(viewEntry.totalCredit)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog
        open={!!cancelEntryId}
        onOpenChange={(open) => !open && setCancelEntryId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Journal Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the accounting effect of this entry. Account
              balances will be adjusted accordingly. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep Entry</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelEntry}
              disabled={cancelling}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Entry'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
