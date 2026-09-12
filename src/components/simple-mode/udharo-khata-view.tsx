'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { authFetch } from '@/lib/session'
import { BsDatePicker } from '@/components/shared/bs-date-picker'
import { numberToNepaliWords, toNepaliDigits, adToBs } from '@/lib/bikram-sambat'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  Search,
  PlusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  User,
  Building2,
  Banknote,
  Smartphone,
  CreditCard,
  QrCode,
  Loader2,
  RefreshCw,
  Plus,
  Filter,
} from 'lucide-react'

interface Party {
  id: string
  name: string
  nameNepali?: string | null
  partyType: string
  phone?: string | null
  panNumber?: string | null
  currentBalance: number
  address?: string | null
}

interface Account {
  id: string
  code: string
  name: string
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'नगद (Cash)', icon: Banknote, color: 'text-emerald-400' },
  { value: 'Fonepay', label: 'फोनपे (Fonepay QR)', icon: QrCode, color: 'text-red-400' },
  { value: 'eSewa', label: 'ईसेवा (eSewa)', icon: Smartphone, color: 'text-green-400' },
  { value: 'Khalti', label: 'खल्ती (Khalti)', icon: CreditCard, color: 'text-purple-400' },
  { value: 'Bank', label: 'बैंक / चेक (Bank/Cheque)', icon: Building2, color: 'text-blue-400' },
]

export function UdharoKhataView() {
  const { currentOrgId } = useAppStore()

  const [parties, setParties] = useState<Party[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterBalanceOnly, setFilterBalanceOnly] = useState(false)
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer')

  // Transaction Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'receive' | 'give_credit' | 'pay' | 'add_supplier_due'>('receive')
  const [selectedParty, setSelectedParty] = useState<Party | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // New Party Quick Create Dialog
  const [newPartyOpen, setNewPartyOpen] = useState(false)
  const [newPartyName, setNewPartyName] = useState('')
  const [newPartyPhone, setNewPartyPhone] = useState('')
  const [newPartyPan, setNewPartyPan] = useState('')
  const [newPartyType, setNewPartyType] = useState<'customer' | 'supplier'>('customer')
  const [creatingParty, setCreatingParty] = useState(false)

  const fetchData = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const [partyRes, accRes] = await Promise.all([
        authFetch(`/api/parties?orgId=${currentOrgId}`),
        authFetch(`/api/accounts?orgId=${currentOrgId}`),
      ])

      if (partyRes.ok) {
        const pData = await partyRes.json()
        setParties(Array.isArray(pData) ? pData : [])
      }
      if (accRes.ok) {
        const aData = await accRes.json()
        setAccounts(Array.isArray(aData) ? aData : [])
      }
    } catch (err) {
      toast.error('विवरण लोड गर्न सकिएन / Failed to load khata data')
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Map of account code -> account id
  const codeToIdMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of accounts) {
      map[a.code] = a.id
    }
    return map
  }, [accounts])

  // Summary calculations
  const customerParties = useMemo(() => {
    return parties.filter((p) => p.partyType === 'customer' || p.partyType === 'both')
  }, [parties])

  const supplierParties = useMemo(() => {
    return parties.filter((p) => p.partyType === 'supplier' || p.partyType === 'both')
  }, [parties])

  const totalReceivables = useMemo(() => {
    return customerParties.reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0)
  }, [customerParties])

  const totalPayables = useMemo(() => {
    return supplierParties.reduce((sum, p) => sum + Math.max(0, p.currentBalance), 0)
  }, [supplierParties])

  const netBalance = totalReceivables - totalPayables

  // Filtered lists
  const currentList = activeTab === 'customer' ? customerParties : supplierParties

  const displayedParties = useMemo(() => {
    return currentList.filter((p) => {
      const matchSearch =
        search === '' ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.nameNepali && p.nameNepali.includes(search)) ||
        (p.phone && p.phone.includes(search)) ||
        (p.panNumber && p.panNumber.includes(search))

      const matchBalance = !filterBalanceOnly || p.currentBalance > 0
      return matchSearch && matchBalance
    })
  }, [currentList, search, filterBalanceOnly])

  // Open Transaction Dialog
  const handleOpenDialog = (
    party: Party,
    type: 'receive' | 'give_credit' | 'pay' | 'add_supplier_due'
  ) => {
    setSelectedParty(party)
    setDialogType(type)
    setAmount('')
    setNotes('')
    setPaymentMethod('Cash')
    setDate(new Date().toISOString().split('T')[0])
    setDialogOpen(true)
  }

  const parsedAmount = parseFloat(amount) || 0

  // Submit Transaction
  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedParty || !currentOrgId || parsedAmount <= 0) return

    setSubmitting(true)
    try {
      const cashAccountId = codeToIdMap['11001']
      const bankAccountId = codeToIdMap['11002']
      const receivableAccountId = codeToIdMap['12001'] || codeToIdMap['11003']
      const payableAccountId = codeToIdMap['21001']
      const salesAccountId = codeToIdMap['41001']
      const purchaseAccountId = codeToIdMap['51001']

      const paymentAccId = paymentMethod === 'Cash' ? cashAccountId : bankAccountId

      if (!paymentAccId) {
        toast.error('भुक्तानी खाता भेटिएन / Payment account not found in Chart of Accounts')
        setSubmitting(false)
        return
      }

      let lines: Array<{ accountId: string; debit: number; credit: number; partyId?: string; narration?: string }> = []
      let narrationText = ''
      let voucherType = 'journal'

      const bsFormatted = adToBs(date).formattedBs

      if (dialogType === 'receive') {
        // Customer paid money: Debit Cash/Bank, Credit Accounts Receivable (Party)
        if (!receivableAccountId) {
          toast.error('Accounts Receivable (12001) not found')
          setSubmitting(false)
          return
        }
        voucherType = 'receipt'
        narrationText = `रकम प्राप्त: ${selectedParty.name} बाट ${paymentMethod} मार्फत [मिति: ${bsFormatted}] ${notes}`
        lines = [
          { accountId: paymentAccId, debit: parsedAmount, credit: 0 },
          { accountId: receivableAccountId, debit: 0, credit: parsedAmount, partyId: selectedParty.id },
        ]
      } else if (dialogType === 'give_credit') {
        // Customer given goods on credit: Debit Accounts Receivable (Party), Credit Sales
        if (!receivableAccountId || !salesAccountId) {
          toast.error('Accounts Receivable or Sales Account not found')
          setSubmitting(false)
          return
        }
        voucherType = 'sales'
        narrationText = `उधारो बिक्री: ${selectedParty.name} लाई [मिति: ${bsFormatted}] ${notes}`
        lines = [
          { accountId: receivableAccountId, debit: parsedAmount, credit: 0, partyId: selectedParty.id },
          { accountId: salesAccountId, debit: 0, credit: parsedAmount },
        ]
      } else if (dialogType === 'pay') {
        // Paid to Supplier: Debit Accounts Payable (Party), Credit Cash/Bank
        if (!payableAccountId) {
          toast.error('Accounts Payable (21001) not found')
          setSubmitting(false)
          return
        }
        voucherType = 'payment'
        narrationText = `रकम भुक्तानी: ${selectedParty.name} लाई ${paymentMethod} मार्फत [मिति: ${bsFormatted}] ${notes}`
        lines = [
          { accountId: payableAccountId, debit: parsedAmount, credit: 0, partyId: selectedParty.id },
          { accountId: paymentAccId, debit: 0, credit: parsedAmount },
        ]
      } else if (dialogType === 'add_supplier_due') {
        // Received goods from Supplier on credit: Debit Purchases, Credit Accounts Payable (Party)
        if (!purchaseAccountId || !payableAccountId) {
          toast.error('Purchases or Accounts Payable Account not found')
          setSubmitting(false)
          return
        }
        voucherType = 'purchase'
        narrationText = `उधारो खरिद: ${selectedParty.name} बाट [मिति: ${bsFormatted}] ${notes}`
        lines = [
          { accountId: purchaseAccountId, debit: parsedAmount, credit: 0 },
          { accountId: payableAccountId, debit: 0, credit: parsedAmount, partyId: selectedParty.id },
        ]
      }

      const res = await authFetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          date,
          narration: narrationText,
          voucherType,
          lines,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to record entry')
      }

      toast.success('खाता प्रविष्टि सफलतापूर्वक रेकर्ड भयो! / Recorded successfully!')
      setDialogOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'त्रुटि भयो / Failed to record')
    } finally {
      setSubmitting(false)
    }
  }

  // Create Quick Party
  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPartyName.trim() || !currentOrgId) return

    setCreatingParty(true)
    try {
      const res = await authFetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          name: newPartyName.trim(),
          partyType: newPartyType,
          phone: newPartyPhone.trim() || undefined,
          panNumber: newPartyPan.trim() || undefined,
          openingBalance: 0,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create party')
      }

      toast.success('नयाँ पक्ष खाता थपियो! / Party added successfully')
      setNewPartyOpen(false)
      setNewPartyName('')
      setNewPartyPhone('')
      setNewPartyPan('')
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create party')
    } finally {
      setCreatingParty(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 flex items-center gap-2">
                उधारो खाता <span className="text-sm font-normal text-zinc-400">(Khata / Credit Ledger)</span>
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                ग्राहकबाट लिन बाँकी र साहुलाई तिर्न बाँकी रकमको सरल हिसाब
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setNewPartyType(activeTab)
              setNewPartyOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium h-9 text-xs sm:text-sm gap-1.5 shadow-lg shadow-emerald-900/20"
          >
            <Plus className="h-4 w-4" />
            नयाँ ग्राहक / सप्लायर थप्नुहोस्
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchData}
            className="h-9 w-9 border-white/[0.08] hover:bg-white/5 text-zinc-400 hover:text-zinc-100"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Customer Receivables */}
        <Card className="bg-[#11141c] border-emerald-500/20 shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-400/80">
                ग्राहकबाट लिन बाँकी (Receivables)
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
                {formatNPR(totalReceivables)}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {toNepaliDigits(customerParties.filter((p) => p.currentBalance > 0).length)} जना ग्राहकबाट
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Supplier Payables */}
        <Card className="bg-[#11141c] border-red-500/20 shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-red-400/80">
                साहुलाई तिर्न बाँकी (Payables)
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-red-400 mt-1">
                {formatNPR(totalPayables)}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {toNepaliDigits(supplierParties.filter((p) => p.currentBalance > 0).length)} जना साहुलाई
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Net Outstanding */}
        <Card className="bg-[#11141c] border-white/[0.08] shadow-md">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400">
                खुद बाँकि (Net Balance)
              </p>
              <h3
                className={cn(
                  'text-xl sm:text-2xl font-bold mt-1',
                  netBalance >= 0 ? 'text-emerald-400' : 'text-amber-400'
                )}
              >
                {formatNPR(netBalance)}
              </h3>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {netBalance >= 0 ? 'कुल फाइदा / लिनु बढी' : 'तिर्नु बढी'}
              </p>
            </div>
            <div className="h-10 w-10 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-300">
              <Building2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Khata Section with Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as 'customer' | 'supplier')}
        className="w-full space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <TabsList className="bg-white/[0.04] border border-white/[0.08] p-1 h-10">
            <TabsTrigger
              value="customer"
              className="text-xs sm:text-sm data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium"
            >
              ग्राहक खाता (Customer Dues)
              <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-white/10 text-zinc-200">
                {toNepaliDigits(customerParties.length)}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="supplier"
              className="text-xs sm:text-sm data-[state=active]:bg-red-600 data-[state=active]:text-white font-medium"
            >
              साहु / सप्लायर खाता (Suppliers)
              <Badge className="ml-2 text-[10px] px-1.5 py-0 bg-white/10 text-zinc-200">
                {toNepaliDigits(supplierParties.length)}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Search & Filter */}
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="नाम, फोन, PAN खोज्नुहोस्..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs bg-white/[0.03] border-white/[0.08] text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
            <Button
              variant={filterBalanceOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterBalanceOnly(!filterBalanceOnly)}
              className={cn(
                'h-9 text-xs gap-1.5 shrink-0 border-white/[0.08]',
                filterBalanceOnly
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-100'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              बाँकी मात्र
            </Button>
          </div>
        </div>

        {/* Khata Party List */}
        <TabsContent value={activeTab} className="mt-0 space-y-3">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mx-auto" />
              <p className="text-xs text-zinc-500 mt-2">विवरण लोड हुँदैछ...</p>
            </div>
          ) : displayedParties.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
              <User className="h-10 w-10 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-medium">कुनै खाता भेटिएन</p>
              <p className="text-xs text-zinc-600 mt-1">
                {search ? 'खोजिएको नामसँग मिल्ने कुनै पक्ष छैन।' : 'नयाँ पक्ष थपेर कारोबार सुरु गर्नुहोस्।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {displayedParties.map((party) => {
                const hasDue = party.currentBalance > 0
                return (
                  <Card
                    key={party.id}
                    className="bg-[#11141c] border-white/[0.06] hover:border-white/[0.12] transition-colors overflow-hidden"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-100 truncate">
                            {party.name}
                            {party.nameNepali && (
                              <span className="text-xs text-zinc-400 ml-1 font-normal">
                                ({party.nameNepali})
                              </span>
                            )}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-zinc-500">
                            {party.phone && (
                              <a
                                href={`tel:${party.phone}`}
                                className="flex items-center gap-1 text-emerald-400/80 hover:text-emerald-300"
                              >
                                <Phone className="h-3 w-3" />
                                {party.phone}
                              </a>
                            )}
                            {party.panNumber && (
                              <span>PAN: {party.panNumber}</span>
                            )}
                          </div>
                        </div>

                        {/* Balance Badge */}
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                            {activeTab === 'customer' ? 'लिन बाँकी' : 'तिर्न बाँकी'}
                          </p>
                          <p
                            className={cn(
                              'text-base font-bold',
                              hasDue
                                ? activeTab === 'customer'
                                  ? 'text-emerald-400'
                                  : 'text-red-400'
                                : 'text-zinc-500'
                            )}
                          >
                            {formatNPR(party.currentBalance)}
                          </p>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                        {activeTab === 'customer' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenDialog(party, 'receive')}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 gap-1"
                            >
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                              रकम लियो (Receive)
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(party, 'give_credit')}
                              className="flex-1 border-white/[0.1] hover:bg-white/5 text-zinc-300 text-xs h-8 gap-1"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              उधारो दियो (Give Credit)
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleOpenDialog(party, 'pay')}
                              className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs h-8 gap-1"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              रकम तिर्यो (Pay)
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(party, 'add_supplier_due')}
                              className="flex-1 border-white/[0.1] hover:bg-white/5 text-zinc-300 text-xs h-8 gap-1"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                              सामान उधारो लियो
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Transaction Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#131722] border-white/[0.1] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              {dialogType === 'receive' && <span className="text-emerald-400">ग्राहकबाट रकम प्राप्त (Receive Payment)</span>}
              {dialogType === 'give_credit' && <span className="text-amber-400">उधारो सामान दियो (Give Credit)</span>}
              {dialogType === 'pay' && <span className="text-red-400">साहुलाई रकम भुक्तानी (Pay Supplier)</span>}
              {dialogType === 'add_supplier_due' && <span className="text-amber-400">साहुबाट उधारो सामान खरिद</span>}
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              पक्ष: <strong className="text-zinc-200">{selectedParty?.name}</strong>
              {selectedParty && (
                <span className="ml-2">
                  (हालको बाँकी: <strong className="text-emerald-400">{formatNPR(selectedParty.currentBalance)}</strong>)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTransaction} className="space-y-4 pt-2">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">
                रकम (Amount - NPR) <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">
                  रु.
                </span>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 h-11 text-lg font-bold bg-white/[0.04] border-white/[0.1] text-zinc-100 focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>

              {parsedAmount > 0 && (
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between">
                  <span className="text-zinc-400 text-[11px]">अक्षरमा:</span>
                  <span className="font-semibold text-emerald-400 text-[11px]">
                    {numberToNepaliWords(parsedAmount)}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method (for Receive & Pay) */}
            {(dialogType === 'receive' || dialogType === 'pay') && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-zinc-300">
                  भुक्तानी माध्यम (Payment Method)
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon
                    const isSel = paymentMethod === m.value
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={cn(
                          'p-2 rounded-lg border text-left flex flex-col items-center gap-1 transition-all',
                          isSel
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                            : 'bg-white/[0.02] border-white/[0.08] text-zinc-400 hover:bg-white/[0.05]'
                        )}
                      >
                        <Icon className={cn('h-4 w-4', isSel ? m.color : 'text-zinc-500')} />
                        <span className="text-[11px] font-medium text-center leading-tight">
                          {m.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Date */}
            <BsDatePicker
              value={date}
              onChange={(ad) => setDate(ad)}
              label="कारोबार मिति (Transaction Date - BS / वि.सं.)"
            />

            {/* Notes / Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-zinc-300">
                कैफियत / विवरण (Note / Item details)
              </Label>
              <Input
                placeholder="उदा. सामानको भुक्तानी वा बिल नं."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs bg-white/[0.04] border-white/[0.1] text-zinc-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialogOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-100"
              >
                रद्द गर्नुहोस् (Cancel)
              </Button>
              <Button
                type="submit"
                disabled={submitting || parsedAmount <= 0}
                className={cn(
                  'text-xs font-semibold',
                  dialogType === 'receive' || dialogType === 'give_credit'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                )}
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                प्रविष्टि सेभ गर्नुहोस् (Save Entry)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create New Party Modal */}
      <Dialog open={newPartyOpen} onOpenChange={setNewPartyOpen}>
        <DialogContent className="bg-[#131722] border-white/[0.1] text-zinc-100 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-zinc-100">
              नयाँ पक्ष थप्नुहोस् (Add New Party)
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              नयाँ ग्राहक वा साहुको विवरण प्रविष्ट गर्नुहोस्
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateParty} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">पक्षको प्रकार (Type)</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={newPartyType === 'customer' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewPartyType('customer')}
                  className={cn(
                    'flex-1 text-xs h-8',
                    newPartyType === 'customer' && 'bg-emerald-600 text-white'
                  )}
                >
                  ग्राहक (Customer)
                </Button>
                <Button
                  type="button"
                  variant={newPartyType === 'supplier' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewPartyType('supplier')}
                  className={cn(
                    'flex-1 text-xs h-8',
                    newPartyType === 'supplier' && 'bg-red-600 text-white'
                  )}
                >
                  साहु / सप्लायर (Supplier)
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">
                नाम (Name) <span className="text-red-400">*</span>
              </Label>
              <Input
                required
                placeholder="उदा. राम बहादुर थापा वा ABC स्टोर"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                className="h-9 text-xs bg-white/[0.04] border-white/[0.1] text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">सम्पर्क फोन (Phone Number)</Label>
              <Input
                placeholder="उदा. 9801234567"
                value={newPartyPhone}
                onChange={(e) => setNewPartyPhone(e.target.value)}
                className="h-9 text-xs bg-white/[0.04] border-white/[0.1] text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">स्थायी लेखा नम्बर (PAN Number)</Label>
              <Input
                placeholder="९ अंकको प्यान (वैकल्पिक)"
                maxLength={9}
                value={newPartyPan}
                onChange={(e) => setNewPartyPan(e.target.value)}
                className="h-9 text-xs bg-white/[0.04] border-white/[0.1] text-zinc-100"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setNewPartyOpen(false)}
                className="text-xs text-zinc-400 hover:text-zinc-100"
              >
                रद्द
              </Button>
              <Button
                type="submit"
                disabled={creatingParty || !newPartyName.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                {creatingParty && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                थप्नुहोस् (Save Party)
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
