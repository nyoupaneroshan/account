'use client'

import { useAppStore, type AppMode } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  HelpCircle,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  Building2,
  Receipt,
  ShoppingCart,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  ToggleLeft,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

// ──────────────────────────────────────────────
// Action definitions per mode
// ──────────────────────────────────────────────

interface QuickAction {
  id: string
  label: string
  labelNepali: string
  shortcut: string
  icon: React.ElementType
  action: () => void
  colorClass: string
  mode?: AppMode
}

interface QuickActionsBarProps {
  onToggleSidebar: () => void
  onToggleMode: () => void
  onOpenCheatsheet: () => void
  onOrgSwitcher: () => void
}

export function QuickActionsBar({
  onToggleSidebar,
  onToggleMode,
  onOpenCheatsheet,
  onOrgSwitcher,
}: QuickActionsBarProps) {
  const mode = useAppStore((s) => s.mode)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const router = useRouter()
  const pathname = usePathname()

  // Only show on dashboard
  const isDashboard = pathname === '/dashboard'
  if (!isDashboard) return null

  const actions: QuickAction[] = [
    {
      id: 'help',
      label: 'Help',
      labelNepali: 'मद्दत',
      shortcut: 'F1',
      icon: HelpCircle,
      action: onOpenCheatsheet,
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
    ...(mode === 'simple'
      ? [
          {
            id: 'income',
            label: 'Income',
            labelNepali: 'आम्दानी',
            shortcut: 'F2',
            icon: PlusCircle,
            action: () => router.push('/income'),
            colorClass: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
          },
          {
            id: 'expense',
            label: 'Expense',
            labelNepali: 'खर्च',
            shortcut: 'F4',
            icon: MinusCircle,
            action: () => router.push('/expense'),
            colorClass: 'text-red-400 hover:text-red-300 hover:bg-red-500/10',
          },
        ]
      : [
          {
            id: 'journal',
            label: 'Journal',
            labelNepali: 'जर्नल',
            shortcut: 'F2',
            icon: ArrowRightLeft,
            action: () => router.push('/journal/new'),
            colorClass: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10',
          },
        ]),
    {
      id: 'org',
      label: 'Switch Org',
      labelNepali: 'संस्था',
      shortcut: 'F3',
      icon: Building2,
      action: onOrgSwitcher,
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
    {
      id: 'toggle-mode',
      label: mode === 'simple' ? 'Advanced' : 'Simple',
      labelNepali: mode === 'simple' ? 'उन्नत' : 'सरल',
      shortcut: 'F5',
      icon: ToggleLeft,
      action: onToggleMode,
      colorClass: 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10',
    },
    {
      id: 'invoice',
      label: 'Invoice',
      labelNepali: 'इनभ्वाइस',
      shortcut: 'F6',
      icon: Receipt,
      action: () => router.push('/invoices/new'),
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
    {
      id: 'purchase',
      label: 'Purchase',
      labelNepali: 'खरिद',
      shortcut: 'F7',
      icon: ShoppingCart,
      action: () => router.push('/purchases/new'),
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
    {
      id: 'party',
      label: 'Party',
      labelNepali: 'पक्ष',
      shortcut: 'F8',
      icon: Users,
      action: () => router.push('/parties/new'),
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
    {
      id: 'sidebar',
      label: sidebarOpen ? 'Hide Side' : 'Show Side',
      labelNepali: 'साइडबार',
      shortcut: 'F9',
      icon: sidebarOpen ? PanelLeftClose : PanelLeftOpen,
      action: onToggleSidebar,
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
    {
      id: 'reports',
      label: 'Reports',
      labelNepali: 'रिपोर्ट',
      shortcut: 'F10',
      icon: BarChart3,
      action: () => router.push('/reports'),
      colorClass: 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]',
    },
  ]

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className={cn(
        "flex items-center gap-1 px-2 py-1.5 rounded-2xl border",
        "bg-[#0c0f14]/80 backdrop-blur-xl border-white/[0.08]",
        "shadow-2xl shadow-black/40",
        "transition-all duration-300 hover:border-white/[0.12]"
      )}>
        {/* Mode indicator dot */}
        <div className="flex items-center gap-1.5 px-2 py-1 mr-1">
          <div className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            mode === 'simple'
              ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
              : 'bg-violet-500 shadow-[0_0_6px_rgba(139,92,246,0.5)]'
          )} />
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider",
            mode === 'simple' ? 'text-emerald-400/70' : 'text-violet-400/70'
          )}>
            {mode === 'simple' ? 'SIM' : 'ADV'}
          </span>
        </div>

        <div className="h-5 w-px bg-white/[0.06] mr-1" />

        {/* Action buttons */}
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Tooltip key={action.id}>
              <TooltipTrigger asChild>
                <button
                  onClick={action.action}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all duration-200",
                    "text-xs font-medium",
                    action.colorClass
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline text-[11px]">{action.label}</span>
                  <kbd className="text-[8px] px-0.5 py-0 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-500 font-mono shrink-0">
                    {action.shortcut}
                  </kbd>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-zinc-800/95 backdrop-blur-sm text-zinc-200 border-zinc-700/80 shadow-lg text-xs"
              >
                <span>{action.label} · {action.labelNepali}</span>
                <span className="text-zinc-500 ml-1.5">({action.shortcut})</span>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
