'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS, type PlanId } from '@/lib/plans'
import { cn } from '@/lib/utils'
import { ArrowLeft, Check, Star } from 'lucide-react'

interface PricingPlansProps {
  onBack: () => void
  onSelectPlan?: (plan: string) => void
}

const PLAN_DISPLAY = [
  {
    id: 'free' as PlanId,
    name: 'Free',
    nameNe: 'निःशुल्क',
    price: '$0',
    period: '/month',
    description: 'Limited access for small businesses',
    badge: null,
    highlighted: false,
    features: [
      'Up to 50 transactions/month',
      'Basic Chart of Accounts',
      'Simple mode only',
      'Up to 5 parties',
      'Basic reports',
      'Single user',
      'Single organization',
    ],
    cta: 'Get Started Free',
    ctaVariant: 'outline' as const,
  },
  {
    id: 'pro' as PlanId,
    name: 'Pro',
    nameNe: 'प्रो',
    price: '$10',
    period: '/month',
    description: 'All features for growing businesses',
    badge: 'Most Popular',
    highlighted: true,
    features: [
      'Unlimited transactions',
      'Full Chart of Accounts (NFRS)',
      'Simple + Advanced mode',
      'Unlimited parties',
      'All reports (Trial Balance, P&L, BS, VAT, TDS)',
      'Up to 10 users',
      'Up to 5 organizations',
      'Inventory management',
      'TDS & SSF compliance',
      'Audit log',
      'Multi-warehouse',
      'Priority support',
    ],
    cta: 'Start Pro Trial',
    ctaVariant: 'default' as const,
  },
  {
    id: 'enterprise' as PlanId,
    name: 'Enterprise',
    nameNe: 'एन्टरप्राइज',
    price: 'Contact Us',
    period: '',
    description: 'Custom solutions for large organizations',
    badge: null,
    highlighted: false,
    features: [
      'Everything in Pro',
      'Unlimited users & organizations',
      'Custom integrations (IRD, banks)',
      'Dedicated account manager',
      'Custom reporting',
      'SSO & advanced security',
      'On-premise deployment option',
      'SLA guarantee',
      'Training & onboarding',
    ],
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
  },
]

export function PricingPlans({ onBack, onSelectPlan }: PricingPlansProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <div className="flex-1 py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </button>
            <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto mb-4 shadow-lg shadow-primary/25">
              HP
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Choose Your Plan</h1>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              Start free and upgrade as your business grows. All plans include Nepal VAT/TDS compliance.
            </p>
          </div>

          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLAN_DISPLAY.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'relative transition-all duration-200 hover:shadow-lg',
                  plan.highlighted
                    ? 'border-primary shadow-xl ring-1 ring-primary/20 scale-[1.02]'
                    : 'border-border/50 hover:border-border'
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 shadow-md">
                      <Star className="h-3 w-3 mr-1" />
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pt-6 pb-2 text-center">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground">{plan.nameNe}</p>
                  <div className="mt-3">
                    <span className={cn(
                      'text-4xl font-bold',
                      plan.highlighted ? 'text-primary' : 'text-foreground'
                    )}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent className="pb-4">
                  <ul className="space-y-2.5">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className={cn(
                          'h-4 w-4 shrink-0 mt-0.5',
                          plan.highlighted ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pb-6">
                  <Button
                    variant={plan.ctaVariant}
                    className={cn(
                      'w-full',
                      plan.highlighted && 'shadow-md'
                    )}
                    onClick={() => onSelectPlan?.(plan.id)}
                  >
                    {plan.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Bottom Info */}
          <div className="text-center mt-10 space-y-2">
            <p className="text-sm text-muted-foreground">
              All plans include: Nepal Chart of Accounts • VAT 13% • TDS rates • IRD-ready billing
            </p>
            <p className="text-xs text-muted-foreground/50">
              Prices are in USD. Nepali Rupee (NPR) billing available upon request.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
