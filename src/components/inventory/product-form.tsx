'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { authFetch } from '@/lib/session'
import { ArrowLeft, Package } from 'lucide-react'
import { toast } from 'sonner'

const UNITS = ['pcs', 'kg', 'ltr', 'box', 'ream', 'set', 'pair', 'meter', 'dozen', 'packet', 'gram', 'ml', 'ton', 'bundle', 'carton']
const CATEGORIES = [
  'Electronics', 'Grocery', 'Clothing', 'Stationery', 'Hardware',
  'Furniture', 'Food & Beverage', 'Medical', 'Construction', 'Automobile',
  'Software', 'Consulting', 'Printing', 'Textiles', 'Other',
]

export function ProductForm() {
  const { currentOrgId } = useAppStore()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  // Basic fields
  const [name, setName] = useState('')
  const [nameNepali, setNameNepali] = useState('')
  const [code, setCode] = useState('')
  const [unit, setUnit] = useState('pcs')
  const [hsnCode, setHsnCode] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [productType, setProductType] = useState('goods')

  // Tax & pricing
  const [isVatable, setIsVatable] = useState(true)
  const [vatRate, setVatRate] = useState(NEPAL_VAT_RATE * 100)
  const [sellingPrice, setSellingPrice] = useState('')
  const [costPrice, setCostPrice] = useState('')

  // Stock settings
  const [minStockLevel, setMinStockLevel] = useState('')
  const [maxStockLevel, setMaxStockLevel] = useState('')
  const [costingMethod, setCostingMethod] = useState('fifo')

  // Tracking toggles
  const [hasBatch, setHasBatch] = useState(false)
  const [hasExpiry, setHasExpiry] = useState(false)

  // Description
  const [description, setDescription] = useState('')

  // Computed VAT preview
  const vatPreview = (() => {
    if (!isVatable || !sellingPrice) return null
    const price = parseFloat(sellingPrice) || 0
    const vat = price * NEPAL_VAT_RATE
    return formatNPR(vat)
  })()

  const handleSubmit = async () => {
    if (!currentOrgId) return
    if (!name.trim()) {
      toast.error('Product name is required')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        orgId: currentOrgId,
        name: name.trim(),
        nameNepali: nameNepali.trim() || null,
        code: code.trim() || null,
        unit,
        hsnCode: hsnCode.trim() || null,
        category: category || null,
        brand: brand.trim() || null,
        productType,
        isVatable,
        vatRate: isVatable ? vatRate : 0,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : null,
        costPrice: costPrice ? parseFloat(costPrice) : null,
        minStockLevel: minStockLevel ? parseFloat(minStockLevel) : null,
        maxStockLevel: maxStockLevel ? parseFloat(maxStockLevel) : null,
        costingMethod,
        hasBatch,
        hasExpiry,
        description: description.trim() || null,
      }

      const res = await authFetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        toast.success('Product created successfully')
        router.push('/inventory')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create product')
      }
    } catch {
      toast.error('Failed to create product')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/inventory')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">Add Product</h1>
          <p className="text-muted-foreground text-sm">
            Add a new product or service to your inventory
          </p>
        </div>
        <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
          <Package className="size-5 text-muted-foreground" />
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Product name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameNepali">Name (Nepali)</Label>
              <Input
                id="nameNepali"
                value={nameNepali}
                onChange={(e) => setNameNepali(e.target.value)}
                placeholder="\u0909\u0924\u094D\u092A\u093E\u0926\u0928\u0915\u094B \u0928\u093E\u092E"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="code">Code / SKU</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PRD-001"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit">Unit</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                value={hsnCode}
                onChange={(e) => setHsnCode(e.target.value)}
                placeholder="HSN/SAC code"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Brand name"
              />
            </div>
          </div>

          {/* Product Type */}
          <div className="space-y-3">
            <Label>Product Type</Label>
            <RadioGroup
              value={productType}
              onValueChange={setProductType}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="goods" id="goods" />
                <Label htmlFor="goods" className="font-normal cursor-pointer">
                  Goods (Physical Product)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="service" id="service" />
                <Label htmlFor="service" className="font-normal cursor-pointer">
                  Service
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Tax & Pricing */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Tax & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              id="isVatable"
              checked={isVatable}
              onCheckedChange={(checked) => {
                setIsVatable(checked)
                if (checked) setVatRate(NEPAL_VAT_RATE * 100)
                else setVatRate(0)
              }}
            />
            <Label htmlFor="isVatable" className="cursor-pointer">
              VAT Applicable (Nepal {NEPAL_VAT_RATE * 100}% standard rate)
            </Label>
          </div>

          {isVatable && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 border-l-2 border-muted">
              <div className="space-y-1.5">
                <Label htmlFor="vatRate">VAT Rate (%)</Label>
                <Input
                  id="vatRate"
                  type="number"
                  min="0"
                  step="0.5"
                  value={vatRate}
                  onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Default: {NEPAL_VAT_RATE * 100}% (Nepal standard)
                </p>
              </div>
              {vatPreview && (
                <div className="flex items-end">
                  <div className="p-3 rounded-lg bg-muted text-sm">
                    <p className="text-xs text-muted-foreground">VAT on selling price</p>
                    <p className="font-semibold">{vatPreview}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sellingPrice">Selling Price (NPR)</Label>
              <Input
                id="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
              {sellingPrice && isVatable && (
                <p className="text-xs text-muted-foreground">
                  Incl. VAT: {formatNPR(parseFloat(sellingPrice) * (1 + NEPAL_VAT_RATE))}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="costPrice">Cost Price (NPR)</Label>
              <Input
                id="costPrice"
                type="number"
                min="0"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="0.00"
              />
              {sellingPrice && costPrice && (
                <p className="text-xs text-muted-foreground">
                  Margin: {formatNPR(parseFloat(sellingPrice) - parseFloat(costPrice))}{' '}
                  ({((parseFloat(sellingPrice) - parseFloat(costPrice)) / parseFloat(sellingPrice) * 100).toFixed(1)}%)
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock & Inventory Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Stock & Inventory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="minStock">Min Stock Level</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                step="0.01"
                value={minStockLevel}
                onChange={(e) => setMinStockLevel(e.target.value)}
                placeholder="Reorder point"
              />
              <p className="text-xs text-muted-foreground">
                Alert when stock falls below this level
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxStock">Max Stock Level</Label>
              <Input
                id="maxStock"
                type="number"
                min="0"
                step="0.01"
                value={maxStockLevel}
                onChange={(e) => setMaxStockLevel(e.target.value)}
                placeholder="Maximum capacity"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Costing Method</Label>
            <RadioGroup
              value={costingMethod}
              onValueChange={setCostingMethod}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fifo" id="fifo" />
                <Label htmlFor="fifo" className="font-normal cursor-pointer">
                  FIFO (First In, First Out)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="weighted_average" id="weightedAvg" />
                <Label htmlFor="weightedAvg" className="font-normal cursor-pointer">
                  Weighted Average
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Switch
                id="hasBatch"
                checked={hasBatch}
                onCheckedChange={setHasBatch}
              />
              <Label htmlFor="hasBatch" className="cursor-pointer">
                Has Batch Tracking
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="hasExpiry"
                checked={hasExpiry}
                onCheckedChange={setHasExpiry}
              />
              <Label htmlFor="hasExpiry" className="cursor-pointer">
                Has Expiry Date
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Additional Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description, specifications, or notes..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push('/inventory')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[140px]">
          {submitting ? 'Saving...' : 'Add Product'}
        </Button>
      </div>
    </div>
  )
}
