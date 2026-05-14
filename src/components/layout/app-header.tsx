'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { OrgSwitcher } from '@/components/auth/org-switcher'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Menu,
  Bell,
  Search,
  Plus,
  PlusCircle,
  MinusCircle,
  Moon,
  Sun,
  Shield,
  LogOut,
  Settings,
  Building2,
  UserCog,
  Globe,
  ChevronRight,
  Home,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Pathname to breadcrumb mapping
const PATH_SEGMENT_MAP: Record<string, string> = {
  'dashboard': 'Dashboard',
  'income': 'Add Income',
  'expense': 'Add Expense',
  'accounts': 'Chart of Accounts',
  'journal': 'Journal Entries',
  'new': 'New',
  'ledgers': 'Ledgers',
  'parties': 'Parties',
  'invoices': 'Invoices',
  'purchases': 'Purchases',
  'inventory': 'Inventory',
  'reports': 'Reports',
  'settings': 'Settings',
  'organization': 'Organization',
  'users': 'Users & Roles',
  'admin': 'Admin Portal',
}

export function AppHeader({ onLogout }: { onLogout?: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  const {
    mode,
    setSidebarOpen,
    sidebarOpen,
    currentUser,
    setIsAdminPortal,
    userOrganizations,
    language,
    setLanguage,
  } = useAppStore()

  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('hisab-theme') === 'dark'
    }
    return false
  })

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('hisab-theme', next ? 'dark' : 'light')
  }

  // Build breadcrumb segments from pathname
  const breadcrumbSegments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, arr) => ({
      label: PATH_SEGMENT_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1),
      href: '/' + arr.slice(0, index + 1).join('/'),
      isLast: index === arr.length - 1,
    }))

  const isSuperAdmin = currentUser?.role === 'super_admin'
  const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || 'U'

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  return (
    <header className="h-14 border-b border-white/5 bg-[#0c0f14]/80 backdrop-blur-xl flex items-center justify-between px-4 gap-4 shrink-0 sticky top-0 z-30">
      {/* Left section - Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Breadcrumb Navigation */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <span onClick={() => router.push('/dashboard')}>
                  <Home className="h-3.5 w-3.5" />
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbSegments.map((segment) => (
              <span key={segment.href} className="contents">
                <BreadcrumbSeparator className="text-zinc-600" />
                <BreadcrumbItem>
                  {segment.isLast ? (
                    <BreadcrumbPage className="text-zinc-200 font-medium">
                      {segment.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      asChild
                      className="text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <span onClick={() => router.push(segment.href)}>
                        {segment.label}
                      </span>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </span>
            ))}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Mobile: just show page title */}
        <h1 className="text-sm font-medium text-zinc-200 sm:hidden truncate">
          {breadcrumbSegments[breadcrumbSegments.length - 1]?.label || 'Dashboard'}
        </h1>

        {/* Org Switcher - desktop */}
        <div className="hidden lg:block ml-2">
          <OrgSwitcher />
        </div>
      </div>

      {/* Center - Search (decorative) */}
      <div className="flex-1 max-w-sm hidden md:flex">
        <div className="relative w-full group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            type="text"
            placeholder="Search transactions, parties..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-white/5 bg-white/[0.03] text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:border-emerald-500/20 focus:bg-white/[0.05] transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 hidden lg:inline">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5">
        {/* Quick Add buttons (Simple Mode) */}
        {mode === 'simple' && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => router.push('/income')}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Income</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => router.push('/expense')}
            >
              <MinusCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Expense</span>
            </Button>
          </div>
        )}

        {/* New Journal Entry (Advanced Mode) */}
        {mode === 'advanced' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => router.push('/journal/new')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Entry</span>
          </Button>
        )}

        {/* Language Switcher */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          onClick={() => {
            const next = language === 'en' ? 'ne' : 'en'
            setLanguage(next)
            try {
              fetch('/api/user/language', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: next }),
              })
            } catch {
              // silently fail
            }
          }}
        >
          <Globe className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{language === 'en' ? 'EN' : 'नेपाली'}</span>
        </Button>

        {/* Notification Bell (decorative) */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-[#0c0f14]" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5">
              <Avatar className="h-7 w-7 ring-1 ring-white/10">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-600 to-emerald-800 text-white font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800">
            {currentUser && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-zinc-200">{currentUser.name}</p>
                  <p className="text-xs text-zinc-500">{currentUser.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-zinc-800" />
              </>
            )}

            <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2 text-zinc-300 focus:text-zinc-100 focus:bg-white/5">
              <Settings className="h-4 w-4 text-zinc-500" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/organization')} className="gap-2 text-zinc-300 focus:text-zinc-100 focus:bg-white/5">
              <Building2 className="h-4 w-4 text-zinc-500" />
              Organization
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/users')} className="gap-2 text-zinc-300 focus:text-zinc-100 focus:bg-white/5">
              <UserCog className="h-4 w-4 text-zinc-500" />
              Users & Roles
            </DropdownMenuItem>

            <DropdownMenuItem onClick={toggleTheme} className="gap-2 text-zinc-300 focus:text-zinc-100 focus:bg-white/5">
              {isDark ? <Sun className="h-4 w-4 text-zinc-500" /> : <Moon className="h-4 w-4 text-zinc-500" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>

            {/* Mobile org switcher */}
            <div className="sm:hidden">
              <DropdownMenuSeparator className="bg-zinc-800" />
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-zinc-500">Organizations</p>
              </div>
              {userOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => useAppStore.getState().setCurrentOrg(org.id, org.name)}
                  className="gap-2 text-zinc-300 focus:text-zinc-100 focus:bg-white/5"
                >
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  {org.name}
                </DropdownMenuItem>
              ))}
            </div>

            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator className="bg-zinc-800" />
                <DropdownMenuItem
                  onClick={() => {
                    setIsAdminPortal(true)
                    router.push('/admin')
                  }}
                  className="gap-2 text-amber-400 focus:text-amber-300 focus:bg-amber-500/5"
                >
                  <Shield className="h-4 w-4" />
                  Admin Portal
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="bg-zinc-800" />

            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-400 focus:text-red-300 focus:bg-red-500/5">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
