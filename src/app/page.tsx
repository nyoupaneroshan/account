'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Calculator,
  Shield,
  Globe,
  TrendingUp,
  BookOpen,
  Users,
  Receipt,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Building2,
  Clock,
  ChevronRight,
  Quote,
  Menu,
  X,
} from 'lucide-react'
import { CLIENT_SESSION_KEY } from '@/lib/session'

/* ────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Calculator,
    title: 'Dual-Mode Accounting',
    titleNe: 'दोहोरो मोड लेखांकन',
    desc: 'Simple like Excel for beginners, powerful double-entry for professionals. Switch anytime.',
  },
  {
    icon: Shield,
    title: 'Nepal IRD Compliant',
    titleNe: 'आईआरडी अनुपालन',
    desc: 'VAT 13%, TDS, SSF, and PAN tracking built-in. Ready for Inland Revenue Department audits.',
  },
  {
    icon: Globe,
    title: 'Bilingual Interface',
    titleNe: 'द्विभाषी इन्टरफेस',
    desc: 'Full Nepali and English support. All reports, invoices, and labels in your language.',
  },
  {
    icon: TrendingUp,
    title: 'Real-time Reports',
    titleNe: 'वास्तविक समय रिपोर्ट',
    desc: 'Trial Balance, P&L, Balance Sheet, Cash Flow, VAT & TDS reports at your fingertips.',
  },
  {
    icon: BookOpen,
    title: 'NFRS Standards',
    titleNe: 'एनएफआरएस मापदण्ड',
    desc: 'Nepal Financial Reporting Standards compliant Chart of Accounts auto-generated for you.',
  },
  {
    icon: Users,
    title: 'Multi-Organization',
    titleNe: 'बहु संस्था',
    desc: 'Manage multiple businesses from one account. Role-based access for your team.',
  },
]

const PLANS = [
  {
    name: 'Free',
    nameNe: 'निःशुल्क',
    price: 'Rs. 0',
    period: '/month',
    features: [
      '1 Organization',
      'Simple Mode',
      'Basic Reports',
      'Up to 100 transactions/month',
      'Email Support',
    ],
    cta: 'Get Started Free',
    highlighted: false,
  },
  {
    name: 'Pro',
    nameNe: 'प्रो',
    price: 'Rs. 1,499',
    period: '/month',
    features: [
      'Up to 5 Organizations',
      'Simple + Advanced Mode',
      'All Reports (VAT, TDS, P&L)',
      'Unlimited transactions',
      'Inventory Management',
      'Priority Support',
      'Multi-user access',
    ],
    cta: 'Start Pro Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    nameNe: 'एन्टरप्राइज',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited Organizations',
      'Full ERP Features',
      'API Access',
      'Custom Integrations',
      'Dedicated Account Manager',
      'On-premise option',
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const TESTIMONIALS = [
  {
    name: 'Rajesh Sharma',
    role: 'CEO, Sharma Trading Pvt. Ltd.',
    text: 'Hisab Pro transformed how we handle VAT filings. What used to take 3 days now takes 30 minutes. The IRD compliance features are a game-changer for Nepali businesses.',
    rating: 5,
    avatar: 'RS',
  },
  {
    name: 'Sita Adhikari',
    role: 'Finance Manager, Kathmandu Hotels',
    text: 'The bilingual interface means our entire team can use it comfortably. TDS calculations that used to confuse everyone are now automated and accurate.',
    rating: 5,
    avatar: 'SA',
  },
  {
    name: 'Bikash Tamang',
    role: 'Owner, BT Construction',
    text: 'I switched from Excel and never looked back. The simple mode let me start immediately, and now I use advanced features for P&L tracking across 3 business units.',
    rating: 5,
    avatar: 'BT',
  },
]

const STATS = [
  { value: 2400, suffix: '+', label: 'Businesses Trust Us', labelNe: 'व्यवसायले भरोसा गरेका' },
  { value: 98, suffix: '%', label: 'VAT Compliance Rate', labelNe: 'भ्याट अनुपालन दर' },
  { value: 50, suffix: 'M+', label: 'Transactions Processed', labelNe: 'कारोबार प्रशोधन' },
  { value: 4.9, suffix: '/5', label: 'User Satisfaction', labelNe: 'प्रयोगकर्ता सन्तुष्टि' },
]

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Testimonials', href: '#testimonials' },
]

/* ────────────────────────────────────────────
   ANIMATED COUNTER HOOK
   ──────────────────────────────────────────── */

function useAnimatedCounter(target: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0)
  const [hasStarted, setHasStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const startCounting = useCallback(() => {
    if (hasStarted) return
    setHasStarted(true)
    const startTime = performance.now()
    const isDecimal = target % 1 !== 0

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = eased * target
      setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current))
      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(target)
      }
    }
    requestAnimationFrame(animate)
  }, [target, duration, hasStarted])

  useEffect(() => {
    if (!startOnView || !ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startCounting()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [startCounting, startOnView])

  return { count, ref }
}

/* ────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────── */

export default function HomePage() {
  const router = useRouter()
  const checkedSession = useRef(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Stat counters
  const stat0 = useAnimatedCounter(STATS[0].value, 2200)
  const stat1 = useAnimatedCounter(STATS[1].value, 2000)
  const stat2 = useAnimatedCounter(STATS[2].value, 2400)
  const stat3 = useAnimatedCounter(STATS[3].value, 1800)
  const statRefs = [stat0, stat1, stat2, stat3]

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (checkedSession.current) return
    checkedSession.current = true
    const check = async () => {
      try {
        const token = localStorage.getItem(CLIENT_SESSION_KEY)
        const headers: Record<string, string> = {}
        if (token) {
          headers['x-session-token'] = token
        }
        const res = await fetch('/api/auth/session', { headers })
        if (res.ok) {
          const data = await res.json()
          if (data.user && data.organizations && data.organizations.length > 0) {
            localStorage.setItem(CLIENT_SESSION_KEY, data.user.id)
            window.location.href = '/dashboard'
          }
        }
      } catch {
        // Not logged in, stay on home page
      }
    }
    check()
  }, [])

  // Scroll detection for navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-[#09090b] text-white">
      {/* ─── GLOBAL CSS ANIMATIONS ─── */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-32px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-fade-in-up { animation: fade-in-up 0.7s ease-out forwards; }
        .animate-slide-in-left { animation: slide-in-left 0.7s ease-out forwards; }
        .animate-shimmer {
          background-size: 200% 100%;
          animation: shimmer 3s linear infinite;
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }

        /* Noise texture overlay */
        .noise-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none;
          z-index: 1;
        }

        /* Glassmorphism base */
        .glass {
          background: rgba(255, 255, 255, 0.04);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .glass-strong {
          background: rgba(255, 255, 255, 0.07);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        /* Gradient border trick */
        .gradient-border {
          position: relative;
          background: #0a0a0f;
          z-index: 0;
        }
        .gradient-border::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, #10B981, #059669, #34D399, #10B981);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          z-index: -1;
        }

        /* Smooth scroll */
        html { scroll-behavior: smooth; }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #09090b; }
        ::-webkit-scrollbar-thumb { background: #10B981; border-radius: 3px; }

        /* Stat number monospace feel */
        .stat-number { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* ─── FLOATING NAVBAR ─── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-lg shadow-black/20'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/logo-generated.png"
              alt="Hisab Pro"
              className="h-8 w-8 rounded-lg"
            />
            <span className="text-lg font-bold tracking-tight text-white">
              Hisab<span className="text-emerald-400"> Pro</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-400 hover:text-emerald-400 transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              className="text-zinc-300 hover:text-white hover:bg-white/5"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
            <Button
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300"
              onClick={() => router.push('/login?tab=register')}
            >
              Get Started
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden text-zinc-300 hover:text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden glass-strong border-t border-white/[0.06]">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-zinc-400 hover:text-emerald-400 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/[0.06]">
                <Button
                  variant="ghost"
                  className="text-zinc-300 hover:text-white hover:bg-white/5 justify-start"
                  onClick={() => router.push('/login')}
                >
                  Sign In
                </Button>
                <Button
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
                  onClick={() => router.push('/login?tab=register')}
                >
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24 noise-overlay">
        {/* Background gradient orbs */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/[0.07] rounded-full blur-[120px] animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-emerald-300/[0.05] rounded-full blur-[100px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/[0.03] rounded-full blur-[80px]" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(16,185,129,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.3) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm mb-8">
              <Zap className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-zinc-300">Nepal&apos;s #1 Accounting Software</span>
              <ChevronRight className="h-3.5 w-3.5 text-emerald-400" />
            </div>

            {/* Headline */}
            <h1
              className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6 animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
            >
              Easy like Excel,
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent animate-gradient-shift">
                Powerful like ERP
              </span>
            </h1>

            {/* Subheadline */}
            <p
              className="text-lg md:text-xl text-zinc-400 mb-2 animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              Hisab Pro — नेपालको आफ्नै लेखांकन प्रणाली
            </p>
            <p
              className="text-sm md:text-base text-zinc-500 mb-10 max-w-xl mx-auto animate-fade-in-up"
              style={{ animationDelay: '0.3s' }}
            >
              Nepal&apos;s first dual-mode accounting software with VAT/TDS compliance,
              NFRS standards, and bilingual support. Built for Nepali businesses.
            </p>

            {/* CTA Buttons */}
            <div
              className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
              style={{ animationDelay: '0.4s' }}
            >
              <Button
                size="lg"
                className="gap-2 text-base px-8 h-12 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300 hover:scale-[1.02]"
                onClick={() => router.push('/login?tab=register')}
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-8 h-12 border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-white/5 transition-all duration-300"
                onClick={() => router.push('/login')}
              >
                Sign In to Account
              </Button>
            </div>
            <p
              className="text-xs text-zinc-600 mt-4 animate-fade-in-up"
              style={{ animationDelay: '0.5s' }}
            >
              No credit card required. 30-day free trial on Pro plan.
            </p>
          </div>

          {/* Hero Dashboard Mockup */}
          <div
            className="mt-16 md:mt-20 max-w-5xl mx-auto animate-fade-in-up"
            style={{ animationDelay: '0.6s' }}
          >
            <div className="relative">
              {/* Glow behind image */}
              <div className="absolute inset-0 bg-emerald-500/20 blur-[60px] rounded-3xl" />

              {/* Browser chrome */}
              <div className="relative glass-strong rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
                {/* Top bar */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/70" />
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="bg-white/[0.05] rounded-md px-3 py-1 text-xs text-zinc-500 text-center max-w-xs mx-auto">
                      app.hisabpro.com/dashboard
                    </div>
                  </div>
                </div>
                {/* Dashboard image */}
                <img
                  src="/hero-dashboard.png"
                  alt="Hisab Pro Dashboard"
                  className="w-full object-cover"
                />
              </div>

              {/* Floating card decorations */}
              <div className="absolute -right-4 top-1/4 glass rounded-xl px-4 py-3 shadow-xl animate-float hidden lg:flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">VAT Filed</p>
                  <p className="text-sm font-semibold text-emerald-400">Rs. 2,45,000</p>
                </div>
              </div>

              <div className="absolute -left-4 bottom-1/4 glass rounded-xl px-4 py-3 shadow-xl animate-float-slow hidden lg:flex items-center gap-3" style={{ animationDelay: '1s' }}>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Revenue</p>
                  <p className="text-sm font-semibold text-white">+23.5%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUSTED BY SECTION ─── */}
      <section className="relative py-12 border-y border-white/[0.04]">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-zinc-600 mb-8">
            Trusted by businesses across Nepal
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {['Sharma Trading', 'Kathmandu Hotels', 'BT Construction', 'Himalayan Exports', 'Everest Retail', 'Pokhara Resorts'].map((name) => (
              <div key={name} className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS SECTION ─── */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.03] via-transparent to-transparent" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                ref={statRefs[i].ref}
                className="text-center glass rounded-2xl py-8 px-4 hover:bg-white/[0.06] transition-colors duration-300"
              >
                <p className="text-3xl md:text-4xl font-bold text-emerald-400 stat-number mb-2">
                  {statRefs[i].count}{stat.suffix}
                </p>
                <p className="text-sm text-zinc-400">{stat.label}</p>
                <p className="text-xs text-zinc-600 mt-1">{stat.labelNe}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="relative py-20 noise-overlay">
        <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-emerald-500/[0.04] rounded-full blur-[100px]" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 mb-4">
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
              Everything Nepali Businesses Need
            </h2>
            <p className="text-zinc-400 text-lg">
              नेपाली व्यवसायको लागि सम्पूर्ण लेखांकन समाधान
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {FEATURES.map((feature, idx) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition-all duration-300 group hover:border-emerald-500/20"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5 group-hover:bg-emerald-500/20 transition-colors duration-300">
                    <Icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-lg mb-1 text-white">{feature.title}</h3>
                  <p className="text-sm text-emerald-400/70 font-medium mb-2">
                    {feature.titleNe}
                  </p>
                  <p className="text-sm text-zinc-500">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── COMPLIANCE HIGHLIGHT ─── */}
      <section className="relative py-16 border-y border-white/[0.04]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 max-w-4xl mx-auto">
            {[
              { icon: Shield, text: 'IRD Compliant', subtext: 'आईआरडी अनुपालन' },
              { icon: Receipt, text: 'VAT 13% Ready', subtext: 'भ्याट १३% तयार' },
              { icon: Calculator, text: 'Double-Entry Bookkeeping', subtext: 'दोहोरो लेखा प्रणाली' },
              { icon: Globe, text: 'नेपाली + English', subtext: 'द्विभाषी समर्थन' },
              { icon: BarChart3, text: 'NFRS Standards', subtext: 'एनएफआरएस मापदण्ड' },
            ].map((item) => {
              const ItemIcon = item.icon
              return (
                <div key={item.text} className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors duration-200">
                    <ItemIcon className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-zinc-300">{item.text}</p>
                    <p className="text-xs text-zinc-600">{item.subtext}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section id="testimonials" className="relative py-20 noise-overlay">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-[120px]" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 mb-4">
              Testimonials
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
              Loved by Nepali Businesses
            </h2>
            <p className="text-zinc-400 text-lg">
              नेपाली व्यवसायहरूले मन पराएको
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TESTIMONIALS.map((t) => (
              <Card
                key={t.name}
                className="bg-white/[0.03] border-white/[0.06] backdrop-blur-md hover:bg-white/[0.05] transition-all duration-300 hover:border-emerald-500/20 py-0"
              >
                <CardContent className="pt-6 pb-6 px-6">
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <Quote className="h-5 w-5 text-emerald-500/30 mb-3 rotate-180" />
                  <p className="text-sm text-zinc-300 leading-relaxed mb-6">{t.text}</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-white/[0.06]">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{t.name}</p>
                      <p className="text-xs text-zinc-500">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING SECTION ─── */}
      <section id="pricing" className="relative py-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.02] to-transparent" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="text-center mb-16">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 mb-4">
              Pricing
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-white">
              Simple, Transparent Pricing
            </h2>
            <p className="text-zinc-400 text-lg">
              सरल र पारदर्शी मूल्य निर्धारण
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 relative transition-all duration-300 hover:scale-[1.02] ${
                  plan.highlighted
                    ? 'gradient-border'
                    : 'glass hover:bg-white/[0.06]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 text-black text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-emerald-500/30">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg text-white">{plan.name}</h3>
                  <p className="text-sm text-emerald-400/70">{plan.nameNe}</p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-zinc-500 text-sm">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-zinc-400">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full h-11 font-semibold transition-all duration-300 ${
                    plan.highlighted
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 hover:shadow-emerald-400/30'
                      : 'bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                  onClick={() => router.push('/login?tab=register')}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-zinc-600 mt-8">
            All plans include VAT 13%, TDS, and NFRS compliance. Prices in NPR. GST applicable.
          </p>
        </div>
      </section>

      {/* ─── CTA SECTION ─── */}
      <section className="relative py-24 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.08] via-transparent to-emerald-300/[0.05]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[100px]" />

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <div className="glass-strong rounded-3xl p-10 md:p-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm mb-6">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Start in under 2 minutes</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
                Ready to Simplify Your Accounting?
              </h2>
              <p className="text-zinc-400 text-lg mb-8">
                आफ्नो लेखांकन सरल बनाउनुहोस् — आजै सुरु गर्नुहोस्!
              </p>
              <Button
                size="lg"
                className="gap-2 text-base px-10 h-13 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold shadow-xl shadow-emerald-500/20 hover:shadow-emerald-400/30 transition-all duration-300 hover:scale-[1.02] py-3"
                onClick={() => router.push('/login?tab=register')}
              >
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Button>
              <p className="text-xs text-zinc-600 mt-5">
                No credit card required • VAT & TDS compliant from day one
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.06] bg-[#060608] mt-auto">
        <div className="container mx-auto px-4 md:px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-generated.png" alt="Hisab Pro" className="h-7 w-7 rounded-md" />
                <span className="font-bold text-white">
                  Hisab<span className="text-emerald-400"> Pro</span>
                </span>
              </div>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Nepal&apos;s first dual-mode accounting software. VAT, TDS & NFRS compliant.
              </p>
              <p className="text-sm text-zinc-600 mt-2">
                नेपालको पहिलो दोहोरो-मोड लेखांकन सफ्टवेयर
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Product</h4>
              <ul className="space-y-2.5">
                {['Features', 'Pricing', 'Integrations', 'Changelog', 'Roadmap'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Compliance */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Compliance</h4>
              <ul className="space-y-2.5">
                {['VAT 13% Filing', 'TDS Management', 'NFRS Standards', 'IRD Audit Ready', 'SSF & PAN'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Resources</h4>
              <ul className="space-y-2.5">
                {['Documentation', 'Help Center', 'Blog', 'Community', 'API Reference'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-zinc-300 mb-4">Company</h4>
              <ul className="space-y-2.5">
                {['About Us', 'Contact', 'Privacy Policy', 'Terms of Service', 'Careers'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-500 hover:text-emerald-400 transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} Hisab Pro. All rights reserved. Nepal&apos;s Accounting System.
            </p>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Shield className="h-3.5 w-3.5 text-emerald-500/50" />
                IRD Compliant
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Receipt className="h-3.5 w-3.5 text-emerald-500/50" />
                VAT 13%
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Calculator className="h-3.5 w-3.5 text-emerald-500/50" />
                Double-Entry
              </span>
              <span className="flex items-center gap-1.5 text-xs text-zinc-600">
                <Globe className="h-3.5 w-3.5 text-emerald-500/50" />
                नेपाली + English
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
