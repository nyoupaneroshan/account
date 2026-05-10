'use client'

import { useAppStore, AppMode, AppModule } from '@/store/app-store'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'

interface NavItem {
  id: AppModule
  label: string
  labelNepali: string
  icon: React.ElementType
  mode?: AppMode[] // which modes show this item
}

interface NavGroup {
  label: string
  labelNepali: string
  items: NavItem[]
  defaultOpen?: boolean
}

const SIMPLE_NAV: NavGroup[] = [
  {
    label: 'Overview',
    labelNepali: 'अवलोकन',
    items: [
      { id: 'dashboard', label: 'Dashboard', labelNepali: 'ड्यासबोर्ड', icon: LayoutDashboard },
    ],
    defaultOpen: true,
  },
  {
    label: 'Quick Entry',
    labelNepali: 'छिटो प्रविष्टि',
    items: [
      { id: 'simple-income', label: 'Add Income', labelNepali: 'आम्दानी थप्नुहोस्', icon: PlusCircle },
      { id: 'simple-expense', label: 'Add Expense', labelNepali: 'खर्च थप्नुहोस्', icon: MinusCircle },
    ],
    defaultOpen: true,
  },
  {
    label: 'People',
    labelNepali: 'मानिसहरू',
    items: [
      { id: 'parties', label: 'Customers & Suppliers', labelNepali: 'ग्राहक र आपूर्तिकर्ता', icon: Users },
    ],
    defaultOpen: true,
  },
  {
    label: 'Billing',
    labelNepali: 'बिलिङ',
    items: [
      { id: 'invoices', label: 'Invoices', labelNepali: 'इनभ्वाइस', icon: Receipt },
      { id: 'purchases', label: 'Purchases', labelNepali: 'खरिद', icon: ShoppingCart },
    ],
    defaultOpen: true,
  },
  {
    label: 'Reports',
    labelNepali: 'रिपोर्ट',
    items: [
      { id: 'reports', label: 'All Reports', labelNepali: 'सबै रिपोर्ट', icon: BarChart3 },
    ],
    defaultOpen: false,
  },
]

const ADVANCED_NAV: NavGroup[] = [
  {
    label: 'Overview',
    labelNepali: 'अवलोकन',
    items: [
      { id: 'dashboard', label: 'Dashboard', labelNepali: 'ड्यासबोर्ड', icon: LayoutDashboard },
    ],
    defaultOpen: true,
  },
  {
    label: 'Accounting',
    labelNepali: 'लेखांकन',
    items: [
      { id: 'chart-of-accounts', label: 'Chart of Accounts', labelNepali: 'खाता योजना', icon: BookOpen },
      { id: 'journal-entries', label: 'Journal Entries', labelNepali: 'जर्नल प्रविष्टि', icon: FileText },
      { id: 'ledgers', label: 'Ledgers', labelNepali: 'खाता खाता', icon: FileSpreadsheet },
    ],
    defaultOpen: true,
  },
  {
    label: 'Sales & Purchase',
    labelNepali: 'बिक्री र खरिद',
    items: [
      { id: 'invoices', label: 'Sales Invoices', labelNepali: 'बिक्री इनभ्वाइस', icon: Receipt },
      { id: 'purchases', label: 'Purchase Bills', labelNepali: 'खरिद बिल', icon: Truck },
    ],
    defaultOpen: true,
  },
  {
    label: 'Inventory',
    labelNepali: 'इन्भेन्ट्री',
    items: [
      { id: 'inventory', label: 'Stock Management', labelNepali: 'स्टक व्यवस्थापन', icon: Package },
    ],
    defaultOpen: false,
  },
  {
    label: 'Parties',
    labelNepali: 'पक्षहरू',
    items: [
      { id: 'parties', label: 'Customers & Suppliers', labelNepali: 'ग्राहक र आपूर्तिकर्ता', icon: Users },
    ],
    defaultOpen: false,
  },
  {
    label: 'Reports',
    labelNepali: 'रिपोर्ट',
    items: [
      { id: 'trial-balance', label: 'Trial Balance', labelNepali: 'ट्रायल ब्यालेन्स', icon: Scale },
      { id: 'profit-loss', label: 'Profit & Loss', labelNepali: 'नाफा र घाटा', icon: TrendingUp },
      { id: 'balance-sheet', label: 'Balance Sheet', labelNepali: 'ब्यालेन्स सिट', icon: Layers },
      { id: 'cash-flow', label: 'Cash Flow', labelNepali: 'नगद प्रवाह', icon: DollarSign },
      { id: 'vat-report', label: 'VAT Report', labelNepali: 'भ्याट रिपोर्ट', icon: Calculator },
      { id: 'tds-report', label: 'TDS Report', labelNepali: 'टीडीएस रिपोर्ट', icon: ClipboardList },
    ],
    defaultOpen: false,
  },
  {
    label: 'Settings',
    labelNepali: 'सेटिङ',
    items: [
      { id: 'organization', label: 'Organization', labelNepali: 'संस्था', icon: Building2 },
      { id: 'users', label: 'Users & Roles', labelNepali: 'प्रयोगकर्ता', icon: UserCog },
      { id: 'settings', label: 'Settings', labelNepali: 'सेटिङ', icon: Settings },
    ],
    defaultOpen: false,
  },
]

export function AppSidebar() {
  const { mode, setMode, activeModule, setActiveModule, currentOrgName, currentFiscalYear, currentUser, setIsAdminPortal } = useAppStore()
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const navGroups = mode === 'simple' ? SIMPLE_NAV : ADVANCED_NAV
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(
      navGroups.filter(g => g.defaultOpen).map(g => [g.label, true])
    )
  )

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Organization Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            HP
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">{currentOrgName}</h3>
            <p className="text-xs text-muted-foreground">FY: {currentFiscalYear}</p>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-medium", mode === 'simple' ? 'text-primary' : 'text-muted-foreground')}>
              Simple
            </span>
            <Switch
              checked={mode === 'advanced'}
              onCheckedChange={(checked) => setMode(checked ? 'advanced' : 'simple')}
              className="data-[state=checked]:bg-primary"
            />
            <span className={cn("text-xs font-medium", mode === 'advanced' ? 'text-primary' : 'text-muted-foreground')}>
              Advanced
            </span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {mode === 'simple' ? 'Easy entry, auto-accounting' : 'Full double-entry system'}
        </p>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="p-2 space-y-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {openGroups[group.label] ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>{group.label}</span>
                <span className="text-[10px] text-muted-foreground/60 ml-1">({group.labelNepali})</span>
              </button>
              {openGroups[group.label] && (
                <div className="ml-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const isActive = activeModule === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveModule(item.id)}
                        className={cn(
                          'flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-sm transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                            : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="flex flex-col items-start min-w-0">
                          <span className="truncate w-full text-left">{item.label}</span>
                          {isActive && (
                            <span className="text-[10px] opacity-80 truncate w-full text-left">{item.labelNepali}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {isSuperAdmin && (
          <button
            onClick={() => setIsAdminPortal(true)}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-primary hover:bg-accent transition-colors mb-2"
          >
            <Shield className="h-3.5 w-3.5" />
            Admin Portal
          </button>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ArrowRightLeft className="h-3 w-3" />
          <span>Hisab Pro v1.0</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Nepal Accounting System</p>
      </div>
    </div>
  )
}
