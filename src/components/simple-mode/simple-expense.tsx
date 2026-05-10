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
  TrendingDown,
  Banknote,
  Building2,
  CreditCard,
  ChevronDown,
  Check,
  Loader2,
  Receipt,
} from 'lucide-react'

// ─── Account code mappings ───────────────────────────────────────────
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  'Purchase': '51001',
  'Salary': '52001',
  'Rent': '52002',
  'Utilities': '52003',
  'Office Supplies': '52004',
  'Transport': '52005',
  'Food & Entertainment': '52001',
  'Other Expense': '52001',
}

const PAYMENT_ACCOUNT_MAP: Record<string, string> = {
  'Cash': '11001',
  'Bank': '11002',
  'Credit': '21001',
}

const INPUT_VAT_CODE = '22002'

const EXPENSE_CATEGORIES = [
  { value: 'Purchase', label: 'Purchase', labelNp: 'खरिद', icon: '🛒' },
  { value: 'Salary', label: 'Salary', labelNp: 'तलब', icon: '💰' },
  { value: 'Rent', label: 'Rent', labelNp: 'भाडा', icon: '🏠' },
  { value: 'Utilities', label: 'Utilities', labelNp: 'उपयोगिता', icon: '💡' },
  { value: 'Office Supplies', label: 'Office Supplies', labelNp: 'कार्यालय सामग्री', icon: '📎' },
  { value: 'Transport', label: 'Transport', labelNp: 'यातायात', icon: '🚗' },
  { value: 'Food & Entertainment', label: 'Food & Entertainment', labelNp: 'खाना & मनोरञ्जन', icon: '🍽️' },
  { value: 'Other Expense', label: 'Other Expense', labelNp: 'अन्य खर्च', icon: '📋' },
]

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', labelNp: 'नगद', icon: Banknote, color: 'text-emerald-600' },
  { value: 'Bank', label: 'Bank', labelNp: 'बैंक', icon: Building2, color: 'text-blue-600' },
  { value: 'Credit', label: 'Credit (from supplier)', labelNp: 'क्रेडिट', icon: CreditCard, color: 'text-orange-600' },
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
export function SimpleExpense() {
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
      const paymentAccountCode = PAYMENT_ACCOUNT_MAP[paymentMethod]
      const paymentAccountId = codeMap[paymentAccountCode]
      const expenseAccountCode = EXPENSE_CATEGORY_MAP[category] || '52001'
      const expenseAccountId = codeMap[expenseAccountCode]
      const inputVatAccountId = codeMap[INPUT_VAT_CODE]

      if (!paymentAccountId) {
        toast.error(`Payment account not found (${paymentAccountCode}). Please check your Chart of Accounts.`)
        setSubmitting(false)
        return
      }
      if (!expenseAccountId) {
        toast.error(`Expense account not found (${expenseAccountCode}). Please check your Chart of Accounts.`)
        setSubmitting(false)
        return
      }

      // Build journal entry lines
      const lines: Array<{ accountId: string; debit: number; credit: number; partyId?: string; narration?: string }> = []

      // Debit: Expense account
      lines.push({
        accountId: expenseAccountId,
        debit: Math.round(taxableAmount * 100) / 100,
        credit: 0,
        narration: `${category} - ${description}`,
      })

      // Debit: Input VAT (if VAT inclusive)
      if (vatInclusive && vatAmount > 0 && inputVatAccountId) {
        lines.push({
          accountId: inputVatAccountId,
          debit: Math.round(vatAmount * 100) / 100,
          credit: 0,
          narration: 'Input VAT 13%',
        })
      }

      // If VAT inclusive but no Input VAT account, debit full amount to expense
      if (vatInclusive && vatAmount > 0 && !inputVatAccountId) {
        lines[0].debit = parsedAmount
      }

      // Credit: Payment account (Cash/Bank/Payable)
      lines.push({
        accountId: paymentAccountId,
        debit: 0,
        credit: parsedAmount,
        partyId: partyId || undefined,
      })

      const narration = `Expense: ${description} (${category}) via ${paymentMethod}${vatInclusive ? ' (VAT Inclusive)' : ''}`

      const res = await fetch('/api/journal-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: currentOrgId,
          date,
          narration,
          voucherType: 'payment',
          lines,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to create entry')
      }

      toast.success('Expense recorded successfully!', {
        description: `${formatNPR(parsedAmount)} recorded as ${category}`,
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
      toast.error('Failed to record expense', {
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
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <TrendingDown className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Add Expense</CardTitle>
          <CardDescription className="text-base">खर्च थप्नुहोस्</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="expense-amount" className="text-sm font-semibold">
                Amount (NPR) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                  Rs.
                </span>
                <Input
                  id="expense-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-12 h-14 text-2xl font-semibold border-2 focus:border-red-500"
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
              <Label htmlFor="expense-description" className="text-sm font-semibold">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="expense-description"
                placeholder="e.g. Paid electricity bill"
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
                  <SelectValue placeholder="Select expense category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
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

            {/* Party / Supplier */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Party / Supplier
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
                    {partyName || 'Search supplier...'}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name..." />
                    <CommandList>
                      <CommandEmpty>No supplier found.</CommandEmpty>
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
                          .filter((p) => p.partyType === 'supplier' || p.partyType === 'both')
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
              <Label htmlFor="expense-date" className="text-sm font-semibold">Date</Label>
              <Input
                id="expense-date"
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
                      <span className="text-sm font-medium">{method.value}</span>
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
              className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Recording...
                </>
              ) : (
                <>
                  <TrendingDown className="mr-2 h-5 w-5" />
                  Record Expense
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
