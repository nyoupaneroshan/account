import { create } from 'zustand'

export type AppMode = 'simple' | 'advanced'
export type AppModule =
  | 'dashboard'
  | 'simple-income'
  | 'simple-expense'
  | 'khata'
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
  | 'tax-registers'
  | 'cbms-monitor'
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

// ──────────────────────────────────────────────
// Persisted mode helper
// ──────────────────────────────────────────────

const MODE_STORAGE_KEY = 'hisab-app-mode'

function loadPersistedMode(): AppMode {
  if (typeof window === 'undefined') return 'simple'
  try {
    const stored = localStorage.getItem(MODE_STORAGE_KEY)
    if (stored === 'advanced' || stored === 'simple') return stored
  } catch {
    // ignore
  }
  return 'simple'
}

function persistMode(mode: AppMode) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    // ignore
  }
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
  getCurrentOrgRole: () => string

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

  // Session refresh - allows components to trigger a session data refresh
  refreshSession: () => Promise<void>
  setRefreshSession: (fn: () => Promise<void>) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  mode: loadPersistedMode(),
  setMode: (mode) => {
    persistMode(mode)
    set({ mode })
  },
  toggleMode: () => set((state) => {
    const newMode = state.mode === 'simple' ? 'advanced' : 'simple'
    persistMode(newMode)
    return { mode: newMode }
  }),

  activeModule: 'dashboard',
  setActiveModule: (module) => set({ activeModule: module }),

  currentOrgId: null,
  currentOrgName: 'My Business',
  setCurrentOrg: (id, name) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('hisab-current-org', id)
      } catch {
        // ignore
      }
    }
    set({ currentOrgId: id, currentOrgName: name })
  },
  getCurrentOrgRole: () => {
    const { currentOrgId, userOrganizations } = get()
    const org = userOrganizations.find((o) => o.id === currentOrgId)
    return org?.role || 'staff'
  },

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

  // Session refresh
  refreshSession: async () => {},
  setRefreshSession: (fn) => set({ refreshSession: fn }),
}))
