'use client'

import { useAppStore, type AppMode, type AppModule } from '@/store/app-store'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  PlusCircle,
  MinusCircle,
  BookOpen,
  FileText,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Building2,
  ChevronDown,
  ChevronRight,
  Receipt,
  Truck,
  FileSpreadsheet,
  Scale,
  TrendingUp,
  DollarSign,
  Layers,
  UserCog,
  Calculator,
  ClipboardList,
  ArrowRightLeft,
  Shield,
  LogOut,
  Folder,
  Sparkles,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useState, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'

interface NavItem {
  id: AppModule
  label: string
  labelNepali: string
  icon: React.ElementType
  path: string
  shortcut?: string
}

interface NavGroup {
  label: string
  labelNepali: string
  items: NavItem[]
  defaultOpen?: boolean
}

// Module ID to URL path mapping
const MODULE_PATH_MAP: Record<string, string> = {
  'dashboard': '/dashboard',
  'simple-income': '/income',
  'simple-expense': '/expense',
  'chart-of-accounts': '/accounts',
  'journal-entries': '/journal',
  'journal-entry-new': '/journal/new',
  'ledgers': '/ledgers',
  'parties': '/parties',
  'party-new': '/parties/new',
  'invoices': '/invoices',
  'invoice-new': '/invoices/new',
  'purchases': '/purchases',
  'purchase-new': '/purchases/new',
  'inventory': '/inventory',
  'product-new': '/inventory/new',
  'reports': '/reports',
  'trial-balance': '/reports',
  'profit-loss': '/reports',
  'balance-sheet': '/reports',
  'cash-flow': '/reports',
  'vat-report': '/reports',
  'tds-report': '/reports',
  'settings': '/settings',
  'organization': '/organization',
  'users': '/users',
  'admin-portal': '/admin',
}

const SIMPLE_NAV: NavGroup[] = [
  {
    label: 'Main',
    labelNepali: 'मुख्य',
    items: [
      { id: 'dashboard', label: 'Dashboard', labelNepali: 'ड्यासबोर्ड', icon: LayoutDashboard, path: '/dashboard', shortcut: 'Alt+1' },
      { id: 'parties', label: 'Parties', labelNepali: 'पक्षहरू', icon: Users, path: '/parties', shortcut: 'Alt+2' },
      { id: 'invoices', label: 'Invoices', labelNepali: 'इनभ्वाइस', icon: Receipt, path: '/invoices', shortcut: 'Alt+3' },
      { id: 'purchases', label: 'Purchases', labelNepali: 'खरिद', icon: ShoppingCart, path: '/purchases', shortcut: 'Alt+4' },
    ],
    defaultOpen: true,
  },
  {
    label: 'Quick Entry',
    labelNepali: 'छिटो प्रविष्टि',
    items: [
      { id: 'simple-income', label: 'Add Income', labelNepali: 'आम्दानी थप्नुहोस्', icon: PlusCircle, path: '/income', shortcut: 'F2' },
      { id: 'simple-expense', label: 'Add Expense', labelNepali: 'खर्च थप्नुहोस्', icon: MinusCircle, path: '/expense', shortcut: 'F4' },
    ],
    defaultOpen: true,
  },
  {
    label: 'Reports',
    labelNepali: 'रिपोर्ट',
    items: [
      { id: 'reports', label: 'All Reports', labelNepali: 'सबै रिपोर्ट', icon: BarChart3, path: '/reports' },
    ],
    defaultOpen: false,
  },
]

const ADVANCED_NAV: NavGroup[] = [
  {
    label: 'Main',
    labelNepali: 'मुख्य',
    items: [
      { id: 'dashboard', label: 'Dashboard', labelNepali: 'ड्यासबोर्ड', icon: LayoutDashboard, path: '/dashboard', shortcut: 'Alt+1' },
      { id: 'parties', label: 'Parties', labelNepali: 'पक्षहरू', icon: Users, path: '/parties', shortcut: 'Alt+2' },
      { id: 'invoices', label: 'Invoices', labelNepali: 'इनभ्वाइस', icon: Receipt, path: '/invoices', shortcut: 'Alt+3' },
      { id: 'purchases', label: 'Purchases', labelNepali: 'खरिद', icon: Truck, path: '/purchases', shortcut: 'Alt+4' },
    ],
    defaultOpen: true,
  },
  {
    label: 'Accounting',
    labelNepali: 'लेखांकन',
    items: [
      { id: 'journal-entries', label: 'Journal', labelNepali: 'जर्नल प्रविष्टि', icon: FileText, path: '/journal', shortcut: 'Alt+5' },
      { id: 'chart-of-accounts', label: 'Accounts', labelNepali: 'खाता योजना', icon: BookOpen, path: '/accounts', shortcut: 'Alt+6' },
      { id: 'ledgers', label: 'Ledgers', labelNepali: 'खाता खाता', icon: FileSpreadsheet, path: '/ledgers' },
    ],
    defaultOpen: true,
  },
  {
    label: 'Inventory',
    labelNepali: 'इन्भेन्ट्री',
    items: [
      { id: 'inventory', label: 'Stock', labelNepali: 'स्टक व्यवस्थापन', icon: Package, path: '/inventory', shortcut: 'Alt+8' },
    ],
    defaultOpen: false,
  },
  {
    label: 'Reports',
    labelNepali: 'रिपोर्ट',
    items: [
      { id: 'trial-balance', label: 'Trial Balance', labelNepali: 'ट्रायल ब्यालेन्स', icon: Scale, path: '/reports' },
      { id: 'profit-loss', label: 'Profit & Loss', labelNepali: 'नाफा र घाटा', icon: TrendingUp, path: '/reports' },
      { id: 'balance-sheet', label: 'Balance Sheet', labelNepali: 'ब्यालेन्स सिट', icon: Layers, path: '/reports' },
      { id: 'cash-flow', label: 'Cash Flow', labelNepali: 'नगद प्रवाह', icon: DollarSign, path: '/reports' },
      { id: 'vat-report', label: 'VAT Report', labelNepali: 'भ्याट रिपोर्ट', icon: Calculator, path: '/reports' },
      { id: 'tds-report', label: 'TDS Report', labelNepali: 'टीडीएस रिपोर्ट', icon: ClipboardList, path: '/reports' },
    ],
    defaultOpen: false,
  },
  {
    label: 'Settings',
    labelNepali: 'सेटिङ',
    items: [
      { id: 'organization', label: 'Organization', labelNepali: 'संस्था', icon: Building2, path: '/organization', shortcut: 'Alt+0' },
      { id: 'users', label: 'Users & Roles', labelNepali: 'प्रयोगकर्ता', icon: UserCog, path: '/users' },
      { id: 'settings', label: 'Settings', labelNepali: 'सेटिङ', icon: Settings, path: '/settings', shortcut: 'Alt+9' },
    ],
    defaultOpen: false,
  },
]

export function AppSidebar({ onLogout }: { onLogout?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const { mode, setMode, currentOrgName, currentFiscalYear, currentUser, userOrganizations, currentOrgId, setIsAdminPortal, setSidebarOpen } = useAppStore()
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const navGroups = mode === 'simple' ? SIMPLE_NAV : ADVANCED_NAV

  // Compute default open groups for the current mode
  const defaultOpenGroups = useMemo(
    () => Object.fromEntries(
      navGroups.filter(g => g.defaultOpen).map(g => [g.label, true])
    ),
    [navGroups]
  )

  const [userOverrides, setUserOverrides] = useState<Record<string, boolean>>({})
  const openGroups = { ...defaultOpenGroups, ...userOverrides }

  const toggleGroup = (label: string) => {
    const defaultValue = defaultOpenGroups[label] ?? false
    const currentValue = openGroups[label] ?? defaultValue
    setUserOverrides(prev => ({ ...prev, [label]: !currentValue }))
  }

  // Navigate to a module's URL path
  const handleNavigate = (item: NavItem) => {
    // Close sidebar on mobile
    setSidebarOpen(false)
    router.push(item.path)
  }

  // Determine if a nav item is active based on current pathname
  const isActiveItem = (item: NavItem): boolean => {
    // Exact match
    if (pathname === item.path) return true
    // For parent paths like /parties, highlight if on /parties/new
    if (item.path !== '/' && pathname.startsWith(item.path + '/')) return true
    return false
  }

  // Org switcher
  const currentOrg = userOrganizations.find(o => o.id === currentOrgId)

  return (
    <div className="flex h-full flex-col bg-[#0c0f14] w-72 noise-overlay relative overflow-hidden">
      {/* Subtle gradient mesh background */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-500/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl" />
      </div>

      {/* Content wrapper above the gradient */}
      <div className="relative z-10 flex h-full flex-col">

        {/* Organization Header — Polished with subtle gradient background */}
        <div className="p-4 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl overflow-hidden bg-gradient-to-br from-emerald-500/20 to-emerald-700/30 flex items-center justify-center shrink-0 ring-2 ring-emerald-500/20 ring-offset-1 ring-offset-[#0c0f14] transition-premium group-hover:ring-emerald-500/40">
              <Image
                src="/logo-generated.png"
                alt="Hisab Pro"
                width={36}
                height={36}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-zinc-100 truncate tracking-tight">{currentOrgName}</h3>
                {/* Mode badge in header */}
                <Badge
                  className={cn(
                    "text-[8px] px-1.5 py-0 h-4 leading-none font-bold uppercase tracking-wider border-0 shrink-0 transition-premium",
                    mode === 'simple'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-violet-500/15 text-violet-400'
                  )}
                >
                  {mode === 'simple' ? 'SIM' : 'ADV'}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-zinc-500 font-medium">FY: {currentFiscalYear}</span>
                {currentOrg && (
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 leading-none font-semibold border-0 transition-premium",
                      currentOrg.plan === 'pro'
                        ? 'bg-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                        : currentOrg.plan === 'enterprise'
                          ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                          : 'bg-zinc-700/50 text-zinc-400'
                    )}
                  >
                    {currentOrg.plan === 'pro' && <Sparkles className="h-2.5 w-2.5 mr-0.5 inline" />}
                    {currentOrg.plan.charAt(0).toUpperCase() + currentOrg.plan.slice(1)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mode Toggle — Enhanced with visual distinction and descriptions */}
        <div className={cn(
          "px-4 py-3 border-b border-white/[0.06] transition-all duration-300",
          mode === 'simple'
            ? 'bg-gradient-to-b from-emerald-500/[0.03] to-transparent'
            : 'bg-gradient-to-b from-violet-500/[0.03] to-transparent'
        )}>
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "text-[11px] font-semibold uppercase tracking-wider transition-premium",
              mode === 'simple' ? 'text-emerald-400' : 'text-zinc-600'
            )}>
              Simple
            </span>
            <Switch
              checked={mode === 'advanced'}
              onCheckedChange={(checked) => setMode(checked ? 'advanced' : 'simple')}
              className={cn(
                "transition-premium",
                mode === 'advanced'
                  ? 'data-[state=checked]:bg-violet-600'
                  : 'data-[state=checked]:bg-emerald-600',
                'data-[state=unchecked]:bg-zinc-700'
              )}
            />
            <span className={cn(
              "text-[11px] font-semibold uppercase tracking-wider transition-premium",
              mode === 'advanced' ? 'text-violet-400' : 'text-zinc-600'
            )}>
              Advanced
            </span>
            {/* F5 shortcut hint */}
            <kbd className="px-1 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[9px] text-zinc-500 font-mono shrink-0 ml-1">
              F5
            </kbd>
          </div>
          <p className={cn(
            "text-[10px] mt-1.5 tracking-wide transition-colors duration-300",
            mode === 'simple' ? 'text-emerald-500/60' : 'text-violet-500/60'
          )}>
            {mode === 'simple'
              ? 'सरल मोड · Easy entry, auto-accounting'
              : 'उन्नत मोड · Full double-entry system'
            }
          </p>
        </div>

        {/* Navigation — Premium with emerald hover highlights */}
        <ScrollArea className="flex-1 custom-scrollbar">
          <nav className="p-3 space-y-1">
            {navGroups.map((group) => (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="flex items-center gap-1.5 w-full px-2 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-premium rounded-md hover:bg-white/[0.03]"
                >
                  {openGroups[group.label] ? (
                    <ChevronDown className="h-3 w-3 text-emerald-500/70 transition-premium" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-zinc-600 transition-premium" />
                  )}
                  <span>{group.label}</span>
                  <span className="text-[9px] text-zinc-600 ml-auto font-normal">{group.labelNepali}</span>
                </button>
                {openGroups[group.label] && (
                  <div className="space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = isActiveItem(item)
                      return (
                        <Tooltip key={item.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleNavigate(item)}
                              className={cn(
                                'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-[13px] transition-premium group relative overflow-hidden',
                                isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 font-medium shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]'
                                  : 'text-zinc-400 hover:bg-emerald-500/[0.06] hover:text-emerald-300'
                              )}
                            >
                              {/* Active indicator bar — Emerald bar on left with glow */}
                              {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                              )}
                              {/* Hover highlight background ripple */}
                              {!isActive && (
                                <div className="absolute inset-0 rounded-lg bg-emerald-500/0 group-hover:bg-emerald-500/[0.04] transition-premium" />
                              )}
                              <Icon className={cn(
                                'h-4 w-4 shrink-0 transition-premium relative z-10',
                                isActive ? 'text-emerald-400 drop-shadow-[0_0_4px_rgba(16,185,129,0.3)]' : 'text-zinc-500 group-hover:text-emerald-400 group-hover:scale-110'
                              )} />
                              <div className="flex flex-col items-start min-w-0 relative z-10 flex-1">
                                <span className={cn(
                                  "truncate w-full text-left transition-premium",
                                  !isActive && "group-hover:translate-x-0.5"
                                )}>{item.label}</span>
                                {isActive && (
                                  <span className="text-[10px] text-emerald-500/70 truncate w-full text-left">{item.labelNepali}</span>
                                )}
                              </div>
                              {item.shortcut && (
                                <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-[10px] text-zinc-500 font-mono shrink-0 relative z-10">
                                  {item.shortcut}
                                </kbd>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="bg-zinc-800/95 backdrop-blur-sm text-zinc-200 border-zinc-700/80 shadow-lg">
                            <p>{item.label} <span className="text-zinc-500">({item.labelNepali})</span></p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer — Refined user profile + Logout */}
        <div className="border-t border-white/[0.06] bg-gradient-to-t from-black/20 to-transparent">
          {isSuperAdmin && (
            <div className="px-3 pt-3">
              <button
                onClick={() => {
                  setIsAdminPortal(true)
                  setSidebarOpen(false)
                  router.push('/admin')
                }}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs transition-premium group",
                  pathname === '/admin'
                    ? 'bg-amber-500/10 text-amber-400 font-medium shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)]'
                    : 'text-amber-500/70 hover:bg-amber-500/[0.06] hover:text-amber-400'
                )}
              >
                <Shield className="h-3.5 w-3.5 transition-premium group-hover:scale-110" />
                Admin Portal
                {pathname === '/admin' && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
                )}
              </button>
            </div>
          )}

          {/* User Profile Section — Premium with gradient ring */}
          {currentUser && (
            <div className="p-3">
              <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl bg-gradient-to-r from-white/[0.03] to-white/[0.01] border border-white/[0.04] transition-premium hover:border-white/[0.08] hover:from-white/[0.05] hover:to-white/[0.02]">
                <Avatar className="h-8 w-8 ring-2 ring-emerald-500/20 ring-offset-1 ring-offset-[#0c0f14]">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white text-[11px] font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                    {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-200 truncate">{currentUser.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge className="text-[9px] px-1.5 py-0 h-3.5 leading-none bg-emerald-500/15 text-emerald-400 border-0 font-semibold">
                      {currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout — Premium with hover effect */}
          <div className="px-3 pb-2">
            <button
              onClick={onLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-premium group border border-transparent hover:border-red-500/10"
            >
              <LogOut className="h-3.5 w-3.5 transition-premium group-hover:scale-110 group-hover:text-red-400" />
              <span className="transition-premium">Logout</span>
            </button>
          </div>

          {/* Version Badge — Refined with emerald glow */}
          <div className="px-4 pb-3 pt-1 flex items-center gap-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
            <span className="text-[10px] text-zinc-600 font-medium">Hisab Pro v1.0</span>
            <Badge className="text-[8px] px-1 py-0 h-3 leading-none bg-emerald-500/10 text-emerald-500/70 border-0 font-semibold ml-1">
              Premium
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
