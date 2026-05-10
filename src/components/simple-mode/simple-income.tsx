'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { calculateVAT, formatNPR, NEPAL_VAT_RATE } from '@/lib/nepal-accounting'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  TrendingUp,
  Banknote,
  Building2,
  CreditCard,
  ChevronDown,
  Check,
  Loader2,
  Receipt,
} from 'lucide-react'

// ─── Account code mappings ───────────────────────────────────────────
const INCOME_CATEGORY_MAP: Record<string, string> = {
  'Sales': '41001',
  'Service Income': '42001',
  'Interest Income': '43001',
  'Rent Received': '43001',
  'Other Income': '43001',
}

const PAYMENT_ACCOUNT_MAP: Record<string, string> = {
  'Cash': '11001',
  'Bank': '11002',
  'Credit': '12001',
}

const OUTPUT_VAT_CODE = '22003'

const INCOME_CATEGORIES = [
  { value: 'Sales', label: 'Sales', labelNp: 'बिक्री', icon: '📦' },
  { value: 'Service Income', label: 'Service Income', labelNp: 'सेवा आम्दानी', icon: '🛎️' },
  { value: 'Interest Income', label: 'Interest Income', labelNp: 'ब्याज आम्दानी', icon: '🏦' },
  { value: 'Rent Received', label: 'Rent Received', labelNp: 'भाडा प्राप्त', icon: '🏠' },
  { value: 'Other Income', label: 'Other Income', labelNp: 'अन्य आम्दानी', icon: '📋' },
]

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', labelNp: 'नगद', icon: Banknote, color: 'text-emerald-600' },
  { value: 'Bank', label: 'Bank', labelNp: 'बैंक', icon: Building2, color: 'text-blue-600' },
  { value: 'Credit', label: 'Credit', labelNp: 'क्रेडिट', icon: CreditCard, color: 'text-orange-600' },
]

// ─── Types ────────────────────────────────────────────────────────────
interface AccountItem {
  id: string
  code: string
  name: string
  nameNepali?: string | null
  accountType: string
  subType?: string | null
}

interface PartyItem {
  id: string
  name: string
  nameNepali?: string | null
  partyType: string
  phone?: string | null
}

// ─── Component ────────────────────────────────────────────────────────
export function SimpleIncome() {
  const { currentOrgId, setActiveModule } = useAppStore()

  // Form state
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [partyId, setPartyId] = useState('')
  const [partyName, setPartyName] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [vatInclusive, setVatInclusive] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [submitting, setSubmitting] = useState(false)

  // Data state
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [parties, setParties] = useState<PartyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false)

  // Build code-to-id map
  const accountMap = useCallback(() => {
    const map: Record<string, string> = {}
    for (const acc of accounts) {
      map[acc.code] = acc.id
    }
    return map
  }, [accounts])

  // Fetch accounts and parties on mount
  useEffect(() => {
    if (!currentOrgId) return

    const fetchData = async () => {
      setLoading(true)
      try {
        const [accRes, partyRes] = await Promise.all([
          fetch(`/api/accounts?orgId=${currentOrgId}`),
          fetch(`/api/parties?orgId=${currentOrgId}`),
        ])

        if (accRes.ok) {
          const accData = await accRes.json()
          setAccounts(Array.isArray(accData) ? accData : [])
        }
        if (partyRes.ok) {
          const partyData = await partyRes.json()
          setParties(Array.isArray(partyData) ? partyData : [])
        }
      } catch (err) {
        console.error('Failed to fetch data:', err)
        toast.error('Failed to load form data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [currentOrgId])

  // VAT calculation
  const parsedAmount = parseFloat(amount) || 0
  const vatInfo = vatInclusive && parsedAmount > 0
    ? calculateVAT(parsedAmount / (1 + NEPAL_VAT_RATE))
    : null
  const taxableAmount = vatInfo ? vatInfo.taxableAmount : parsedAmount
  const vatAmount = vatInfo ? vatInfo.vatAmount : 0

  // Validation
  const isValid = parsedAmount > 0 && description.trim() !== '' && category !== '' && date !== ''

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid || !currentOrgId) return

    setSubmitting(true)

    try {
      const codeMap = accountMap()

      // Resolve account IDs from codes
      const paymentAccountId = codeMap[PAYMENT_ACCOUNT_MAP[paymentMethod]]
      const incomeAccountCode = INCOME_CATEGORY_MAP[category] || '43001'
      const incomeAccountId = codeMap[incomeAccountCode]
      const outputVatAccountId = codeMap[OUTPUT_VAT_CODE]

      if (!paymentAccountId) {
        toast.error(`Payment account not found (${PAYMENT_ACCOUNT_MAP[paymentMethod]}). Please check your Chart of Accounts.`)
        setSubmitting(false)
        return
      }
      if (!incomeAccountId) {
        toast.error(`Income account not found (${incomeAccountCode}). Please check your Chart of Accounts.`)
        setSubmitting(false)
        return
      }

      // Build journal entry lines
      const lines: Array<{ accountId: string; debit: number; credit: number; partyId?: string; narration?: string }> = []

      // Debit: Payment account (Cash/Bank/Receivable)
      lines.push({
        accountId: paymentAccountId,
        debit: parsedAmount,
        credit: 0,
        partyId: partyId || undefined,
      })

      // Credit: Income account
      lines.push({
        accountId: incomeAccountId,
        debit: 0,
        credit: Math.round(taxableAmount * 100) / 100,
        narration: `${category} - ${description}`,
      })

      // Credit: Output VAT (if VAT inclusive)
      if (vatInclusive && vatAmount > 0 && outputVatAccountId) {
        lines.push({
          accountId: outputVatAccountId,
          debit: 0,
          credit: Math.round(vatAmount * 100) / 100,
          narration: 'Output VAT 13%',
        })
      }

      // If VAT inclusive but no output VAT account found, adjust income credit to full amount
      if (vatInclusive && vatAmount > 0 && !outputVatAccountId) {
        // Override: credit full amount to income account
        lines[1].credit = parsedAmount
      }

      const narration = `Income: ${description} (${category}) via ${paymentMethod}${vatInclusive ? ' (VAT Inclusive)' : ''}`

      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          date,
          narration,
          voucherType: 'receipt',
          lines,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create entry')
      }

      toast.success('Income recorded successfully!', {
        description: `${formatNPR(parsedAmount)} added to ${category}`,
      })

      // Reset form
      setAmount('')
      setDescription('')
      setCategory('')
      setPartyId('')
      setPartyName('')
      setDate(new Date().toISOString().split('T')[0])
      setVatInclusive(false)
      setPaymentMethod('Cash')

      // Navigate to dashboard
      setActiveModule('dashboard')
    } catch (err) {
      console.error('Submit error:', err)
      toast.error('Failed to record income', {
        description: err instanceof Error ? err.message : 'Please try again',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <TrendingUp className="h-6 w-6 text-emerald-600" />
          </div>
          <CardTitle className="text-2xl">Add Income</CardTitle>
          <CardDescription className="text-base">आम्दानी थप्नुहोस्</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-semibold">
                Amount (NPR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                  Rs.
                </span>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 h-14 text-2xl font-semibold border-2 focus:border-emerald-500"
                  required
                />
              </div>
              {vatInclusive && parsedAmount > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Taxable Amount:</span>
                    <span className="font-medium">{formatNPR(taxableAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT (13%):</span>
                    <span className="font-medium text-orange-600">{formatNPR(vatAmount)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold">{formatNPR(parsedAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="e.g. Sold 10 bags of rice"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none min-h-[80px]"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select income category" />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                        <span className="text-muted-foreground text-xs">({cat.labelNp})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Party / Customer */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Party / Customer
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={partyPopoverOpen}
                    className="w-full h-11 justify-between font-normal"
                  >
                    {partyName || 'Search customer...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value="none"
                          onSelect={() => {
                            setPartyId('')
                            setPartyName('')
                            setPartyPopoverOpen(false)
                          }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${!partyId ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="text-muted-foreground">None</span>
                        </CommandItem>
                        {parties
                          .filter((p) => p.partyType === 'customer' || p.partyType === 'both')
                          .map((party) => (
                            <CommandItem
                              key={party.id}
                              value={party.name}
                              onSelect={() => {
                                setPartyId(party.id)
                                setPartyName(party.name)
                                setPartyPopoverOpen(false)
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${partyId === party.id ? 'opacity-100' : 'opacity-0'}`} />
                              <div className="flex flex-col">
                                <span>{party.name}</span>
                                {party.phone && (
                                  <span className="text-xs text-muted-foreground">{party.phone}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-semibold">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11"
              />
            </div>

            {/* VAT Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-orange-500" />
                  Is this VAT inclusive?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turn on if the amount includes 13% VAT
                </p>
              </div>
              <Switch
                checked={vatInclusive}
                onCheckedChange={setVatInclusive}
                aria-label="VAT inclusive toggle"
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon
                  const isSelected = paymentMethod === method.value
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`
                        relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all
                        hover:border-primary/50 hover:bg-accent/50
                        ${isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <Icon className={`h-6 w-6 ${isSelected ? method.color : 'text-muted-foreground'}`} />
                      <span className="text-sm font-medium">{method.label}</span>
                      <span className="text-[10px] text-muted-foreground">{method.labelNp}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full h-12 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Record Income
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
