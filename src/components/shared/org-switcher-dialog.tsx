'use client'

import { useAppStore } from '@/store/app-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Check, Building2 } from 'lucide-react'
import { getRoleInfo } from '@/lib/rbac'

interface OrgSwitcherDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrgSwitcherDialog({ open, onOpenChange }: OrgSwitcherDialogProps) {
  const {
    currentOrgId,
    currentOrgName,
    userOrganizations,
    setCurrentOrg,
  } = useAppStore()

  const handleSelectOrg = (id: string, name: string) => {
    setCurrentOrg(id, name)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0f1117] border-white/[0.08] text-zinc-100 sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 border-b border-white/[0.06] bg-gradient-to-b from-emerald-500/[0.04] to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-zinc-100">
                Switch Organization
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 mt-0.5">
                संस्था स्विच · Select an organization to work with
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-2">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[10px] text-zinc-500 font-mono">
              F3
            </kbd>
            <span className="text-[10px] text-zinc-600">shortcut to open</span>
          </div>
        </DialogHeader>

        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {userOrganizations.map((org) => {
            const isActive = org.id === currentOrgId
            return (
              <button
                key={org.id}
                onClick={() => handleSelectOrg(org.id, org.name)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-3 rounded-lg transition-all duration-200 text-left",
                  isActive
                    ? 'bg-emerald-500/10 border border-emerald-500/15'
                    : 'hover:bg-white/[0.04] border border-transparent'
                )}
              >
                <Avatar className="h-9 w-9 rounded-lg shrink-0">
                  <AvatarFallback className={cn(
                    "rounded-lg text-sm font-semibold",
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-white/[0.06] text-zinc-400'
                  )}>
                    {org.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm font-medium truncate block",
                    isActive ? 'text-emerald-400' : 'text-zinc-200'
                  )}>
                    {org.name}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge
                      className={cn(
                        "text-[9px] px-1.5 py-0 h-3.5 leading-none font-semibold border-0",
                        org.plan === 'pro'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : org.plan === 'enterprise'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-zinc-700/50 text-zinc-400'
                      )}
                    >
                      {org.plan.charAt(0).toUpperCase() + org.plan.slice(1)}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-[8px] px-1 py-0 h-3.5 leading-none font-medium border",
                        getRoleInfo(org.role).badgeClass
                      )}
                    >
                      {getRoleInfo(org.role).labelNepali}
                    </Badge>
                  </div>
                </div>
                {isActive && (
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                )}
              </button>
            )
          })}
        </div>

        {currentOrgName && (
          <div className="px-5 py-3 border-t border-white/[0.06] bg-white/[0.01]">
            <p className="text-[11px] text-zinc-600">
              Current: <span className="text-zinc-400 font-medium">{currentOrgName}</span>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
