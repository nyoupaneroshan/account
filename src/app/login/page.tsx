'use client'

import { useState, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Eye, EyeOff, Loader2, Calculator, Shield, Globe, ArrowLeft,
  Receipt, TrendingUp, BarChart3, CheckCircle2, Users, Zap,
} from 'lucide-react'
import { CLIENT_SESSION_KEY } from '@/lib/session'

/* ────────────────────────────────────────────
   PASSWORD STRENGTH HELPER
   ──────────────────────────────────────────── */
function getPasswordStrength(password: string): {
  score: number; label: string; color: string
} {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score: 1, label: 'Weak', color: '#ef4444' }
  if (score <= 2) return { score: 2, label: 'Fair', color: '#f97316' }
  if (score <= 3) return { score: 3, label: 'Good', color: '#eab308' }
  if (score <= 4) return { score: 4, label: 'Strong', color: '#22c55e' }
  return { score: 5, label: 'Very Strong', color: '#10B981' }
}

/* ────────────────────────────────────────────
   LOGIN FORM COMPONENT
   ──────────────────────────────────────────── */
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'register' ? 'register' : 'login'
  const { setCurrentUser, setUserOrganizations, setCurrentOrg, setLanguage } = useAppStore()

  const [tab, setTab] = useState<'login' | 'register'>(initialTab)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [errorKey, setErrorKey] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const redirectAttempted = useRef(false)

  // Helper to set error with animation re-trigger
  const showError = (msg: string) => {
    setError(msg)
    setErrorKey((k) => k + 1)
  }

  // Check if already logged in
  useEffect(() => {
    const checkSession = async () => {
      if (redirectAttempted.current) return

      const storedToken = localStorage.getItem(CLIENT_SESSION_KEY)
      if (storedToken) {
        try {
          const res = await fetch('/api/auth/session', {
            headers: { 'x-session-token': storedToken }
          })
          if (res.ok) {
            const data = await res.json()
            if (data.user && data.organizations && data.organizations.length > 0) {
              redirectAttempted.current = true
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
              if (orgs.length > 0) {
                setCurrentOrg(orgs[0].id, orgs[0].name)
              }
              router.replace('/dashboard')
              return
            }
          }
        } catch {
          // Token might be stale, continue to show login form
        }
      }

      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          if (data.user && data.organizations && data.organizations.length > 0) {
            redirectAttempted.current = true
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
            if (orgs.length > 0) {
              setCurrentOrg(orgs[0].id, orgs[0].name)
            }
            router.replace('/dashboard')
            return
          }
        }
      } catch {
        // Not logged in, show the form
      }
      setCheckingSession(false)
    }
    checkSession()
  }, [])

  // Login form
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirmPassword, setRegConfirmPassword] = useState('')
  const [regBusinessName, setRegBusinessName] = useState('')
  const [regLanguage, setRegLanguage] = useState('en')
  const [regTerms, setRegTerms] = useState(false)

  const passwordStrength = getPasswordStrength(regPassword)

  const handleLogin = async () => {
    setError('')
    if (!loginEmail || !loginPassword) {
      showError('Please fill in all fields')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.token) {
          localStorage.setItem(CLIENT_SESSION_KEY, data.token)
        }
        setCurrentUser(data.user)
        setUserOrganizations(data.organizations)
        setLanguage(data.user.language || 'en')
        if (data.organizations.length > 0) {
          setCurrentOrg(data.organizations[0].id, data.organizations[0].name)
        }
        window.location.href = '/dashboard'
      } else {
        showError(data.error || 'Login failed')
      }
    } catch {
      showError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setError('')
    if (!regName || !regEmail || !regPassword || !regConfirmPassword || !regBusinessName) {
      showError('Please fill in all fields')
      return
    }
    if (regPassword !== regConfirmPassword) {
      showError('Passwords do not match')
      return
    }
    if (regPassword.length < 6) {
      showError('Password must be at least 6 characters')
      return
    }
    if (!regTerms) {
      showError('Please accept the terms and conditions')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          password: regPassword,
          businessName: regBusinessName,
          language: regLanguage,
        }),
      })
      const data = await res.json()
      if (data.success) {
        if (data.token) {
          localStorage.setItem(CLIENT_SESSION_KEY, data.token)
        }
        setCurrentUser(data.user)
        setUserOrganizations(data.organizations)
        setLanguage(regLanguage)
        if (data.organizations.length > 0) {
          setCurrentOrg(data.organizations[0].id, data.organizations[0].name)
        }
        window.location.href = '/dashboard'
      } else {
        showError(data.error || 'Registration failed')
      }
    } catch {
      showError('Network error. Please try again.')
    }
    setLoading(false)
  }

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
        <div className="text-center animate-fade-in-up">
          <div className="relative mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
              <img src="/logo-generated.png" alt="HP" className="h-10 w-10 rounded-lg" />
            </div>
            <div className="absolute inset-0 h-16 w-16 rounded-2xl bg-emerald-500/20 mx-auto animate-ping" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white">
      {/* ─── MAIN LAYOUT ─── */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* ─── LEFT SIDE: BRANDING (desktop only) ─── */}
        <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden noise-overlay">
          {/* Background gradient orbs */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/[0.08] rounded-full blur-[120px] animate-pulse-glow" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-300/[0.05] rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.03] rounded-full blur-[80px]" />

          {/* Subtle grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 py-16 w-full">
            {/* Back to Home */}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-400 transition-colors duration-200 mb-12 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              Back to Home
            </button>

            {/* Logo */}
            <div className="mb-10 animate-fade-in-up">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/25">
                  <img src="/logo-generated.png" alt="Hisab Pro" className="h-9 w-9 rounded-lg" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Hisab<span className="text-emerald-400"> Pro</span>
                  </h1>
                  <p className="text-sm text-zinc-500">नेपालको आफ्नै लेखांकन प्रणाली</p>
                </div>
              </div>
            </div>

            {/* Headline */}
            <div className="mb-10 animate-fade-in-up stagger-2">
              <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight mb-4">
                Easy like Excel,
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent animate-gradient-shift">
                  Powerful like ERP
                </span>
              </h2>
              <p className="text-lg text-zinc-400 max-w-md leading-relaxed">
                Nepal&apos;s first dual-mode accounting software with VAT/TDS compliance, NFRS standards, and bilingual support.
              </p>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-3 mb-10 animate-fade-in-up stagger-4">
              {[
                { icon: Shield, text: 'IRD Compliant', sub: 'आईआरडी अनुपालन' },
                { icon: Calculator, text: 'VAT/TDS Ready', sub: 'भ्याट/टीडीएस तयार' },
                { icon: Globe, text: 'Multi-lingual', sub: 'बहुभाषी' },
              ].map((badge) => {
                const BadgeIcon = badge.icon
                return (
                  <div
                    key={badge.text}
                    className="glass rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/[0.06] transition-colors duration-300"
                  >
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                      <BadgeIcon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{badge.text}</p>
                      <p className="text-xs text-zinc-500">{badge.sub}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Social proof */}
            <div className="animate-fade-in-up stagger-6">
              <div className="glass rounded-xl px-5 py-4 inline-flex items-center gap-4">
                <div className="flex -space-x-2">
                  {['RS', 'SA', 'BT', 'KM'].map((initials, i) => (
                    <div
                      key={initials}
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-600/30 border-2 border-[#09090b] flex items-center justify-center text-[10px] font-bold text-emerald-300"
                    >
                      {initials}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">Join 500+ Nepali businesses</p>
                  </div>
                  <p className="text-xs text-zinc-500">500+ नेपाली व्यवसायले भरोसा गरेका</p>
                </div>
              </div>
            </div>

            {/* Floating elements */}
            <div className="absolute top-[15%] right-[10%] glass rounded-xl px-4 py-3 shadow-xl animate-float hover-lift hidden xl:flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">VAT Filed</p>
                <p className="text-sm font-semibold text-emerald-400">Rs. 2,45,000</p>
              </div>
            </div>

            <div className="absolute bottom-[20%] right-[8%] glass rounded-xl px-4 py-3 shadow-xl animate-float-slow hover-lift hidden xl:flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">Revenue</p>
                <p className="text-sm font-semibold text-white">+23.5%</p>
              </div>
            </div>

            <div className="absolute top-[55%] right-[25%] glass rounded-xl px-4 py-3 shadow-xl animate-float-delayed hover-lift hidden xl:flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">P&L Report</p>
                <p className="text-sm font-semibold text-emerald-400">Auto-generated</p>
              </div>
            </div>

            {/* Spinning ring decoration */}
            <div className="absolute bottom-[8%] left-[8%] w-20 h-20 border border-emerald-500/10 rounded-full animate-spin-slow hidden xl:block" />
          </div>
        </div>

        {/* ─── RIGHT SIDE: FORM ─── */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
          {/* Subtle background for form side */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/[0.04] rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-emerald-300/[0.03] rounded-full blur-[60px]" />

          <div className="w-full max-w-[440px] relative z-10">
            {/* Mobile: Back to Home + Logo */}
            <div className="lg:hidden mb-8 animate-fade-in-up">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-400 transition-colors duration-200 mb-6 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
                Back to Home
              </button>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <img src="/logo-generated.png" alt="Hisab Pro" className="h-7 w-7 rounded-md" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Hisab<span className="text-emerald-400"> Pro</span>
                  </h1>
                  <p className="text-xs text-zinc-500">Nepal&apos;s Accounting System</p>
                </div>
              </div>
              {/* Mobile trust badges */}
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>IRD Compliant</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calculator className="h-3.5 w-3.5 text-emerald-400" />
                  <span>VAT/TDS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Multi-lingual</span>
                </div>
              </div>
            </div>

            {/* Desktop: Welcome text */}
            <div className="hidden lg:block mb-8 animate-fade-in-up">
              <h2 className="text-2xl font-bold tracking-tight mb-2">
                {tab === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-zinc-400">
                {tab === 'login'
                  ? 'Sign in to continue to your dashboard'
                  : 'Start your free trial today. No credit card required.'}
              </p>
            </div>

            {/* Main Card */}
            <div className="glass-strong rounded-2xl overflow-hidden premium-glow animate-fade-in-up stagger-2">
              {/* Tab Toggle */}
              <div className="px-6 pt-6">
                <div className="relative flex rounded-xl bg-white/[0.04] p-1">
                  {/* Sliding indicator */}
                  <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20 tab-slider"
                    style={{ transform: tab === 'register' ? 'translateX(100%)' : 'translateX(0)' }}
                  />
                  <button
                    onClick={() => { setTab('login'); setError('') }}
                    className={cn(
                      'relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-300',
                      tab === 'login' ? 'text-black' : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => { setTab('register'); setError('') }}
                    className={cn(
                      'relative z-10 flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors duration-300',
                      tab === 'register' ? 'text-black' : 'text-zinc-400 hover:text-zinc-200'
                    )}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6">
                {/* Error Display with Animation */}
                {error && (
                  <div
                    key={errorKey}
                    className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2 animate-slide-down"
                  >
                    <div className="h-4 w-4 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold">!</span>
                    </div>
                    <span>{error}</span>
                  </div>
                )}

                {/* Login Form */}
                <div
                  className={cn(
                    'transition-all duration-300',
                    tab === 'login'
                      ? 'opacity-100 translate-x-0'
                      : 'absolute opacity-0 translate-x-8 pointer-events-none h-0 overflow-hidden'
                  )}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-zinc-300 text-sm font-medium">
                        Email
                      </Label>
                      <div className="premium-input rounded-lg transition-all duration-200">
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="you@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password" className="text-zinc-300 text-sm font-medium">
                          Password
                        </Label>
                        <button
                          type="button"
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors duration-200"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="premium-input rounded-lg transition-all duration-200 relative">
                        <Input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 pr-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300 hover:scale-[1.01]"
                      onClick={handleLogin}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign In
                    </Button>
                  </div>
                </div>

                {/* Register Form */}
                <div
                  className={cn(
                    'transition-all duration-300',
                    tab === 'register'
                      ? 'opacity-100 translate-x-0'
                      : 'absolute opacity-0 -translate-x-8 pointer-events-none h-0 overflow-hidden'
                  )}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reg-name" className="text-zinc-300 text-sm font-medium">
                        Full Name
                      </Label>
                      <div className="premium-input rounded-lg transition-all duration-200">
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="Ram Sharma"
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-email" className="text-zinc-300 text-sm font-medium">
                        Email
                      </Label>
                      <div className="premium-input rounded-lg transition-all duration-200">
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="you@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="reg-password" className="text-zinc-300 text-sm font-medium">
                          Password
                        </Label>
                        <div className="premium-input rounded-lg transition-all duration-200 relative">
                          <Input
                            id="reg-password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Min 6 chars"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 pr-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="reg-confirm-password" className="text-zinc-300 text-sm font-medium">
                          Confirm
                        </Label>
                        <div className="premium-input rounded-lg transition-all duration-200 relative">
                          <Input
                            id="reg-confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Re-enter"
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 pr-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors duration-200"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Password Strength Indicator */}
                    {regPassword && (
                      <div className="animate-slide-down">
                        <div className="flex gap-1 mb-1.5">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className="h-1 flex-1 rounded-full transition-all duration-300"
                              style={{
                                backgroundColor:
                                  level <= passwordStrength.score
                                    ? passwordStrength.color
                                    : 'rgba(255,255,255,0.06)',
                              }}
                            />
                          ))}
                        </div>
                        <p
                          className="text-xs transition-colors duration-300"
                          style={{ color: passwordStrength.color }}
                        >
                          {passwordStrength.label}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="reg-business" className="text-zinc-300 text-sm font-medium">
                        Business Name
                      </Label>
                      <div className="premium-input rounded-lg transition-all duration-200">
                        <Input
                          id="reg-business"
                          type="text"
                          placeholder="e.g. Sharma Trading"
                          value={regBusinessName}
                          onChange={(e) => setRegBusinessName(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 transition-all duration-200"
                        />
                      </div>
                      <p className="text-xs text-zinc-600">
                        This creates your organization
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-zinc-300 text-sm font-medium">
                        Language / भाषा
                      </Label>
                      <Select value={regLanguage} onValueChange={setRegLanguage}>
                        <SelectTrigger className="bg-white/[0.04] border-white/[0.08] text-white focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all duration-200">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-white/[0.1] text-white">
                          <SelectItem value="en" className="focus:bg-emerald-500/20 focus:text-white">English</SelectItem>
                          <SelectItem value="ne" className="focus:bg-emerald-500/20 focus:text-white">नेपाली (Nepali)</SelectItem>
                          <SelectItem value="hi" className="focus:bg-emerald-500/20 focus:text-white">हिंदी (Hindi)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-start gap-3 py-1">
                      <Checkbox
                        id="reg-terms"
                        checked={regTerms}
                        onCheckedChange={(checked) => setRegTerms(checked === true)}
                        className="mt-0.5 border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <label
                        htmlFor="reg-terms"
                        className="text-sm text-zinc-400 leading-tight cursor-pointer hover:text-zinc-300 transition-colors duration-200"
                      >
                        I agree to the{' '}
                        <span className="text-emerald-400 hover:text-emerald-300">Terms of Service</span>{' '}
                        and{' '}
                        <span className="text-emerald-400 hover:text-emerald-300">Privacy Policy</span>
                      </label>
                    </div>

                    <Button
                      className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300 hover:scale-[1.01]"
                      onClick={handleRegister}
                      disabled={loading}
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </div>
                </div>
              </div>

              {/* Footer Switch */}
              <div className="px-6 pb-6 pt-2 border-t border-white/[0.04]">
                {tab === 'login' ? (
                  <p className="text-center text-sm text-zinc-500">
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => { setTab('register'); setError('') }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
                    >
                      Create one →
                    </button>
                  </p>
                ) : (
                  <p className="text-center text-sm text-zinc-500">
                    Already have an account?{' '}
                    <button
                      onClick={() => { setTab('login'); setError('') }}
                      className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors duration-200"
                    >
                      Sign in →
                    </button>
                  </p>
                )}
              </div>
            </div>

            {/* Social proof (mobile) */}
            <div className="lg:hidden mt-6 text-center animate-fade-in-up stagger-4">
              <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs text-zinc-400">Join 500+ Nepali businesses</span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center animate-fade-in-up stagger-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src="/logo-generated.png" alt="Hisab Pro" className="h-4 w-4 rounded" />
                <span className="text-xs text-zinc-500 font-medium">
                  Hisab<span className="text-emerald-400/60"> Pro</span>
                </span>
              </div>
              <p className="text-xs text-zinc-600">
                &copy; {new Date().getFullYear()} Hisab Pro. All rights reserved.
              </p>
              <p className="text-xs text-zinc-700 mt-1">
                Dual-mode: Simple + Advanced &bull; VAT/TDS Compliant &bull; IRD Ready
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────
   PAGE EXPORT WITH SUSPENSE
   ──────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#09090b]">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/25">
                <img src="/logo-generated.png" alt="HP" className="h-10 w-10 rounded-lg" />
              </div>
              <div className="absolute inset-0 h-16 w-16 rounded-2xl bg-emerald-500/20 mx-auto animate-ping" />
            </div>
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-400" />
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
