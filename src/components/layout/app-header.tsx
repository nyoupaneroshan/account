'use client'

import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import {
  Menu,
  Bell,
  Search,
  Plus,
  PlusCircle,
  MinusCircle,
  Moon,
  Sun,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function AppHeader() {
  const { mode, toggleMode, setSidebarOpen, sidebarOpen, setShowQuickEntry, setActiveModule, activeModule } = useAppStore()
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

  // Get module title
  const getModuleTitle = () => {
    const titles: Record<string, string> = {
      dashboard: mode === 'simple' ? 'Dashboard' : 'Dashboard',
      'simple-income': 'Add Income',
      'simple-expense': 'Add Expense',
      'chart-of-accounts': 'Chart of Accounts',
      'journal-entries': 'Journal Entries',
      'journal-entry-new': 'New Journal Entry',
      ledgers: 'Ledgers',
      parties: 'Customers & Suppliers',
      'party-new': 'New Party',
      invoices: 'Sales Invoices',
      'invoice-new': 'New Invoice',
      purchases: 'Purchase Bills',
      'purchase-new': 'New Purchase Bill',
      inventory: 'Stock Management',
      'product-new': 'New Product',
      reports: 'Reports',
      'trial-balance': 'Trial Balance',
      'profit-loss': 'Profit & Loss',
      'balance-sheet': 'Balance Sheet',
      'cash-flow': 'Cash Flow',
      'vat-report': 'VAT Report',
      'tds-report': 'TDS Report',
      settings: 'Settings',
      organization: 'Organization',
      users: 'Users & Roles',
    }
    return titles[activeModule] || 'Hisab Pro'
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 gap-4">
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
        <h1 className="text-lg font-semibold hidden sm:block">{getModuleTitle()}</h1>
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
              onClick={() => setActiveModule('simple-income')}
            >
              <PlusCircle className="h-3.5 w-3.5 text-green-600" />
              <span className="hidden sm:inline">Income</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => setActiveModule('simple-expense')}
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
            onClick={() => setActiveModule('journal-entry-new')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Entry</span>
          </Button>
        )}

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
                  A
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setActiveModule('settings')}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleTheme}>
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveModule('organization')}>
              Organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
