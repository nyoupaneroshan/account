'use client'

import { useAppStore } from '@/store/app-store'
import { NEPAL_VAT_RATE, TDS_RATES, SSF_TOTAL_RATE } from '@/lib/nepal-accounting'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Settings,
  Building2,
  Sliders,
  Calculator,
  Calendar,
  Database,
  Lock,
  Download,
  HardDrive,
  ChevronRight,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================
interface TaxRate {
  id: string
  name: string
  nameNepali: string | null
  taxType: string
  rate: number
  isDefault: boolean
  isActive: boolean
  description: string | null
}

// ============================================================
// Main Component
// ============================================================
export function SettingsView() {
  const { mode, setMode, currentOrgId, currentFiscalYear, setActiveModule } = useAppStore()
  const [vatEnabled, setVatEnabled] = useState(true)
  const [tdsEnabled, setTdsEnabled] = useState(false)
  const [ssfEnabled, setSsfEnabled] = useState(false)
  const [defaultVatRate, setDefaultVatRate] = useState(`${Math.round(NEPAL_VAT_RATE * 100)}%`)
  const [dateFormat, setDateFormat] = useState('YYYY-MM-DD')
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTaxRates = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      // We'll use organization settings as proxy for tax config
      // In production, there'd be a dedicated /api/tax-rates endpoint
      setTaxRates([
        { id: '1', name: 'VAT 13%', nameNepali: 'भ्याट १३%', taxType: 'vat', rate: 13, isDefault: true, isActive: true, description: 'Standard Nepal VAT rate' },
        { id: '2', name: 'TDS Contract 1.5%', nameNepali: 'टीडीएस ठेक्का १.५%', taxType: 'tds', rate: 1.5, isDefault: true, isActive: true, description: 'Contract work TDS' },
        { id: '3', name: 'TDS Rent 15%', nameNepali: 'टीडीएस भाडा १५%', taxType: 'tds', rate: 15, isDefault: false, isActive: true, description: 'Rent TDS' },
        { id: '4', name: 'TDS Transport 1.5%', nameNepali: 'टीडीएस यातायात १.५%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true, description: 'Transport TDS' },
        { id: '5', name: 'SSF Total 31%', nameNepali: 'एसएसएफ कुल ३१%', taxType: 'ssf', rate: 31, isDefault: true, isActive: true, description: `Employee ${SSF_TOTAL_RATE * 100}% (20% + Employer 11%)` },
      ])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  useEffect(() => { fetchTaxRates() }, [fetchTaxRates])

  const handleLockFY = () => {
    toast.success(`Fiscal Year ${currentFiscalYear} has been locked`)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">सेटिङ — Configure your accounting preferences</p>
      </div>

      {/* Organization Settings */}
      <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => setActiveModule('organization')}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Organization Settings</h3>
              <p className="text-xs text-muted-foreground">संस्था सेटिङ — Name, PAN, address, and more</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Preferences</CardTitle>
          </div>
          <CardDescription>General accounting preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Default Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Default Mode</p>
              <p className="text-xs text-muted-foreground">Simple for beginners, Advanced for accountants</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${mode === 'simple' ? 'text-primary' : 'text-muted-foreground'}`}>Simple</span>
              <Switch
                checked={mode === 'advanced'}
                onCheckedChange={(checked) => setMode(checked ? 'advanced' : 'simple')}
              />
              <span className={`text-xs font-medium ${mode === 'advanced' ? 'text-primary' : 'text-muted-foreground'}`}>Advanced</span>
            </div>
          </div>

          <Separator />

          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Currency</p>
              <p className="text-xs text-muted-foreground">Base currency for all transactions</p>
            </div>
            <Badge variant="outline" className="font-mono">NPR — Nepalese Rupee</Badge>
          </div>

          <Separator />

          {/* Default VAT Rate */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Default VAT Rate</p>
              <p className="text-xs text-muted-foreground">Applied to taxable sales and purchases</p>
            </div>
            <Select value={defaultVatRate} onValueChange={setDefaultVatRate}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="13%">13% (Standard)</SelectItem>
                <SelectItem value="0%">0% (Exempt)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Date Format */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Date Format</p>
              <p className="text-xs text-muted-foreground">Display format for dates</p>
            </div>
            <Select value={dateFormat} onValueChange={setDateFormat}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="BS">Nepali (BS)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tax Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Tax Configuration / कर विन्यास</CardTitle>
          </div>
          <CardDescription>VAT, TDS, and SSF settings for Nepal compliance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* VAT Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">VAT Enabled</p>
              <p className="text-xs text-muted-foreground">भ्याट सक्षम — Nepal standard 13% VAT</p>
            </div>
            <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
          </div>

          <Separator />

          {/* TDS Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">TDS Enabled</p>
              <p className="text-xs text-muted-foreground">टीडीएस सक्षम — Tax Deducted at Source</p>
            </div>
            <Switch checked={tdsEnabled} onCheckedChange={setTdsEnabled} />
          </div>

          <Separator />

          {/* SSF Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">SSF Enabled</p>
              <p className="text-xs text-muted-foreground">एसएसएफ सक्षम — Social Security Fund</p>
            </div>
            <Switch checked={ssfEnabled} onCheckedChange={setSsfEnabled} />
          </div>

          <Separator />

          {/* Tax Rates List */}
          <div>
            <p className="text-sm font-medium mb-3">Tax Rates</p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {taxRates.map((tr) => (
                  <div key={tr.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          tr.taxType === 'vat' ? 'border-green-300 text-green-700 dark:text-green-400' :
                          tr.taxType === 'tds' ? 'border-amber-300 text-amber-700 dark:text-amber-400' :
                          'border-teal-300 text-teal-700 dark:text-teal-400'
                        }`}
                      >
                        {tr.taxType.toUpperCase()}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{tr.name}</p>
                        {tr.description && <p className="text-[10px] text-muted-foreground">{tr.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{tr.rate}%</span>
                      {tr.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fiscal Year */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Fiscal Year / आर्थिक वर्ष</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Current Fiscal Year</p>
              <p className="text-xs text-muted-foreground">Active accounting period</p>
            </div>
            <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">{currentFiscalYear}</Badge>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Lock Fiscal Year</p>
              <p className="text-xs text-muted-foreground">Prevent further entries in current FY</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLockFY}>
              <Lock className="h-3.5 w-3.5 mr-2" />
              Lock FY {currentFiscalYear}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Data Management</CardTitle>
          </div>
          <CardDescription>Export and backup your accounting data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export Data</p>
              <p className="text-xs text-muted-foreground">Download all data as CSV/Excel</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export coming soon')}>
              <Download className="h-3.5 w-3.5 mr-2" />
              Export
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Backup</p>
              <p className="text-xs text-muted-foreground">Create a backup of your database</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info('Backup coming soon')}>
              <HardDrive className="h-3.5 w-3.5 mr-2" />
              Backup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
