import { create } from 'zustand'

export type AppMode = 'simple' | 'advanced'
export type AppModule =
  | 'dashboard'
  | 'simple-income'
  | 'simple-expense'
  | 'chart-of-accounts'
  | 'journal-entries'
  | 'journal-entry-new'
  | 'ledgers'
  | 'parties'
  | 'party-new'
  | 'invoices'
  | 'invoice-new'
  | 'purchases'
  | 'purchase-new'
  | 'inventory'
  | 'product-new'
  | 'reports'
  | 'trial-balance'
  | 'profit-loss'
  | 'balance-sheet'
  | 'cash-flow'
  | 'vat-report'
  | 'tds-report'
  | 'settings'
  | 'organization'
  | 'users'

interface AppState {
  // Mode
  mode: AppMode
  setMode: (mode: AppMode) => void
  toggleMode: () => void

  // Active Module
  activeModule: AppModule
  setActiveModule: (module: AppModule) => void

  // Organization
  currentOrgId: string | null
  currentOrgName: string
  setCurrentOrg: (id: string, name: string) => void

  // Sidebar
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void

  // Fiscal Year
  currentFiscalYear: string
  setCurrentFiscalYear: (fy: string) => void

  // Quick entry modal (simple mode)
  showQuickEntry: boolean
  quickEntryType: 'income' | 'expense'
  setShowQuickEntry: (show: boolean, type?: 'income' | 'expense') => void
}

export const useAppStore = create<AppState>((set) => ({
  mode: 'simple',
  setMode: (mode) => set({ mode }),
  toggleMode: () => set((state) => ({ mode: state.mode === 'simple' ? 'advanced' : 'simple' })),

  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),

  currentOrgId: null,
  currentOrgName: 'My Business',
  setCurrentOrg: (id, name) => set({ currentOrgId: id, currentOrgName: name }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  currentFiscalYear: '2081/82',
  setCurrentFiscalYear: (fy) => set({ currentFiscalYear: fy }),

  showQuickEntry: false,
  quickEntryType: 'income',
  setShowQuickEntry: (show, type) => set({ showQuickEntry: show, quickEntryType: type || 'income' }),
}))
