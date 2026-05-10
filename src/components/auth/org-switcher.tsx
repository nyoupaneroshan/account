'use client'

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Building2, ChevronsUpDown, Plus, Check } from 'lucide-react'

const planBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  free: 'secondary',
  pro: 'default',
  enterprise: 'outline',
}

export function OrgSwitcher() {
  const {
    currentOrgId,
    currentOrgName,
    userOrganizations,
    setCurrentOrg,
  } = useAppStore()

  const currentOrg = userOrganizations.find(o => o.id === currentOrgId)

  return (
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

        <DropdownMenuItem className="cursor-pointer text-primary">
          <Plus className="h-4 w-4 mr-2" />
          Add New Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
