'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/session'
import { Building2, ChevronsUpDown, Plus, Check, Loader2 } from 'lucide-react'
import { getPlan } from '@/lib/plans'
import { toast } from 'sonner'

const planBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'secondary',
  pro: 'default',
  enterprise: 'outline',
}

export function OrgSwitcher() {
  const router = useRouter()
  const {
    currentOrgId,
    currentOrgName,
    userOrganizations,
    setCurrentOrg,
    setUserOrganizations,
  } = useAppStore()

  const currentOrg = userOrganizations.find(o => o.id === currentOrgId)

  // Create org dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')
  const [creating, setCreating] = useState(false)

  // Determine best plan for org limit check
  let bestPlanId: string = 'free'
  for (const org of userOrganizations) {
    if (org.plan === 'enterprise') { bestPlanId = 'enterprise'; break }
    if (org.plan === 'pro') bestPlanId = 'pro'
  }
  const bestPlan = getPlan(bestPlanId)
  const orgLimit = bestPlan.limits.organizations
  const canCreateOrg = orgLimit === -1 || userOrganizations.length < orgLimit

  const handleAddOrg = () => {
    if (!canCreateOrg) {
      toast.error(`Organization limit reached (${orgLimit === -1 ? '∞' : orgLimit}). Upgrade your plan to create more.`)
      return
    }
    setCreateOpen(true)
  }

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error('Organization name is required')
      return
    }
    setCreating(true)
    try {
      const res = await authFetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        toast.success(`Organization "${newOrgName}" created successfully`)
        setCurrentOrg(data.organization.id, data.organization.name)
        setCreateOpen(false)
        setNewOrgName('')
        // Refresh org list
        try {
          const orgsRes = await authFetch('/api/organizations')
          if (orgsRes.ok) {
            const orgsData = await orgsRes.json()
            if (orgsData.organizations) {
              const orgs = orgsData.organizations.map((o: { id: string; name: string; role: string; plan: string }) => ({
                id: o.id,
                name: o.name,
                role: o.role,
                plan: o.plan,
              }))
              setUserOrganizations(orgs)
            }
          }
        } catch {
          // silently fail refresh
        }
      } else {
        toast.error(data.error || 'Failed to create organization')
      }
    } catch {
      toast.error('Failed to create organization')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 h-auto py-1.5 hover:bg-accent"
          >
            <Avatar className="h-7 w-7 rounded-md">
              <AvatarFallback className="rounded-md bg-primary text-primary-foreground text-xs font-semibold">
                {currentOrgName?.charAt(0)?.toUpperCase() || 'O'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start text-left min-w-0">
              <span className="text-sm font-medium truncate max-w-[120px]">
                {currentOrgName}
              </span>
              {currentOrg && (
                <Badge
                  variant={planBadgeVariant[currentOrg.plan] || 'secondary'}
                  className="text-[10px] px-1 py-0 h-4 leading-none"
                >
                  {currentOrg.plan.charAt(0).toUpperCase() + currentOrg.plan.slice(1)}
                </Badge>
              )}
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Organizations
          </DropdownMenuLabel>

          {userOrganizations.map((org) => (
            <DropdownMenuItem
              key={org.id}
              onClick={() => setCurrentOrg(org.id, org.name)}
              className={cn(
                'flex items-center gap-2 cursor-pointer',
                org.id === currentOrgId && 'bg-accent'
              )}
            >
              <Avatar className="h-6 w-6 rounded-md">
                <AvatarFallback className="rounded-md bg-muted text-[10px] font-semibold">
                  {org.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{org.name}</span>
                <div className="flex items-center gap-1">
                  <Badge
                    variant={planBadgeVariant[org.plan] || 'secondary'}
                    className="text-[10px] px-1 py-0 h-3.5 leading-none"
                  >
                    {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{org.role}</span>
                </div>
              </div>
              {org.id === currentOrgId && (
                <Check className="h-4 w-4 text-primary shrink-0" />
              )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />

          <DropdownMenuItem className="cursor-pointer text-primary" onClick={handleAddOrg}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Organization
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/organization')}>
            <Building2 className="h-4 w-4 mr-2" />
            Manage Organizations
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Organization Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Set up a new business organization. You can switch between organizations anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="switcherNewOrgName">Organization Name *</Label>
              <Input
                id="switcherNewOrgName"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="e.g. Sharma Trading"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              />
            </div>
            {!canCreateOrg && (
              <p className="text-sm text-destructive">
                You have reached the organization limit for your plan. Upgrade to create more.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Organizations: {userOrganizations.length} / {orgLimit === -1 ? '∞' : orgLimit} ({bestPlan.name} plan)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={creating || !newOrgName.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
