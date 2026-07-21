'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR, calculateVAT, NEPAL_VAT_RATE } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Plus, Search, Package, AlertTriangle, PackageX,
  SlidersHorizontal, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────
interface StockLevel {
  id: string
  warehouseId: string
  quantity: number
  reservedQty: number
  costPrice: number | null
  warehouse: { id: string; name: string }
}

interface Product {
  id: string
  name: string
  nameNepali: string | null
  code: string | null
  unit: string | null
  category: string | null
  brand: string | null
  productType: string
  isVatable: boolean
  vatRate: number | null
  sellingPrice: number | null
  costPrice: number | null
  minStockLevel: number | null
  maxStockLevel: number | null
  isActive: boolean
  description: string | null
  stockLevels: StockLevel[]
  totalQuantity: number
  totalReserved: number
  availableQuantity: number
}

const ITEMS_PER_PAGE = 15

// ─── Component ────────────────────────────────────────────────
export function InventoryView() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out'>('all')
  const [page, setPage] = useState(1)

  // Stock adjustment dialog
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustSubmitting, setAdjustSubmitting] = useState(false)

  const fetchInventory = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (searchQuery) params.set('search', searchQuery)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await authFetch(`/api/inventory?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      } else {
        setError('Failed to load inventory')
      }
    } catch {
      setError('Network error. Please try again.')
      toast.error('Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, searchQuery, categoryFilter])

  useEffect(() => { fetchInventory() }, [fetchInventory])
  useEffect(() => { setPage(1) }, [searchQuery, categoryFilter, stockStatusFilter])

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [products])

  // Filter products by stock status
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (stockStatusFilter === 'low') {
        const minStock = product.minStockLevel || 0
        if (minStock <= 0 || product.totalQuantity > minStock) return false
      }
      if (stockStatusFilter === 'out') {
        if (product.totalQuantity > 0) return false
      }
      return true
    })
  }, [products, stockStatusFilter])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))
  const currentPage = Math.min(page, totalPages)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )

  // Get stock status
  const getStockStatus = (product: Product) => {
    const qty = product.totalQuantity
    const minStock = product.minStockLevel || 0

    if (qty <= 0) {
      return {
        label: 'Out of Stock',
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        icon: <PackageX className="size-3" />,
        rowClass: 'bg-red-50/50 dark:bg-red-950/20',
      }
    }
    if (minStock > 0 && qty <= minStock) {
      return {
        label: 'Low Stock',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        icon: <AlertTriangle className="size-3" />,
        rowClass: 'bg-yellow-50/50 dark:bg-yellow-950/20',
      }
    }
    return {
      label: 'In Stock',
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      icon: null,
      rowClass: '',
    }
  }

  // Summary stats
  const summary = useMemo(() => {
    let totalProducts = products.length
    let totalStockValue = 0
    let lowStockCount = 0
    let outOfStockCount = 0

    products.forEach((p) => {
      const qty = p.totalQuantity
      const costPrice = p.costPrice || 0
      totalStockValue += qty * costPrice

      const minStock = p.minStockLevel || 0
      if (qty <= 0) {
        outOfStockCount++
      } else if (minStock > 0 && qty <= minStock) {
        lowStockCount++
      }
    })

    return { totalProducts, totalStockValue, lowStockCount, outOfStockCount }
  }, [products])

  // Stock adjustment submit
  const handleAdjustSubmit = async () => {
    if (!adjustProduct || !adjustQty) return
    setAdjustSubmitting(true)
    try {
      const res = await authFetch('/api/inventory/stock-adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          productId: adjustProduct.id,
          type: adjustType,
          quantity: parseFloat(adjustQty),
          reason: adjustReason || null,
        }),
      })
      if (res.ok) {
        toast.success('Stock adjusted successfully')
        setAdjustOpen(false)
        setAdjustQty('')
        setAdjustReason('')
        fetchInventory()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to adjust stock')
      }
    } catch {
      toast.error('Failed to adjust stock')
    } finally {
      setAdjustSubmitting(false)
    }
  }

  const openAdjustDialog = (product: Product) => {
    setAdjustProduct(product)
    setAdjustType('add')
    setAdjustQty('')
    setAdjustReason('')
    setAdjustOpen(true)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground text-sm">Track inventory, stock levels, and product details</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => router.push('/inventory/new')} className="shrink-0">
            <Plus className="size-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="size-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Total Products</p>
            </div>
            <p className="text-2xl font-bold">{summary.totalProducts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Stock Value</p>
            <p className="text-xl font-bold">{formatNPR(summary.totalStockValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="size-4 text-yellow-600" />
              <p className="text-xs text-muted-foreground">Low Stock</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{summary.lowStockCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <PackageX className="size-4 text-red-600" />
              <p className="text-xs text-muted-foreground">Out of Stock</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.outOfStockCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, code, or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stockStatusFilter} onValueChange={(v) => setStockStatusFilter(v as 'all' | 'low' | 'out')}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
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
          ) : error ? (
            <div className="p-12 text-center">
              <Package className="size-12 text-red-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-red-600">{error}</h3>
              <Button variant="outline" className="mt-4" onClick={fetchInventory}>
                Retry
              </Button>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">No products found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || categoryFilter !== 'all' || stockStatusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Add your first product to get started'}
              </p>
              {!searchQuery && categoryFilter === 'all' && stockStatusFilter === 'all' && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => router.push('/inventory/new')}
                >
                  <Plus className="size-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code / SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Stock Qty</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Selling Price</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product) => {
                      const status = getStockStatus(product)
                      const stockValue = product.totalQuantity * (product.costPrice || 0)
                      const isLowOrOut = product.totalQuantity <= 0 ||
                        (product.minStockLevel != null && product.minStockLevel > 0 && product.totalQuantity <= product.minStockLevel)

                      return (
                        <TableRow
                          key={product.id}
                          className={cn(
                            'cursor-pointer hover:bg-muted/60',
                            status.rowClass,
                          )}
                          onClick={() => router.push('/inventory/new')}
                        >
                          <TableCell className="font-mono text-xs">
                            {product.code || '\u2014'}
                          </TableCell>
                          <TableCell>
                            <div>
                              <span className={cn('font-medium', isLowOrOut && 'text-red-700 dark:text-red-400')}>
                                {product.name}
                              </span>
                              {product.nameNepali && (
                                <span className="block text-xs text-muted-foreground">
                                  {product.nameNepali}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.category ? (
                              <Badge variant="secondary" className="text-xs">
                                {product.category}
                              </Badge>
                            ) : (
                              '\u2014'
                            )}
                          </TableCell>
                          <TableCell>{product.unit || '\u2014'}</TableCell>
                          <TableCell className={cn('text-right font-medium', isLowOrOut && 'text-red-700 dark:text-red-400')}>
                            {product.totalQuantity}
                            {product.totalReserved > 0 && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({product.totalReserved} reserved)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.costPrice ? formatNPR(product.costPrice) : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right">
                            {product.sellingPrice ? formatNPR(product.sellingPrice) : '\u2014'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatNPR(stockValue)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs font-medium border-0 inline-flex items-center gap-1',
                                status.className,
                              )}
                            >
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => openAdjustDialog(product)}
                            >
                              <SlidersHorizontal className="size-3" />
                              Adjust
                            </Button>
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
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
                    {filteredProducts.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline" size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <span className="text-sm">{currentPage} / {totalPages}</span>
                    <Button
                      variant="outline" size="sm"
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

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Stock Adjustment</DialogTitle>
            <DialogDescription className="sr-only">Adjust stock quantity for a product</DialogDescription>
          </DialogHeader>
          {adjustProduct && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{adjustProduct.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Current stock: {adjustProduct.totalQuantity} {adjustProduct.unit || 'pcs'}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <Label>Adjustment Type</Label>
                <Select value={adjustType} onValueChange={(v) => setAdjustType(v as 'add' | 'subtract')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Add Stock (In)</SelectItem>
                    <SelectItem value="subtract">Subtract Stock (Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjustQty">Quantity *</Label>
                <Input
                  id="adjustQty"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adjustReason">Reason</Label>
                <Input
                  id="adjustReason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Stock count correction"
                />
              </div>

              {adjustQty && (
                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="text-muted-foreground">
                    New stock will be:{' '}
                    <span className="font-semibold">
                      {adjustType === 'add'
                        ? adjustProduct.totalQuantity + parseFloat(adjustQty || '0')
                        : Math.max(0, adjustProduct.totalQuantity - parseFloat(adjustQty || '0'))
                      }{' '}
                      {adjustProduct.unit || 'pcs'}
                    </span>
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAdjustOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAdjustSubmit}
                  disabled={!adjustQty || adjustSubmitting}
                >
                  {adjustSubmitting ? 'Adjusting...' : 'Adjust Stock'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
