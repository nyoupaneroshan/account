'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Printer, Download, RefreshCw, FileText, Calendar, ShieldCheck, ArrowRight, BookOpen,
} from 'lucide-react'
import { authFetch } from '@/lib/session'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function IrdRegistersView() {
  const { currentOrgId, currentOrgName, currentFiscalYear } = useAppStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('annex5')
  const [fiscalYear, setFiscalYear] = useState(currentFiscalYear || '2081/82')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const fetchRegisters = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        orgId: currentOrgId,
        register: 'all',
      })
      if (fiscalYear && fiscalYear !== 'all') params.set('fiscalYear', fiscalYear)
      if (fromDate) params.set('fromDate', fromDate)
      if (toDate) params.set('toDate', toDate)

      const res = await authFetch(`/api/reports/ird?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        toast.error('Failed to load IRD registers')
      }
    } catch {
      toast.error('Network error loading IRD registers')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId, fiscalYear, fromDate, toDate])

  useEffect(() => {
    fetchRegisters()
  }, [fetchRegisters])

  const handlePrint = () => {
    window.print()
  }

  // Export CSV Helper
  const exportCsv = (annexKey: string) => {
    if (!data) return
    let rows: any[] = []
    let filename = `IRD_${annexKey}_${fiscalYear.replace(/\//g, '-')}.csv`

    if (annexKey === 'annex5' && data.annex5?.rows) {
      const headers = ['Date BS', 'Date AD', 'Invoice No', 'Buyer Name', 'Buyer PAN', 'Total Sales', 'Exempt Sales', 'Taxable Sales', 'VAT 13%', 'Sync Status']
      const content = data.annex5.rows.map((r: any) => [
        `"${r.dateBS}"`, `"${r.dateAD}"`, `"${r.invoiceNumber}"`, `"${r.buyerName.replace(/"/g, '""')}"`,
        `"${r.buyerPan}"`, r.totalAmount, r.exemptAmount, r.taxableAmount, r.vatAmount, `"${r.syncStatus || ''}"`,
      ])
      rows = [headers, ...content]
    } else if (annexKey === 'annex6' && data.annex6?.rows) {
      const headers = ['Date BS', 'Date AD', 'Bill No', 'Supplier Bill No', 'Supplier Name', 'Supplier PAN', 'Total Amount', 'Exempt', 'Taxable', 'VAT 13%', 'Capital', 'Import']
      const content = data.annex6.rows.map((r: any) => [
        `"${r.dateBS}"`, `"${r.dateAD}"`, `"${r.billNumber}"`, `"${r.supplierBillNo}"`,
        `"${r.supplierName.replace(/"/g, '""')}"`, `"${r.supplierPan}"`, r.totalAmount, r.exemptAmount,
        r.taxableAmount, r.vatAmount, r.capitalAmount, r.isImport ? 'Yes' : 'No',
      ])
      rows = [headers, ...content]
    } else if (annexKey === 'annex7' && data.annex7?.rows) {
      const headers = ['Date BS', 'Date AD', 'Credit Note No', 'Original Invoice', 'Buyer Name', 'Buyer PAN', 'Reason', 'Taxable Return', 'VAT Reversed', 'Total Return']
      const content = data.annex7.rows.map((r: any) => [
        `"${r.dateBS}"`, `"${r.dateAD}"`, `"${r.creditNoteNumber}"`, `"${r.originalInvoiceNo}"`,
        `"${r.buyerName.replace(/"/g, '""')}"`, `"${r.buyerPan}"`, `"${r.reason.replace(/"/g, '""')}"`,
        r.taxableAmount, r.vatAmount, r.totalAmount,
      ])
      rows = [headers, ...content]
    } else if (annexKey === 'annex8' && data.annex8?.rows) {
      const headers = ['Date BS', 'Date AD', 'Debit Note No', 'Original Bill', 'Supplier Name', 'Supplier PAN', 'Reason', 'Taxable Return', 'VAT 13%', 'Total Return']
      const content = data.annex8.rows.map((r: any) => [
        `"${r.dateBS}"`, `"${r.dateAD}"`, `"${r.debitNoteNumber}"`, `"${r.originalBillNo}"`,
        `"${r.supplierName.replace(/"/g, '""')}"`, `"${r.supplierPan}"`, `"${r.reason.replace(/"/g, '""')}"`,
        r.taxableAmount, r.vatAmount, r.totalAmount,
      ])
      rows = [headers, ...content]
    }

    if (rows.length === 0) {
      toast.error('No rows to export')
      return
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${filename}`)
  }

  const org = data?.organization

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Statutory Tax Registers (कर खाताहरू)</h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
              <ShieldCheck className="size-3 mr-1" />
              Nepal VAT Rules 2053
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Official Inland Revenue Department (IRD) Sales, Purchase, Credit/Debit Notes, and Monthly VAT Returns (Maskewari)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(activeTab)}>
            <Download className="size-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="size-4 mr-1" />
            Print Register (प्रिन्ट)
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold">Fiscal Year (आ.व.):</Label>
              <Select value={fiscalYear} onValueChange={setFiscalYear}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Fiscal Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  <SelectItem value="2081/82">2081/82</SelectItem>
                  <SelectItem value="2080/81">2080/81</SelectItem>
                  <SelectItem value="2079/80">2079/80</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold">From (AD):</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold">To (AD):</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>

            {(fromDate || toDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={() => {
                  setFromDate('')
                  setToDate('')
                }}
              >
                Clear Dates
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 ml-auto"
              onClick={fetchRegisters}
              disabled={loading}
            >
              <RefreshCw className={cn('size-3.5 mr-1', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Official Government Register Printable Header */}
      <div className="hidden print:block text-center border-b pb-3 mb-4 space-y-1">
        <h2 className="text-lg font-bold">{org?.nameNepali || org?.name || currentOrgName}</h2>
        <p className="text-xs text-muted-foreground">{org?.address || 'Nepal'}</p>
        <div className="flex justify-center gap-6 text-xs font-semibold mt-1">
          <span>स्थायी लेखा नम्बर (PAN): {org?.panNumber || '-'}</span>
          <span>आर्थिक वर्ष: {fiscalYear}</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 h-auto p-1 bg-muted/60 print:hidden">
          <TabsTrigger value="annex5" className="text-xs py-2">
            अनुसूची ५: बिक्री खाता
          </TabsTrigger>
          <TabsTrigger value="annex6" className="text-xs py-2">
            अनुसूची ६: खरिद खाता
          </TabsTrigger>
          <TabsTrigger value="annex7" className="text-xs py-2">
            अनुसूची ७: बिक्री फिर्ता
          </TabsTrigger>
          <TabsTrigger value="annex8" className="text-xs py-2">
            अनुसूची ८: खरिद फिर्ता
          </TabsTrigger>
          <TabsTrigger value="annex10" className="text-xs py-2">
            अनुसूची १०: कर विवरण (मास्केवारी)
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: Annex 5 (Sales Book) ─────────────────────────── */}
        <TabsContent value="annex5" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">अनुसूची ५: बिक्री खाता (Sales Book)</CardTitle>
                  <CardDescription className="text-xs">
                    नियम २३ को उपनियम (१) को खण्ड (झ) सँग सम्बन्धित
                  </CardDescription>
                </div>
                {data?.annex5 && (
                  <div className="text-xs font-mono bg-muted/50 px-3 py-1.5 rounded flex items-center gap-3">
                    <span>Invoices: <strong>{data.annex5.summary.activeCount}</strong></span>
                    <span>Taxable: <strong>{formatNPR(data.annex5.summary.totalTaxable)}</strong></span>
                    <span>VAT 13%: <strong>{formatNPR(data.annex5.summary.totalVat)}</strong></span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !data?.annex5?.rows || data.annex5.rows.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <BookOpen className="size-10 mx-auto mb-2 opacity-30" />
                  <p>बिक्री खातामा कुनै रेकर्ड भेटिएन (No sales records found)</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold">मिति (Date BS)</TableHead>
                        <TableHead className="font-semibold">बीजक नं. (Invoice #)</TableHead>
                        <TableHead className="font-semibold">खरिदकर्ताको नाम (Buyer Name)</TableHead>
                        <TableHead className="font-semibold">स्थायी लेखा नं. (PAN)</TableHead>
                        <TableHead className="text-right font-semibold">जम्मा बिक्री (Total)</TableHead>
                        <TableHead className="text-right font-semibold">कर छुट (Exempt)</TableHead>
                        <TableHead className="text-right font-semibold">करयोग्य बिक्री (Taxable)</TableHead>
                        <TableHead className="text-right font-semibold">कर (VAT 13%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.annex5.rows.map((r: any) => (
                        <TableRow
                          key={r.id}
                          className={cn(r.isCancelled && 'opacity-50 line-through bg-muted/20')}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {r.dateBS} <span className="text-[10px] text-muted-foreground">({r.dateAD})</span>
                          </TableCell>
                          <TableCell className="font-mono font-medium">{r.invoiceNumber}</TableCell>
                          <TableCell>{r.buyerName}</TableCell>
                          <TableCell className="font-mono">{r.buyerPan}</TableCell>
                          <TableCell className="text-right font-medium">{formatNPR(r.totalAmount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNPR(r.exemptAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatNPR(r.taxableAmount)}</TableCell>
                          <TableCell className="text-right font-semibold text-foreground">{formatNPR(r.vatAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow className="bg-muted/70 font-bold border-t-2">
                        <TableCell colSpan={4} className="text-right pr-4 uppercase tracking-wider">
                          जम्मा कुल (Total):
                        </TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex5.summary.totalSales)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex5.summary.totalExempt)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex5.summary.totalTaxable)}</TableCell>
                        <TableCell className="text-right text-primary">{formatNPR(data.annex5.summary.totalVat)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: Annex 6 (Purchase Book) ──────────────────────── */}
        <TabsContent value="annex6" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">अनुसूची ६: खरिद खाता (Purchase Book)</CardTitle>
                  <CardDescription className="text-xs">
                    नियम २३ को उपनियम (१) को खण्ड (ज) सँग सम्बन्धित
                  </CardDescription>
                </div>
                {data?.annex6 && (
                  <div className="text-xs font-mono bg-muted/50 px-3 py-1.5 rounded flex items-center gap-3">
                    <span>Bills: <strong>{data.annex6.summary.activeCount}</strong></span>
                    <span>Taxable: <strong>{formatNPR(data.annex6.summary.totalTaxable)}</strong></span>
                    <span>Input VAT: <strong>{formatNPR(data.annex6.summary.totalVat)}</strong></span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !data?.annex6?.rows || data.annex6.rows.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <BookOpen className="size-10 mx-auto mb-2 opacity-30" />
                  <p>खरिद खातामा कुनै रेकर्ड भेटिएन (No purchase records found)</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold">मिति (Date BS)</TableHead>
                        <TableHead className="font-semibold">बीजक नं. (Bill #)</TableHead>
                        <TableHead className="font-semibold">आपूर्तिकर्ता (Supplier)</TableHead>
                        <TableHead className="font-semibold">स्थायी लेखा नं. (PAN)</TableHead>
                        <TableHead className="text-right font-semibold">जम्मा खरिद (Total)</TableHead>
                        <TableHead className="text-right font-semibold">कर छुट (Exempt)</TableHead>
                        <TableHead className="text-right font-semibold">करयोग्य (Taxable)</TableHead>
                        <TableHead className="text-right font-semibold">कर (VAT 13%)</TableHead>
                        <TableHead className="text-right font-semibold">पुँजीगत (Capital)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.annex6.rows.map((r: any) => (
                        <TableRow
                          key={r.id}
                          className={cn(r.isCancelled && 'opacity-50 line-through bg-muted/20')}
                        >
                          <TableCell className="font-medium whitespace-nowrap">
                            {r.dateBS} <span className="text-[10px] text-muted-foreground">({r.dateAD})</span>
                          </TableCell>
                          <TableCell className="font-mono">
                            <div>{r.billNumber}</div>
                            {r.supplierBillNo !== r.billNumber && (
                              <div className="text-[10px] text-muted-foreground">Ref: {r.supplierBillNo}</div>
                            )}
                          </TableCell>
                          <TableCell>{r.supplierName}</TableCell>
                          <TableCell className="font-mono">{r.supplierPan}</TableCell>
                          <TableCell className="text-right font-medium">{formatNPR(r.totalAmount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNPR(r.exemptAmount)}</TableCell>
                          <TableCell className="text-right font-medium">{formatNPR(r.taxableAmount)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatNPR(r.vatAmount)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatNPR(r.capitalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow className="bg-muted/70 font-bold border-t-2">
                        <TableCell colSpan={4} className="text-right pr-4 uppercase tracking-wider">
                          जम्मा कुल (Total):
                        </TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex6.summary.totalPurchase)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex6.summary.totalExempt)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex6.summary.totalTaxable)}</TableCell>
                        <TableCell className="text-right text-primary">{formatNPR(data.annex6.summary.totalVat)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex6.summary.totalCapital)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 3: Annex 7 (Sales Return / Credit Notes) ─────────── */}
        <TabsContent value="annex7" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">अनुसूची ७: बिक्री फिर्ता खाता (Sales Return Register)</CardTitle>
                  <CardDescription className="text-xs">
                    नियम २३ को उपनियम (१) को खण्ड (ञ) सँग सम्बन्धित क्रेडिट नोट विवरण
                  </CardDescription>
                </div>
                {data?.annex7 && (
                  <div className="text-xs font-mono bg-muted/50 px-3 py-1.5 rounded flex items-center gap-3">
                    <span>Credit Notes: <strong>{data.annex7.summary.count}</strong></span>
                    <span>VAT Reversed: <strong>{formatNPR(data.annex7.summary.totalVatReturn)}</strong></span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !data?.annex7?.rows || data.annex7.rows.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <BookOpen className="size-10 mx-auto mb-2 opacity-30" />
                  <p>कुनै बिक्री फिर्ता (Credit Notes) रेकर्ड गरिएको छैन</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold">मिति (Date BS)</TableHead>
                        <TableHead className="font-semibold">क्रेडिट नोट नं. (CN #)</TableHead>
                        <TableHead className="font-semibold">सम्बन्धित बीजक (Original Inv)</TableHead>
                        <TableHead className="font-semibold">ग्राहक (Customer)</TableHead>
                        <TableHead className="font-semibold">PAN</TableHead>
                        <TableHead className="font-semibold">कारण (Reason)</TableHead>
                        <TableHead className="text-right font-semibold">करयोग्य फिर्ता (Taxable)</TableHead>
                        <TableHead className="text-right font-semibold">कर फिर्ता (VAT 13%)</TableHead>
                        <TableHead className="text-right font-semibold">जम्मा फिर्ता (Total)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.annex7.rows.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium whitespace-nowrap">{r.dateBS}</TableCell>
                          <TableCell className="font-mono font-medium text-blue-600">{r.creditNoteNumber}</TableCell>
                          <TableCell className="font-mono">{r.originalInvoiceNo}</TableCell>
                          <TableCell>{r.buyerName}</TableCell>
                          <TableCell className="font-mono">{r.buyerPan}</TableCell>
                          <TableCell className="max-w-[180px] truncate" title={r.reason}>{r.reason}</TableCell>
                          <TableCell className="text-right">{formatNPR(r.taxableAmount)}</TableCell>
                          <TableCell className="text-right font-semibold text-rose-600">-{formatNPR(r.vatAmount)}</TableCell>
                          <TableCell className="text-right font-bold">{formatNPR(r.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow className="bg-muted/70 font-bold border-t-2">
                        <TableCell colSpan={6} className="text-right pr-4 uppercase tracking-wider">
                          जम्मा कुल फिर्ता:
                        </TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex7.summary.totalTaxableReturn)}</TableCell>
                        <TableCell className="text-right text-rose-600">-{formatNPR(data.annex7.summary.totalVatReturn)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex7.summary.totalReturn)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: Annex 8 (Purchase Return / Debit Notes) ────────── */}
        <TabsContent value="annex8" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">अनुसूची ८: खरिद फिर्ता खाता (Purchase Return Register)</CardTitle>
                  <CardDescription className="text-xs">
                    नियम २३ को उपनियम (१) को खण्ड (ट) सँग सम्बन्धित डेबिट नोट विवरण
                  </CardDescription>
                </div>
                {data?.annex8 && (
                  <div className="text-xs font-mono bg-muted/50 px-3 py-1.5 rounded flex items-center gap-3">
                    <span>Debit Notes: <strong>{data.annex8.summary.count}</strong></span>
                    <span>VAT Adjusted: <strong>{formatNPR(data.annex8.summary.totalVatReturn)}</strong></span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : !data?.annex8?.rows || data.annex8.rows.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <BookOpen className="size-10 mx-auto mb-2 opacity-30" />
                  <p>कुनै खरिद फिर्ता (Debit Notes) रेकर्ड गरिएको छैन</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-xs">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="font-semibold">मिति (Date BS)</TableHead>
                        <TableHead className="font-semibold">डेबिट नोट नं. (DN #)</TableHead>
                        <TableHead className="font-semibold">सम्बन्धित बिल (Bill #)</TableHead>
                        <TableHead className="font-semibold">आपूर्तिकर्ता (Supplier)</TableHead>
                        <TableHead className="font-semibold">PAN</TableHead>
                        <TableHead className="font-semibold">कारण (Reason)</TableHead>
                        <TableHead className="text-right font-semibold">करयोग्य (Taxable)</TableHead>
                        <TableHead className="text-right font-semibold">कर (VAT 13%)</TableHead>
                        <TableHead className="text-right font-semibold">जम्मा (Total)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.annex8.rows.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium whitespace-nowrap">{r.dateBS}</TableCell>
                          <TableCell className="font-mono font-medium">{r.debitNoteNumber}</TableCell>
                          <TableCell className="font-mono">{r.originalBillNo}</TableCell>
                          <TableCell>{r.supplierName}</TableCell>
                          <TableCell className="font-mono">{r.supplierPan}</TableCell>
                          <TableCell className="max-w-[180px] truncate">{r.reason}</TableCell>
                          <TableCell className="text-right">{formatNPR(r.taxableAmount)}</TableCell>
                          <TableCell className="text-right font-semibold text-rose-600">-{formatNPR(r.vatAmount)}</TableCell>
                          <TableCell className="text-right font-bold">{formatNPR(r.totalAmount)}</TableCell>
                        </TableRow>
                      ))}
                      {/* Summary Row */}
                      <TableRow className="bg-muted/70 font-bold border-t-2">
                        <TableCell colSpan={6} className="text-right pr-4 uppercase tracking-wider">
                          जम्मा कुल फिर्ता:
                        </TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex8.summary.totalTaxableReturn)}</TableCell>
                        <TableCell className="text-right text-rose-600">-{formatNPR(data.annex8.summary.totalVatReturn)}</TableCell>
                        <TableCell className="text-right">{formatNPR(data.annex8.summary.totalReturn)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: Annex 10 (Monthly VAT Return / Maskewari) ────── */}
        <TabsContent value="annex10" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">अनुसूची १०: मूल्य अभिवृद्धि कर विवरण (Monthly VAT Return - Maskewari)</CardTitle>
                  <CardDescription className="text-xs">
                    मूल्य अभिवृद्धि कर ऐन, २०५२ को दफा १७ तथा मूल्य अभिवृद्धि कर नियमावली, २०५३ को नियम २६ अनुसार
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 w-fit">
                  IRD Form 10 Maskewari
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              {loading || !data?.annex10 ? (
                <div className="p-6 space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tax Assessment Summary Banner */}
                  <div className={cn(
                    'p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4',
                    data.annex10.assessment.isPayable
                      ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/20'
                      : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20',
                  )}>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        कर निर्धारण नतिजा (Tax Assessment Result)
                      </p>
                      <h3 className={cn(
                        'text-2xl font-bold mt-0.5',
                        data.annex10.assessment.isPayable ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400',
                      )}>
                        {data.annex10.assessment.isPayable
                          ? `दाखिला गर्नुपर्ने कर (Net VAT Payable): ${formatNPR(data.annex10.assessment.netVatPayable)}`
                          : `अर्को महिना सार्ने कर कट्टी (Credit Carry Forward): ${formatNPR(data.annex10.assessment.excessCreditToCarryForward)}`}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Output VAT: {formatNPR(data.annex10.assessment.netOutputVat)} | Total Input Tax Credit Claimed: {formatNPR(data.annex10.assessment.totalInputTaxCredit)}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Button
                        size="sm"
                        variant={data.annex10.assessment.isPayable ? 'destructive' : 'default'}
                        onClick={handlePrint}
                      >
                        <Printer className="size-4 mr-2" />
                        Print Maskewari
                      </Button>
                    </div>
                  </div>

                  {/* Statutory Maskewari Details Table */}
                  <div className="border rounded-md overflow-hidden">
                    <Table className="text-xs">
                      <TableHeader className="bg-muted/70">
                        <TableRow>
                          <TableHead className="w-16 font-bold">क्र.सं.</TableHead>
                          <TableHead className="font-bold">विवरण (Particulars)</TableHead>
                          <TableHead className="text-right font-bold">करयोग्य रकम (Taxable Amount)</TableHead>
                          <TableHead className="text-right font-bold">कर रकम (VAT Amount)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* 1. Sales Section */}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell colSpan={4} className="text-primary font-bold">
                            १. बिक्री सम्बन्धी विवरण (Sales Particulars)
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">१.१</TableCell>
                          <TableCell>कुल बिक्री (Total Sales)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.sales.grossTotalSales)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">१.२</TableCell>
                          <TableCell>कर छुट हुने बिक्री (Tax-Exempt Sales)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.sales.exemptSales)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">१.३</TableCell>
                          <TableCell>करयोग्य बिक्री (Gross Taxable Sales)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.sales.grossTaxableSales)}</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.sales.grossOutputVat)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">१.४</TableCell>
                          <TableCell>घटाउने: बिक्री फिर्ता (Less: Sales Return / Credit Notes)</TableCell>
                          <TableCell className="text-right text-rose-600">-{formatNPR(data.annex10.sales.salesReturnTaxable)}</TableCell>
                          <TableCell className="text-right text-rose-600">-{formatNPR(data.annex10.sales.salesReturnVat)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/20 font-semibold border-b-2">
                          <TableCell className="font-mono font-bold">१.५</TableCell>
                          <TableCell className="font-bold">खुद करयोग्य बिक्री र संकलन भएको कर (Net Output VAT)</TableCell>
                          <TableCell className="text-right font-bold">{formatNPR(data.annex10.sales.netTaxableSales)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatNPR(data.annex10.sales.netOutputVat)}</TableCell>
                        </TableRow>

                        {/* 2. Purchase Section */}
                        <TableRow className="bg-muted/30 font-semibold">
                          <TableCell colSpan={4} className="text-primary font-bold">
                            २. खरिद तथा पैठारी सम्बन्धी विवरण (Purchase & Import Particulars)
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">२.१</TableCell>
                          <TableCell>कुल खरिद (Total Purchases)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.purchases.grossTotalPurchases)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">२.२</TableCell>
                          <TableCell>कर छुट हुने खरिद (Tax-Exempt Purchases)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.purchases.exemptPurchases)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">—</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">२.३</TableCell>
                          <TableCell>करयोग्य खरिद (Gross Taxable Purchases)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.purchases.grossTaxablePurchases)}</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.purchases.grossInputVat)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">२.४</TableCell>
                          <TableCell>घटाउने: खरिद फिर्ता (Less: Purchase Return / Debit Notes)</TableCell>
                          <TableCell className="text-right text-rose-600">-{formatNPR(data.annex10.purchases.purchaseReturnTaxable)}</TableCell>
                          <TableCell className="text-right text-rose-600">-{formatNPR(data.annex10.purchases.purchaseReturnVat)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-mono">२.५</TableCell>
                          <TableCell>पुँजीगत खरिद तथा कर कट्टी (Capital Goods Purchases & VAT)</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.purchases.capitalGoodsPurchases)}</TableCell>
                          <TableCell className="text-right">{formatNPR(data.annex10.purchases.capitalGoodsVat)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-muted/20 font-semibold border-b-2">
                          <TableCell className="font-mono font-bold">२.६</TableCell>
                          <TableCell className="font-bold">जम्मा कट्टी दाबी गर्न पाउने कर (Total Input Tax Credit)</TableCell>
                          <TableCell className="text-right font-bold">{formatNPR(data.annex10.purchases.netTaxablePurchases)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">{formatNPR(data.annex10.purchases.totalInputTaxCredit)}</TableCell>
                        </TableRow>

                        {/* 3. Final Tax Payable / Carry Forward */}
                        <TableRow className="bg-muted/50 font-bold text-sm">
                          <TableCell colSpan={3} className="text-right uppercase tracking-wider">
                            ३. {data.annex10.assessment.isPayable ? 'दाखिला गर्नुपर्ने खुद मूल्य अभिवृद्धि कर (Net Payable to IRD)' : 'अर्को महिना सार्ने कर कट्टी (Excess Tax Credit to Carry Forward)'}:
                          </TableCell>
                          <TableCell className={cn(
                            'text-right font-mono text-base',
                            data.annex10.assessment.isPayable ? 'text-rose-600' : 'text-emerald-600',
                          )}>
                            {formatNPR(
                              data.annex10.assessment.isPayable
                                ? data.annex10.assessment.netVatPayable
                                : data.annex10.assessment.excessCreditToCarryForward,
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
