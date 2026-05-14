'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useAppStore } from '@/store/app-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const AppSidebar = dynamic(
  () => import('@/components/layout/app-sidebar').then((mod) => ({ default: mod.AppSidebar })),
  { ssr: false, loading: () => <div className="w-64 h-full bg-card animate-pulse" /> }
)
const AppHeader = dynamic(
  () => import('@/components/layout/app-header').then((mod) => ({ default: mod.AppHeader })),
  { ssr: false, loading: () => <div className="h-14 border-b bg-card animate-pulse" /> }
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

  // Restore session on mount
  const restoreSession = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await fetch('/api/auth/session', { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.user && data.organizations && data.organizations.length > 0) {
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
          // No valid user/orgs in session data - redirect to login
          setInitializing(false)
          router.replace('/login')
          return
        }
      } else {
        // Session API returned error (401 etc) - redirect to login
        setInitializing(false)
        router.replace('/login')
        return
      }
    } catch (err) {
      console.warn('Session restore failed:', err instanceof Error ? err.message : 'Unknown error')
      setInitializing(false)
      router.replace('/login')
      return
    }
    setInitializing(false)
  }, [setCurrentUser, setUserOrganizations, setCurrentOrg, setLanguage, router])

  useEffect(() => {
    // Use a microtask to avoid calling setState synchronously within an effect
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
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    logout()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('hisab-current-org')
    }
    router.replace('/login')
  }

  // Loading screen
  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4 shadow-lg shadow-primary/25">
            HP
          </div>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading Hisab Pro...</p>
        </div>
      </div>
    )
  }

  // If still no user after loading, don't render app content (redirect is happening)
  if (!currentUser || !currentOrgId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "shrink-0 border-r border-border transition-all duration-300 hidden md:block",
        sidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <AppSidebar onLogout={handleLogout} />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
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
