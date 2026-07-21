'use client'

import { useEffect, useCallback, useMemo } from 'react'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import {
  LayoutDashboard,
  Users,
  Receipt,
  ShoppingCart,
  FileText,
  BookOpen,
  FileSpreadsheet,
  BarChart3,
  Package,
  Settings,
  Building2,
  PlusCircle,
  MinusCircle,
  ArrowRightLeft,
  ArrowRight,
  ToggleLeft,
  Globe,
  PanelLeftClose,
  Clock,
} from 'lucide-react'

/* ── Types ── */
interface CommandDef {
  id: string
  icon: React.ElementType
  label: string
  sublabel: string
  shortcut?: string
  category: 'navigation' | 'actions' | 'settings'
  path?: string
  action?: string
  mode?: 'simple' | 'advanced' | 'both'
}

/* ── Command Definitions ── */
const COMMANDS: CommandDef[] = [
  // Navigation
  { id: 'nav-dashboard', icon: LayoutDashboard, label: 'Dashboard', sublabel: 'ड्यासबोर्ड', category: 'navigation', path: '/dashboard', shortcut: '⌘1', mode: 'both' },
  { id: 'nav-parties', icon: Users, label: 'Parties', sublabel: 'पक्षहरू', category: 'navigation', path: '/parties', shortcut: '⌘2', mode: 'both' },
  { id: 'nav-invoices', icon: Receipt, label: 'Invoices', sublabel: 'इनभ्वाइस', category: 'navigation', path: '/invoices', shortcut: '⌘3', mode: 'both' },
  { id: 'nav-purchases', icon: ShoppingCart, label: 'Purchases', sublabel: 'खरिद', category: 'navigation', path: '/purchases', shortcut: '⌘4', mode: 'both' },
  { id: 'nav-journal', icon: FileText, label: 'Journal', sublabel: 'जर्नल प्रविष्टि', category: 'navigation', path: '/journal', shortcut: '⌘5', mode: 'advanced' },
  { id: 'nav-accounts', icon: BookOpen, label: 'Accounts', sublabel: 'खाता योजना', category: 'navigation', path: '/accounts', shortcut: '⌘6', mode: 'advanced' },
  { id: 'nav-ledgers', icon: FileSpreadsheet, label: 'Ledgers', sublabel: 'खाता खाता', category: 'navigation', path: '/ledgers', shortcut: '⌘7', mode: 'advanced' },
  { id: 'nav-reports', icon: BarChart3, label: 'Reports', sublabel: 'रिपोर्ट', category: 'navigation', path: '/reports', shortcut: '⌘8', mode: 'both' },
  { id: 'nav-inventory', icon: Package, label: 'Inventory', sublabel: 'इन्भेन्ट्री', category: 'navigation', path: '/inventory', shortcut: '⌘9', mode: 'advanced' },
  { id: 'nav-settings', icon: Settings, label: 'Settings', sublabel: 'सेटिङ', category: 'navigation', path: '/settings', mode: 'both' },
  { id: 'nav-org', icon: Building2, label: 'Organization', sublabel: 'संस्था', category: 'navigation', path: '/organization', mode: 'both' },

  // Quick Actions
  { id: 'act-income', icon: PlusCircle, label: 'Add Income', sublabel: 'आम्दानी थप्नुहोस्', category: 'actions', action: 'add-income', shortcut: 'N I', mode: 'simple' },
  { id: 'act-expense', icon: MinusCircle, label: 'Add Expense', sublabel: 'खर्च थप्नुहोस्', category: 'actions', action: 'add-expense', shortcut: 'N E', mode: 'simple' },
  { id: 'act-invoice', icon: Receipt, label: 'New Invoice', sublabel: 'नयाँ इनभ्वाइस', category: 'actions', action: 'new-invoice', shortcut: 'N I', mode: 'both' },
  { id: 'act-purchase', icon: ShoppingCart, label: 'New Purchase Bill', sublabel: 'नयाँ खरिद बिल', category: 'actions', action: 'new-purchase', shortcut: 'N P', mode: 'both' },
  { id: 'act-party', icon: Users, label: 'New Party', sublabel: 'नयाँ पक्ष', category: 'actions', action: 'new-party', shortcut: 'N C', mode: 'both' },
  { id: 'act-journal', icon: ArrowRightLeft, label: 'New Journal Entry', sublabel: 'नयाँ जर्नल प्रविष्टि', category: 'actions', action: 'new-journal', shortcut: 'N J', mode: 'advanced' },

  // Settings
  { id: 'set-mode', icon: ToggleLeft, label: 'Toggle Simple/Advanced', sublabel: 'सरल/उन्नत मोड', category: 'settings', action: 'toggle-mode', mode: 'both' },
  { id: 'set-language', icon: Globe, label: 'Switch Language (EN/NE)', sublabel: 'भाषा परिवर्तन', category: 'settings', action: 'switch-language', mode: 'both' },
  { id: 'set-sidebar', icon: PanelLeftClose, label: 'Toggle Sidebar', sublabel: 'साइडबार', category: 'settings', action: 'toggle-sidebar', shortcut: '⌘B', mode: 'both' },
]

const STORAGE_KEY = 'hisab-recent-pages'
const MAX_RECENT = 5

interface RecentPage {
  path: string
  label: string
  sublabel: string
  ts: number
}

function getRecentPages(): RecentPage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]').slice(0, MAX_RECENT)
  } catch { return [] }
}

/* ── Component ── */
interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'simple' | 'advanced'
  onNavigate: (path: string) => void
  onAction: (action: string) => void
}

export function CommandPalette({ open, onOpenChange, mode, onNavigate, onAction }: CommandPaletteProps) {
  const filtered = useMemo(
    () => COMMANDS.filter(c => c.mode === 'both' || c.mode === mode),
    [mode],
  )

  const nav = filtered.filter(c => c.category === 'navigation')
  const actions = filtered.filter(c => c.category === 'actions')
  const settings = filtered.filter(c => c.category === 'settings')
  const recent = getRecentPages()

  const handleSelect = useCallback((cmd: CommandDef) => {
    onOpenChange(false)
    if (cmd.path) onNavigate(cmd.path)
    else if (cmd.action) onAction(cmd.action)
  }, [onOpenChange, onNavigate, onAction])

  // Ctrl+K / ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0c0f14] border-white/[0.06] shadow-2xl shadow-black/50 p-0 overflow-hidden max-w-lg rounded-xl"
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command className="bg-transparent [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]]:border-b-white/[0.06] [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2.5 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4">
          <CommandInput
            placeholder="Type a command or search…"
            className="h-11 text-sm text-zinc-200 placeholder:text-zinc-600"
          />
          <CommandList className="max-h-80 custom-scrollbar">
            <CommandEmpty className="py-6 text-center text-sm text-zinc-500">
              No results found · नतिजा भेटिएन
            </CommandEmpty>

            {/* Recent */}
            {recent.length > 0 && (
              <CommandGroup heading="Recent · हालैको" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
                {recent.map((p) => (
                  <CommandItem
                    key={p.path}
                    value={`recent-${p.label}`}
                    onSelect={() => { onOpenChange(false); onNavigate(p.path) }}
                    className="flex items-center gap-3 cursor-pointer rounded-lg text-sm text-zinc-300 data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{p.label}</span>
                      <span className="text-[11px] text-zinc-600 truncate">{p.sublabel}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {recent.length > 0 && <CommandSeparator className="bg-white/[0.04]" />}

            {/* Navigation */}
            <CommandGroup heading="Navigation · नेभिगेसन" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {nav.map((cmd) => (
                <CmdItem key={cmd.id} cmd={cmd} onSelect={handleSelect} />
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-white/[0.04]" />

            {/* Quick Actions */}
            <CommandGroup heading="Actions · कार्य" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {actions.map((cmd) => (
                <CmdItem key={cmd.id} cmd={cmd} onSelect={handleSelect} />
              ))}
            </CommandGroup>

            <CommandSeparator className="bg-white/[0.04]" />

            {/* Settings */}
            <CommandGroup heading="Settings · सेटिङ" className="[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
              {settings.map((cmd) => (
                <CmdItem key={cmd.id} cmd={cmd} onSelect={handleSelect} />
              ))}
            </CommandGroup>

            {/* Footer hint */}
            <div className="flex items-center justify-center gap-4 px-3 py-2 border-t border-white/[0.04]">
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/[0.06] text-[9px]">↑↓</kbd> navigate
              </span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/[0.06] text-[9px]">↵</kbd> select
              </span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/[0.06] text-[9px]">esc</kbd> close
              </span>
            </div>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

/* ── Reusable command item with bilingual label + shortcut ── */
function CmdItem({ cmd, onSelect }: { cmd: CommandDef; onSelect: (c: CommandDef) => void }) {
  const Icon = cmd.icon
  return (
    <CommandItem
      value={`${cmd.label} ${cmd.sublabel}`}
      onSelect={() => onSelect(cmd)}
      className="flex items-center gap-3 cursor-pointer rounded-lg text-sm text-zinc-300 data-[selected=true]:bg-emerald-500/15 data-[selected=true]:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
    >
      <Icon className="h-4 w-4 text-zinc-500 shrink-0 data-[selected=true]:text-emerald-400" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate">{cmd.label}</span>
        <span className="text-[11px] text-zinc-600 truncate">{cmd.sublabel}</span>
      </div>
      {cmd.shortcut && (
        <CommandShortcut className="text-[10px] text-zinc-600 font-mono tracking-normal">
          {cmd.shortcut}
        </CommandShortcut>
      )}
    </CommandItem>
  )
}
