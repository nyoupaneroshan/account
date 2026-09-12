'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNPR, NEPAL_VAT_RATE } from '@/lib/nepal-accounting'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ReturnItem {
  lineId: string
  productId: string | null
  description: string
  hsnCode: string | null
  maxQty: number
  unit: string | null
  unitPrice: number
  vatRate: number
  returnQty: number
  isSelected: boolean
}

export interface CreditNoteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onSuccess?: () => void
}

const COMMON_REASONS = [
  'Defective / Damaged Goods (खराब वा बिग्रिएको वस्तु)',
  'Customer Return / Excess Quantity (ग्राहक फिर्ता / बढी परिमाण)',
  'Price / Rate Difference (दर फरक परेको)',
  'Billing Error / Cancelled Order (बीजक त्रुटि / रद्द गरिएको)',
  'Service Deficiency (सेवामा त्रुटि)',
]

export function CreditNoteDialog({
  open,
  onOpenChange,
  invoice,
  onSuccess,
}: CreditNoteDialogProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [returnItems, setReturnItems] = useState<ReturnItem[]>(() => {
    if (!invoice?.lines) return []
    return invoice.lines.map((l: any) => ({
      lineId: l.id,
      productId: l.productId,
      description: l.description,
      hsnCode: l.hsnCode,
      maxQty: l.quantity,
      unit: l.unit,
      unitPrice: l.unitPrice,
      vatRate: l.vatRate ?? NEPAL_VAT_RATE * 100,
      returnQty: l.quantity,
      isSelected: true,
    }))
  })

  // Recalculate totals
  const totals = useMemo(() => {
    let taxable = 0
    let vat = 0
    let grandTotal = 0

    returnItems
      .filter((i) => i.isSelected && i.returnQty > 0)
      .forEach((item) => {
        const itemAmount = item.returnQty * item.unitPrice
        const itemVat = item.vatRate > 0 ? itemAmount * (item.vatRate / 100) : 0
        taxable += itemAmount
        vat += itemVat
        grandTotal += itemAmount + itemVat
      })

    return {
      taxable: Math.round(taxable * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
    }
  }, [returnItems])

  const handleQtyChange = (index: number, val: number) => {
    setReturnItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        const safeQty = Math.max(0, Math.min(item.maxQty, val))
        return { ...item, returnQty: safeQty }
      })
    )
  }

  const handleToggleSelect = (index: number, checked: boolean) => {
    setReturnItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isSelected: checked } : item))
    )
  }

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('IRD regulations mandate a stated reason for issuing a Credit Note')
      return
    }

    const itemsToReturn = returnItems.filter((i) => i.isSelected && i.returnQty > 0)
    if (itemsToReturn.length === 0) {
      toast.error('Please select at least one item and quantity to return')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetch('/api/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalInvoiceId: invoice.id,
          reason,
          lines: itemsToReturn.map((item) => ({
            productId: item.productId,
            description: item.description,
            hsnCode: item.hsnCode,
            quantity: item.returnQty,
            unit: item.unit,
            unitPrice: item.unitPrice,
            vatRate: item.vatRate,
          })),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Credit Note ${data.creditNoteNumber} issued & synced to IRD successfully!`)
        onOpenChange(false)
        if (onSuccess) onSuccess()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to issue Credit Note')
      }
    } catch {
      toast.error('Network error. Failed to issue Credit Note.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <RotateCcw className="size-5 text-amber-600" />
            Issue Credit Note (क्रेडिट नोट / बिक्री फिर्ता)
          </DialogTitle>
          <DialogDescription className="text-xs">
            मूल्य अभिवृद्धि कर ऐन, २०५२ तथा CBMS निर्देशिका अनुसार बीजक नं: <strong>{invoice?.invoiceNumber}</strong> को लागि क्रेडिट नोट
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Metadata banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border rounded text-xs">
            <div>
              <span className="text-slate-500">Invoice No:</span>{' '}
              <span className="font-mono font-bold text-slate-800">{invoice?.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-slate-500">Customer:</span>{' '}
              <span className="font-semibold text-slate-800">{invoice?.buyerName || invoice?.party?.name || 'Cash Customer'}</span>
            </div>
            <div>
              <span className="text-slate-500">Buyer PAN:</span>{' '}
              <span className="font-mono font-medium text-slate-800">{invoice?.panNumber || '—'}</span>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="cnReason" className="text-xs font-semibold flex items-center justify-between">
              <span>Reason for Return / क्रेडिट नोट जारी गर्नुको कारण *</span>
              <span className="text-[11px] font-normal text-amber-600">IRD Mandatory Field</span>
            </Label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {COMMON_REASONS.map((r) => (
                <Badge
                  key={r}
                  variant="outline"
                  className="cursor-pointer text-[10px] hover:bg-slate-100"
                  onClick={() => setReason(r)}
                >
                  {r.split('(')[0].trim()}
                </Badge>
              ))}
            </div>
            <Textarea
              id="cnReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter exact statutory reason for credit note / सामान फिर्ता वा छुटको कारण खुलाउनुहोस्..."
              rows={2}
              className="text-xs"
            />
          </div>

          {/* Items selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">फिर्ता हुने वस्तु तथा परिमाण (Items to Credit)</Label>
            <div className="border rounded overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs bg-slate-50">
                    <TableHead className="w-10 text-center">Select</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-20 text-right">Invoiced Qty</TableHead>
                    <TableHead className="w-24 text-right">Return Qty</TableHead>
                    <TableHead className="w-24 text-right">Rate (Rs)</TableHead>
                    <TableHead className="w-24 text-right">Taxable</TableHead>
                    <TableHead className="w-24 text-right">VAT (13%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item, idx) => {
                    const lineTaxable = item.isSelected ? item.returnQty * item.unitPrice : 0
                    const lineVat = item.isSelected && item.vatRate > 0 ? lineTaxable * (item.vatRate / 100) : 0

                    return (
                      <TableRow key={item.lineId || idx} className="text-xs">
                        <TableCell className="text-center">
                          <input
                            type="checkbox"
                            checked={item.isSelected}
                            onChange={(e) => handleToggleSelect(idx, e.target.checked)}
                            className="rounded cursor-pointer"
                          />
                        </TableCell>
                        <TableCell className="font-medium">{item.description}</TableCell>
                        <TableCell className="text-right font-mono text-slate-500">
                          {item.maxQty} {item.unit || ''}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            max={item.maxQty}
                            step="0.01"
                            disabled={!item.isSelected}
                            value={item.returnQty}
                            onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                            className="h-7 text-xs text-right font-mono w-20 ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right font-mono">{Number(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono font-medium">{lineTaxable.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-mono text-slate-600">{lineVat.toFixed(2)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Credit Summary */}
          <div className="bg-amber-50/70 border border-amber-200 p-3 rounded space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">करयोग्य फिर्ता रकम (Taxable Credit):</span>
              <span className="font-mono font-semibold">{formatNPR(totals.taxable)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">मूल्य अभिवृद्धि कर फिर्ता (VAT 13% Credit):</span>
              <span className="font-mono font-semibold">{formatNPR(totals.vat)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-amber-300 pt-1">
              <span>कुल क्रेडिट नोट रकम (Total Credit Note Amount):</span>
              <span className="font-mono text-amber-900">{formatNPR(totals.grandTotal)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
            <RotateCcw className="size-4" />
            {submitting ? 'Issuing...' : 'Issue Credit Note & Sync to IRD'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
