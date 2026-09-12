'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  QrCode,
  ShieldCheck,
  FileText,
} from 'lucide-react'
import { formatNPR } from '@/lib/nepal-accounting'
import { adToBs, toNepaliDigits, numberToNepaliWords, numberToEnglishWords } from '@/lib/bikram-sambat'
import { generateQRCodeDataUri } from '@/lib/qrcode'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'

export interface TaxInvoiceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  organization: any
  onSyncSuccess?: () => void
}

export function TaxInvoiceModal({
  open,
  onOpenChange,
  invoice,
  organization,
  onSyncSuccess,
}: TaxInvoiceModalProps) {
  const [printCount, setPrintCount] = useState<number>(invoice?.printCount || 0)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>(invoice?.syncStatus || 'pending')

  if (!invoice) return null

  const org = organization || invoice.organization || {}
  const party = invoice.party || {}
  const bsDate = invoice.dateBS
    ? { formattedBs: toNepaliDigits(invoice.dateBS.replace(/-/g, '/')), str: invoice.dateBS }
    : adToBs(invoice.date)

  const isReprint = printCount > 1
  const qrString = `PAN:${org.panNumber || ''}|INV:${invoice.invoiceNumber}|DATE:${invoice.dateBS || bsDate.str}|AMT:${invoice.totalAmount}`
  const qrDataUri = generateQRCodeDataUri(qrString)

  // Trigger print with IRD audit counter increment
  const handlePrint = async () => {
    try {
      // Call API to record print count
      const res = await authFetch(`/api/invoices/${invoice.id}/print`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        setPrintCount(data.printCount)
      }
    } catch {
      // Continue even if network glitch occurs
    }

    // Trigger standard browser print window
    window.print()
  }

  // Trigger manual CBMS sync
  const handleSyncCbms = async () => {
    setSyncing(true)
    try {
      const res = await authFetch('/api/cbms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_invoice', invoiceId: invoice.id }),
      })
      const data = await res.json()
      if (data.success) {
        setSyncStatus('synced')
        toast.success(data.message || 'Invoice successfully synced to IRD CBMS!')
        if (onSyncSuccess) onSyncSuccess()
      } else {
        setSyncStatus('failed')
        toast.error(data.message || 'CBMS Sync failed')
      }
    } catch {
      toast.error('Network error during CBMS sync')
    } finally {
      setSyncing(false)
    }
  }

  const buyerName = invoice.buyerName || party.name || 'Cash Customer / नगद ग्राहक'
  const buyerPan = invoice.panNumber || party.panNumber || ''
  const paymentModeLabel =
    invoice.paymentMode === 'cash' ? 'Cash (नगद)' :
    invoice.paymentMode === 'credit' ? 'Credit (उधारो)' :
    invoice.paymentMode === 'bank' ? 'Bank Transfer (बैंक)' :
    invoice.paymentMode === 'cheque' ? 'Cheque (चेक)' :
    invoice.paymentMode === 'digital' ? 'Digital Wallet (डिजिटल)' : 'Cash (नगद)'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        {/* Action Header - Hidden during print */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <div>
              <DialogTitle className="text-base font-semibold">
                IRD Tax Invoice Preview
              </DialogTitle>
              <DialogDescription className="text-xs">
                अनुसूची ५ बमोजिमको कर बीजक (Schedule 5 Tax Invoice)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {syncStatus === 'synced' ? (
              <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                <CheckCircle2 className="size-3.5" /> CBMS Synced
              </Badge>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncCbms}
                disabled={syncing}
                className="gap-1.5 text-xs text-amber-600 border-amber-300 hover:bg-amber-50"
              >
                {syncing ? <RefreshCw className="size-3.5 animate-spin" /> : <Clock className="size-3.5" />}
                Sync to IRD CBMS
              </Button>
            )}

            <Button onClick={handlePrint} size="sm" className="gap-1.5 text-xs">
              <Printer className="size-3.5" />
              Print Tax Invoice
            </Button>
          </div>
        </div>

        {/* Printable Tax Invoice Container */}
        <div className="bg-white text-black p-4 sm:p-6 rounded-lg border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 font-sans text-xs sm:text-sm">
          {/* Statutory Title */}
          <div className="text-center pb-2">
            {isReprint ? (
              <div className="border-2 border-dashed border-red-500 bg-red-50 p-2 mb-2 rounded">
                <h1 className="text-base sm:text-lg font-extrabold text-red-600 tracking-wider">
                  कर बीजकको प्रतिलिपि (प्रतिलिपि संख्या: {printCount})
                </h1>
                <p className="text-xs font-semibold text-red-700">
                  COPY OF ORIGINAL (Copy No: {printCount}) — REPRINT
                </p>
                {invoice.lastPrintedAt && (
                  <p className="text-[10px] text-red-500 mt-0.5">
                    अन्तिम प्रिन्ट मिति: {new Date(invoice.lastPrintedAt).toLocaleString('en-US', { timeZone: 'Asia/Kathmandu' })}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <h1 className="text-lg sm:text-xl font-bold tracking-wider text-slate-900">
                  कर बीजक
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
                  TAX INVOICE
                </p>
                <p className="text-[10px] text-slate-500">
                  (मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम १७ को उपनियम (१) सँग सम्बन्धित - अनुसूची ५)
                </p>
              </div>
            )}
          </div>

          {/* Seller / Organization Header */}
          <div className="text-center border-b pb-3 mb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {org.nameNepali || org.name || 'Hisab Pro Enterprise'}
            </h2>
            {org.nameNepali && org.name && org.nameNepali !== org.name && (
              <p className="text-xs font-medium text-slate-700">{org.name}</p>
            )}
            <p className="text-xs text-slate-600 mt-0.5">
              {[org.address, org.city, org.province].filter(Boolean).join(', ') || 'Kathmandu, Nepal'}
            </p>
            <p className="text-xs text-slate-600">
              {org.phone && `फोन: ${org.phone}`} {org.email && `| इमेल: ${org.email}`}
            </p>
            <div className="mt-1 inline-block border-2 border-slate-900 px-3 py-0.5 rounded font-mono font-bold text-xs sm:text-sm">
              स्थायी लेखा नं (PAN): {org.panNumber || '100000000'}
            </div>
          </div>

          {/* Invoice Meta Grid */}
          <div className="grid grid-cols-2 gap-4 pb-3 border-b text-xs">
            {/* Left: Buyer Details */}
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">खरिदकर्ताको विवरण (Buyer Details):</div>
              <div className="flex">
                <span className="w-24 text-slate-500">नाम (Name):</span>
                <span className="font-semibold text-slate-800">{buyerName}</span>
              </div>
              <div className="flex">
                <span className="w-24 text-slate-500">ठेगाना (Address):</span>
                <span className="text-slate-700">{invoice.buyerAddress || party.address || '—'}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-slate-500">पान नं (PAN):</span>
                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                  {buyerPan || 'अदर्ता / Not Registered'}
                </span>
              </div>
            </div>

            {/* Right: Invoice Metadata */}
            <div className="space-y-1 pl-4 border-l">
              <div className="flex">
                <span className="w-28 text-slate-500">बीजक नं (Inv No):</span>
                <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">आर्थिक वर्ष (FY):</span>
                <span className="font-semibold text-slate-800">{invoice.fiscalYear || '2081/82'}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">मिति (Date BS):</span>
                <span className="font-semibold text-slate-900">{bsDate.formattedBs}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">ई.सं. (Date AD):</span>
                <span className="text-slate-600">
                  {new Date(invoice.date).toISOString().split('T')[0]}
                </span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">भुक्तानी विधि (Mode):</span>
                <span className="font-medium text-slate-800">{paymentModeLabel}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                  <th className="border border-slate-300 p-1.5 text-center w-10">क्र.सं.<br/><span className="text-[10px] font-normal">S.N.</span></th>
                  <th className="border border-slate-300 p-1.5 text-left">विवरण<br/><span className="text-[10px] font-normal">Description</span></th>
                  <th className="border border-slate-300 p-1.5 text-center w-16">एच.एस. कोड<br/><span className="text-[10px] font-normal">HS Code</span></th>
                  <th className="border border-slate-300 p-1.5 text-right w-14">परिमाण<br/><span className="text-[10px] font-normal">Qty</span></th>
                  <th className="border border-slate-300 p-1.5 text-center w-12">इकाइ<br/><span className="text-[10px] font-normal">Unit</span></th>
                  <th className="border border-slate-300 p-1.5 text-right w-20">दर<br/><span className="text-[10px] font-normal">Rate (Rs)</span></th>
                  <th className="border border-slate-300 p-1.5 text-right w-20">रकम<br/><span className="text-[10px] font-normal">Amount (Rs)</span></th>
                  <th className="border border-slate-300 p-1.5 text-right w-16">छुट<br/><span className="text-[10px] font-normal">Discount</span></th>
                  <th className="border border-slate-300 p-1.5 text-right w-24">करयोग्य रकम<br/><span className="text-[10px] font-normal">Taxable (Rs)</span></th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines && invoice.lines.length > 0 ? (
                  invoice.lines.map((line: any, idx: number) => {
                    const lineSubtotal = (line.quantity || 1) * (line.unitPrice || 0)
                    const lineDiscount = line.discountAmount || 0
                    const taxable = line.taxableAmount || (lineSubtotal - lineDiscount)

                    return (
                      <tr key={line.id || idx} className="border-b border-slate-200 hover:bg-slate-50/50">
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 text-left font-medium">
                          {line.description}
                          {line.product?.name && line.product.name !== line.description && (
                            <span className="block text-[10px] text-slate-500">{line.product.name}</span>
                          )}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center font-mono text-[11px] text-slate-600">
                          {line.hsnCode || line.product?.hsnCode || '—'}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">{line.quantity}</td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-600">{line.unit || 'pcs'}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">{Number(line.unitPrice || 0).toFixed(2)}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono">{lineSubtotal.toFixed(2)}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-600">{lineDiscount > 0 ? lineDiscount.toFixed(2) : '0.00'}</td>
                        <td className="border border-slate-300 p-1.5 text-right font-mono font-medium">{taxable.toFixed(2)}</td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center p-4 text-slate-400">
                      कुनै वस्तु वा सेवा समावेश छैन (No items listed)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation & Words */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t text-xs">
            {/* Left: Words & QR Code */}
            <div className="space-y-3">
              <div>
                <span className="font-semibold text-slate-800">अक्षरेपी (Amount in Words):</span>
                <p className="font-medium text-slate-900 mt-0.5 italic">
                  {numberToNepaliWords(invoice.totalAmount)}
                </p>
                <p className="text-[11px] text-slate-600 italic">
                  ({numberToEnglishWords(invoice.totalAmount)})
                </p>
              </div>

              {/* QR Verification Box */}
              <div className="flex items-center gap-3 p-2 bg-slate-50 rounded border border-slate-200">
                <img
                  src={qrDataUri}
                  alt="Invoice QR Code"
                  className="size-16 border rounded bg-white p-0.5 shrink-0"
                />
                <div className="text-[10px] text-slate-600 space-y-0.5">
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="size-3 text-emerald-600" />
                    आन्तरिक राजस्व विभाग (IRD) प्रमाणीकरण
                  </div>
                  <div>बीजक नं: {invoice.invoiceNumber}</div>
                  <div>जम्मा रकम: रु {Number(invoice.totalAmount).toFixed(2)}</div>
                  <div className="text-[9px] text-slate-500">
                    केन्द्रीय बीजक अनुगमन प्रणाली (CBMS) मा दर्ता हुने गरी जारी गरिएको
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Calculations */}
            <div className="space-y-1 bg-slate-50/70 p-3 rounded border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-600">कुल जम्मा (Subtotal):</span>
                <span className="font-mono">{formatNPR(invoice.subtotal || invoice.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">छुट रकम (Discount):</span>
                <span className="font-mono">({formatNPR(invoice.discountAmount || 0)})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">कर छुट रकम (Exempt Sales):</span>
                <span className="font-mono">{formatNPR(invoice.exemptAmount || 0)}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-200 pt-1">
                <span className="text-slate-800">करयोग्य रकम (Taxable Amount):</span>
                <span className="font-mono font-semibold">{formatNPR(invoice.taxableAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-slate-800">मूल्य अभिवृद्धि कर १३% (VAT 13%):</span>
                <span className="font-mono font-semibold">{formatNPR(invoice.vatAmount)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between text-sm sm:text-base font-bold text-slate-900 pt-0.5">
                <span>कुल जम्मा रकम (Grand Total):</span>
                <span className="font-mono">{formatNPR(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-12 mt-6 border-t text-xs">
            <div className="text-center">
              <div className="border-t border-dashed border-slate-400 w-44 mx-auto mb-1"></div>
              <div className="font-semibold text-slate-800">जारी गर्नेको दस्तखत</div>
              <div className="text-[10px] text-slate-500">Prepared & Issued By</div>
            </div>
            <div className="text-center">
              <div className="border-t border-dashed border-slate-400 w-44 mx-auto mb-1"></div>
              <div className="font-semibold text-slate-800">बुझिलिनेको दस्तखत</div>
              <div className="text-[10px] text-slate-500">Received By / Customer Signature</div>
            </div>
          </div>

          {/* IRD Software Footer Note */}
          <div className="text-center text-[10px] text-slate-400 pt-6 mt-4 border-t">
            <p>
              Hisab Pro — IRD Approved Electronic Billing Software | Software Reg: {org.irdSoftwareCode || 'HISABPRO-2081'}
            </p>
            <p className="mt-0.5">
              यो विद्युतीय बीजक आन्तरिक राजस्व विभागको विद्युतीय बीजक सम्बन्धी कार्यविधि, २०७४ अनुसार जारी गरिएको हो ।
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
