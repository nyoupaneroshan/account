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
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Pathname to title mapping
const PATH_TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/income': 'Add Income',
  '/expense': 'Add Expense',
  '/accounts': 'Chart of Accounts',
  '/journal': 'Journal Entries',
  '/journal/new': 'New Journal Entry',
  '/ledgers': 'Ledgers',
  '/parties': 'Customers & Suppliers',
  '/parties/new': 'New Party',
  '/invoices': 'Sales Invoices',
  '/invoices/new': 'New Invoice',
  '/purchases': 'Purchase Bills',
  '/purchases/new': 'New Purchase Bill',
  '/inventory': 'Stock Management',
  '/inventory/new': 'New Product',
  '/reports': 'Reports',
  '/settings': 'Settings',
  '/organization': 'Organization',
  '/users': 'Users & Roles',
  '/admin': 'Admin Portal',
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

  // Get page title from current pathname
  const getPageTitle = () => {
    // Try exact match first
    if (PATH_TITLE_MAP[pathname]) return PATH_TITLE_MAP[pathname]
    // Try matching parent path
    const segments = pathname.split('/')
    for (let i = segments.length; i >= 2; i--) {
      const parentPath = segments.slice(0, i).join('/')
      if (PATH_TITLE_MAP[parentPath]) return PATH_TITLE_MAP[parentPath]
    }
    return 'Hisab Pro'
  }

  const isSuperAdmin = currentUser?.role === 'super_admin'
  const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || 'U'

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    }
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4 shrink-0">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu className="h-4 w-4" />
        </Button>

        {/* Org Switcher - visible on desktop */}
        <div className="hidden sm:block">
          <OrgSwitcher />
        </div>

        <h1 className="text-lg font-semibold hidden sm:block">{getPageTitle()}</h1>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md hidden md:flex">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search transactions, parties, accounts..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Quick Add buttons (Simple Mode) */}
        {mode === 'simple' && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => router.push('/income')}
            >
              <PlusCircle className="h-3.5 w-3.5 text-green-600" />
              <span className="hidden sm:inline">Income</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => router.push('/expense')}
            >
              <MinusCircle className="h-3.5 w-3.5 text-red-600" />
              <span className="hidden sm:inline">Expense</span>
            </Button>
          </div>
        )}

        {/* New Journal Entry (Advanced Mode) */}
        {mode === 'advanced' && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={() => router.push('/journal/new')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Entry</span>
          </Button>
        )}

        {/* Language Switcher */}
        <Select value={language} onValueChange={async (val) => {
          setLanguage(val)
          // Persist language preference to database
          try {
            await fetch('/api/user/language', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ language: val }),
            })
          } catch {
            // silently fail - language is already saved in Zustand
          }
        }}>
          <SelectTrigger className="h-8 w-auto gap-1 border-none shadow-none bg-transparent text-xs font-medium">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">EN</SelectItem>
            <SelectItem value="ne">नेपाली</SelectItem>
            <SelectItem value="hi">हिंदी</SelectItem>
          </SelectContent>
        </Select>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {currentUser && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/organization')} className="gap-2">
              <Building2 className="h-4 w-4" />
              Organization
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => router.push('/users')} className="gap-2">
              <UserCog className="h-4 w-4" />
              Users & Roles
            </DropdownMenuItem>

            <DropdownMenuItem onClick={toggleTheme} className="gap-2">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>

            {/* Mobile org switcher */}
            <div className="sm:hidden">
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-xs font-medium text-muted-foreground">Organizations</p>
              </div>
              {userOrganizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => useAppStore.getState().setCurrentOrg(org.id, org.name)}
                  className="gap-2"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {org.name}
                </DropdownMenuItem>
              ))}
            </div>

            {isSuperAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsAdminPortal(true)
                    router.push('/admin')
                  }}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Admin Portal
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
