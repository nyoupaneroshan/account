---
Task ID: 1-8
Agent: Main Agent
Task: Add login/register, admin portal, subscriptions, language support to Hisab Pro

Work Log:
- Updated Prisma schema with Subscription model, Organization subscription fields (plan, subscriptionStatus, trialEndsAt), User role/language fields
- Pushed schema to database with `bun run db:push`
- Built auth API routes: /api/auth/register, /api/auth/login, /api/auth/session, /api/auth/logout
- Built admin API routes: /api/admin (GET + PATCH for user/org/subscription management)
- Created /src/lib/i18n.ts with full EN/NE/HI translations (170+ keys)
- Created /src/lib/plans.ts with Free/Pro/Enterprise plan definitions and limit helpers
- Created /src/components/auth/auth-screen.tsx (login/register with language selector)
- Created /src/components/auth/pricing-plans.tsx (3-plan pricing page)
- Created /src/components/auth/org-switcher.tsx (org dropdown with plan badges)
- Created /src/components/admin/admin-portal.tsx (5-tab admin dashboard)
- Updated /src/store/app-store.ts with auth state, language state, admin portal state
- Updated /src/app/page.tsx with auth flow (auth → pricing → app → admin)
- Updated /src/components/layout/app-header.tsx with OrgSwitcher, language selector, user menu, admin portal, logout
- Updated /src/components/layout/app-sidebar.tsx with admin portal button for super_admin
- Fixed admin API to match admin portal expected data format
- Updated existing admin user to super_admin role with password hash
- Tested login API successfully
- All lint checks pass

Stage Summary:
- Full auth system: Login/Register with password hashing (SHA-256 + salt)
- Admin portal: Super admin can manage users, organizations, subscriptions, plans
- Subscription plans: Free ($0), Pro ($10/month), Enterprise (Contact Us) with feature limits
- Language support: English, Nepali (नेपाली), Hindi (हिंदी) with 170+ translated keys
- Multi-tenant: Users can switch between organizations, org switcher in header
- Pricing page accessible from auth screen
- Default credentials: admin@hisabpro.com / admin123 (super_admin)
