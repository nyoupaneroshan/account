'use client'

import { useAppStore } from '@/store/app-store'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { AuthScreen } from '@/components/auth/auth-screen'
import { PricingPlans } from '@/components/auth/pricing-plans'
import { AdminPortal } from '@/components/admin/admin-portal'
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
import { useState } from 'react'
import { cn } from '@/lib/utils'

type AppView = 'auth' | 'pricing' | 'app' | 'admin'

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
    case 'admin-portal':
      return <AdminPortal />
    default:
      return <DashboardView />
  }
}

export default function HomePage() {
  const { currentUser, currentOrgId, isAdminPortal, sidebarOpen } = useAppStore()
  const [pricingView, setPricingView] = useState(false)

  // Compute view directly from store state (no useEffect + setState)
  let view: AppView
  if (pricingView) {
    view = 'pricing'
  } else if (isAdminPortal) {
    view = 'admin'
  } else if (currentUser && currentOrgId) {
    view = 'app'
  } else {
    view = 'auth'
  }

  // Admin Portal
  if (view === 'admin') {
    return <AdminPortal />
  }

  // Pricing Plans
  if (view === 'pricing') {
    return (
      <PricingPlans
        onBack={() => setPricingView(false)}
        onSelectPlan={() => setPricingView(false)}
      />
    )
  }

  // Auth Screen
  if (view === 'auth') {
    return (
      <AuthScreen onShowPricing={() => setPricingView(true)} />
    )
  }

  // Main App
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
