'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { AuthScreen } from '@/components/auth/auth-screen'
import { PricingPlans } from '@/components/auth/pricing-plans'
import { Loader2 } from 'lucide-react'

type PageState = 'loading' | 'authenticated' | 'unauthenticated'

export default function HomePage() {
  const router = useRouter()
  const store = useAppStore()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [showPricing, setShowPricing] = useState(false)
  const hasRun = useRef(false)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const checkSession = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000)

        const res = await fetch('/api/auth/session', { signal: controller.signal })
        clearTimeout(timeoutId)

        if (res.ok) {
          const data = await res.json()
          if (data.user && data.organizations && data.organizations.length > 0) {
            // Populate the store
            store.setCurrentUser({
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
            store.setUserOrganizations(orgs)
            store.setLanguage(data.user.language || 'en')

            const lastOrgId = typeof window !== 'undefined' ? localStorage.getItem('hisab-current-org') : null
            const lastOrg = lastOrgId ? orgs.find((o: { id: string }) => o.id === lastOrgId) : null
            if (lastOrg) {
              store.setCurrentOrg(lastOrg.id, lastOrg.name)
            } else {
              store.setCurrentOrg(orgs[0].id, orgs[0].name)
            }

            // Valid session - redirect to dashboard
            setPageState('authenticated')
            router.replace('/dashboard')
            return
          }
        }
        // No valid session
        setPageState('unauthenticated')
      } catch (err) {
        console.warn('Session check failed:', err instanceof Error ? err.message : 'Unknown error')
        setPageState('unauthenticated')
      }
    }

    checkSession()
  }, [])

  if (pageState === 'loading') {
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

  if (pageState === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  if (showPricing) {
    return (
      <PricingPlans
        onBack={() => setShowPricing(false)}
        onSelectPlan={() => setShowPricing(false)}
      />
    )
  }

  return <AuthScreen onShowPricing={() => setShowPricing(true)} />
}
