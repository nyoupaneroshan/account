'use client'

import { useAppStore } from '@/store/app-store'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import { SimpleIncome } from '@/components/simple-mode/simple-income'
import { SimpleExpense } from '@/components/simple-mode/simple-expense'
import { ChartOfAccounts } from '@/components/accounting/chart-of-accounts'
import { JournalEntries } from '@/components/accounting/journal-entries'
import { JournalEntryNew } from '@/components/accounting/journal-entry-new'
import { LedgerView } from '@/components/accounting/ledger-view'
import { PartyList } from '@/components/parties/party-list'
import { InvoiceList } from '@/components/sales/invoice-list'
import { InvoiceForm } from '@/components/sales/invoice-form'
import { PurchaseList } from '@/components/purchase/purchase-list'
import { PurchaseForm } from '@/components/purchase/purchase-form'
import { InventoryView } from '@/components/inventory/inventory-view'
import { ReportView } from '@/components/reports/report-view'
import { SettingsView } from '@/components/settings/settings-view'
import { OrganizationView } from '@/components/organizations/organization-view'
import { UsersView } from '@/components/settings/users-view'
import { ProductForm } from '@/components/inventory/product-form'
import { PartyForm } from '@/components/parties/party-form'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

function ModuleRenderer() {
  const { activeModule } = useAppStore()

  switch (activeModule) {
    case 'dashboard':
      return <DashboardView />
    case 'simple-income':
      return <SimpleIncome />
    case 'simple-expense':
      return <SimpleExpense />
    case 'chart-of-accounts':
      return <ChartOfAccounts />
    case 'journal-entries':
      return <JournalEntries />
    case 'journal-entry-new':
      return <JournalEntryNew />
    case 'ledgers':
      return <LedgerView />
    case 'parties':
      return <PartyList />
    case 'party-new':
      return <PartyForm />
    case 'invoices':
      return <InvoiceList />
    case 'invoice-new':
      return <InvoiceForm />
    case 'purchases':
      return <PurchaseList />
    case 'purchase-new':
      return <PurchaseForm />
    case 'inventory':
      return <InventoryView />
    case 'product-new':
      return <ProductForm />
    case 'reports':
    case 'trial-balance':
    case 'profit-loss':
    case 'balance-sheet':
    case 'cash-flow':
    case 'vat-report':
    case 'tds-report':
      return <ReportView />
    case 'settings':
      return <SettingsView />
    case 'organization':
      return <OrganizationView />
    case 'users':
      return <UsersView />
    default:
      return <DashboardView />
  }
}

function SetupScreen({ onSetup }: { onSetup: (orgId: string, orgName: string) => void }) {
  const [loading, setLoading] = useState(false)
  const [orgName, setOrgName] = useState('My Business')

  const handleSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, mode: 'simple' }),
      })
      const data = await res.json()
      if (data.success) {
        onSetup(data.organizationId, orgName)
      }
    } catch (err) {
      console.error('Setup failed:', err)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-4">
            HP
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Hisab Pro</h1>
          <p className="text-muted-foreground mt-2">Nepal Accounting System</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Easy like Excel, Powerful like ERP</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Set Up Your Business</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Business Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="e.g. Sharma Trading"
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-foreground">Setup includes:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>✅ Nepal Chart of Accounts (NFRS compliant)</li>
                <li>✅ VAT 13% configuration</li>
                <li>✅ TDS rate setup</li>
                <li>✅ Default warehouse</li>
                <li>✅ Sample data to get started</li>
              </ul>
            </div>

            <button
              onClick={handleSetup}
              disabled={loading || !orgName.trim()}
              className="w-full py-2.5 px-4 bg-primary text-primary-foreground rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up...' : 'Create Organization & Start'}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Dual-mode: Simple (for beginners) + Advanced (for accountants)
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Supports English & Nepali • VAT/TDS Compliant • IRD Ready
          </p>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const { currentOrgId, setCurrentOrg, sidebarOpen } = useAppStore()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check if an organization already exists
    fetch('/api/seed')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCurrentOrg(data[0].id, data[0].name)
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [setCurrentOrg])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-3 animate-pulse">
            HP
          </div>
          <p className="text-muted-foreground text-sm">Loading Hisab Pro...</p>
        </div>
      </div>
    )
  }

  if (!currentOrgId) {
    return <SetupScreen onSetup={(id, name) => setCurrentOrg(id, name)} />
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "shrink-0 border-r border-border transition-all duration-300",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <AppSidebar />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          <ModuleRenderer />
        </main>
      </div>
    </div>
  )
}
