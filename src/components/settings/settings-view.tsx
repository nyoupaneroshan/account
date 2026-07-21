'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { NEPAL_VAT_RATE, TDS_RATES, SSF_EMPLOYEE_RATE, SSF_EMPLOYER_RATE } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Settings,
  Building2,
  Sliders,
  Calculator,
  FileText,
  Globe,
  Palette,
  ShieldAlert,
  Save,
  Loader2,
  Upload,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { toast } from 'sonner'
import { authFetch } from '@/lib/session'

// ============================================================
// Constants
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

const LANGUAGES = [
  { value: 'en', label: 'English', flag: '🇬🇧' },
  { value: 'ne', label: 'नेपाली (Nepali)', flag: '🇳🇵' },
  { value: 'hi', label: 'हिन्दी (Hindi)', flag: '🇮🇳' },
]

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

// ============================================================
// Main Component
// ============================================================
export function SettingsView() {
  const {
    mode, setMode, currentOrgId, currentFiscalYear,
    language, setLanguage, currentUser,
  } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState('light')
  const initialLoadDone = useRef(false)

  // Org settings form
  const [orgForm, setOrgForm] = useState({
    name: '',
    nameNepali: '',
    pan: '',
    address: '',
    city: '',
    province: '',
    phone: '',
    email: '',
  })

  // Tax configuration
  const [taxConfig, setTaxConfig] = useState({
    vatEnabled: true,
    vatRate: `${Math.round(NEPAL_VAT_RATE * 100)}`,
    tdsEnabled: false,
    ssfEnabled: false,
    ssfEmployeeRate: `${Math.round(SSF_EMPLOYEE_RATE * 100)}`,
    ssfEmployerRate: `${Math.round(SSF_EMPLOYER_RATE * 100)}`,
  })

  // Invoice settings
  const [invoiceConfig, setInvoiceConfig] = useState({
    prefix: 'INV-',
    nextNumber: '001',
    defaultTerms: 'Payment due within 30 days.',
  })

  // Preferences
  const [preferences, setPreferences] = useState({
    language: language,
    theme: 'light',
    defaultMode: mode,
  })

  // Load org data from proper API
  useEffect(() => {
    if (!currentOrgId) return
    const loadOrg = async () => {
      setLoading(true)
      try {
        const res = await authFetch(`/api/settings?orgId=${currentOrgId}`)
        if (res.ok) {
          const data = await res.json()
          setOrgForm({
            name: data.name || '',
            nameNepali: data.nameNepali || '',
            pan: data.panNumber || '',
            address: data.address || '',
            city: data.city || '',
            province: data.province || '',
            phone: data.phone || '',
            email: data.email || '',
          })
          setTaxConfig(prev => ({
            ...prev,
            vatEnabled: data.vatEnabled ?? true,
            vatRate: data.vatRate || '13',
            tdsEnabled: data.tdsEnabled ?? false,
            ssfEnabled: data.ssfEnabled ?? false,
          }))
          setInvoiceConfig({
            prefix: data.invoicePrefix || 'INV-',
            nextNumber: data.invoiceNextNumber || '001',
            defaultTerms: data.invoiceDefaultTerms || 'Payment due within 30 days.',
          })
          if (data.mode) {
            setPreferences(prev => ({ ...prev, defaultMode: data.mode }))
          }
          if (data.language) {
            setPreferences(prev => ({ ...prev, language: data.language }))
          }
          // Mark that initial load is complete so auto-save can start
          initialLoadDone.current = true
        }
      } catch {
        toast.error('Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadOrg()
  }, [currentOrgId])

  // Sync language preference to store AND persist to user profile
  useEffect(() => {
    setLanguage(preferences.language)
    // Also persist to user language preference so it loads on next login
    if (preferences.language && currentUser?.id) {
      authFetch('/api/user/language', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: preferences.language }),
      }).catch(() => {
        // silently fail - language is already saved in org settings and Zustand
      })
    }
  }, [preferences.language, setLanguage, currentUser?.id])

  // Sync mode preference to store
  useEffect(() => {
    setMode(preferences.defaultMode as 'simple' | 'advanced')
  }, [preferences.defaultMode, setMode])

  const handleSaveOrg = async (showToast = true) => {
    if (!currentOrgId) return
    setSaving(true)
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentOrgId,
          name: orgForm.name,
          nameNepali: orgForm.nameNepali || null,
          panNumber: orgForm.pan || null,
          address: orgForm.address || null,
          city: orgForm.city || null,
          province: orgForm.province || null,
          phone: orgForm.phone || null,
          email: orgForm.email || null,
          vatEnabled: taxConfig.vatEnabled,
          vatRate: taxConfig.vatRate,
          tdsEnabled: taxConfig.tdsEnabled,
          ssfEnabled: taxConfig.ssfEnabled,
          invoicePrefix: invoiceConfig.prefix,
          invoiceNextNumber: invoiceConfig.nextNumber,
          invoiceDefaultTerms: invoiceConfig.defaultTerms,
          mode: preferences.defaultMode,
          language: preferences.language,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        if (showToast) toast.success('Settings saved successfully')
      } else {
        if (showToast) toast.error(data.error || 'Failed to save settings')
      }
    } catch {
      if (showToast) toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save settings when values change (debounced, silent)
  // Only auto-save AFTER the initial load is complete to avoid saving data we just fetched
  useEffect(() => {
    if (!currentOrgId || loading || !initialLoadDone.current) return
    const timer = setTimeout(() => {
      handleSaveOrg(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [orgForm, taxConfig, invoiceConfig, preferences])

  const handleDeleteOrg = async () => {
    toast.error('Organization deletion is disabled for safety. Contact support.')
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
        <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
        <div className="h-48 bg-muted/30 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {t('settings', language as 'en' | 'ne' | 'hi')}
          </h1>
          <p className="text-sm text-muted-foreground">सेटिङ — Configure your accounting preferences</p>
        </div>
        <Button onClick={handleSaveOrg} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('save', language as 'en' | 'ne' | 'hi')}
        </Button>
      </div>

      {/* Organization Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Organization Settings</CardTitle>
          </div>
          <CardDescription>Basic information about your business / संस्थाको विवरण</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Name *</Label>
              <Input
                id="orgName"
                value={orgForm.name}
                onChange={(e) => setOrgForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgNameNepali">Name (Nepali) / नेपाली नाम</Label>
              <Input
                id="orgNameNepali"
                value={orgForm.nameNepali}
                onChange={(e) => setOrgForm(prev => ({ ...prev, nameNepali: e.target.value }))}
                placeholder="नेपाली नाम"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgPan">PAN Number / प्यान नम्बर</Label>
              <Input
                id="orgPan"
                value={orgForm.pan}
                onChange={(e) => setOrgForm(prev => ({ ...prev, pan: e.target.value }))}
                placeholder="e.g. 301234567"
              />
              <p className="text-[10px] text-muted-foreground">For IRD compliance / आयकर विभाग अनुपालन</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgPhone">{t('phone', language as 'en' | 'ne' | 'hi')}</Label>
              <Input
                id="orgPhone"
                value={orgForm.phone}
                onChange={(e) => setOrgForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="e.g. 01-4123456"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgAddress">{t('address', language as 'en' | 'ne' | 'hi')}</Label>
            <Input
              id="orgAddress"
              value={orgForm.address}
              onChange={(e) => setOrgForm(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgCity">{t('city', language as 'en' | 'ne' | 'hi')}</Label>
              <Input
                id="orgCity"
                value={orgForm.city}
                onChange={(e) => setOrgForm(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g. Kathmandu"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgProvince">{t('province', language as 'en' | 'ne' | 'hi')}</Label>
              <Select value={orgForm.province} onValueChange={(v) => setOrgForm(prev => ({ ...prev, province: v }))}>
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
              <Label htmlFor="orgEmail">{t('email', language as 'en' | 'ne' | 'hi')}</Label>
              <Input
                id="orgEmail"
                type="email"
                value={orgForm.email}
                onChange={(e) => setOrgForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="info@business.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center text-muted-foreground">
                  <Building2 className="h-5 w-5 opacity-50" />
                </div>
                <Button variant="outline" size="sm" disabled>
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('tax_configuration', language as 'en' | 'ne' | 'hi')} / कर विन्यास</CardTitle>
          </div>
          <CardDescription>VAT, TDS, and SSF settings for Nepal compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* VAT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('vat_enabled', language as 'en' | 'ne' | 'hi')}</p>
                <p className="text-xs text-muted-foreground">भ्याट सक्षम — Nepal standard 13% VAT</p>
              </div>
              <Switch
                checked={taxConfig.vatEnabled}
                onCheckedChange={(v) => setTaxConfig(prev => ({ ...prev, vatEnabled: v }))}
              />
            </div>
            {taxConfig.vatEnabled && (
              <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">VAT Rate</Label>
                  <Select value={taxConfig.vatRate} onValueChange={(v) => setTaxConfig(prev => ({ ...prev, vatRate: v }))}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="13">13% (Standard)</SelectItem>
                      <SelectItem value="0">0% (Exempt)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* TDS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('tds_enabled', language as 'en' | 'ne' | 'hi')}</p>
                <p className="text-xs text-muted-foreground">टीडीएस सक्षम — Tax Deducted at Source</p>
              </div>
              <Switch
                checked={taxConfig.tdsEnabled}
                onCheckedChange={(v) => setTaxConfig(prev => ({ ...prev, tdsEnabled: v }))}
              />
            </div>
            {taxConfig.tdsEnabled && (
              <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Applicable TDS rates:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(TDS_RATES).map(([category, rate]) => (
                    <div key={category} className="bg-muted/30 rounded px-2 py-1.5 text-xs">
                      <span className="capitalize">{category}</span>: <span className="font-mono font-medium">{(rate * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SSF */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('ssf_enabled', language as 'en' | 'ne' | 'hi')}</p>
                <p className="text-xs text-muted-foreground">एसएसएफ सक्षम — Social Security Fund</p>
              </div>
              <Switch
                checked={taxConfig.ssfEnabled}
                onCheckedChange={(v) => setTaxConfig(prev => ({ ...prev, ssfEnabled: v }))}
              />
            </div>
            {taxConfig.ssfEnabled && (
              <div className="pl-4 border-l-2 border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Employee Rate</Label>
                  <Badge variant="outline" className="font-mono">{taxConfig.ssfEmployeeRate}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Employer Rate</Label>
                  <Badge variant="outline" className="font-mono">{taxConfig.ssfEmployerRate}%</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Total Rate</Label>
                  <Badge className="font-mono">{Number(taxConfig.ssfEmployeeRate) + Number(taxConfig.ssfEmployerRate)}%</Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Invoice Settings / इनभ्वाइस सेटिङ</CardTitle>
          </div>
          <CardDescription>Configure invoice numbering and default terms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">{t('invoice_prefix', language as 'en' | 'ne' | 'hi')}</Label>
              <Input
                id="invoicePrefix"
                value={invoiceConfig.prefix}
                onChange={(e) => setInvoiceConfig(prev => ({ ...prev, prefix: e.target.value }))}
                placeholder="INV-"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNextNumber">Next Invoice Number</Label>
              <Input
                id="invoiceNextNumber"
                value={invoiceConfig.nextNumber}
                onChange={(e) => setInvoiceConfig(prev => ({ ...prev, nextNumber: e.target.value }))}
                placeholder="001"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="defaultTerms">Default Terms & Conditions</Label>
            <Textarea
              id="defaultTerms"
              value={invoiceConfig.defaultTerms}
              onChange={(e) => setInvoiceConfig(prev => ({ ...prev, defaultTerms: e.target.value }))}
              placeholder="Payment due within 30 days..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{t('preferences', language as 'en' | 'ne' | 'hi')}</CardTitle>
          </div>
          <CardDescription>Language, theme, and default mode</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Language */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('language', language as 'en' | 'ne' | 'hi')}</p>
                <p className="text-xs text-muted-foreground">भाषा — Interface language</p>
              </div>
            </div>
            <Select
              value={preferences.language}
              onValueChange={(v) => setPreferences(prev => ({ ...prev, language: v }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.flag} {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Theme */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('theme', language as 'en' | 'ne' | 'hi')}</p>
                <p className="text-xs text-muted-foreground">विषयवस्तु — Light or dark mode</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {THEMES.map((th) => {
                const Icon = th.icon
                return (
                  <Button
                    key={th.value}
                    variant={theme === th.value ? 'default' : 'outline'}
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setTheme(th.value)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {th.label}
                  </Button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Default Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Default Mode</p>
              <p className="text-xs text-muted-foreground">Simple for beginners, Advanced for accountants</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${preferences.defaultMode === 'simple' ? 'text-primary' : 'text-muted-foreground'}`}>Simple</span>
              <Switch
                checked={preferences.defaultMode === 'advanced'}
                onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, defaultMode: checked ? 'advanced' : 'simple' }))}
              />
              <span className={`text-xs font-medium ${preferences.defaultMode === 'advanced' ? 'text-primary' : 'text-muted-foreground'}`}>Advanced</span>
            </div>
          </div>

          <Separator />

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Currency</p>
              <p className="text-xs text-muted-foreground">Base currency for all transactions</p>
            </div>
            <Badge variant="outline" className="font-mono">NPR — Nepalese Rupee (रू)</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-4 w-4" />
            <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>Irreversible actions that affect your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Delete Organization</p>
              <p className="text-xs text-muted-foreground">Permanently delete this organization and all associated data</p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">Delete Organization</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the organization
                    &ldquo;{orgForm.name}&rdquo; and all of its data including transactions, invoices,
                    parties, and reports.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteOrg} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Yes, delete organization
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Save Button (bottom) */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSaveOrg} disabled={saving} size="lg">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? 'Saving...' : t('save', language as 'en' | 'ne' | 'hi')}
        </Button>
        <p className="text-xs text-muted-foreground">All changes are saved to your organization settings</p>
      </div>
    </div>
  )
}
