'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const NEPAL_PROVINCES = [
  'Province 1', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim',
]

const PARTY_TYPES = [
  { value: 'customer', label: 'Customer', nepali: '\u0917\u094D\u0930\u093E\u0939\u0915' },
  { value: 'supplier', label: 'Supplier', nepali: '\u0906\u092A\u0942\u0930\u094D\u0924\u093F\u0915\u0930\u094D\u0924\u093E' },
  { value: 'both', label: 'Both (Customer & Supplier)', nepali: '\u0926\u0941\u0935\u0948' },
  { value: 'employee', label: 'Employee', nepali: '\u0915\u0930\u094D\u092E\u091A\u093E\u0930\u0940' },
]

const TDS_CATEGORIES = [
  { value: 'contract', label: 'Contract (1.5%)', rate: 1.5 },
  { value: 'rent', label: 'Rent (15%)', rate: 15 },
  { value: 'interest', label: 'Interest (15%)', rate: 15 },
  { value: 'commission', label: 'Commission (15%)', rate: 15 },
  { value: 'consultancy', label: 'Consultancy (15%)', rate: 15 },
  { value: 'transport', label: 'Transport (1.5%)', rate: 1.5 },
  { value: 'others', label: 'Others (15%)', rate: 15 },
]

export function PartyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('edit')
  const isEdit = !!editId
  const { currentOrgId } = useAppStore()
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(isEdit)

  // Basic fields
  const [name, setName] = useState('')
  const [nameNepali, setNameNepali] = useState('')
  const [panNumber, setPanNumber] = useState('')
  const [partyType, setPartyType] = useState('customer')

  // Contact fields
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [creditLimit, setCreditLimit] = useState('')

  // Opening balance
  const [openingBalance, setOpeningBalance] = useState('')
  const [balanceType, setBalanceType] = useState('debit')

  // Bank fields
  const [bankName, setBankName] = useState('')
  const [bankAccount, setBankAccount] = useState('')

  // TDS / SSF
  const [isTdsApplicable, setIsTdsApplicable] = useState(false)
  const [tdsCategory, setTdsCategory] = useState('others')
  const [tdsRate, setTdsRate] = useState(15)
  const [isSsfApplicable, setIsSsfApplicable] = useState(false)

  // Notes
  const [notes, setNotes] = useState('')

  // Load party data for editing
  useEffect(() => {
    if (!editId || !currentOrgId) return
    const loadParty = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/parties?orgId=${currentOrgId}`)
        if (res.ok) {
          const parties = await res.json()
          const party = parties.find((p: Party) => p.id === editId)
          if (party) {
            setName(party.name || '')
            setNameNepali(party.nameNepali || '')
            setPanNumber(party.panNumber || '')
            setPartyType(party.partyType || 'customer')
            setEmail(party.email || '')
            setPhone(party.phone || '')
            setAddress(party.address || '')
            setCity(party.city || '')
            setProvince(party.province || '')
            setContactPerson(party.contactPerson || '')
            setCreditLimit(party.creditLimit?.toString() || '')
            setOpeningBalance(party.openingBalance?.toString() || '')
            setBalanceType(party.balanceType || 'debit')
            setBankName(party.bankName || '')
            setBankAccount(party.bankAccount || '')
            setIsTdsApplicable(party.isTdsApplicable || false)
            setTdsCategory(party.tdsCategory || 'others')
            setTdsRate(party.tdsRate || 15)
            setIsSsfApplicable(party.isSSFAplicable || false)
            setNotes(party.notes || '')
          } else {
            toast.error('Party not found')
            router.push('/parties')
          }
        }
      } catch {
        toast.error('Failed to load party data')
      } finally {
        setLoading(false)
      }
    }
    loadParty()
  }, [editId, currentOrgId, router])

  // Auto-set TDS rate when category changes
  const handleTdsCategoryChange = (category: string) => {
    setTdsCategory(category)
    const found = TDS_CATEGORIES.find((c) => c.value === category)
    if (found) setTdsRate(found.rate)
  }

  const handleSubmit = async () => {
    if (!currentOrgId) return
    if (!name.trim()) {
      toast.error('Party name is required')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        orgId: currentOrgId,
        name: name.trim(),
        nameNepali: nameNepali.trim() || null,
        panNumber: panNumber.trim() || null,
        partyType,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        province: province || null,
        contactPerson: contactPerson.trim() || null,
        creditLimit: creditLimit ? parseFloat(creditLimit) : null,
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
        balanceType: balanceType || null,
        bankName: bankName.trim() || null,
        bankAccount: bankAccount.trim() || null,
        isTdsApplicable,
        tdsCategory: isTdsApplicable ? tdsCategory : null,
        tdsRate: isTdsApplicable ? tdsRate : null,
        isSSFAplicable: isSsfApplicable,
        notes: notes.trim() || null,
      }

      if (isEdit && editId) {
        // Update existing party
        const res = await fetch('/api/parties', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editId, ...payload }),
        })
        if (res.ok) {
          toast.success('Party updated successfully')
          router.push('/parties')
        } else {
          const data = await res.json()
          toast.error(data.error || 'Failed to update party')
        }
      } else {
        // Create new party
        const res = await fetch('/api/parties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          toast.success('Party created successfully')
          router.push('/parties')
        } else {
          const data = await res.json()
          toast.error(data.error || 'Failed to create party')
        }
      }
    } catch {
      toast.error(isEdit ? 'Failed to update party' : 'Failed to create party')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/parties')}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit ? 'Edit Party' : 'Add New Party'}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEdit ? 'Update party information' : 'Create a customer, supplier, or employee contact'}
          </p>
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
                placeholder="Party name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameNepali">Name (Nepali)</Label>
              <Input
                id="nameNepali"
                value={nameNepali}
                onChange={(e) => setNameNepali(e.target.value)}
                placeholder="\u0928\u093E\u092E"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
                placeholder="e.g. 301234567"
              />
              <p className="text-xs text-muted-foreground">
                Required for Nepal VAT compliance
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Party Type</Label>
              <Select value={partyType} onValueChange={setPartyType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARTY_TYPES.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label} ({pt.nepali})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="openingBalance">Opening Balance (NPR)</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Balance Type</Label>
                <Select value={balanceType} onValueChange={setBalanceType}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (Receivable)</SelectItem>
                    <SelectItem value="credit">Credit (Payable)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Contact Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+977-9800000000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kathmandu"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {NEPAL_PROVINCES.map((prov) => (
                    <SelectItem key={prov} value={prov}>
                      {prov}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input
                id="contactPerson"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="Primary contact name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="creditLimit">Credit Limit (NPR)</Label>
              <Input
                id="creditLimit"
                type="number"
                min="0"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Banking Details */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Banking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. Nabil Bank"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bankAccount">Bank Account Number</Label>
              <Input
                id="bankAccount"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="Account number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TDS & SSF */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Tax & Compliance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* TDS */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="isTdsApplicable"
                checked={isTdsApplicable}
                onCheckedChange={setIsTdsApplicable}
              />
              <Label htmlFor="isTdsApplicable" className="cursor-pointer">
                TDS Applicable (Tax Deducted at Source)
              </Label>
            </div>
            {isTdsApplicable && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-2 border-l-2 border-muted">
                <div className="space-y-1.5">
                  <Label>TDS Category</Label>
                  <Select value={tdsCategory} onValueChange={handleTdsCategoryChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TDS_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tdsRate">TDS Rate (%)</Label>
                  <Input
                    id="tdsRate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tdsRate}
                    onChange={(e) => setTdsRate(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SSF */}
          <div className="flex items-center gap-3">
            <Switch
              id="isSsfApplicable"
              checked={isSsfApplicable}
              onCheckedChange={setIsSsfApplicable}
            />
            <Label htmlFor="isSsfApplicable" className="cursor-pointer">
              SSF Applicable (Social Security Fund)
            </Label>
          </div>
          {isSsfApplicable && (
            <div className="pl-2 border-l-2 border-muted text-sm text-muted-foreground">
              Employee contribution: 20% | Employer contribution: 11% | Total: 31%
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes about this party..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" onClick={() => router.push('/parties')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={submitting} className="min-w-[140px]">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Update Party' : 'Create Party'
          )}
        </Button>
      </div>
    </div>
  )
}

interface Party {
  id: string
  name: string
  nameNepali: string | null
  panNumber: string | null
  partyType: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  province: string | null
  contactPerson: string | null
  creditLimit: number | null
  openingBalance: number
  balanceType: string | null
  currentBalance: number
  isTdsApplicable: boolean
  tdsCategory: string | null
  tdsRate: number | null
  isSSFAplicable: boolean
  bankName: string | null
  bankAccount: string | null
  notes: string | null
}
