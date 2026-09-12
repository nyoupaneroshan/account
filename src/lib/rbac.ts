// ============================================================
// Role-Based Access Control (RBAC) Engine
// ============================================================

export type OrgRole = 'admin' | 'accountant' | 'staff' | 'viewer'

export interface RoleInfo {
  role: OrgRole
  label: string
  labelNepali: string
  description: string
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive'
  badgeClass: string
}

export const ROLE_DEFINITIONS: Record<OrgRole, RoleInfo> = {
  admin: {
    role: 'admin',
    label: 'Administrator',
    labelNepali: 'व्यवस्थापक / मालिक',
    description: 'पूर्ण पहुँच: संस्था सेटिङ, प्रयोगकर्ता व्यवस्थापन, कर तथा लेखा प्रणाली',
    badgeVariant: 'default',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  accountant: {
    role: 'accountant',
    label: 'Accountant',
    labelNepali: 'लेखापाल / सीए',
    description: 'लेखा, जर्नल, लेजर, वित्तीय विवरण (P&L, ब्यालेन्स सिट), IRD अनुसूची ५-१०',
    badgeVariant: 'secondary',
    badgeClass: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  },
  staff: {
    role: 'staff',
    label: 'Staff / Cashier',
    labelNepali: 'कर्मचारी / क्यासियर',
    description: 'सरल खाता: दैनिक आम्दानी, खर्च, बिलिङ, उधारो खाता (ग्राहक/सप्लायर)',
    badgeVariant: 'secondary',
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  viewer: {
    role: 'viewer',
    label: 'Viewer / Auditor',
    labelNepali: 'निरीक्षक / अडिटर',
    description: 'पढ्ने मात्र पहुँच: कारोबार तथा प्रतिवेदनहरू अवलोकन गर्न सकिने',
    badgeVariant: 'outline',
    badgeClass: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/30',
  },
}

export function getRoleInfo(role?: string | null): RoleInfo {
  const normalized = (role?.toLowerCase() || 'staff') as OrgRole
  return ROLE_DEFINITIONS[normalized] || ROLE_DEFINITIONS.staff
}

/**
 * Check if the role is allowed to toggle to or use Advanced Mode (विस्तृत लेखा)
 */
export function canAccessAdvancedMode(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant'
}

/**
 * Check if role can manage organization settings, billing, or delete org
 */
export function canManageOrganization(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  return role?.toLowerCase() === 'admin'
}

/**
 * Check if role can invite, edit, or remove users
 */
export function canManageUsers(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  return role?.toLowerCase() === 'admin'
}

/**
 * Check if role can configure IRD & CBMS settings
 */
export function canConfigureIrd(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant'
}

/**
 * Check if role can create, update, or post manual journal entries
 */
export function canManageJournals(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant'
}

/**
 * Check if role can record transactions (income, expense, sales, purchases)
 */
export function canRecordTransactions(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant' || r === 'staff'
}

/**
 * Check if role can view full financial statements (Trial Balance, P&L, Balance Sheet)
 */
export function canViewFinancialStatements(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant' || r === 'viewer'
}

/**
 * Check if role can view IRD Tax Registers (Annex 5, 6, 7, 8, 10)
 */
export function canViewTaxRegisters(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant' || r === 'viewer'
}

/**
 * Check if role can monitor or trigger CBMS sync
 */
export function canAccessCbms(role?: string | null, isSuperAdmin = false): boolean {
  if (isSuperAdmin) return true
  const r = role?.toLowerCase()
  return r === 'admin' || r === 'accountant'
}
