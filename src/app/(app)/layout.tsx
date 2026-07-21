'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/app-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { CLIENT_SESSION_KEY, getSessionHeaders } from '@/lib/session'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { CommandPalette } from '@/components/shared/command-palette'
import { ShortcutCheatsheet } from '@/components/shared/shortcut-cheatsheet'
import { OrgSwitcherDialog } from '@/components/shared/org-switcher-dialog'

const AppSidebar = dynamic(
  () => import('@/components/layout/app-sidebar').then((mod) => ({ default: mod.AppSidebar })),
  { ssr: false, loading: () => <div className="w-72 h-full bg-[#0c0f14] animate-pulse" /> }
)
const AppHeader = dynamic(
  () => import('@/components/layout/app-header').then((mod) => ({ default: mod.AppHeader })),
  { ssr: false, loading: () => <div className="h-14 border-b border-white/5 bg-[#0c0f14]/80 animate-pulse" /> }
)
const QuickActionsBar = dynamic(
  () => import('@/components/shared/quick-actions-bar').then((mod) => ({ default: mod.QuickActionsBar })),
  { ssr: false }
)

// Key for tracking recent login to prevent redirect loops
const JUST_LOGGED_IN_KEY = 'hisab-just-logged-in'

// Keys for persisting user data in localStorage (survives page reload)
const USER_DATA_KEY = 'hisab-user-data'
const ORGS_DATA_KEY = 'hisab-orgs-data'

/**
 * Save user/org data to localStorage so we can restore without API call
 */
function saveUserDataLocally(user: { id: string; email: string; name: string; role: string; language: string }, orgs: { id: string; name: string; role: string; plan: string }[]) {
  try {
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(user))
    localStorage.setItem(ORGS_DATA_KEY, JSON.stringify(orgs))
  } catch {
    // ignore
  }
}

/**
 * Load user/org data from localStorage
 */
function loadUserDataLocally(): { user: { id: string; email: string; name: string; role: string; language: string } | null; orgs: { id: string; name: string; role: string; plan: string }[] | null } {
  try {
    const userData = localStorage.getItem(USER_DATA_KEY)
    const orgsData = localStorage.getItem(ORGS_DATA_KEY)
    return {
      user: userData ? JSON.parse(userData) : null,
      orgs: orgsData ? JSON.parse(orgsData) : null,
    }
  } catch {
    return { user: null, orgs: null }
  }
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const {
    currentUser,
    currentOrgId,
    sidebarOpen,
    setSidebarOpen,
    mode,
    setCurrentUser,
    setUserOrganizations,
    setCurrentOrg,
    setLanguage,
    setRefreshSession,
    logout,
    toggleMode,
  } = useAppStore()

  const [initializing, setInitializing] = useState(true)
  const [shouldRedirect, setShouldRedirect] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false)
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false)
  const hasRestoredSession = useRef(false)

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onQuickIncome: () => {
      if (mode === 'simple') router.push('/income')
      else router.push('/journal/new')
    },
    onQuickExpense: () => {
      if (mode === 'simple') router.push('/expense')
      else router.push('/journal/new')
    },
    onNewInvoice: () => router.push('/invoices/new'),
    onNewPurchaseBill: () => router.push('/purchases/new'),
    onNewParty: () => router.push('/parties/new'),
    onToggleSidebar: () => setSidebarOpen(!sidebarOpen),
    onOpenCommandPalette: () => setCommandPaletteOpen(true),
    onCloseModal: () => {
      setCommandPaletteOpen(false)
      setCheatsheetOpen(false)
      setOrgSwitcherOpen(false)
    },
    onOpenCheatsheet: () => setCheatsheetOpen(true),
    onToggleMode: () => toggleMode(),
    onOrgSwitcher: () => setOrgSwitcherOpen(true),
    onReports: () => router.push('/reports'),
    onAcceptForm: () => {
      const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"], button[data-action="save"], button[data-action="accept"]')
      if (submitBtn) {
        submitBtn.click()
      }
    },
    onCancelForm: () => {
      const cancelBtn = document.querySelector<HTMLButtonElement>('button[data-action="cancel"], button[data-action="close"]')
      if (cancelBtn) {
        cancelBtn.click()
      } else {
        router.back()
      }
    },
    onCreateNew: () => {
      const pathMap: Record<string, string> = {
        '/invoices': '/invoices/new',
        '/purchases': '/purchases/new',
        '/parties': '/parties/new',
        '/journal': '/journal/new',
        '/inventory': '/inventory/new',
        '/income': '/income',
        '/expense': '/expense',
      }
      const currentPath = window.location.pathname
      const newPath = pathMap[currentPath]
      if (newPath) router.push(newPath)
    },
    onSaveRecord: () => {
      const submitBtn = document.querySelector<HTMLButtonElement>('button[type="submit"]')
      if (submitBtn) submitBtn.click()
    },
    onPrint: () => window.print(),
    onExport: () => {
      window.dispatchEvent(new CustomEvent('hisab-export'))
    },
    onDeleteRecord: () => {
      window.dispatchEvent(new CustomEvent('hisab-delete'))
    },
    onLogout: () => {
      logout()
      localStorage.removeItem(CLIENT_SESSION_KEY)
      localStorage.removeItem('hisab-current-org')
      localStorage.removeItem(JUST_LOGGED_IN_KEY)
      localStorage.removeItem(USER_DATA_KEY)
      localStorage.removeItem(ORGS_DATA_KEY)
      window.location.href = '/login'
    },
  })

  // Refresh session data from server (can be called multiple times)
  const refreshSessionData = useCallback(async () => {
    try {
      const headers = getSessionHeaders()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch('/api/auth/session', {
        signal: controller.signal,
        headers,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.user && data.organizations && data.organizations.length > 0) {
          localStorage.setItem(CLIENT_SESSION_KEY, data.user.id)

          const userData = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            language: data.user.language,
          }
          setCurrentUser(userData)
          const orgs = data.organizations.map((o: { id: string; name: string; role: string; plan: string }) => ({
            id: o.id,
            name: o.name,
            role: o.role,
            plan: o.plan,
          }))
          setUserOrganizations(orgs)
          setLanguage(data.user.language || 'en')

          // Save to localStorage for fast restore next time
          saveUserDataLocally(userData, orgs)

          const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('hisab-current-org') : null
          const lastOrg = lastOrgId ? orgs.find((o: { id: string }) => o.id === lastOrgId) : null
          if (lastOrg) {
            setCurrentOrg(lastOrg.id, lastOrg.name)
          } else {
            setCurrentOrg(orgs[0].id, orgs[0].name)
          }
          return true
        }
      }
      return false
    } catch (err) {
      console.warn('Session refresh failed:', err instanceof Error ? err.message : 'Unknown error')
      return false
    }
  }, [setCurrentUser, setUserOrganizations, setCurrentOrg, setLanguage])

  // Restore session on mount — ONLY ONCE
  // Strategy: Try localStorage first (instant), then verify with API
  const restoreSession = useCallback(async () => {
    if (hasRestoredSession.current) return
    hasRestoredSession.current = true

    // Step 1: Check if we have a session token (localStorage or cookie)
    let sessionToken: string | null = null
    try {
      sessionToken = localStorage.getItem(CLIENT_SESSION_KEY)
    } catch {
      // localStorage not available (some browser security settings)
    }

    // Fallback: check cookie for session token
    if (!sessionToken) {
      try {
        const cookies = document.cookie.split(';').map(c => c.trim())
        const sessionCookie = cookies.find(c => c.startsWith('hisab-session='))
        if (sessionCookie) {
          sessionToken = sessionCookie.split('=')[1]
          // Save to localStorage for future use
          try { localStorage.setItem(CLIENT_SESSION_KEY, sessionToken) } catch {}
        }
      } catch {
        // cookies not available
      }
    }

    // Step 1: Check if we have a session token (localStorage or cookie)
    if (!sessionToken) {
      // No token at all — redirect to login
      setShouldRedirect(true)
      setInitializing(false)
      return
    }

    // Step 2: Try to restore from localStorage data (instant, no API call)
    let localData = { user: null as null | { id: string; email: string; name: string; role: string; language: string }, orgs: null as null | { id: string; name: string; role: string; plan: string }[] }
    try {
      localData = loadUserDataLocally()
    } catch {
      // localStorage not available
    }
    if (localData.user && localData.orgs && localData.orgs.length > 0) {
      // We have cached user data — use it immediately
      setCurrentUser(localData.user)
      setUserOrganizations(localData.orgs)
      setLanguage(localData.user.language || 'en')

      const lastOrgId = localStorage.getItem('hisab-current-org')
      const lastOrg = lastOrgId ? localData.orgs.find(o => o.id === lastOrgId) : null
      if (lastOrg) {
        setCurrentOrg(lastOrg.id, lastOrg.name)
      } else {
        setCurrentOrg(localData.orgs[0].id, localData.orgs[0].name)
      }

      // We're initialized now — the user can see the dashboard
      setInitializing(false)

      // Step 3: In the background, verify session with API (non-blocking)
      // This will update the data if anything changed on the server
      refreshSessionData().then(success => {
        if (success) {
          localStorage.removeItem(JUST_LOGGED_IN_KEY)
          sessionStorage.removeItem('hisab-redirect-count')
        }
      }).catch(() => {
        // Background refresh failed — that's OK, we already have local data
      })
      return
    }

    // Step 4: No local data — need to call the API
    // This happens on first visit or after clearing browser data
    const justLoggedIn = localStorage.getItem(JUST_LOGGED_IN_KEY)
    const maxAttempts = justLoggedIn ? 5 : 3

    let success = false
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      success = await refreshSessionData()
      if (success) {
        localStorage.removeItem(JUST_LOGGED_IN_KEY)
        sessionStorage.removeItem('hisab-redirect-count')
        break
      }
      // Wait before retry (increasing delay)
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)))
      }
    }

    if (!success) {
      // API failed — but we still have a session token.
      // Try one more time with an even longer delay
      if (justLoggedIn) {
        await new Promise(r => setTimeout(r, 3000))
        success = await refreshSessionData()
      }

      if (!success) {
        // API truly unavailable — clear session and redirect to login
        localStorage.removeItem(CLIENT_SESSION_KEY)
        localStorage.removeItem('hisab-current-org')
        localStorage.removeItem(JUST_LOGGED_IN_KEY)
        localStorage.removeItem(USER_DATA_KEY)
        localStorage.removeItem(ORGS_DATA_KEY)
        setShouldRedirect(true)
      }
    }

    setInitializing(false)
  }, [refreshSessionData, setCurrentUser, setUserOrganizations, setCurrentOrg, setLanguage])

  useEffect(() => {
    const doRestore = async () => {
      await restoreSession()
      setRefreshSession(refreshSessionData)
    }
    doRestore()
  }, [])

  // Handle redirect in a separate effect (lint-safe)
  useEffect(() => {
    if (shouldRedirect) {
      // Track redirect count for loop detection on login page
      const count = parseInt(sessionStorage.getItem('hisab-redirect-count') || '0', 10)
      sessionStorage.setItem('hisab-redirect-count', String(count + 1))
      localStorage.removeItem(USER_DATA_KEY)
      localStorage.removeItem(ORGS_DATA_KEY)
      window.location.href = '/login'
    }
  }, [shouldRedirect])

  // Save current org ID to localStorage
  useEffect(() => {
    if (currentOrgId && typeof window !== 'undefined') {
      localStorage.setItem('hisab-current-org', currentOrgId)
    }
  }, [currentOrgId])

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      const headers = getSessionHeaders()
      await fetch('/api/auth/logout', { method: 'POST', headers })
    } catch {
      // ignore
    }
    logout()
    localStorage.removeItem(CLIENT_SESSION_KEY)
    localStorage.removeItem('hisab-current-org')
    localStorage.removeItem(JUST_LOGGED_IN_KEY)
    localStorage.removeItem(USER_DATA_KEY)
    localStorage.removeItem(ORGS_DATA_KEY)
    window.location.href = '/login'
  }, [logout])

  // Loading screen
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <style>{`
          @keyframes logo-pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.85; }
          }
          @keyframes ring-rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes ring-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes shimmer {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          .logo-pulse { animation: logo-pulse 2s ease-in-out infinite; }
          .ring-rotate { animation: ring-rotate 8s linear infinite; }
          .ring-pulse { animation: ring-pulse 3s ease-in-out infinite; }
          .fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
          .shimmer-text {
            background: linear-gradient(90deg, #6b7280 0%, #10b981 50%, #6b7280 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: shimmer 3s linear infinite;
          }
        `}</style>
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-20 w-20">
            <div className="absolute inset-0 rounded-2xl ring-rotate border-2 border-transparent border-t-emerald-500/40 border-r-emerald-500/20" />
            <div className="absolute inset-2 rounded-xl ring-pulse border border-emerald-500/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/30 logo-pulse">
                HP
              </div>
            </div>
          </div>
          <div className="fade-in-up" style={{ animationDelay: '0.3s', opacity: 0 }}>
            <Loader2 className="h-4 w-4 animate-spin mx-auto text-emerald-500/60" />
          </div>
          <p className="text-sm shimmer-text mt-3 font-medium fade-in-up" style={{ animationDelay: '0.5s', opacity: 0 }}>
            Loading Hisab Pro
          </p>
        </div>
      </div>
    )
  }

  // No user after initialization — redirect to login
  if (!currentUser || !currentOrgId) {
    // If we finished initializing but have no user, redirect to login
    if (!initializing) {
      // Use a timeout to avoid calling setState during render
      setTimeout(() => {
        if (!useAppStore.getState().currentUser || !useAppStore.getState().currentOrgId) {
          // Clear data and redirect
          localStorage.removeItem(CLIENT_SESSION_KEY)
          localStorage.removeItem('hisab-current-org')
          localStorage.removeItem(JUST_LOGGED_IN_KEY)
          localStorage.removeItem(USER_DATA_KEY)
          localStorage.removeItem(ORGS_DATA_KEY)
          window.location.href = '/login'
        }
      }, 100)
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-500/60" />
          <p className="text-sm text-zinc-500 mt-2">Loading session...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex overflow-hidden bg-[#09090b]">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "shrink-0 transition-all duration-300 hidden md:block",
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        )}>
          <AppSidebar onLogout={handleLogout} />
        </aside>

        {/* Mobile Sidebar (Sheet) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-72 bg-[#0c0f14] border-r border-white/5">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Sidebar</SheetTitle>
            </SheetHeader>
            <AppSidebar onLogout={handleLogout} />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <AppHeader onLogout={handleLogout} />
          <main className="flex-1 overflow-y-auto relative">
            {children}
            {/* Quick Actions Bar - floating at bottom on dashboard */}
            <QuickActionsBar
              onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
              onToggleMode={toggleMode}
              onOpenCheatsheet={() => setCheatsheetOpen(true)}
              onOrgSwitcher={() => setOrgSwitcherOpen(true)}
            />
          </main>
        </div>

        {/* Command Palette & Shortcut Cheatsheet */}
        <CommandPalette
          open={commandPaletteOpen}
          onOpenChange={setCommandPaletteOpen}
          mode={mode}
          onNavigate={(path) => router.push(path)}
          onAction={(action) => {
            switch (action) {
              case 'add-income': router.push('/income'); break
              case 'add-expense': router.push('/expense'); break
              case 'new-invoice': router.push('/invoices/new'); break
              case 'new-purchase': router.push('/purchases/new'); break
              case 'new-party': router.push('/parties/new'); break
              case 'new-journal': router.push('/journal/new'); break
              case 'toggle-mode': {
                const newMode = mode === 'simple' ? 'advanced' : 'simple'
                useAppStore.getState().setMode(newMode)
                break
              }
              case 'switch-language': {
                const currentLang = useAppStore.getState().language
                useAppStore.getState().setLanguage(currentLang === 'en' ? 'ne' : 'en')
                break
              }
              case 'toggle-sidebar': setSidebarOpen(!sidebarOpen); break
            }
          }}
        />
        <ShortcutCheatsheet
          open={cheatsheetOpen}
          onOpenChange={setCheatsheetOpen}
        />
        <OrgSwitcherDialog
          open={orgSwitcherOpen}
          onOpenChange={setOrgSwitcherOpen}
        />
      </div>
    </TooltipProvider>
  )
}
