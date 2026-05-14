'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'

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

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-sm">
              HP
            </div>
            <span className="text-xl font-bold tracking-tight">Hisab Pro</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => router.push('/login')}>
              Sign In
            </Button>
            <Button onClick={() => router.push('/login?tab=register')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container mx-auto px-4 py-20 md:py-28 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm mb-6">
              <Star className="h-4 w-4 text-amber-500" />
              <span>Nepal&apos;s #1 Accounting Software</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Easy like Excel,
              <br />
              <span className="text-primary">Powerful like ERP</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-4 max-w-2xl mx-auto">
              Hisab Pro — नेपालको आफ्नै लेखांकन प्रणाली
            </p>
            <p className="text-base text-muted-foreground/70 mb-8 max-w-xl mx-auto">
              Nepal&apos;s first dual-mode accounting software with VAT/TDS compliance,
              NFRS standards, and bilingual support. Built for Nepali businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="gap-2 text-base px-8 h-12"
                onClick={() => router.push('/login?tab=register')}
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-base px-8 h-12"
                onClick={() => router.push('/login')}
              >
                Sign In to Account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/50 mt-4">
              No credit card required. 30-day free trial on Pro plan.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="border-y bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span>IRD Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <span>VAT 13% Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-emerald-600" />
              <span>Double-Entry Bookkeeping</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-600" />
              <span>नेपाली + English</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-emerald-600" />
              <span>NFRS Standards</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Everything Nepali Businesses Need
          </h2>
          <p className="text-muted-foreground text-lg">
            नेपाली व्यवसायको लागि सम्पूर्ण लेखांकन समाधान
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                <p className="text-sm text-primary/70 font-medium mb-2">
                  {feature.titleNe}
                </p>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold tracking-tight mb-3">
              Simple, Transparent Pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              सरल र पारदर्शी मूल्य निर्धारण
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border bg-card p-6 relative ${
                  plan.highlighted
                    ? 'border-primary shadow-lg ring-1 ring-primary/20'
                    : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-primary/70">{plan.nameNe}</p>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  onClick={() => router.push('/login?tab=register')}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to Simplify Your Accounting?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            आफ्नो लेखांकन सरल बनाउनुहोस् — आजै सुरु गर्नुहोस्!
          </p>
          <Button
            size="lg"
            className="gap-2 text-base px-8 h-12"
            onClick={() => router.push('/login?tab=register')}
          >
            Create Free Account
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30 mt-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                HP
              </div>
              <span className="font-semibold">Hisab Pro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Hisab Pro. Nepal&apos;s Accounting System.
              Dual-mode: Simple + Advanced • VAT/TDS Compliant • IRD Ready
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
