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
  | 'admin-portal'

interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
  language: string
}

interface UserOrganization {
  id: string
  name: string
  role: string
  plan: string
}

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

  // Auth
  currentUser: CurrentUser | null
  userOrganizations: UserOrganization[]
  setCurrentUser: (user: CurrentUser | null) => void
  setUserOrganizations: (orgs: UserOrganization[]) => void
  logout: () => void

  // Language
  language: string
  setLanguage: (lang: string) => void

  // Admin mode
  isAdminPortal: boolean
  setIsAdminPortal: (val: boolean) => void
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

  // Auth
  currentUser: null,
  userOrganizations: [],
  setCurrentUser: (user) => set({ currentUser: user }),
  setUserOrganizations: (orgs) => set({ userOrganizations: orgs }),
  logout: () => set({
    currentUser: null,
    userOrganizations: [],
    currentOrgId: null,
    currentOrgName: 'My Business',
    isAdminPortal: false,
    activeModule: 'dashboard',
  }),

  // Language
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),

  // Admin mode
  isAdminPortal: false,
  setIsAdminPortal: (val) => set({ isAdminPortal: val }),
}))
