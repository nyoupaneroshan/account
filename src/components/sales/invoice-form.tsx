'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import {
  formatNPR,
  calculateVAT,
  NEPAL_VAT_RATE,
  adToBs,
  toNepaliDigits,
  numberToNepaliWords,
  numberToEnglishWords,
  PAYMENT_MODES,
  IRD_BUYER_PAN_MANDATORY_THRESHOLD,
  isValidNepaliPAN,
} from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
  AlertTriangle, Calendar, ShieldCheck,
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
  hsnCode: string
  quantity: number
  unit: string
  unitPrice: number
  discountPercent: number
  vatRate: number
  isExempt: boolean
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
    hsnCode: '',
    quantity: 1,
    unit: 'pcs',
    unitPrice: 0,
    discountPercent: 0,
    vatRate: NEPAL_VAT_RATE * 100,
    isExempt: false,
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
  const netAmt = subtotal - discountAmt
  const taxableAmt = item.isExempt ? 0 : netAmt
  const vatAmt = item.isExempt ? 0 : taxableAmt * (item.vatRate / 100)
  const total = netAmt + vatAmt

  return {
    ...item,
    lineSubtotal: Math.round(subtotal * 100) / 100,
    lineDiscount: Math.round(discountAmt * 100) / 100,
    lineTaxable: Math.round(taxableAmt * 100) / 100,
    lineVat: Math.round(vatAmt * 100) / 100,
    lineTotal: Math.round(total * 100) / 100,
  }
}

// ─── Component ────────────────────────────────────────────────
export function InvoiceForm() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()

  // Form state
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState('')
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [partyOpen, setPartyOpen] = useState(false)
  const [buyerName, setBuyerName] = useState('')
  const [buyerAddress, setBuyerAddress] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [paymentMode, setPaymentMode] = useState<string>('cash')
  const [billingAddress, setBillingAddress] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [sameAsBilling, setSameAsBilling] = useState(true)
  const [lines, setLines] = useState<LineItem[]>([createEmptyLine()])
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Derived BS date
  const bsDate = useMemo(() => adToBs(new Date(invoiceDate)), [invoiceDate])

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
      setBuyerName(party.name)
      setPanNumber(party.panNumber || '')
      const addressParts = [party.address, party.city].filter(Boolean)
      const addr = addressParts.join(', ') || ''
      setBuyerAddress(addr)
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
          const isExempt = !product.isVatable
          return calcLine({
            ...line,
            productId: product.id,
            description: product.name,
            hsnCode: product.hsnCode || '',
            unit: product.unit || 'pcs',
            unitPrice: product.sellingPrice || 0,
            isExempt,
            vatRate: isExempt
              ? 0
              : (product.vatRate !== null && product.vatRate !== undefined ? product.vatRate : NEPAL_VAT_RATE * 100),
          })
        }),
      )
      setProductOpenMap((prev) => ({ ...prev, [lineId]: false }))
    },
    [],
  )

  // Update a line field
  const updateLine = useCallback(
    (lineId: string, field: keyof LineItem, value: any) => {
      setLines((prev) =>
        prev.map((line) => {
          if (line.id !== lineId) return line
          const updated = { ...line, [field]: value }
          if (field === 'isExempt' && value === true) {
            updated.vatRate = 0
          } else if (field === 'isExempt' && value === false) {
            updated.vatRate = NEPAL_VAT_RATE * 100
          }
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

  // Summary calculations with IRD taxable and exempt amounts
  const summary = useMemo(() => {
    const subtotal = lines.reduce((s, l) => s + l.lineSubtotal, 0)
    const totalDiscount = lines.reduce((s, l) => s + l.lineDiscount, 0)
    const exempt = lines
      .filter((l) => l.isExempt)
      .reduce((s, l) => s + (l.lineSubtotal - l.lineDiscount), 0)
    const taxable = lines
      .filter((l) => !l.isExempt)
      .reduce((s, l) => s + l.lineTaxable, 0)
    const vatTotal = lines.reduce((s, l) => s + l.lineVat, 0)
    const grandTotal = taxable + exempt + vatTotal - discountAmount

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      exempt: Math.round(exempt * 100) / 100,
      taxable: Math.round(taxable * 100) / 100,
      vatTotal: Math.round(vatTotal * 100) / 100,
      grandTotal: Math.round(Math.max(0, grandTotal) * 100) / 100,
    }
  }, [lines, discountAmount])

  // Submit handlers
  const handleSubmit = async (status: 'draft' | 'issued') => {
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

    if (summary.grandTotal >= IRD_BUYER_PAN_MANDATORY_THRESHOLD && !panNumber) {
      toast.warning('Note: IRD regulations require Buyer PAN for transactions exceeding Rs. 10,000')
    }

    setSubmitting(true)
    try {
      const payload = {
        orgId: currentOrgId,
        date: invoiceDate,
        dueDate: dueDate || null,
        partyId: selectedParty?.id || null,
        buyerName: buyerName || selectedParty?.name || null,
        buyerAddress: buyerAddress || billingAddress || null,
        panNumber: panNumber || null,
        paymentMode: paymentMode || 'cash',
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
          hsnCode: l.hsnCode || null,
          quantity: l.quantity,
          unit: l.unit,
          unitPrice: l.unitPrice,
          discountPercent: l.discountPercent,
          vatRate: l.vatRate,
          isExempt: l.isExempt,
        })),
      }
      const res = await authFetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const inv = await res.json()
        toast.success(`Invoice ${inv.invoiceNumber} created & issued successfully!`)
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/invoices')}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <ShieldCheck className="size-6 text-emerald-600" />
              New Tax Invoice (नयाँ कर बीजक)
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Create an IRD-compliant Schedule 5 tax invoice with real-time CBMS synchronization
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono py-1 px-2.5 bg-slate-50">
            आ.व. {bsDate.fiscalYear}
          </Badge>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs py-1 px-2.5">
            वि.सं. {bsDate.formattedBs}
          </Badge>
        </div>
      </div>

      {/* PAN Mandatory Threshold Alert */}
      {summary.grandTotal >= IRD_BUYER_PAN_MANDATORY_THRESHOLD && !panNumber && (
        <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs sm:text-sm">
          <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">आन्तरिक राजस्व विभाग (IRD) नियम सचेतना: </span>
            रु. १०,००० भन्दा माथिको कारोबारमा खरिदकर्ताको स्थायी लेखा नम्बर (PAN) अनिवार्य छ । कृपया खरिदकर्ताको पान नम्बर प्रविष्ट गर्नुहोस् ।
            <span className="block text-xs text-amber-700 mt-0.5">
              (Buyer PAN is mandatory for invoices of NPR 10,000 and above under Nepal VAT regulations)
            </span>
          </div>
        </div>
      )}

      {/* Invoice Details Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span>बीजक विवरण (Invoice & Buyer Details)</span>
            <span className="text-xs font-normal text-muted-foreground">अनुसूची ५ बमोजिम</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Row 1: Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label>Invoice Number (बीजक नं)</Label>
              <Input
                value={`Auto-assigned on issue (INV-${bsDate.fiscalYear.slice(-5)}-...)`}
                disabled
                className="bg-muted text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoiceDate">Invoice Date (ई.सं. / मिति) *</Label>
              <div className="space-y-1">
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="h-9"
                />
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="size-3" /> वि.सं. {bsDate.formattedBs} ({bsDate.monthNameNepali})
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dueDate">Due Date (भुक्तानी मिति)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentMode">Payment Mode (भुक्तानी विधि) *</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger id="paymentMode" className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode.value} value={mode.value} className="text-xs">
                      {mode.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2: Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2 border-t">
            <div className="space-y-1.5">
              <Label>Customer / Party (ग्राहक चयन)</Label>
              <Popover open={partyOpen} onOpenChange={setPartyOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal text-xs h-9"
                    role="combobox"
                    aria-expanded={partyOpen}
                  >
                    {selectedParty ? selectedParty.name : 'Select registered customer...'}
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
                              <Badge variant="secondary" className="ml-2 text-[10px]">
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
              <Label htmlFor="buyerName">Buyer Name (खरिदकर्ताको नाम)</Label>
              <Input
                id="buyerName"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Cash Customer / ग्राहकको नाम"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="panNumber" className="flex items-center justify-between">
                <span>Buyer PAN (स्थायी लेखा नं)</span>
                {panNumber && (
                  <span className={cn(
                    "text-[10px] font-medium",
                    isValidNepaliPAN(panNumber) ? "text-emerald-600" : "text-amber-600"
                  )}>
                    {isValidNepaliPAN(panNumber) ? "✓ Valid 9-digit" : "⚠ 9 digits expected"}
                  </span>
                )}
              </Label>
              <Input
                id="panNumber"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                placeholder="९ अङ्कको स्थायी लेखा नम्बर"
                className="h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Row 3: Addresses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="billingAddress">Billing Address (खरिदकर्ताको ठेगाना)</Label>
              <Input
                id="billingAddress"
                value={billingAddress}
                onChange={(e) => {
                  setBillingAddress(e.target.value)
                  if (sameAsBilling) setShippingAddress(e.target.value)
                }}
                placeholder="Customer registered address"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="shippingAddress">Shipping Address (सामान पुर्याउने ठेगाना)</Label>
              <Input
                id="shippingAddress"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Shipping destination"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">वस्तु वा सेवा विवरण (Line Items)</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                मूल्य अभिवृद्धि कर (VAT 13%) वा कर छुट (Exempt) वस्तुहरू चयन गर्नुहोस्
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addLine} className="gap-1.5 text-xs">
              <Plus className="size-3.5" />
              Add Item
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
                    <span className="text-xs font-semibold">Item #{idx + 1}</span>
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
                  <Input
                    value={line.description}
                    onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-8 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">HS Code</Label>
                      <Input
                        value={line.hsnCode}
                        onChange={(e) => updateLine(line.id, 'hsnCode', e.target.value)}
                        placeholder="HS Code"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unitPrice || ''}
                        onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Disc %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={line.discountPercent || ''}
                        onChange={(e) => updateLine(line.id, 'discountPercent', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={line.isExempt}
                        onChange={(e) => updateLine(line.id, 'isExempt', e.target.checked)}
                        className="rounded"
                      />
                      <span>कर छुट (Exempt)</span>
                    </label>
                    <span className="font-semibold text-sm">{formatNPR(line.lineTotal)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop: table layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs bg-slate-50/75">
                  <TableHead className="w-[180px]">Product / सेवा</TableHead>
                  <TableHead className="min-w-[140px]">Description</TableHead>
                  <TableHead className="w-[85px]">HS Code</TableHead>
                  <TableHead className="w-[70px] text-right">Qty</TableHead>
                  <TableHead className="w-[75px]">Unit</TableHead>
                  <TableHead className="w-[95px] text-right">Rate (Rs)</TableHead>
                  <TableHead className="w-[70px] text-right">Disc %</TableHead>
                  <TableHead className="w-[80px] text-center">कर छुट</TableHead>
                  <TableHead className="w-[70px] text-right">VAT %</TableHead>
                  <TableHead className="w-[110px] text-right">Total (Rs)</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id} className="text-xs">
                    <TableCell>
                      <Popover
                        open={productOpenMap[line.id]}
                        onOpenChange={(open) =>
                          setProductOpenMap((prev) => ({ ...prev, [line.id]: open }))
                        }
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full justify-between font-normal text-xs h-8">
                            <span className="truncate">
                              {line.productId
                                ? products.find((p) => p.id === line.productId)?.name || 'Select...'
                                : 'Select...'}
                            </span>
                            <ChevronDown className="size-3 opacity-50 shrink-0" />
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
                                    {product.hsnCode && (
                                      <span className="ml-auto text-[10px] text-muted-foreground">{product.hsnCode}</span>
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
                        value={line.hsnCode}
                        onChange={(e) => updateLine(line.id, 'hsnCode', e.target.value)}
                        placeholder="HS Code"
                        className="h-8 text-xs font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs text-right font-mono"
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={line.unit} onValueChange={(val) => updateLine(line.id, 'unit', val)}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
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
                        className="h-8 text-xs text-right font-mono"
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
                        className="h-8 text-xs text-right font-mono"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={line.isExempt}
                        onChange={(e) => updateLine(line.id, 'isExempt', e.target.checked)}
                        className="size-4 rounded cursor-pointer"
                        title="कर छुट (Tax Exempt)"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        disabled={line.isExempt}
                        value={line.isExempt ? 0 : line.vatRate}
                        onChange={(e) => updateLine(line.id, 'vatRate', parseFloat(e.target.value) || 0)}
                        className={cn("h-8 text-xs text-right font-mono", line.isExempt && "bg-muted text-muted-foreground")}
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-xs">
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
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes / टिप्पणी</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for invoice..."
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="terms">Terms & Conditions / शर्तहरू</Label>
              <Textarea
                id="terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms..."
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discountAmt">Invoice Discount (एकमुष्ठ छुट रकम - रु.)</Label>
              <Input
                id="discountAmt"
                type="number"
                min="0"
                step="0.01"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-8 text-xs font-mono"
              />
            </div>
          </CardContent>
        </Card>

        {/* Calculation Summary */}
        <Card>
          <CardContent className="p-4 space-y-2.5 text-xs">
            <h3 className="font-semibold text-sm border-b pb-2 text-slate-900">
              कर बीजक हिसाब (Tax Invoice Calculation)
            </h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">कुल जम्मा (Subtotal):</span>
              <span className="font-mono">{formatNPR(summary.subtotal)}</span>
            </div>
            {summary.totalDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">वस्तुगत छुट (Line Discounts):</span>
                <span className="font-mono text-red-600">- {formatNPR(summary.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">कर छुट हुने बिक्री (Tax-Exempt Sales):</span>
              <span className="font-mono">{formatNPR(summary.exempt)}</span>
            </div>
            <div className="flex justify-between font-medium pt-1 border-t">
              <span className="text-slate-800">करयोग्य रकम (Taxable Amount):</span>
              <span className="font-mono font-semibold">{formatNPR(summary.taxable)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-slate-800">मूल्य अभिवृद्धि कर १३% (VAT 13%):</span>
              <span className="font-mono font-semibold">{formatNPR(summary.vatTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">एकमुष्ठ छुट (Invoice Discount):</span>
                <span className="font-mono text-red-600">- {formatNPR(discountAmount)}</span>
              </div>
            )}
            <Separator className="my-1.5" />
            <div className="flex justify-between text-base font-bold text-slate-900">
              <span>कुल जम्मा रकम (Grand Total):</span>
              <span className="font-mono text-primary">{formatNPR(summary.grandTotal)}</span>
            </div>

            {/* In Words */}
            <div className="pt-2 border-t text-[11px] bg-slate-50/80 p-2 rounded">
              <span className="font-semibold text-slate-800">अक्षरेपी: </span>
              <span className="italic text-slate-900">{numberToNepaliWords(summary.grandTotal)}</span>
              <div className="text-slate-500 italic mt-0.5">({numberToEnglishWords(summary.grandTotal)})</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => router.push('/invoices')} disabled={submitting}>
          रद्द गर्नुहोस् (Cancel)
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={submitting}
            className="text-xs"
          >
            Save as Draft
          </Button>
          <Button
            onClick={() => handleSubmit('issued')}
            disabled={submitting}
            className="gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <ShieldCheck className="size-4" />
            {submitting ? 'Generating...' : 'Save & Issue Tax Invoice (कर बीजक जारी गर्नुहोस्)'}
          </Button>
        </div>
      </div>
    </div>
  )
}
