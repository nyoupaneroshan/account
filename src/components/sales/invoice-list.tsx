'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR, calculateVAT, NEPAL_VAT_RATE } from '@/lib/nepal-accounting'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Plus, Search, MoreHorizontal, Eye, CheckCircle, XCircle, FileText,
  ChevronLeft, ChevronRight, Calendar, Send, Pencil, Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  product: { id: string; name: string; code: string; unit: string } | null
}

interface Invoice {
  id: string
  invoiceNumber: string
  date: string
  dueDate: string | null
  partyId: string | null
  status: string
  subtotal: number
  discountAmount: number
  taxableAmount: number
  vatAmount: number
  totalAmount: number
  amountPaid: number
  amountDue: number
  panNumber: string | null
  lines: InvoiceLine[]
  party: {
    id: string
    name: string
    nameNepali: string | null
    panNumber: string | null
    partyType: string
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
    label: 'Cancelled',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 line-through',
    lineThrough: true,
  },
}

const ITEMS_PER_PAGE = 10

// ─── Component ────────────────────────────────────────────────
export function InvoiceList() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [page, setPage] = useState(1)

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/invoices?${params}`)
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
  useEffect(() => { setPage(1) }, [statusFilter, searchQuery, dateFrom, dateTo])

  // Client-side search + date filtering
  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.party?.name || '').toLowerCase().includes(q) ||
        (inv.panNumber || '').toLowerCase().includes(q)
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
      const res = await fetch('/api/invoices', {
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
      const res = await fetch('/api/invoices', {
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

  const handleCancel = async (invoiceId: string) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, status: 'cancelled' }),
      })
      if (res.ok) {
        toast.success('Invoice cancelled')
        fetchInvoices()
      } else {
        toast.error('Failed to cancel invoice')
      }
    } catch {
      toast.error('Failed to cancel invoice')
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // Summary counts
  const summaryCounts = {
    total: invoices.length,
    totalValue: invoices.reduce((s, i) => s + i.totalAmount, 0),
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    draft: invoices.filter((i) => i.status === 'draft').length,
  }

  const activeDateFilter = dateFrom || dateTo

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Invoices</h1>
          <p className="text-muted-foreground text-sm">Manage your sales invoices and billing</p>
        </div>
        <Button onClick={() => router.push('/invoices/new')} className="shrink-0">
          <Plus className="size-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Invoices</p>
            <p className="text-2xl font-bold">{summaryCounts.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Value: {formatNPR(summaryCounts.totalValue)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="text-2xl font-bold text-green-600">{summaryCounts.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-2xl font-bold text-red-600">{summaryCounts.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Draft</p>
            <p className="text-2xl font-bold text-gray-600">{summaryCounts.draft}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by invoice #, party name, PAN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
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
            {/* Date Range Filter */}
            <Popover open={dateFilterOpen} onOpenChange={setDateFilterOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={activeDateFilter ? 'default' : 'outline'}
                  className="w-full sm:w-auto shrink-0"
                >
                  <Calendar className="size-4 mr-2" />
                  {activeDateFilter ? 'Date Filtered' : 'Date Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="end">
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">To</Label>
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
                {searchQuery || statusFilter !== 'all' || activeDateFilter
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
                  Create Invoice
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Party Name</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">VAT Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvoices.map((inv) => {
                      const isCancelled = inv.status === 'cancelled'
                      return (
                        <TableRow
                          key={inv.id}
                          className={cn(
                            'cursor-pointer hover:bg-muted/50',
                            isCancelled && 'opacity-60',
                          )}
                          onClick={() => router.push('/invoices/new')}
                        >
                          <TableCell className={cn('font-medium', isCancelled && 'line-through')}>
                            {inv.invoiceNumber}
                          </TableCell>
                          <TableCell className={isCancelled && 'line-through'}>
                            {formatDate(inv.date)}
                          </TableCell>
                          <TableCell className={isCancelled && 'line-through'}>
                            {inv.party?.name || '\u2014'}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-medium',
                              isCancelled && 'line-through',
                            )}
                          >
                            {formatNPR(inv.totalAmount)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              'text-right text-muted-foreground',
                              isCancelled && 'line-through',
                            )}
                          >
                            {formatNPR(inv.vatAmount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(inv.status)}</TableCell>
                          <TableCell className="text-right">
                            {inv.amountDue > 0 ? (
                              <span
                                className={cn(
                                  'font-medium',
                                  isCancelled ? 'line-through text-muted-foreground' : 'text-red-600',
                                )}
                              >
                                {formatNPR(inv.amountDue)}
                              </span>
                            ) : (
                              <span className="text-green-600 text-sm">Cleared</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push('/invoices/new')
                                  }}
                                >
                                  <Eye className="size-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    router.push('/invoices/new')
                                  }}
                                >
                                  <Pencil className="size-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {inv.status === 'draft' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleSend(inv.id)
                                    }}
                                  >
                                    <Send className="size-4 mr-2" />
                                    Send Invoice
                                  </DropdownMenuItem>
                                )}
                                {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleMarkAsPaid(inv.id, inv.totalAmount)
                                    }}
                                  >
                                    <CheckCircle className="size-4 mr-2" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCancel(inv.id)
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <XCircle className="size-4 mr-2" />
                                    Cancel Invoice
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
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
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}\u2013
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
    </div>
  )
}
