// Plan definitions and limits for Hisab Pro

export type PlanId = 'free' | 'pro' | 'enterprise'

export interface PlanLimits {
  transactions: number   // -1 = unlimited
  parties: number
  users: number
  organizations: number
  products: number
  invoices: number
  advancedMode: boolean
  inventory: boolean
  tds: boolean
  multiUser: boolean
  auditLog: boolean
}

export interface Plan {
  id: PlanId
  name: string
  nameNe: string
  nameHi: string
  price: number      // -1 = custom pricing
  priceDisplay: string
  features: string[]
  limits: PlanLimits
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    nameNe: 'निःशुल्क',
    nameHi: 'मुफ्त',
    price: 0,
    priceDisplay: 'Free',
    features: [
      'Up to 50 transactions/month',
      'Basic Chart of Accounts',
      'Simple mode only',
      'Up to 5 parties',
      'Basic reports',
      'Single user',
      'Single organization',
    ],
    limits: {
      transactions: 50,
      parties: 5,
      users: 1,
      organizations: 1,
      products: 10,
      invoices: 20,
      advancedMode: false,
      inventory: false,
      tds: false,
      multiUser: false,
      auditLog: false,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    nameNe: 'प्रो',
    nameHi: 'प्रो',
    price: 10,
    priceDisplay: '$10/month',
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
    limits: {
      transactions: -1,
      parties: -1,
      users: 10,
      organizations: 5,
      products: -1,
      invoices: -1,
      advancedMode: true,
      inventory: true,
      tds: true,
      multiUser: true,
      auditLog: true,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    nameNe: 'एन्टरप्राइज',
    nameHi: 'एंटरप्राइज',
    price: -1,
    priceDisplay: 'Contact Us',
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
    limits: {
      transactions: -1,
      parties: -1,
      users: -1,
      organizations: -1,
      products: -1,
      invoices: -1,
      advancedMode: true,
      inventory: true,
      tds: true,
      multiUser: true,
      auditLog: true,
    },
  },
}

/**
 * Get plan by id with safe fallback to free
 */
export function getPlan(planId: string): Plan {
  return PLANS[planId as PlanId] || PLANS.free
}

/**
 * Check if a feature is available for a given plan
 */
export function hasFeature(planId: string, feature: keyof PlanLimits): boolean {
  const plan = getPlan(planId)
  const limit = plan.limits[feature]
  if (typeof limit === 'boolean') return limit
  return limit === -1 || limit > 0
}

/**
 * Check if a limit is exceeded
 * @returns true if the current count exceeds the plan limit
 */
export function isLimitExceeded(planId: string, limitKey: keyof PlanLimits, currentCount: number): boolean {
  const plan = getPlan(planId)
  const limit = plan.limits[limitKey]
  if (typeof limit === 'boolean') return !limit && currentCount > 0
  if (limit === -1) return false // unlimited
  return currentCount >= limit
}

/**
 * Get remaining allowance for a limit (-1 means unlimited)
 */
export function getRemaining(planId: string, limitKey: keyof PlanLimits, currentCount: number): number {
  const plan = getPlan(planId)
  const limit = plan.limits[limitKey]
  if (typeof limit === 'boolean') return limit ? -1 : 0
  if (limit === -1) return -1
  return Math.max(0, limit - currentCount)
}
