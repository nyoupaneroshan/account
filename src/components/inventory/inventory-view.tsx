'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Plus, Search, Package, AlertTriangle, PackageX,
} from 'lucide-react'
import { toast } from 'sonner'

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

export function InventoryView() {
  const { currentOrgId, setActiveModule } = useAppStore()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [lowStockOnly, setLowStockOnly] = useState(false)

  const fetchInventory = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ orgId: currentOrgId })
      if (searchQuery) params.set('search', searchQuery)
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      const res = await fetch(`/api/inventory?${params}`)
      if (res.ok) {
        const data = await res.json()
        setProducts(Array.isArray(data) ? data : [])
      }
    } catch {
      toast.error('Failed to fetch inventory')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, searchQuery, categoryFilter])

  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach((p) => {
      if (p.category) cats.add(p.category)
    })
    return Array.from(cats).sort()
  }, [products])

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (lowStockOnly) {
        const minStock = product.minStockLevel || 0
        if (product.totalQuantity > minStock) return false
      }
      return true
    })
  }, [products, lowStockOnly])

  // Get stock status
  const getStockStatus = (product: Product) => {
    const qty = product.totalQuantity
    const minStock = product.minStockLevel || 0

    if (qty <= 0) {
      return {
        label: 'Out of Stock',
        className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        icon: <PackageX className="size-3" />,
      }
    }
    if (minStock > 0 && qty <= minStock) {
      return {
        label: 'Low Stock',
        className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        icon: <AlertTriangle className="size-3" />,
      }
    }
    return {
      label: 'In Stock',
      className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      icon: null,
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stock Management</h1>
          <p className="text-muted-foreground text-sm">Track inventory, stock levels, and product details</p>
        </div>
        <Button onClick={() => setActiveModule('product-new')} className="shrink-0">
          <Plus className="size-4 mr-2" />
          Add Product
        </Button>
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
              <p className="text-xs text-muted-foreground">Low Stock Items</p>
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
                  placeholder="Search products by name, code, or brand..."
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
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 shrink-0">
              <Switch
                id="lowStockToggle"
                checked={lowStockOnly}
                onCheckedChange={setLowStockOnly}
              />
              <Label htmlFor="lowStockToggle" className="text-sm whitespace-nowrap">
                Low Stock Only
              </Label>
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
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">No products found</h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {searchQuery || categoryFilter !== 'all' || lowStockOnly
                  ? 'Try adjusting your filters'
                  : 'Add your first product to get started'}
              </p>
              {!searchQuery && categoryFilter === 'all' && !lowStockOnly && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setActiveModule('product-new')}
                >
                  <Plus className="size-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product)
                    const stockValue = product.totalQuantity * (product.costPrice || 0)

                    return (
                      <TableRow
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/60"
                        onClick={() => {
                          // For now, just navigate to product form for editing
                          setActiveModule('product-new')
                        }}
                      >
                        <TableCell className="font-mono text-xs">
                          {product.code || '—'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{product.name}</span>
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
                            '—'
                          )}
                        </TableCell>
                        <TableCell>{product.unit || '—'}</TableCell>
                        <TableCell className="text-right font-medium">
                          {product.totalQuantity}
                          {product.totalReserved > 0 && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({product.totalReserved} reserved)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.costPrice ? formatNPR(product.costPrice) : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.sellingPrice ? formatNPR(product.sellingPrice) : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatNPR(stockValue)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-medium border-0 inline-flex items-center gap-1 ${status.className}`}
                          >
                            {status.icon}
                            {status.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
