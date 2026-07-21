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
  Keyboard,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { authFetch } from '@/lib/session'

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

  const [searchFocused, setSearchFocused] = useState(false)

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
    <header className="h-14 border-b border-white/[0.06] bg-[#0c0f14]/80 backdrop-blur-xl flex items-center justify-between px-4 gap-4 shrink-0 sticky top-0 z-30 relative overflow-hidden">
      {/* Subtle emerald gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

      {/* Left section - Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile Menu Toggle — Improved with emerald accent */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 md:hidden text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-premium border border-transparent hover:border-emerald-500/10",
            sidebarOpen && "text-emerald-400 bg-emerald-500/10 border-emerald-500/10"
          )}
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Breadcrumb Navigation — Refined with emerald accent */}
        <Breadcrumb className="hidden sm:flex">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink
                asChild
                className="text-zinc-500 hover:text-emerald-400 transition-premium cursor-pointer"
              >
                <span onClick={() => router.push('/dashboard')} className="flex items-center gap-1">
                  <Home className="h-3.5 w-3.5" />
                </span>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {breadcrumbSegments.map((segment) => (
              <span key={segment.href} className="contents">
                <BreadcrumbSeparator className="text-zinc-600">
                  <ChevronRight className="h-3 w-3" />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  {segment.isLast ? (
                    <BreadcrumbPage className="text-zinc-200 font-medium">
                      <span className="flex items-center gap-1.5">
                        {segment.label}
                        <Badge
                          className={cn(
                            "text-[8px] px-1 py-0 h-3.5 leading-none font-bold uppercase tracking-wider border-0",
                            mode === 'simple'
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-violet-500/15 text-violet-400'
                          )}
                        >
                          {mode === 'simple' ? 'SIM' : 'ADV'}
                        </Badge>
                      </span>
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      asChild
                      className="text-zinc-500 hover:text-emerald-400 transition-premium cursor-pointer"
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

        {/* Mobile: just show page title with mode badge */}
        <h1 className="text-sm font-medium text-zinc-200 sm:hidden truncate flex items-center gap-1.5">
          {breadcrumbSegments[breadcrumbSegments.length - 1]?.label || 'Dashboard'}
          <Badge
            className={cn(
              "text-[7px] px-1 py-0 h-3 leading-none font-bold uppercase tracking-wider border-0 shrink-0",
              mode === 'simple'
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-violet-500/15 text-violet-400'
            )}
          >
            {mode === 'simple' ? 'SIM' : 'ADV'}
          </Badge>
        </h1>

        {/* Org Switcher - desktop */}
        <div className="hidden lg:block ml-2">
          <OrgSwitcher />
        </div>
      </div>

      {/* Center - Search with premium focus state */}
      <div className="flex-1 max-w-sm hidden md:flex">
        <div className={cn(
          "relative w-full group transition-premium rounded-lg",
          searchFocused && "scale-[1.02]"
        )}>
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 transition-premium",
            searchFocused ? "text-emerald-400" : "text-zinc-500"
          )} />
          <input
            type="text"
            placeholder="Search transactions, parties..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={cn(
              "w-full pl-9 pr-12 py-1.5 text-sm rounded-lg border bg-white/[0.03] text-zinc-300 placeholder:text-zinc-600 focus:outline-none transition-premium premium-input",
              searchFocused
                ? "border-emerald-500/30 bg-white/[0.05] shadow-[0_0_0_3px_rgba(16,185,129,0.08),0_0_20px_rgba(16,185,129,0.03)]"
                : "border-white/[0.06] hover:border-white/10"
            )}
          />
          <kbd className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded border transition-premium hidden lg:inline-flex items-center gap-0.5",
            searchFocused
              ? "text-emerald-500/60 bg-emerald-500/5 border-emerald-500/10"
              : "text-zinc-600 bg-white/5 border-white/5"
          )}>
            <Keyboard className="h-2.5 w-2.5" />
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5">

        {/* Quick Add buttons (Simple Mode) — Better styling */}
        {mode === 'simple' && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/10 transition-premium"
              onClick={() => router.push('/income')}
            >
              <PlusCircle className="h-3.5 w-3.5 transition-premium group-hover:scale-110" />
              <span className="hidden sm:inline">Income</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/10 transition-premium"
              onClick={() => router.push('/expense')}
            >
              <MinusCircle className="h-3.5 w-3.5 transition-premium group-hover:scale-110" />
              <span className="hidden sm:inline">Expense</span>
            </Button>
          </div>
        )}

        {/* New Journal Entry (Advanced Mode) — Better styling */}
        {mode === 'advanced' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/10 transition-premium"
            onClick={() => router.push('/journal/new')}
          >
            <Plus className="h-3.5 w-3.5 transition-premium group-hover:scale-110" />
            <span className="hidden sm:inline">New Entry</span>
          </Button>
        )}

        {/* Language Switcher — Smooth transition with emerald accent */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1 text-xs transition-premium border border-transparent",
            language === 'ne'
              ? "text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/10"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5 hover:border-white/5"
          )}
          onClick={() => {
            const next = language === 'en' ? 'ne' : 'en'
            setLanguage(next)
            try {
              authFetch('/api/user/language', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: next }),
              })
            } catch {
              // silently fail
            }
          }}
        >
          <Globe className={cn(
            "h-3.5 w-3.5 transition-premium",
            language === 'ne' ? "text-emerald-400" : ""
          )} />
          <span className="hidden sm:inline font-medium">{language === 'en' ? 'EN' : 'नेपाली'}</span>
        </Button>

        {/* Notification Bell — Premium with emerald glow indicator */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 relative transition-premium border border-transparent hover:border-white/5">
          <Bell className="h-4 w-4 transition-premium" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] ring-2 ring-[#0c0f14] transition-premium animate-pulse" />
        </Button>

        {/* User Menu — Polished with gradient ring avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-white/5 transition-premium group">
              <Avatar className="h-7 w-7 ring-2 ring-emerald-500/20 ring-offset-1 ring-offset-[#0c0f14] group-hover:ring-emerald-500/40 transition-premium">
                <AvatarFallback className="text-[10px] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#1c1c1f]/95 backdrop-blur-xl border-white/[0.08] shadow-2xl rounded-xl overflow-hidden">
            {currentUser && (
              <>
                <div className="px-3 py-2.5 bg-gradient-to-r from-emerald-500/[0.06] to-transparent">
                  <p className="text-sm font-medium text-zinc-200">{currentUser.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{currentUser.email}</p>
                </div>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
              </>
            )}

            <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2.5 text-zinc-300 focus:text-zinc-100 focus:bg-white/[0.04] transition-premium py-2 cursor-pointer">
              <Settings className="h-4 w-4 text-zinc-500" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/organization')} className="gap-2.5 text-zinc-300 focus:text-zinc-100 focus:bg-white/[0.04] transition-premium py-2 cursor-pointer">
              <Building2 className="h-4 w-4 text-zinc-500" />
              Organization
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/users')} className="gap-2.5 text-zinc-300 focus:text-zinc-100 focus:bg-white/[0.04] transition-premium py-2 cursor-pointer">
              <UserCog className="h-4 w-4 text-zinc-500" />
              Users & Roles
            </DropdownMenuItem>

            <DropdownMenuItem onClick={toggleTheme} className="gap-2.5 text-zinc-300 focus:text-zinc-100 focus:bg-white/[0.04] transition-premium py-2 cursor-pointer">
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-zinc-500" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>

            {/* Mobile org switcher */}
            <div className="sm:hidden">
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <div className="px-3 py-1.5">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Organizations</p>
              </div>
              {userOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => useAppStore.getState().setCurrentOrg(org.id, org.name)}
                  className="gap-2 text-zinc-300 focus:text-zinc-100 focus:bg-white/[0.04] transition-premium py-2 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                  {org.name}
                </DropdownMenuItem>
              ))}
            </div>

            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator className="bg-white/[0.06]" />
                <DropdownMenuItem
                  onClick={() => {
                    setIsAdminPortal(true)
                    router.push('/admin')
                  }}
                  className="gap-2.5 text-amber-400 focus:text-amber-300 focus:bg-amber-500/[0.06] transition-premium py-2 cursor-pointer"
                >
                  <Shield className="h-4 w-4" />
                  Admin Portal
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="bg-white/[0.06]" />

            <DropdownMenuItem onClick={handleLogout} className="gap-2.5 text-red-400 focus:text-red-300 focus:bg-red-500/[0.06] transition-premium py-2 cursor-pointer">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
