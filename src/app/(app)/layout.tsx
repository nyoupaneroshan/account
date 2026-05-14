'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/app-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { CLIENT_SESSION_KEY, getSessionHeaders } from '@/lib/session'

const AppSidebar = dynamic(
  () => import('@/components/layout/app-sidebar').then((mod) => ({ default: mod.AppSidebar })),
  { ssr: false, loading: () => <div className="w-72 h-full bg-[#0c0f14] animate-pulse" /> }
)
const AppHeader = dynamic(
  () => import('@/components/layout/app-header').then((mod) => ({ default: mod.AppHeader })),
  { ssr: false, loading: () => <div className="h-14 border-b border-white/5 bg-[#0c0f14]/80 animate-pulse" /> }
)

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
    setCurrentUser,
    setUserOrganizations,
    setCurrentOrg,
    setLanguage,
    setRefreshSession,
    logout,
  } = useAppStore()

  const [initializing, setInitializing] = useState(true)
  const redirectAttempted = useRef(false)

  // Restore session on mount
  const restoreSession = useCallback(async () => {
    if (redirectAttempted.current) return

    try {
      const headers = getSessionHeaders()
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const res = await fetch('/api/auth/session', {
        signal: controller.signal,
        headers,
      })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.user && data.organizations && data.organizations.length > 0) {
          // Ensure token is in localStorage
          localStorage.setItem(CLIENT_SESSION_KEY, data.user.id)

          setCurrentUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            language: data.user.language,
          })
          const orgs = data.organizations.map((o: { id: string; name: string; role: string; plan: string }) => ({
            id: o.id,
            name: o.name,
            role: o.role,
            plan: o.plan,
          }))
          setUserOrganizations(orgs)
          setLanguage(data.user.language || 'en')

          const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('hisab-current-org') : null
          const lastOrg = lastOrgId ? orgs.find((o: { id: string }) => o.id === lastOrgId) : null
          if (lastOrg) {
            setCurrentOrg(lastOrg.id, lastOrg.name)
          } else {
            setCurrentOrg(orgs[0].id, orgs[0].name)
          }
        } else {
          // Valid session but no user/orgs - redirect to login
          redirectAttempted.current = true
          setInitializing(false)
          localStorage.removeItem(CLIENT_SESSION_KEY)
          router.replace('/login')
          return
        }
      } else {
        // Session API returned error (401 etc) - redirect to login
        redirectAttempted.current = true
        setInitializing(false)
        localStorage.removeItem(CLIENT_SESSION_KEY)
        router.replace('/login')
        return
      }
    } catch (err) {
      console.warn('Session restore failed:', err instanceof Error ? err.message : 'Unknown error')
      // Don't redirect on network errors - might be temporary
    }
    setInitializing(false)
  }, [setCurrentUser, setUserOrganizations, setCurrentOrg, setLanguage, router])

  useEffect(() => {
    const doRestore = async () => {
      await restoreSession()
      setRefreshSession(restoreSession)
    }
    doRestore()
  }, [])

  // Save current org ID to localStorage
  useEffect(() => {
    if (currentOrgId && typeof window !== 'undefined') {
      localStorage.setItem('hisab-current-org', currentOrgId)
    }
  }, [currentOrgId])

  // Handle logout
  const handleLogout = async () => {
    try {
      const headers = getSessionHeaders()
      await fetch('/api/auth/logout', { method: 'POST', headers })
    } catch {
      // ignore
    }
    logout()
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CLIENT_SESSION_KEY)
      localStorage.removeItem('hisab-current-org')
    }
    router.replace('/login')
  }

  // Premium loading screen with animated logo
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
          {/* Animated ring decoration */}
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

  // If still no user after loading, show redirect message
  if (!currentUser || !currentOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-500/60" />
          <p className="text-sm text-zinc-500 mt-2">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
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
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
