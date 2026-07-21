'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { formatNPR, calculateVAT, NEPAL_VAT_RATE } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
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
import {
  ArrowLeft, Plus, Trash2, ChevronDown, Check, Save, Send,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────
interface Party {
  id: string
  name: string
  nameNepali: string | null
  panNumber: string | null
  partyType: string
  address: string | null
  city: string | null
  phone: string | null
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

interface LineItem {
  id: string
  productId: string | null
  description: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  vatRate: number
  lineSubtotal: number
  lineDiscount: number
  lineTaxable: number
  lineVat: number
  lineTotal: number
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
    lineSubtotal: 0,
    lineDiscount: 0,
    lineTaxable: 0,
    lineVat: 0,
    lineTotal: 0,
  }
}

function calcLine(item: Omit<LineItem, 'lineSubtotal' | 'lineDiscount' | 'lineTaxable' | 'lineVat' | 'lineTotal'>): LineItem {
  const subtotal = item.quantity * item.unitPrice
  const discountAmt = subtotal * (item.discountPercent / 100)
  const taxableAmt = subtotal - discountAmt
  const vatAmt = taxableAmt * (item.vatRate / 100)
  const total = taxableAmt + vatAmt
  return {
    ...item,
    lineSubtotal: Math.round(subtotal * 100) / 100,
    lineDiscount: Math.round(discountAmt * 100) / 100,
    lineTaxable: Math.round(taxableAmt * 100) / 100,
    lineVat: Math.round(vatAmt * 100) / 100,
    lineTotal: Math.round(total * 100) / 100,
  }
}

function generateInvoiceNumber(): string {
  const now = new Date()
  const yr = now.getFullYear().toString().slice(-2)
  const mo = (now.getMonth() + 1).toString().padStart(2, '0')
  const seq = Math.floor(Math.random() * 9000 + 1000)
  return `INV-${yr}${mo}-${seq}`
}

// ─── Component ────────────────────────────────────────────────
export function InvoiceForm() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()

  // Form state
  const [invoiceNumber] = useState(() => generateInvoiceNumber())
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [partyOpen, setPartyOpen] = useState(false)
  const [panNumber, setPanNumber] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()])
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Data
  const [parties, setParties] = useState<Party[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [productOpenMap, setProductOpenMap] = useState<Record<string, boolean>>({})

  // Fetch parties and products
  useEffect(() => {
    if (!currentOrgId) return
    setLoadingData(true)
    Promise.all([
      authFetch(`/api/parties?orgId=${currentOrgId}&partyType=customer`).then((r) => r.json()),
      authFetch(`/api/inventory?orgId=${currentOrgId}`).then((r) => r.json()),
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

  // Auto-fill party details
  const handleSelectParty = useCallback(
    (party: Party) => {
      setSelectedParty(party)
      setPanNumber(party.panNumber || '')
      const addressParts = [party.address, party.city].filter(Boolean)
      const addr = addressParts.join(', ') || ''
      setBillingAddress(addr)
      if (sameAsBilling) setShippingAddress(addr)
      setPartyOpen(false)
    },
    [sameAsBilling],
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
            unitPrice: product.sellingPrice || 0,
            vatRate: product.isVatable
              ? (product.vatRate || NEPAL_VAT_RATE * 100)
              : 0,
          })
        }),
      )
      setProductOpenMap((prev) => ({ ...prev, [lineId]: false }))
    },
    [],
  )

  // Update a line field
  const updateLine = useCallback(
    (lineId: string, field: keyof LineItem, value: string | number) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line
          const updated = { ...line, [field]: value }
          return calcLine(updated)
        }),
      )
    },
    [],
  )

  const addLine = useCallback(() => {
    setLines((prev) => [...prev, createEmptyLine()])
  }, [])

  const removeLine = useCallback(
    (lineId: string) => {
      setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== lineId)))
    },
    [],
  )

  // Summary calculations
  const summary = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0)
    const totalDiscount = lines.reduce((s, l) => s + l.lineDiscount, 0)
    const taxable = lines.reduce((s, l) => s + l.lineTaxable, 0)
    const vatTotal = lines.reduce((s, l) => s + l.lineVat, 0)
    const grandTotal = taxable + vatTotal - discountAmount
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      taxable: Math.round(taxable * 100) / 100,
      vatTotal: Math.round(vatTotal * 100) / 100,
      grandTotal: Math.round(Math.max(0, grandTotal) * 100) / 100,
    }
  }, [lines, discountAmount])

  // Submit handlers
  const handleSubmit = async (status: 'draft' | 'sent') => {
    if (!currentOrgId) return
    if (!invoiceDate) {
      toast.error('Invoice date is required')
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
        invoiceNumber,
        date: invoiceDate,
        dueDate: dueDate || null,
        partyId: selectedParty?.id || null,
        panNumber: panNumber || null,
        billingAddress: billingAddress || null,
        shippingAddress: sameAsBilling ? billingAddress : shippingAddress || null,
        invoiceType: 'sales',
        status,
        discountAmount,
        notes,
        terms,
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
      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        router.push('/invoices')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create invoice')
      }
    } catch {
      toast.error('Failed to create invoice')
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
        <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">New Sales Invoice</h1>
          <p className="text-muted-foreground text-sm">Create a VAT-compliant sales invoice</p>
        </div>
        <Badge variant="secondary" className="text-sm font-mono">{invoiceNumber}</Badge>
      </div>

      {/* Invoice Header Fields */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Number</Label>
              <Input value={invoiceNumber} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoiceDate">Invoice Date *</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Customer Searchable Dropdown */}
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Popover open={partyOpen} onOpenChange={setPartyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                    role="combobox"
                    aria-expanded={partyOpen}
                  >
                    {selectedParty ? selectedParty.name : 'Select customer...'}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
                  <Command>
                    <CommandInput placeholder="Search customers..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
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
                                selectedParty?.id === party.id ? 'opacity-100' : 'opacity-0',
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

            <div className="space-y-1.5">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="Auto-filled from party"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billingAddress">Billing Address</Label>
              <Input
                id="billingAddress"
                value={billingAddress}
                onChange={(e) => {
                  setBillingAddress(e.target.value)
                  if (sameAsBilling) setShippingAddress(e.target.value)
                }}
                placeholder="Auto-filled from party"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="sameAsBilling"
                checked={sameAsBilling}
                onCheckedChange={(checked) => {
                  setSameAsBilling(checked)
                  if (checked) setShippingAddress(billingAddress)
                }}
              />
              <Label htmlFor="sameAsBilling" className="cursor-pointer text-sm">
                Shipping address same as billing
              </Label>
            </div>
            {!sameAsBilling && (
              <div className="space-y-1.5">
                <Label htmlFor="shippingAddress">Shipping Address</Label>
                <Input
                  id="shippingAddress"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="Enter shipping address"
                />
              </div>
            )}
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
          {/* Mobile: card-based layout */}
          <div className="md:hidden space-y-4 p-4">
            {lines.map((line, idx) => (
              <Card key={line.id} className="border-dashed">
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Item #{idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length <= 1}
                    >
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                  {/* Product Dropdown */}
                  <Popover
                    open={productOpenMap[line.id]}
                    onOpenChange={(open) =>
                      setProductOpenMap((prev) => ({ ...prev, [line.id]: open }))
                    }
                  >
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal text-sm">
                        {line.productId
                          ? products.find((p) => p.id === line.productId)?.name || 'Select...'
                          : 'Select product...'}
                        <ChevronDown className="size-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 w-full" align="start">
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
                                    line.productId === product.id ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                <span className="truncate">{product.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder="Description"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice || ''}
                        onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Unit</Label>
                      <Select value={line.unit} onValueChange={(val) => updateLine(line.id, 'unit', val)}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Disc %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discountPercent || ''}
                        onChange={(e) => updateLine(line.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">VAT %</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.vatRate}
                        onChange={(e) => updateLine(line.id, 'vatRate', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <span className="font-semibold">{formatNPR(line.lineTotal)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block overflow-x-auto">
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
                          <Button variant="outline" size="sm" className="w-full justify-between font-normal text-xs h-8">
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
                                        line.productId === product.id ? 'opacity-100' : 'opacity-0',
                                      )}
                                    />
                                    <span className="truncate">{product.name}</span>
                                    {product.code && (
                                      <span className="ml-auto text-xs text-muted-foreground">{product.code}</span>
                                    )}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                        placeholder="Description"
                        className="h-8 text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={line.unit} onValueChange={(val) => updateLine(line.id, 'unit', val)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice || ''}
                        onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discountPercent || ''}
                        onChange={(e) => updateLine(line.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        value={line.vatRate}
                        onChange={(e) => updateLine(line.id, 'vatRate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatNPR(line.lineTotal)}
                    </TableCell>
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
        {/* Notes & Terms */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms..."
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discountAmt">Invoice Discount (NPR)</Label>
              <Input
                id="discountAmt"
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
            <h3 className="font-semibold text-base mb-4">Invoice Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatNPR(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Line Discounts</span>
              <span className="text-red-600">- {formatNPR(summary.totalDiscount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Taxable Amount</span>
              <span className="font-medium">{formatNPR(summary.taxable)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">VAT Amount ({NEPAL_VAT_RATE * 100}%)</span>
              <span>{formatNPR(summary.vatTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Invoice Discount</span>
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

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push('/invoices')}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={() => handleSubmit('draft')}
          disabled={submitting}
          className="min-w-[140px]"
        >
          <Save className="size-4 mr-2" />
          {submitting ? 'Saving...' : 'Save as Draft'}
        </Button>
        <Button
          onClick={() => handleSubmit('sent')}
          disabled={submitting}
          className="min-w-[140px]"
        >
          <Send className="size-4 mr-2" />
          {submitting ? 'Sending...' : 'Create & Send'}
        </Button>
      </div>
    </div>
  )
}
