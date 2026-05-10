'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent } from '@/components/ui/card'
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
import { Plus, Search, MoreHorizontal, Eye, CheckCircle, XCircle, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

interface PurchaseBillLine {
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

interface PurchaseBill {
  id: string
  billNumber: string
  supplierBillNo: string | null
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
  warehouseId: string | null
  lines: PurchaseBillLine[]
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
  received: { label: 'Received', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
  paid: { label: 'Paid', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
  partial: { label: 'Partial', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
}

const ITEMS_PER_PAGE = 10

export function PurchaseList() {
  const { currentOrgId, setActiveModule } = useAppStore()
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const fetchPurchases = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      const res = await fetch(`/api/purchases?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPurchaseBills(data)
      }
    } catch {
      toast.error('Failed to fetch purchase bills')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, statusFilter])

  useEffect(() => {
    fetchPurchases()
  }, [fetchPurchases])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, searchQuery])

  const filteredBills = purchaseBills.filter((bill) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      bill.billNumber.toLowerCase().includes(q) ||
      (bill.supplierBillNo || '').toLowerCase().includes(q) ||
      (bill.party?.name || '').toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filteredBills.length / ITEMS_PER_PAGE)
  const paginatedBills = filteredBills.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  )

  const handleMarkAsPaid = async (billId: string, totalAmount: number) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: billId, status: 'paid', amountPaid: totalAmount }),
      })
      if (res.ok) {
        toast.success('Purchase bill marked as paid')
        fetchPurchases()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to update purchase bill')
      }
    } catch {
      toast.error('Failed to update purchase bill')
    }
  }

  const handleCancel = async (billId: string) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: billId, status: 'cancelled' }),
      })
      if (res.ok) {
        toast.success('Purchase bill cancelled')
        fetchPurchases()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to cancel purchase bill')
      }
    } catch {
      toast.error('Failed to cancel purchase bill')
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
    total: purchaseBills.length,
    paid: purchaseBills.filter((b) => b.status === 'paid').length,
    draft: purchaseBills.filter((b) => b.status === 'draft').length,
    totalValue: purchaseBills.reduce((s, b) => s + b.totalAmount, 0),
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Bills</h1>
          <p className="text-muted-foreground text-sm">Manage your purchase bills and suppliers</p>
        </div>
        <Button onClick={() => setActiveModule('purchase-new')} className="shrink-0">
          <Plus className="size-4 mr-2" />
          New Purchase
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Bills</p>
            <p className="text-2xl font-bold">{summaryCounts.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-xl font-bold">{formatNPR(summaryCounts.totalValue)}</p>
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
                  placeholder="Search purchase bills..."
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
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
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
          ) : paginatedBills.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">No purchase bills found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first purchase bill to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveModule('purchase-new')}
                >
                  <Plus className="size-4 mr-2" />
                  Create Purchase Bill
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedBills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{bill.billNumber}</span>
                            {bill.supplierBillNo && (
                              <span className="block text-xs text-muted-foreground">
                                Ref: {bill.supplierBillNo}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(bill.date)}</TableCell>
                        <TableCell>{bill.party?.name || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNPR(bill.totalAmount)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatNPR(bill.vatAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(bill.status)}</TableCell>
                        <TableCell className="text-right">
                          {bill.amountDue > 0 ? (
                            <span className="font-medium text-red-600">
                              {formatNPR(bill.amountDue)}
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
                              {bill.status !== 'paid' && bill.status !== 'cancelled' && (
                                <DropdownMenuItem
                                  onClick={() => handleMarkAsPaid(bill.id, bill.totalAmount)}
                                >
                                  <CheckCircle className="size-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                              )}
                              {bill.status !== 'cancelled' && bill.status !== 'paid' && (
                                <DropdownMenuItem
                                  onClick={() => handleCancel(bill.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <XCircle className="size-4 mr-2" />
                                  Cancel Bill
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
                    {Math.min(page * ITEMS_PER_PAGE, filteredBills.length)} of{' '}
                    {filteredBills.length}
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
