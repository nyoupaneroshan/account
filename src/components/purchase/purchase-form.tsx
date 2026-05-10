'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR, NEPAL_VAT_RATE } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, Trash2, ChevronDown, Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Party {
  id: string
  name: string
  nameNepali: string | null
  panNumber: string | null
  partyType: string
  address: string | null
  city: string | null
}

interface Product {
  id: string
  name: string
  nameNepali: string | null
  code: string | null
  unit: string | null
  sellingPrice: number | null
  costPrice: number | null
  isVatable: boolean
  vatRate: number | null
  productType: string
  hsnCode: string | null
}

interface Warehouse {
  id: string
  name: string
  isDefault: boolean
}

interface LineItem {
  id: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  vatRate: number
  lineTotal: number
  lineVat: number
  lineSubtotal: number
}

const UNITS = ['pcs', 'kg', 'ltr', 'box', 'ream', 'set', 'pair', 'meter', 'dozen', 'packet']

function createEmptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    productId: null,
    description: '',
    quantity: 1,
    unit: 'pcs',
    unitPrice: 0,
    discountPercent: 0,
    vatRate: NEPAL_VAT_RATE * 100,
    lineTotal: 0,
    lineVat: 0,
    lineSubtotal: 0,
  }
}

function calcLine(item: Omit<LineItem, 'lineTotal' | 'lineVat' | 'lineSubtotal'>): LineItem {
  const subtotal = item.quantity * item.unitPrice
  const discountAmt = subtotal * (item.discountPercent / 100)
  const taxableAmt = subtotal - discountAmt
  const vatAmt = taxableAmt * (item.vatRate / 100)
  const total = taxableAmt + vatAmt
  return {
    ...item,
    lineSubtotal: Math.round(subtotal * 100) / 100,
    lineVat: Math.round(vatAmt * 100) / 100,
    lineTotal: Math.round(total * 100) / 100,
  }
}

export function PurchaseForm() {
  const { currentOrgId, setActiveModule } = useAppStore()

  // Form state
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [partyOpen, setPartyOpen] = useState(false)
  const [supplierBillNo, setSupplierBillNo] = useState('')
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()])
  const [notes, setNotes] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Data
  const [parties, setParties] = useState<Party[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [productOpenMap, setProductOpenMap] = useState<Record<string, boolean>>({})

  // Fetch data
  useEffect(() => {
    if (!currentOrgId) return
    setLoadingData(true)
    Promise.all([
      fetch(`/api/parties?orgId=${currentOrgId}&partyType=supplier`).then((r) => r.json()),
      fetch(`/api/inventory?orgId=${currentOrgId}`).then((r) => r.json()),
    ])
      .then(([partyData, productData]) => {
        setParties(Array.isArray(partyData) ? partyData : [])
        setProducts(Array.isArray(productData) ? productData : [])
      })
      .catch(() => {
        toast.error('Failed to load data')
      })
      .finally(() => setLoadingData(false))
  }, [currentOrgId])

  // Auto-select default warehouse from products
  useEffect(() => {
    if (products.length > 0 && warehouses.length === 0) {
      const whSet = new Map<string, Warehouse>()
      products.forEach((p) => {
        if ('stockLevels' in p) {
          const levels = (p as Product & { stockLevels?: { warehouse: { id: string; name: string; isDefault: boolean } }[] }).stockLevels
          if (levels) {
            levels.forEach((sl) => {
              if (!whSet.has(sl.warehouse.id)) {
                whSet.set(sl.warehouse.id, sl.warehouse)
              }
            })
          }
        }
      })
      const whList = Array.from(whSet.values())
      setWarehouses(whList)
      const defaultWh = whList.find((w) => w.isDefault)
      if (defaultWh) {
        setSelectedWarehouse(defaultWh.id)
      } else if (whList.length > 0) {
        setSelectedWarehouse(whList[0].id)
      }
    }
  }, [products, warehouses.length])

  // Handle supplier selection
  const handleSelectParty = useCallback(
    (party: Party) => {
      setSelectedParty(party)
      setPartyOpen(false)
    },
    []
  )

  // Handle product selection
  const handleSelectProduct = useCallback(
    (lineId: string, product: Product) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line
          return calcLine({
            ...line,
            productId: product.id,
            description: product.name,
            unit: product.unit || 'pcs',
            unitPrice: product.costPrice || product.sellingPrice || 0,
            vatRate: product.isVatable
              ? (product.vatRate || NEPAL_VAT_RATE * 100)
              : 0,
          })
        })
      )
      setProductOpenMap((prev) => ({ ...prev, [lineId]: false }))
    },
    []
  )

  // Update a line field
  const updateLine = useCallback(
    (lineId: string, field: keyof LineItem, value: string | number) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line
          const updated = { ...line, [field]: value }
          return calcLine(updated)
        })
      )
    },
    []
  )

  // Add / remove lines
  const addLine = useCallback(() => {
    setLines((prev) => [...prev, createEmptyLine()])
  }, [])

  const removeLine = useCallback(
    (lineId: string) => {
      setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)))
    },
    []
  )

  // Summary
  const summary = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0)
    const vatTotal = lines.reduce((s, l) => s + l.lineVat, 0)
    const totalDiscount = lines.reduce(
      (s, l) => s + l.lineSubtotal * (l.discountPercent / 100),
      0
    )
    const grandTotal = subtotal - totalDiscount + vatTotal - discountAmount
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      vatTotal: Math.round(vatTotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    }
  }, [lines, discountAmount])

  // Submit
  const handleSubmit = async () => {
    if (!currentOrgId) return
    if (!billDate) {
      toast.error('Bill date is required')
      return
    }
    const validLines = lines.filter((l) => l.quantity > 0 && l.unitPrice > 0)
    if (validLines.length === 0) {
      toast.error('Add at least one line item with quantity and price')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        orgId: currentOrgId,
        date: billDate,
        dueDate: dueDate || null,
        partyId: selectedParty?.id || null,
        supplierBillNo: supplierBillNo || null,
        warehouseId: selectedWarehouse || null,
        billType: 'purchase',
        discountAmount,
        notes,
        lines: validLines.map((l) => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          vatRate: l.vatRate,
        })),
      }
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        toast.success('Purchase bill created successfully')
        setActiveModule('purchases')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create purchase bill')
      }
    } catch {
      toast.error('Failed to create purchase bill')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingData) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setActiveModule('purchases')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Purchase Bill</h1>
          <p className="text-muted-foreground text-sm">Record a purchase with VAT compliance</p>
        </div>
      </div>

      {/* Bill Header Fields */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Bill Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Bill Date */}
            <div className="space-y-1.5">
              <Label htmlFor="billDate">Bill Date *</Label>
              <Input
                id="billDate"
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
              />
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Supplier Searchable Dropdown */}
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Popover open={partyOpen} onOpenChange={setPartyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    role="combobox"
                    aria-expanded={partyOpen}
                  >
                    {selectedParty ? selectedParty.name : 'Select supplier...'}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                  <Command>
                    <CommandInput placeholder="Search suppliers..." />
                    <CommandList>
                      <CommandEmpty>No supplier found.</CommandEmpty>
                      <CommandGroup>
                        {parties.map((party) => (
                          <CommandItem
                            key={party.id}
                            value={party.name}
                            onSelect={() => handleSelectParty(party)}
                          >
                            <Check
                              className={cn(
                                'mr-2 size-4',
                                selectedParty?.id === party.id ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <span>{party.name}</span>
                            {party.panNumber && (
                              <Badge variant="secondary" className="ml-2 text-xs">
                                PAN: {party.panNumber}
                              </Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Supplier Bill # */}
            <div className="space-y-1.5">
              <Label htmlFor="supplierBillNo">Supplier Bill #</Label>
              <Input
                id="supplierBillNo"
                value={supplierBillNo}
                onChange={(e) => setSupplierBillNo(e.target.value)}
                placeholder="Supplier's reference number"
              />
            </div>

            {/* Warehouse */}
            <div className="space-y-1.5">
              <Label>Warehouse</Label>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh.id} value={wh.id}>
                      {wh.name}
                      {wh.isDefault && ' (Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Line Items</CardTitle>
            <Button variant="outline" size="sm" onClick={addLine}>
              <Plus className="size-4 mr-1" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px] min-w-[200px]">Product</TableHead>
                  <TableHead className="min-w-[150px]">Description</TableHead>
                  <TableHead className="w-[80px]">Qty</TableHead>
                  <TableHead className="w-[80px]">Unit</TableHead>
                  <TableHead className="w-[110px]">Unit Price</TableHead>
                  <TableHead className="w-[80px]">Disc %</TableHead>
                  <TableHead className="w-[80px]">VAT %</TableHead>
                  <TableHead className="w-[120px] text-right">Line Total</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    {/* Product Dropdown */}
                    <TableCell>
                      <Popover
                        open={productOpenMap[line.id]}
                        onOpenChange={(open) =>
                          setProductOpenMap((prev) => ({ ...prev, [line.id]: open }))
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full justify-between font-normal text-xs h-8"
                          >
                            {line.productId
                              ? products.find((p) => p.id === line.productId)?.name || 'Select...'
                              : 'Select...'}
                            <ChevronDown className="size-3 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 w-56" align="start">
                          <Command>
                            <CommandInput placeholder="Search products..." />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup>
                                {products.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    value={product.name}
                                    onSelect={() => handleSelectProduct(line.id, product)}
                                  >
                                    <Check
                                      className={cn(
                                        'mr-2 size-4',
                                        line.productId === product.id
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      )}
                                    />
                                    <span className="truncate">{product.name}</span>
                                    {product.code && (
                                      <span className="ml-auto text-xs text-muted-foreground">
                                        {product.code}
                                      </span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </TableCell>

                    {/* Description */}
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-8 text-xs"
                      />
                    </TableCell>

                    {/* Quantity */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        onChange={(e) =>
                          updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>

                    {/* Unit */}
                    <TableCell>
                      <Select
                        value={line.unit}
                        onValueChange={(val) => updateLine(line.id, 'unit', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>

                    {/* Unit Price */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice || ''}
                        onChange={(e) =>
                          updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>

                    {/* Discount % */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discountPercent || ''}
                        onChange={(e) =>
                          updateLine(line.id, 'discountPercent', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>

                    {/* VAT Rate */}
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.vatRate}
                        onChange={(e) =>
                          updateLine(line.id, 'vatRate', parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>

                    {/* Line Total */}
                    <TableCell className="text-right font-medium text-sm">
                      {formatNPR(line.lineTotal)}
                    </TableCell>

                    {/* Delete */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                      >
                        <Trash2 className="size-3.5 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary & Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pNotes">Notes</Label>
              <Textarea
                id="pNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pDiscount">Bill Discount (NPR)</Label>
              <Input
                id="pDiscount"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-base mb-4">Bill Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (before VAT)</span>
              <span>{formatNPR(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Line Discounts</span>
              <span className="text-red-600">- {formatNPR(summary.totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT Amount</span>
              <span>{formatNPR(summary.vatTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Bill Discount</span>
                <span className="text-red-600">- {formatNPR(discountAmount)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">Grand Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatNPR(summary.grandTotal)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-right">
              Inclusive of {NEPAL_VAT_RATE * 100}% Nepal VAT where applicable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => setActiveModule('purchases')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
          {submitting ? 'Creating...' : 'Create Purchase Bill'}
        </Button>
      </div>
    </div>
  )
}
