# Task: Rebuild Frontend Components for Hisab Pro

## Status: Completed

## Summary
Rebuilt 5 production-quality frontend components for the Nepal-compliant accounting SaaS "Hisab Pro".

## Components Created/Updated

### 1. report-view.tsx
- Unified reports view with 6 tabs: Trial Balance, P&L, Balance Sheet, Cash Flow, VAT Report, TDS Report
- Date range picker for all reports with apply button
- Export/Print buttons on each report tab
- Balanced/not-balanced indicators for Trial Balance and Balance Sheet
- VAT Report with Output VAT, Input VAT, Net VAT Payable sections
- TDS Report with rates by category
- Syncs with sidebar navigation via store's activeModule
- All amounts formatted as NPR using formatNPR()
- Loading skeletons, error states with retry, empty states

### 2. settings-view.tsx
- Organization settings: name, nameNepali, PAN, address, city, province, phone, email, logo
- Tax configuration: VAT toggle + rate selector, TDS toggle + rates display, SSF toggle + rates
- Invoice settings: prefix, next number, default terms
- Preferences: language selector (EN/Nepali/Hindi), theme (light/dark/system), default mode toggle
- Danger zone: delete organization with AlertDialog confirmation
- Save button at top and bottom
- Uses store for language/theme settings

### 3. users-view.tsx
- Users table: name, email, role, organization, last login, status
- Add user dialog with email, name, role select
- Role options: admin, accountant, staff, viewer with Nepali labels and color-coded badges
- Activate/deactivate toggle
- Remove user with AlertDialog confirmation
- Current user's row highlighted with "(You)" label
- Search functionality
- Role descriptions card
- Fetches from /api/admin/user

### 4. organization-view.tsx
- Current org details card with all fields
- Subscription status card with current plan, billing period, upgrade button
- Plan limits display with progress bars for transactions, users, parties, products, invoices
- Organization switching between user's organizations
- Create new organization dialog
- Fiscal year management with lock/unlock functionality
- Uses PLANS/getPlan/hasFeature/isLimitExceeded/getRemaining from plans lib

### 5. admin-portal.tsx
- Full-width, no sidebar super admin portal
- Stats overview: total users, organizations, active subscriptions, revenue estimate
- Users management tab: table with search, filter (all/active/inactive), activate/deactivate
- Organizations tab: all orgs with plan, status, industry, user count, created date
- Subscriptions tab: upgrade/downgrade plans via Select
- System settings tab: system info, compliance info, global configuration with switches
- Back to App button, refresh button
- Fetches from /api/admin, /api/admin/user, /api/admin/subscription
- Only accessible by super_admin role

## Technical Details
- All components start with 'use client'
- Uses existing shadcn/ui components (Table, Card, Tabs, Dialog, Select, Input, Button, Badge, etc.)
- Uses useAppStore from @/store/app-store
- Uses Nepal helpers from @/lib/nepal-accounting (formatNPR, NEPAL_VAT_RATE, TDS_RATES, SSF rates)
- Uses i18n from @/lib/i18n with t() function
- Uses plans from @/lib/plans (PLANS, getPlan, hasFeature, isLimitExceeded, getRemaining)
- Responsive design with mobile-first approach
- Production-quality loading/error/empty states
- All amounts formatted as NPR using formatNPR()
- Lint passes with no errors
