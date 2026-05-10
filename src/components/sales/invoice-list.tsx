'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, MoreHorizontal, Eye, CheckCircle, XCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

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

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
}

const ITEMS_PER_PAGE = 10

export function InvoiceList() {
  const { currentOrgId, setActiveModule } = useAppStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const fetchInvoices = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/invoices?${params}`)
      if (res.ok) {
        const data = await res.json()
        setInvoices(data)
      }
    } catch {
      toast.error('Failed to fetch invoices')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, statusFilter])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchQuery])

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      (inv.party?.name || '').toLowerCase().includes(q) ||
      (inv.panNumber || '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE)
  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

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
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel invoice')
      }
    } catch {
      toast.error('Failed to cancel invoice')
    }
  }

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft
    return (
      <Badge variant="outline" className={`text-xs font-medium border-0 ${config.className}`}>
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
    paid: invoices.filter((i) => i.status === 'paid').length,
    overdue: invoices.filter((i) => i.status === 'overdue').length,
    draft: invoices.filter((i) => i.status === 'draft').length,
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Invoices</h1>
          <p className="text-muted-foreground text-sm">Manage your sales invoices and billing</p>
        </div>
        <Button onClick={() => setActiveModule('invoice-new')} className="shrink-0">
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
                  placeholder="Search invoices..."
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
          ) : paginatedInvoices.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">No invoices found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first invoice to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveModule('invoice-new')}
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
                    {paginatedInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                        <TableCell>{formatDate(inv.date)}</TableCell>
                        <TableCell>{inv.party?.name || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNPR(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNPR(inv.vatAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell className="text-right">
                          {inv.amountDue > 0 ? (
                            <span className="font-medium text-red-600">
                              {formatNPR(inv.amountDue)}
                            </span>
                          ) : (
                            <span className="text-green-600 text-sm">Cleared</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="size-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsPaid(inv.id, inv.totalAmount)}
                                >
                                  <CheckCircle className="size-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                                <DropdownMenuItem
                                  onClick={() => handleCancel(inv.id)}
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(page * ITEMS_PER_PAGE, filteredInvoices.length)} of{' '}
                    {filteredInvoices.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
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
