'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { formatNPR } from '@/lib/nepal-accounting'
import { t } from '@/lib/i18n'
import { PLANS, getPlan, hasFeature, isLimitExceeded, getRemaining } from '@/lib/plans'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Building2,
  Save,
  Loader2,
  Calendar,
  Lock,
  Unlock,
  CreditCard,
  ArrowUpRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Users,
  FileText,
  Package,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

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
  plan: string
  subscriptionStatus: string
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
  const {
    currentOrgId, currentOrgName, currentFiscalYear, setCurrentOrg,
    userOrganizations, setUserOrganizations, currentUser, language,
  } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fiscalYears, setFiscalYears] = useState<FiscalYearData[]>([])
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creating, setCreating] = useState(false)

  // Current org plan info
  const currentOrg = userOrganizations.find(o => o.id === currentOrgId)
  const plan = getPlan(currentOrg?.plan || 'free')

  // Find the best plan across ALL user's orgs (for org creation limits)
  let bestPlanId: string = 'free'
  for (const org of userOrganizations) {
    if (org.plan === 'enterprise') { bestPlanId = 'enterprise'; break }
    if (org.plan === 'pro') bestPlanId = 'pro'
  }
  const bestPlan = getPlan(bestPlanId)

  // Usage stats (mock - would come from API in production)
  const [usage, setUsage] = useState({
    transactions: 12,
    parties: 3,
    users: 1,
    products: 5,
    invoices: 8,
  })

  const [orgData, setOrgData] = useState<OrgData | null>(null)

  const fetchOrg = useCallback(async () => {
    if (!currentOrgId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/settings?orgId=${currentOrgId}`)
      if (res.ok) {
        const data = await res.json()
        setOrgData(data as OrgData)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [currentOrgId])

  const fetchFiscalYears = useCallback(async () => {
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

  // Refresh org list from API
  const refreshOrgs = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations')
      if (res.ok) {
        const data = await res.json()
        if (data.organizations) {
          const orgs = data.organizations.map((o: { id: string; name: string; role: string; plan: string }) => ({
            id: o.id,
            name: o.name,
            role: o.role,
            plan: o.plan,
          }))
          setUserOrganizations(orgs)
        }
      }
    } catch {
      // silently fail
    }
  }, [setUserOrganizations])

  useEffect(() => {
    fetchOrg()
    fetchFiscalYears()
  }, [fetchOrg, fetchFiscalYears])

  const handleLockFY = () => {
    setFiscalYears(prev =>
      prev.map(fy => fy.isCurrent ? { ...fy, isLocked: true } : fy)
    )
    toast.success(`Fiscal Year ${currentFiscalYear} has been locked`)
  }

  const handleUnlockFY = () => {
    setFiscalYears(prev =>
      prev.map(fy => fy.isCurrent ? { ...fy, isLocked: false } : fy)
    )
    toast.success(`Fiscal Year ${currentFiscalYear} has been unlocked`)
  }

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Organization name is required')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Organization "${newOrgName}" created successfully`)
        setCurrentOrg(data.organization.id, data.organization.name)
        setCreateOrgOpen(false)
        setNewOrgName('')
        // Refresh org list
        await refreshOrgs()
      } else {
        toast.error(data.error || 'Failed to create organization')
      }
    } catch {
      toast.error('Failed to create organization')
    } finally {
      setCreating(false)
    }
  }

  const handleSwitchOrg = (orgId: string, orgName: string) => {
    setCurrentOrg(orgId, orgName)
    toast.success(`Switched to ${orgName}`)
  }

  // Check if user can create more orgs (uses best plan across ALL orgs)
  const canCreateOrg = () => {
    const orgLimit = bestPlan.limits.organizations
    if (orgLimit === -1) return true
    return userOrganizations.length < orgLimit
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        <div className="h-8 w-64 bg-muted/50 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
          <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />
        </div>
        <div className="h-48 bg-muted/30 rounded-lg animate-pulse" />
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
          <h1 className="text-2xl font-bold tracking-tight">{t('organization', language as 'en' | 'ne' | 'hi')}</h1>
          <p className="text-sm text-muted-foreground">संस्था — {currentOrgName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Org Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DetailRow label="Name" value={orgData?.name || currentOrgName} />
            <DetailRow label="PAN" value={orgData?.panNumber || '—'} />
            <DetailRow label="Address" value={orgData?.address || '—'} />
            <DetailRow label="City" value={orgData?.city || '—'} />
            <DetailRow label="Province" value={orgData?.province || '—'} />
            <DetailRow label="Phone" value={orgData?.phone || '—'} />
            <DetailRow label="Email" value={orgData?.email || '—'} />
            <DetailRow label="VAT Enabled" value={orgData?.vatEnabled ? 'Yes' : 'No'} />
            <DetailRow label="TDS Enabled" value={orgData?.tdsEnabled ? 'Yes' : 'No'} />
            <DetailRow label="SSF Enabled" value={orgData?.ssfEnabled ? 'Yes' : 'No'} />
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Subscription Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('current_plan', language as 'en' | 'ne' | 'hi')}</span>
              <Badge className="text-sm px-3 py-1">{plan.name}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Price</span>
              <span className="text-sm font-medium">{plan.priceDisplay}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {currentOrg?.plan === 'free' ? 'Active' : 'Subscribed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Billing Period</span>
              <span className="text-sm">{currentOrg?.plan === 'free' ? 'Free forever' : 'Monthly'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Organizations</span>
              <span className="text-sm">{userOrganizations.length} / {bestPlan.limits.organizations === -1 ? '∞' : bestPlan.limits.organizations}</span>
            </div>

            <Separator />

            {currentOrg?.plan !== 'enterprise' && (
              <Button className="w-full" variant="outline" onClick={() => toast.info('Upgrade flow coming soon')}>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                {t('upgrade', language as 'en' | 'ne' | 'hi')} to {currentOrg?.plan === 'free' ? 'Pro' : 'Enterprise'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Limits */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Plan Limits / योजना सीमा
          </CardTitle>
          <CardDescription>Current usage vs. plan limits for {plan.name} plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <LimitCard
              icon={FileText}
              label="Transactions"
              current={usage.transactions}
              limit={plan.limits.transactions}
            />
            <LimitCard
              icon={Users}
              label="Users"
              current={usage.users}
              limit={plan.limits.users}
            />
            <LimitCard
              icon={TrendingUp}
              label="Parties"
              current={usage.parties}
              limit={plan.limits.parties}
            />
            <LimitCard
              icon={Package}
              label="Products"
              current={usage.products}
              limit={plan.limits.products}
            />
            <LimitCard
              icon={FileText}
              label="Invoices"
              current={usage.invoices}
              limit={plan.limits.invoices}
            />
            <LimitCard
              icon={Building2}
              label="Organizations"
              current={userOrganizations.length}
              limit={bestPlan.limits.organizations}
            />
          </div>
        </CardContent>
      </Card>

      {/* Switch / Create Organization */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Organizations
              </CardTitle>
              <CardDescription>Switch between organizations or create a new one</CardDescription>
            </div>
            <Dialog open={createOrgOpen} onOpenChange={setCreateOrgOpen}>
              <DialogTrigger asChild>
                <Button size="sm" title={!canCreateOrg() ? `Organization limit reached (${bestPlan.limits.organizations === -1 ? '∞' : bestPlan.limits.organizations}). Upgrade your plan to create more.` : 'Create new organization'}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Set up a new business organization. You can switch between organizations anytime.
                  </DialogDescription>
                </DialogHeader>
                {!canCreateOrg() ? (
                  <div className="py-6 text-center">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-amber-500" />
                    <p className="text-sm font-medium mb-1">Organization Limit Reached</p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your {bestPlan.name} plan allows up to {bestPlan.limits.organizations === -1 ? '∞' : bestPlan.limits.organizations} organization(s). Upgrade to create more.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setCreateOrgOpen(false)}>Close</Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="newOrgName">Organization Name *</Label>
                      <Input
                        id="newOrgName"
                        value={newOrgName}
                        onChange={(e) => setNewOrgName(e.target.value)}
                        placeholder="e.g. Sharma Trading"
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Organizations: {userOrganizations.length} / {bestPlan.limits.organizations === -1 ? '∞' : bestPlan.limits.organizations} ({bestPlan.name} plan)
                    </p>
                  </div>
                )}
                {canCreateOrg() && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOrgOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateOrg} disabled={creating || !newOrgName.trim()}>
                      {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Create
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {!canCreateOrg() && (
            <div className="mb-4 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              You have reached the organization limit ({bestPlan.limits.organizations === -1 ? '∞' : bestPlan.limits.organizations}) for your {bestPlan.name} plan. Upgrade to create more organizations.
            </div>
          )}
          {userOrganizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No organizations yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {userOrganizations.map((org) => (
                <div
                  key={org.id}
                  className={`flex items-center justify-between rounded-lg p-3 cursor-pointer transition-colors ${
                    org.id === currentOrgId ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => handleSwitchOrg(org.id, org.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-xs font-semibold">
                      {org.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{org.name}</p>
                      <p className="text-xs text-muted-foreground">Role: {org.role} · Plan: {org.plan}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={org.plan === 'pro' ? 'default' : org.plan === 'enterprise' ? 'outline' : 'secondary'} className="text-[10px]">
                      {org.plan}
                    </Badge>
                    {org.id === currentOrgId && (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">Current</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fiscal Year Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            {t('fiscal_year', language as 'en' | 'ne' | 'hi')} / आर्थिक वर्ष व्यवस्थापन
          </CardTitle>
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
                  {fy.isCurrent && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Current</Badge>
                  )}
                  {fy.isLocked ? (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <Lock className="h-3 w-3" /> Locked
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs gap-1">
                      <Unlock className="h-3 w-3" /> Open
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {fiscalYears.some(fy => fy.isCurrent && !fy.isLocked) && (
              <Button variant="outline" size="sm" onClick={handleLockFY}>
                <Lock className="h-3.5 w-3.5 mr-2" />
                Lock FY {currentFiscalYear}
              </Button>
            )}
            {fiscalYears.some(fy => fy.isCurrent && fy.isLocked) && (
              <Button variant="outline" size="sm" onClick={handleUnlockFY}>
                <Unlock className="h-3.5 w-3.5 mr-2" />
                Unlock FY {currentFiscalYear}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================
// Helper Components
// ============================================================
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function LimitCard({ icon: Icon, label, current, limit }: { icon: React.ElementType; label: string; current: number; limit: number }) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? Math.min(100, (current / 100) * 100) : Math.min(100, (current / limit) * 100)
  const isWarning = !isUnlimited && percentage >= 80
  const isCritical = !isUnlimited && percentage >= 95

  return (
    <div className={`rounded-lg p-4 border ${isCritical ? 'border-destructive/50 bg-destructive/5' : isWarning ? 'border-amber-300/50 bg-amber-50 dark:bg-amber-950/20' : 'border-border bg-card'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        {isCritical && <AlertTriangle className="h-4 w-4 text-destructive" />}
        {isWarning && !isCritical && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="text-xl font-bold">{current}</span>
        <span className="text-sm text-muted-foreground">
          / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      {!isUnlimited && (
        <Progress value={percentage} className="h-2" />
      )}
      <p className="text-xs text-muted-foreground mt-1.5">
        {isUnlimited
          ? 'Unlimited'
          : `${getRemainingLabel(limit - current)} remaining`
        }
      </p>
    </div>
  )
}

function getRemainingLabel(remaining: number): string {
  if (remaining < 0) return '0'
  return remaining.toString()
}
