'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { adToBs } from '@/lib/bikram-sambat'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, MoreHorizontal, CheckCircle, XCircle, FileText,
  ChevronLeft, ChevronRight, Calendar, Send, Pencil, Printer, RotateCcw,
  RefreshCw, AlertCircle, ShieldAlert,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { TaxInvoiceModal } from '@/components/sales/tax-invoice-modal'
import { CreditNoteDialog } from '@/components/sales/credit-note-dialog'

// ─── Types ────────────────────────────────────────────────────
interface InvoiceLine {
  id: string
  productId: string | null
  description: string
  quantity: number
  unit: string | null
  unitPrice: number
  discountPercent: number
  taxableAmount: number
  vatRate: number | null
  vatAmount: number
  totalAmount: number
  hsnCode?: string | null
  isExempt?: boolean
  product: { id: string; name: string; code: string; unit: string; hsnCode?: string | null } | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  fiscalYear: string | null
  date: string
  dateBS: string | null
  dueDate: string | null
  partyId: string | null
  status: string
  subtotal: number
  discountAmount: number
  taxableAmount: number
  exemptAmount?: number
  vatAmount: number
  totalAmount: number
  amountPaid: number
  amountDue: number
  panNumber: string | null
  buyerName?: string | null
  buyerAddress?: string | null
  paymentMode?: string | null
  printCount?: number
  lastPrintedAt?: string | null
  cancelReason?: string | null
  cancelledAt?: string | null
  syncStatus?: string
  syncResponseCode?: number | null
  syncResponseMessage?: string | null
  syncedAt?: string | null
  syncAttempts?: number
  lines: InvoiceLine[]
  party: {
    id: string
    name: string
    nameNepali: string | null
    panNumber: string | null
    partyType: string
    address?: string | null
    city?: string | null
    phone?: string | null
  } | null
  organization?: {
    id: string
    name: string
    nameNepali?: string | null
    panNumber?: string | null
    address?: string | null
    phone?: string | null
    email?: string | null
    cbmsEnabled?: boolean
    cbmsIsSandbox?: boolean
    irdSoftwareCode?: string | null
  } | null
}

// ─── Status Config ────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; className: string; lineThrough?: boolean }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  },
  sent: {
    label: 'Sent',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  paid: {
    label: 'Paid',
    className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  },
  partial: {
    label: 'Partial',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  },
  overdue: {
    label: 'Overdue',
    className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  },
  cancelled: {
    label: 'Cancelled (रद्द)',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 line-through',
    lineThrough: true,
  },
}

const CANCEL_REASONS = [
  'Customer Cancelled Order (ग्राहकद्वारा अर्डर रद्द)',
  'Billing Data Entry Error (बीजक प्रविष्टिमा त्रुटि)',
  'Duplicate Invoice Generated (दोहोरो बीजक जारी भएको)',
  'Incorrect Customer / PAN (गलत ग्राहक वा स्थायी लेखा नम्बर)',
  'Price / Rate Mismatch (दर वा मूल्य फरक परेको)',
]

const ITEMS_PER_PAGE = 10

// ─── Component ────────────────────────────────────────────────
export function InvoiceList() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [syncFilter, setSyncFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [page, setPage] = useState(1)

  // Tax Invoice Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState<Invoice | null>(null)

  // Credit Note Modal State
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [selectedForCredit, setSelectedForCredit] = useState<Invoice | null>(null)

  // Cancel Invoice Dialog State
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [selectedForCancel, setSelectedForCancel] = useState<Invoice | null>(null)
  const [cancelReasonText, setCancelReasonText] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Syncing State
  const [syncingId, setSyncingId] = useState<string | null>(null)

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('fromDate', dateFrom)
      if (dateTo) params.set('toDate', dateTo)
      const res = await authFetch(`/api/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(Array.isArray(data) ? data : [])
      } else {
        setError('Failed to load invoices')
      }
    } catch {
      setError('Network error. Please try again.')
      toast.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, statusFilter, dateFrom, dateTo])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])
  useEffect(() => { setPage(1) }, [statusFilter, syncFilter, searchQuery, dateFrom, dateTo])

  // Client-side search & filtering
  const filteredInvoices = invoices.filter((inv) => {
    if (syncFilter !== 'all') {
      const currentSync = (inv.syncStatus || 'pending').toLowerCase()
      if (currentSync !== syncFilter.toLowerCase()) return false
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.party?.name || '').toLowerCase().includes(q) ||
        (inv.buyerName || '').toLowerCase().includes(q) ||
        (inv.panNumber || '').toLowerCase().includes(q) ||
        (inv.dateBS || '').toLowerCase().includes(q)
      if (!matchesSearch) return false
    }
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  // Actions
  const handleMarkAsPaid = async (invoiceId: string, totalAmount: number) => {
    try {
      const res = await authFetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, status: 'paid', amountPaid: totalAmount }),
      })
      if (res.ok) {
        toast.success('Invoice marked as paid')
        fetchInvoices()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update invoice')
      }
    } catch {
      toast.error('Failed to update invoice')
    }
  }

  const handleSend = async (invoiceId: string) => {
    try {
      const res = await authFetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, status: 'sent' }),
      })
      if (res.ok) {
        toast.success('Invoice sent')
        fetchInvoices()
      } else {
        toast.error('Failed to send invoice')
      }
    } catch {
      toast.error('Failed to send invoice')
    }
  }

  // Open Cancel Dialog
  const openCancelDialog = (invoice: Invoice) => {
    setSelectedForCancel(invoice)
    setCancelReasonText('')
    setCancelDialogOpen(true)
  }

  // Execute IRD Invoice Cancellation
  const handleConfirmCancel = async () => {
    if (!selectedForCancel) return
    if (!cancelReasonText.trim()) {
      toast.error('IRD requires a mandatory reason for invoice cancellation')
      return
    }

    setCancelling(true)
    try {
      const res = await authFetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedForCancel.id,
          status: 'cancelled',
          cancelReason: cancelReasonText.trim(),
        }),
      })

      if (res.ok) {
        toast.success(`Invoice ${selectedForCancel.invoiceNumber} has been cancelled per IRD audit rules`)
        setCancelDialogOpen(false)
        fetchInvoices()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel invoice')
      }
    } catch {
      toast.error('Network error while cancelling invoice')
    } finally {
      setCancelling(false)
    }
  }

  // Direct CBMS Sync Action
  const handleSyncCbms = async (invoiceId: string) => {
    setSyncingId(invoiceId)
    try {
      const res = await authFetch('/api/cbms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`CBMS Synced: Code ${data.responseCode} - ${data.message}`)
        fetchInvoices()
      } else {
        toast.error(`CBMS Sync Failed: ${data.message || 'Error communicating with IRD'}`)
        fetchInvoices()
      }
    } catch {
      toast.error('Failed to communicate with IRD CBMS')
    } finally {
      setSyncingId(null)
    }
  }

  // Helpers
  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    return (
      <Badge
        variant="outline"
        className={cn(
          'text-xs font-medium border-0',
          config.className,
          config.lineThrough && 'line-through',
        )}
      >
        {config.label}
      </Badge>
    )
  }

  const getCbmsBadge = (inv: Invoice) => {
    const status = (inv.syncStatus || 'pending').toLowerCase()
    const isSyncing = syncingId === inv.id

    if (status === 'synced') {
      return (
        <Badge
          variant="outline"
          className="text-xs bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center gap-1 font-mono"
          title={`Synced at ${inv.syncedAt || 'N/A'}`}
        >
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          CBMS 200
        </Badge>
      )
    }

    if (status === 'failed') {
      return (
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className="text-xs bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 flex items-center gap-1 font-mono"
            title={inv.syncResponseMessage || 'Sync failed'}
          >
            <span className="inline-block size-1.5 rounded-full bg-rose-500" />
            Failed {inv.syncResponseCode ? `(${inv.syncResponseCode})` : ''}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              handleSyncCbms(inv.id)
            }}
            disabled={isSyncing}
            title="Retry CBMS Sync"
          >
            <RefreshCw className={cn('size-3', isSyncing && 'animate-spin text-primary')} />
          </Button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1">
        <Badge
          variant="outline"
          className="text-xs bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 flex items-center gap-1 font-mono"
        >
          <span className="inline-block size-1.5 rounded-full bg-amber-500" />
          Pending
        </Badge>
        {inv.status !== 'draft' && inv.status !== 'cancelled' && (
          <Button
            size="icon"
            variant="ghost"
            className="size-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              handleSyncCbms(inv.id)
            }}
            disabled={isSyncing}
            title="Send to IRD CBMS"
          >
            <RefreshCw className={cn('size-3', isSyncing && 'animate-spin text-primary')} />
          </Button>
        )}
      </div>
    )
  }

  const formatDateDisplay = (inv: Invoice) => {
    const bsStr = inv.dateBS || adToBs(inv.date).str
    try {
      const adStr = new Date(inv.date).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
      return (
        <div className="flex flex-col text-xs leading-tight">
          <span className="font-medium text-foreground">{bsStr} BS</span>
          <span className="text-muted-foreground">{adStr} AD</span>
        </div>
      )
    } catch {
      return <span>{bsStr} BS</span>
    }
  }

  // Summary counts
  const summaryCounts = {
    total: invoices.length,
    totalValue: invoices.reduce((s, i) => (i.status !== 'cancelled' ? s + i.totalAmount : s), 0),
    paid: invoices.filter((i) => i.status === 'paid').length,
    cbmsSynced: invoices.filter((i) => (i.syncStatus || '').toLowerCase() === 'synced').length,
    cbmsPending: invoices.filter((i) => (i.syncStatus || '').toLowerCase() === 'pending' && i.status !== 'draft').length,
    cbmsFailed: invoices.filter((i) => (i.syncStatus || '').toLowerCase() === 'failed').length,
  }

  const activeDateFilter = dateFrom || dateTo

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Sales Invoices</h1>
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
              IRD Schedule 5 Compliant
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Tax invoices (कर बीजक), real-time CBMS synchronization, and credit note issuance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/tax-registers')}
            className="shrink-0"
          >
            <FileText className="size-4 mr-2 text-primary" />
            Tax Registers (खाताहरू)
          </Button>
          <Button onClick={() => router.push('/invoices/new')} className="shrink-0">
            <Plus className="size-4 mr-2" />
            New Tax Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{summaryCounts.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Net: {formatNPR(summaryCounts.totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid Invoices</p>
            <p className="text-2xl font-bold text-green-600">{summaryCounts.paid}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Settled in full</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CBMS Synced</p>
            <p className="text-2xl font-bold text-emerald-600">{summaryCounts.cbmsSynced}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Reported to IRD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CBMS Pending</p>
            <p className="text-2xl font-bold text-amber-600">{summaryCounts.cbmsPending}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Queue for sync</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CBMS Failed</p>
            <p className="text-2xl font-bold text-rose-600">{summaryCounts.cbmsFailed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Requires retry</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Audit Status</p>
            <p className="text-sm font-semibold text-primary mt-1">Rule 2074 Active</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Immutability enforced</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice #, party name, PAN, BS date..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={syncFilter} onValueChange={setSyncFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="CBMS Sync" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All CBMS Sync</SelectItem>
                  <SelectItem value="synced">Synced (200)</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filter */}
              <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={activeDateFilter ? 'default' : 'outline'}
                    className="shrink-0"
                  >
                    <Calendar className="size-4 mr-2" />
                    {activeDateFilter ? 'Date Filtered' : 'Date Range'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">From (AD)</Label>
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">To (AD)</Label>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setDateFrom('')
                          setDateTo('')
                          setDateFilterOpen(false)
                        }}
                      >
                        Clear
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => setDateFilterOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <FileText className="size-12 text-red-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-red-600">{error}</h3>
              <Button variant="outline" className="mt-4" onClick={fetchInvoices}>
                Retry
              </Button>
            </div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">No invoices found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || statusFilter !== 'all' || syncFilter !== 'all' || activeDateFilter
                  ? 'Try adjusting your filters'
                  : 'Create your first invoice to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && !activeDateFilter && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/invoices/new')}
                >
                  <Plus className="size-4 mr-2" />
                  Create Tax Invoice
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice # (बीजक नं.)</TableHead>
                      <TableHead>Date (मिति)</TableHead>
                      <TableHead>Party / Buyer PAN</TableHead>
                      <TableHead className="text-right">Total Amount (जम्मा)</TableHead>
                      <TableHead className="text-right">VAT (१३%)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>CBMS Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((inv) => {
                      const isCancelled = inv.status === 'cancelled'
                      const isDraft = inv.status === 'draft'
                      const partyName = inv.party?.name || inv.buyerName || 'Walk-in Customer'
                      const buyerPan = inv.panNumber || inv.party?.panNumber || null
                      const printCount = inv.printCount || 0

                      return (
                        <TableRow
                          key={inv.id}
                          className={cn(
                            'hover:bg-muted/50',
                            isCancelled && 'opacity-60 bg-muted/20',
                          )}
                        >
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className={cn('font-mono font-semibold', isCancelled && 'line-through')}>
                                {inv.invoiceNumber}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                {printCount > 0 ? (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Printer className="size-2.5" />
                                    {printCount === 1 ? '1 print' : `${printCount} prints`}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground/60">Not printed</span>
                                )}
                                {inv.fiscalYear && (
                                  <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground">
                                    {inv.fiscalYear}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateDisplay(inv)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className={cn('font-medium text-sm', isCancelled && 'line-through')}>
                                {partyName}
                              </span>
                              {buyerPan ? (
                                <span className="text-[11px] text-muted-foreground font-mono">
                                  PAN: {buyerPan}
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60">No PAN</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-medium',
                              isCancelled && 'line-through text-muted-foreground',
                            )}
                          >
                            <div>{formatNPR(inv.totalAmount)}</div>
                            {inv.amountDue > 0 && !isCancelled && (
                              <div className="text-[11px] text-rose-600 font-normal">
                                Due: {formatNPR(inv.amountDue)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right text-muted-foreground font-mono text-xs',
                              isCancelled && 'line-through',
                            )}
                          >
                            {formatNPR(inv.vatAmount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                          <TableCell>{getCbmsBadge(inv)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Print Tax Invoice Button */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1 text-xs px-2.5"
                                onClick={() => {
                                  setSelectedForPrint(inv)
                                  setPrintModalOpen(true)
                                }}
                                title="Print Schedule 5 Tax Invoice (कर बीजक)"
                              >
                                <Printer className="size-3.5 text-primary" />
                                <span className="hidden sm:inline">Print</span>
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedForPrint(inv)
                                      setPrintModalOpen(true)
                                    }}
                                  >
                                    <Printer className="size-4 mr-2 text-primary" />
                                    Tax Invoice (कर बीजक)
                                  </DropdownMenuItem>

                                  {/* Allow Edit ONLY for Draft per IRD Immutability Rules */}
                                  {isDraft ? (
                                    <DropdownMenuItem onClick={() => router.push(`/invoices/${inv.id}/edit`)}>
                                      <Pencil className="size-4 mr-2" />
                                      Edit Draft
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                      <ShieldAlert className="size-4 mr-2 text-amber-500" />
                                      Cannot edit (IRD Rule)
                                    </DropdownMenuItem>
                                  )}

                                  {/* Send Invoice */}
                                  {isDraft && (
                                    <DropdownMenuItem onClick={() => handleSend(inv.id)}>
                                      <Send className="size-4 mr-2" />
                                      Send Invoice
                                    </DropdownMenuItem>
                                  )}

                                  {/* Mark as Paid */}
                                  {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                    <DropdownMenuItem onClick={() => handleMarkAsPaid(inv.id, inv.totalAmount)}>
                                      <CheckCircle className="size-4 mr-2 text-green-600" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}

                                  {/* Issue Credit Note (Sales Return) */}
                                  {!isCancelled && !isDraft && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedForCredit(inv)
                                        setCreditDialogOpen(true)
                                      }}
                                    >
                                      <RotateCcw className="size-4 mr-2 text-blue-600" />
                                      Credit Note (फिर्ता)
                                    </DropdownMenuItem>
                                  )}

                                  {/* Manual CBMS Sync */}
                                  {inv.status !== 'cancelled' && (
                                    <DropdownMenuItem
                                      onClick={() => handleSyncCbms(inv.id)}
                                      disabled={syncingId === inv.id}
                                    >
                                      <RefreshCw className={cn('size-4 mr-2 text-emerald-600', syncingId === inv.id && 'animate-spin')} />
                                      Sync with IRD CBMS
                                    </DropdownMenuItem>
                                  )}

                                  <DropdownMenuSeparator />

                                  {/* Cancel Invoice with mandatory IRD reason */}
                                  {!isCancelled && (
                                    <DropdownMenuItem
                                      onClick={() => openCancelDialog(inv)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <XCircle className="size-4 mr-2" />
                                      Cancel (रद्द गर्नुहोस्)
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)} of{' '}
                    {filteredInvoices.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Tax Invoice Modal (Schedule 5) */}
      {selectedForPrint && (
        <TaxInvoiceModal
          open={printModalOpen}
          onOpenChange={(open) => {
            setPrintModalOpen(open)
            if (!open) setSelectedForPrint(null)
          }}
          invoice={selectedForPrint}
          organization={selectedForPrint.organization}
          onSyncSuccess={() => {
            fetchInvoices()
          }}
        />
      )}

      {/* Credit Note Dialog (Schedule 7) */}
      {selectedForCredit && (
        <CreditNoteDialog
          open={creditDialogOpen}
          onOpenChange={(open) => {
            setCreditDialogOpen(open)
            if (!open) setSelectedForCredit(null)
          }}
          invoice={selectedForCredit}
          onSuccess={() => {
            fetchInvoices()
          }}
        />
      )}

      {/* IRD Cancellation Dialog with Mandatory Reason */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="size-5" />
              <DialogTitle>Cancel Tax Invoice (बीजक रद्द)</DialogTitle>
            </div>
            <DialogDescription>
              Under IRD Electronic Billing Procedure 2074, an issued invoice cannot be deleted.
              Cancelling it will mark it as CANCELLED, create reversal audit entries, and report
              the cancellation to IRD CBMS.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/60 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Number:</span>
                <span className="font-mono font-bold">{selectedForCancel?.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date (BS / AD):</span>
                <span>{selectedForCancel?.dateBS || 'N/A'} / {selectedForCancel?.date?.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold">{formatNPR(selectedForCancel?.totalAmount || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">
                Reason for Cancellation (रद्द गर्नुको कारण) <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CANCEL_REASONS.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCancelReasonText(r)}
                    className={cn(
                      'text-[11px] px-2 py-1 rounded border transition-colors text-left',
                      cancelReasonText === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {r.split(' (')[0]}
                  </button>
                ))}
              </div>
              <Textarea
                placeholder="Specify the reason for cancellation required for tax audit..."
                value={cancelReasonText}
                onChange={(e) => setCancelReasonText(e.target.value)}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={cancelling}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelling || !cancelReasonText.trim()}
            >
              {cancelling ? (
                <>
                  <RefreshCw className="size-4 mr-2 animate-spin" />
                  Cancelling & Reporting...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
