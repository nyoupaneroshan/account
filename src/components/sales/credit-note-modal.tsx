'use client'

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
import { Printer, RotateCcw, CheckCircle2, FileText, ShieldCheck } from 'lucide-react'
import { formatNPR } from '@/lib/nepal-accounting'
import { adToBs, toNepaliDigits, numberToNepaliWords, numberToEnglishWords } from '@/lib/bikram-sambat'

export interface CreditNoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditNote: any
  organization: any
}

export function CreditNoteModal({
  open,
  onOpenChange,
  creditNote,
  organization,
}: CreditNoteModalProps) {
  if (!creditNote) return null

  const org = organization || creditNote.organization || {}
  const bsDate = creditNote.dateBS
    ? { formattedBs: toNepaliDigits(creditNote.dateBS.replace(/-/g, '/')), str: creditNote.dateBS }
    : adToBs(creditNote.date)

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:m-0 print:max-w-none print:max-h-none print:shadow-none print:border-none">
        {/* Action Header - Hidden during print */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b print:hidden">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-5 text-amber-600" />
            <div>
              <DialogTitle className="text-base font-semibold">
                Official Credit Note Preview
              </DialogTitle>
              <DialogDescription className="text-xs">
                अनुसूची ७ बमोजिमको क्रेडिट नोट (Schedule 7 Credit Note)
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {creditNote.syncStatus === 'synced' && (
              <Badge className="bg-emerald-600 text-white gap-1 text-xs">
                <CheckCircle2 className="size-3.5" /> CBMS Synced
              </Badge>
            )}
            <Button onClick={handlePrint} size="sm" className="gap-1.5 text-xs">
              <Printer className="size-3.5" />
              Print Credit Note
            </Button>
          </div>
        </div>

        {/* Printable Credit Note */}
        <div className="bg-white text-black p-4 sm:p-6 rounded-lg border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 font-sans text-xs sm:text-sm">
          {/* Statutory Title */}
          <div className="text-center pb-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-wider text-slate-900">
              क्रेडिट नोट
            </h1>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest">
              CREDIT NOTE
            </p>
            <p className="text-[10px] text-slate-500">
              (मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम १७ को उपनियम (१) सँग सम्बन्धित - अनुसूची ७)
            </p>
          </div>

          {/* Organization Header */}
          <div className="text-center border-b pb-3 mb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {org.nameNepali || org.name || 'Hisab Pro Enterprise'}
            </h2>
            <p className="text-xs text-slate-600">
              {[org.address, org.city, org.province].filter(Boolean).join(', ')}
            </p>
            <div className="mt-1 inline-block border border-slate-900 px-3 py-0.5 rounded font-mono font-bold text-xs">
              स्थायी लेखा नं (PAN): {org.panNumber || '100000000'}
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 pb-3 border-b text-xs">
            {/* Left: Customer */}
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">खरिदकर्ताको विवरण (Customer Details):</div>
              <div className="flex">
                <span className="w-24 text-slate-500">नाम (Name):</span>
                <span className="font-semibold text-slate-800">{creditNote.partyName}</span>
              </div>
              <div className="flex items-center">
                <span className="w-24 text-slate-500">पान नं (PAN):</span>
                <span className="font-mono font-bold text-slate-800">
                  {creditNote.partyPan || 'अदर्ता / Unregistered'}
                </span>
              </div>
              <div className="flex pt-1">
                <span className="w-24 text-slate-500 font-semibold text-amber-700">फिर्ताको कारण:</span>
                <span className="font-medium text-slate-800">{creditNote.reason}</span>
              </div>
            </div>

            {/* Right: Credit Note Meta */}
            <div className="space-y-1 pl-4 border-l">
              <div className="flex">
                <span className="w-28 text-slate-500">क्रेडिट नोट नं:</span>
                <span className="font-mono font-bold text-slate-900">{creditNote.creditNoteNumber}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">सम्बन्धित बीजक नं:</span>
                <span className="font-mono font-bold text-primary">{creditNote.originalInvoiceNo}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">आर्थिक वर्ष (FY):</span>
                <span className="font-semibold text-slate-800">{creditNote.fiscalYear}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">मिति (Date BS):</span>
                <span className="font-semibold text-slate-900">{bsDate.formattedBs}</span>
              </div>
              <div className="flex">
                <span className="w-28 text-slate-500">ई.सं. (Date AD):</span>
                <span className="text-slate-600">{new Date(creditNote.date).toISOString().split('T')[0]}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3">
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-semibold border-b border-slate-300">
                  <th className="border border-slate-300 p-1.5 text-center w-10">क्र.सं.</th>
                  <th className="border border-slate-300 p-1.5 text-left">विवरण (Description)</th>
                  <th className="border border-slate-300 p-1.5 text-right w-16">परिमाण</th>
                  <th className="border border-slate-300 p-1.5 text-center w-12">इकाइ</th>
                  <th className="border border-slate-300 p-1.5 text-right w-20">दर (Rate)</th>
                  <th className="border border-slate-300 p-1.5 text-right w-24">करयोग्य फिर्ता</th>
                  <th className="border border-slate-300 p-1.5 text-right w-20">भ्याट (१३%)</th>
                  <th className="border border-slate-300 p-1.5 text-right w-24">जम्मा रकम</th>
                </tr>
              </thead>
              <tbody>
                {creditNote.lines && creditNote.lines.map((line: any, idx: number) => (
                  <tr key={line.id || idx} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                    <td className="border border-slate-300 p-1.5 text-left font-medium">{line.description}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{line.quantity}</td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-600">{line.unit || 'pcs'}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{Number(line.unitPrice).toFixed(2)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-medium">{Number(line.taxableAmount).toFixed(2)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-slate-600">{Number(line.vatAmount).toFixed(2)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-semibold">{Number(line.totalAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Words */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t text-xs">
            <div>
              <span className="font-semibold text-slate-800">अक्षरेपी (Amount in Words):</span>
              <p className="font-medium text-slate-900 mt-0.5 italic">
                {numberToNepaliWords(creditNote.totalAmount)}
              </p>
              <p className="text-[11px] text-slate-600 italic">
                ({numberToEnglishWords(creditNote.totalAmount)})
              </p>
            </div>

            <div className="space-y-1 bg-slate-50 p-2.5 rounded border">
              <div className="flex justify-between">
                <span className="text-slate-600">करयोग्य फिर्ता रकम (Taxable Credit):</span>
                <span className="font-mono font-semibold">{formatNPR(creditNote.taxableAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">मूल्य अभिवृद्धि कर १३% (VAT Credit):</span>
                <span className="font-mono font-semibold">{formatNPR(creditNote.vatAmount)}</span>
              </div>
              <Separator className="my-1" />
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>कुल क्रेडिट रकम (Total Credit):</span>
                <span className="font-mono text-amber-800">{formatNPR(creditNote.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-10 mt-6 border-t text-xs">
            <div className="text-center">
              <div className="border-t border-dashed border-slate-400 w-40 mx-auto mb-1"></div>
              <div className="font-semibold text-slate-800">जारी गर्नेको दस्तखत</div>
              <div className="text-[10px] text-slate-500">Issued By</div>
            </div>
            <div className="text-center">
              <div className="border-t border-dashed border-slate-400 w-40 mx-auto mb-1"></div>
              <div className="font-semibold text-slate-800">बुझिलिनेको दस्तखत</div>
              <div className="text-[10px] text-slate-500">Received By</div>
            </div>
          </div>

          <div className="text-center text-[10px] text-slate-400 pt-4 mt-4 border-t">
            Hisab Pro — IRD Approved Electronic Billing System | अनुसूची ७ अनुसार जारी गरिएको क्रेडिट नोट
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
