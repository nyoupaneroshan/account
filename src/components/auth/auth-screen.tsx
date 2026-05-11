'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Eye, EyeOff, Loader2, Calculator, Shield, Globe } from 'lucide-react'

export function AuthScreen({ onShowPricing }: { onShowPricing: () => void }) {
  const router = useRouter()
  const { setCurrentUser, setUserOrganizations, setCurrentOrg, setLanguage } = useAppStore()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

  const handleLogin = async () => {
    setError('')
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields')
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
        setCurrentUser(data.user)
        setUserOrganizations(data.organizations)
        setLanguage(data.user.language || 'en')
        if (data.organizations.length > 0) {
          setCurrentOrg(data.organizations[0].id, data.organizations[0].name)
        }
        // Navigate to dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  const handleRegister = async () => {
    setError('')
    if (!regName || !regEmail || !regPassword || !regConfirmPassword || !regBusinessName) {
      setError('Please fill in all fields')
      return
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (!regTerms) {
      setError('Please accept the terms and conditions')
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
        setCurrentUser(data.user)
        setUserOrganizations(data.organizations)
        setLanguage(regLanguage)
        if (data.organizations.length > 0) {
          setCurrentOrg(data.organizations[0].id, data.organizations[0].name)
        }
        // Navigate to dashboard
        router.push('/dashboard')
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch {
      setError('Network error. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Background with gradient and pattern */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4 relative overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/3 blur-3xl" />

        <div className="w-full max-w-md relative z-10">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-4 shadow-lg shadow-primary/25">
              HP
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Hisab Pro</h1>
            <p className="text-muted-foreground mt-1">Nepal&apos;s Accounting System</p>
            <p className="text-sm text-muted-foreground/60 mt-0.5">Easy like Excel, Powerful like ERP</p>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mb-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              <span>IRD Compliant</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5 text-emerald-600" />
              <span>VAT/TDS Ready</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              <span>Multi-lingual</span>
            </div>
          </div>

          {/* Main Card */}
          <Card className="shadow-xl border-border/50">
            <CardHeader className="pb-0 pt-6 px-6">
              {/* Tab Toggle */}
              <div className="flex rounded-lg bg-muted p-1">
                <button
                  onClick={() => { setTab('login'); setError('') }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                    tab === 'login'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Login
                </button>
                <button
                  onClick={() => { setTab('register'); setError('') }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-md transition-all',
                    tab === 'register'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Register
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {error && (
                <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {tab === 'login' ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button type="button" className="text-xs text-primary hover:underline">
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign In
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="Ram Sharma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="reg-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min 6 chars"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-confirm-password">Confirm</Label>
                      <div className="relative">
                        <Input
                          id="reg-confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Re-enter"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reg-business">Business Name</Label>
                    <Input
                      id="reg-business"
                      type="text"
                      placeholder="e.g. Sharma Trading"
                      value={regBusinessName}
                      onChange={(e) => setRegBusinessName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">This creates your organization</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Language / भाषा</Label>
                    <Select value={regLanguage} onValueChange={setRegLanguage}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ne">नेपाली (Nepali)</SelectItem>
                        <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="reg-terms"
                      checked={regTerms}
                      onCheckedChange={(checked) => setRegTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="reg-terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                      I agree to the Terms of Service and Privacy Policy
                    </label>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleRegister}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Account
                  </Button>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pb-6 px-6">
              <button
                onClick={onShowPricing}
                className="text-sm text-primary hover:underline font-medium"
              >
                View Plans →
              </button>
            </CardFooter>
          </Card>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground">
              © 2024 Hisab Pro. Nepal&apos;s Accounting System.
            </p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              Dual-mode: Simple + Advanced • VAT/TDS Compliant • IRD Ready
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
