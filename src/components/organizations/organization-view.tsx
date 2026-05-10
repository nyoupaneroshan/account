'use client'

import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Building2, Save, Loader2, Calendar, Lock } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// ============================================================
// Nepal Provinces
// ============================================================
const PROVINCES = [
  { value: 'province1', label: 'Province 1 (प्रदेश १)' },
  { value: 'madhesh', label: 'Madhesh Province (मधेश प्रदेश)' },
  { value: 'bagmati', label: 'Bagmati Province (बागमती प्रदेश)' },
  { value: 'gandaki', label: 'Gandaki Province (गण्डकी प्रदेश)' },
  { value: 'lumbini', label: 'Lumbini Province (लुम्बिनी प्रदेश)' },
  { value: 'karnali', label: 'Karnali Province (कर्णाली प्रदेश)' },
  { value: 'sudurpashchim', label: 'Sudurpashchim Province (सुदूरपश्चिम प्रदेश)' },
]

const INDUSTRIES = [
  { value: 'trading', label: 'Trading (व्यापार)' },
  { value: 'manufacturing', label: 'Manufacturing (उत्पादन)' },
  { value: 'service', label: 'Service (सेवा)' },
  { value: 'construction', label: 'Construction (निर्माण)' },
  { value: 'it', label: 'IT & Technology (आईटी)' },
  { value: 'education', label: 'Education (शिक्षा)' },
  { value: 'healthcare', label: 'Healthcare (स्वास्थ्य)' },
  { value: 'hospitality', label: 'Hospitality (आतिथ्य)' },
  { value: 'ngo', label: 'NGO/INGO' },
  { value: 'other', label: 'Other (अन्य)' },
]

// ============================================================
// Types
// ============================================================
interface OrgData {
  id: string
  name: string
  nameNepali: string | null
  panNumber: string | null
  address: string | null
  city: string | null
  province: string | null
  phone: string | null
  email: string | null
  vatEnabled: boolean
  vatNumber: string | null
  tdsEnabled: boolean
  ssfEnabled: boolean
  industry: string | null
  fiscalYear: string | null
  mode: string
}

interface FiscalYearData {
  id: string
  name: string
  startDate: string
  endDate: string
  isCurrent: boolean
  isLocked: boolean
}

// ============================================================
// Main Component
// ============================================================
export function OrganizationView() {
  const { currentOrgId, currentOrgName, currentFiscalYear, setCurrentOrg } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fiscalYears, setFiscalYears] = useState<FiscalYearData[]>([])

  const [formData, setFormData] = useState({
    name: '',
    nameNepali: '',
    panNumber: '',
    address: '',
    city: '',
    province: '',
    phone: '',
    email: '',
    vatEnabled: false,
    vatNumber: '',
    tdsEnabled: false,
    ssfEnabled: false,
    industry: '',
  })

  const fetchOrg = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/seed`)
      if (res.ok) {
        const orgs = await res.json()
        const org = Array.isArray(orgs) ? orgs.find((o: { id: string }) => o.id === currentOrgId) : null
        if (org) {
          setFormData({
            name: org.name || '',
            nameNepali: org.nameNepali || '',
            panNumber: org.panNumber || '',
            address: org.address || '',
            city: org.city || '',
            province: org.province || '',
            phone: org.phone || '',
            email: org.email || '',
            vatEnabled: org.vatEnabled || false,
            vatNumber: org.vatNumber || '',
            tdsEnabled: org.tdsEnabled || false,
            ssfEnabled: org.ssfEnabled || false,
            industry: org.industry || '',
          })
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  const fetchFiscalYears = useCallback(async () => {
    // Display FY from store since there's no dedicated FY list API
    setFiscalYears([
      {
        id: 'fy-current',
        name: currentFiscalYear,
        startDate: '2024-07-16',
        endDate: '2025-07-15',
        isCurrent: true,
        isLocked: false,
      },
    ])
  }, [currentFiscalYear])

  useEffect(() => {
    fetchOrg()
    fetchFiscalYears()
  }, [fetchOrg, fetchFiscalYears])

  const updateField = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!currentOrgId) return
    setSaving(true)
    try {
      const res = await fetch('/api/seed', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentOrgId,
          ...formData,
          nameNepali: formData.nameNepali || null,
          panNumber: formData.panNumber || null,
          address: formData.address || null,
          city: formData.city || null,
          province: formData.province || null,
          phone: formData.phone || null,
          email: formData.email || null,
          vatNumber: formData.vatNumber || null,
          industry: formData.industry || null,
        }),
      })

      if (!res.ok) throw new Error('Failed to update organization')

      setCurrentOrg(currentOrgId, formData.name)
      toast.success('Organization updated successfully')
    } catch {
      toast.error('Failed to update organization')
    } finally {
      setSaving(false)
    }
  }

  const handleLockFY = () => {
    toast.success(`Fiscal Year ${currentFiscalYear} has been locked`)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
        <div className="h-96 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-sm text-muted-foreground">संस्था सेटिङ — {currentOrgName}</p>
        </div>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Organization Details</CardTitle>
          <CardDescription>Basic information about your business</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Name *</Label>
              <Input
                id="orgName"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgNameNepali">Name (Nepali)</Label>
              <Input
                id="orgNameNepali"
                value={formData.nameNepali}
                onChange={(e) => updateField('nameNepali', e.target.value)}
                placeholder="नेपाली नाम"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgPan">PAN Number</Label>
              <Input
                id="orgPan"
                value={formData.panNumber}
                onChange={(e) => updateField('panNumber', e.target.value)}
                placeholder="e.g. 301234567"
              />
              <p className="text-[10px] text-muted-foreground">For IRD compliance / आयकर विभाग अनुपालन</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgIndustry">Industry Type</Label>
              <Select value={formData.industry} onValueChange={(v) => updateField('industry', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>{ind.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgAddress">Address</Label>
            <Input
              id="orgAddress"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgCity">City</Label>
              <Input
                id="orgCity"
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="e.g. Kathmandu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgProvince">Province</Label>
              <Select value={formData.province} onValueChange={(v) => updateField('province', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgPhone">Phone</Label>
              <Input
                id="orgPhone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="e.g. 01-4123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgEmail">Email</Label>
              <Input
                id="orgEmail"
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="info@business.com"
              />
            </div>
          </div>

          {/* Logo placeholder */}
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Building2 className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-[9px]">Upload</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Logo upload coming soon</p>
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Tax Settings / कर सेटिङ</CardTitle>
          <CardDescription>Configure VAT, TDS, and SSF for your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">VAT Enabled</p>
              <p className="text-xs text-muted-foreground">भ्याट सक्षम — Enable VAT on invoices and purchases</p>
            </div>
            <Switch checked={formData.vatEnabled} onCheckedChange={(v) => updateField('vatEnabled', v)} />
          </div>

          {formData.vatEnabled && (
            <div className="pl-2 border-l-2 border-primary/20">
              <div className="space-y-2">
                <Label htmlFor="vatNumber">VAT Number / पन</Label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber}
                  onChange={(e) => updateField('vatNumber', e.target.value)}
                  placeholder="e.g. 301234567"
                />
              </div>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">TDS Enabled</p>
              <p className="text-xs text-muted-foreground">टीडीएस सक्षम — Tax Deducted at Source</p>
            </div>
            <Switch checked={formData.tdsEnabled} onCheckedChange={(v) => updateField('tdsEnabled', v)} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SSF Enabled</p>
              <p className="text-xs text-muted-foreground">एसएसएफ सक्षम — Social Security Fund</p>
            </div>
            <Switch checked={formData.ssfEnabled} onCheckedChange={(v) => updateField('ssfEnabled', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Year Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Fiscal Year Management / आर्थिक वर्ष व्यवस्थापन</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {fiscalYears.map((fy) => (
              <div key={fy.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3">
                <div>
                  <p className="font-semibold">{fy.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(fy.startDate).toLocaleDateString()} — {new Date(fy.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {fy.isCurrent && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Current</Badge>}
                  {fy.isLocked && <Badge variant="secondary" className="text-xs">Locked</Badge>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleLockFY}>
              <Lock className="h-3.5 w-3.5 mr-2" />
              Lock Current FY
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
