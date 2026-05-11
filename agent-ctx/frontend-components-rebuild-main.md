# Task: Rebuild Frontend Components for Hisab Pro

## Task ID: frontend-components-rebuild

## Summary
Rebuilt 7 production-quality frontend components for Hisab Pro (Nepal-compliant accounting SaaS) following exact specifications. All components use `'use client'` directive, shadcn/ui components, Zustand store, Nepal accounting helpers, i18n, and plan helpers.

## Files Created/Updated

### 1. `/src/components/dashboard/dashboard-view.tsx`
- Professional dashboard with stat cards (4 simple, 8 advanced mode)
- Monthly Income vs Expense bar chart (recharts + shadcn/ui ChartContainer)
- Recent transactions list (last 5) with TransactionRow component
- Top parties list with receivable/payable indicators
- Quick action buttons in simple mode (Add Income, Add Expense, New Journal Entry)
- Fiscal year progress bar (visible in both modes)
- Full loading skeletons, error states with retry, empty states
- Uses `useAppStore`, `formatNPR`, `NEPAL_FISCAL_YEARS`, `hasFeature`, `t()`

### 2. `/src/components/accounting/chart-of-accounts.tsx`
- Tree view with account groups and accounts using Accordion
- Color-coded by type per spec: Asset=green, Liability=red, Equity=purple, Income=blue, Expense=orange
- Left border color indicator on each group
- Each account shows: code, name, nameNepali, currentBalance, accountType
- Expandable/collapsible groups with group balance totals
- Add account dialog with type color indicators
- Filter by account type (tabs with colored dots)
- Search accounts by name, code, Nepali name
- Loading, error, empty states

### 3. `/src/components/accounting/journal-entries.tsx`
- Table with: entryNumber, date, narration, voucherType, totalDebit, totalCredit, status
- Filter by date range (from/to), voucher type select
- Search by narration (client-side)
- Pagination with Previous/Next
- Click to view entry detail in dialog
- Cancel entry with AlertDialog confirmation
- Voucher type badges with distinct colors
- Status badges (Posted/Draft/Cancelled)
- Loading, error, empty states

### 4. `/src/components/accounting/journal-entry-new.tsx`
- Date picker (Calendar popover), narration textarea, voucher type select
- Dynamic line items (add/remove rows) with responsive mobile/desktop layouts
- Account dropdown (searchable Command component) grouped by nature
- Debit amount, Credit amount inputs (auto-clear opposite)
- Running totals with debit=credit validation
- **Save as Draft** button (isPosted=false) alongside **Post Entry** button (isPosted=true)
- Balance validation indicators (red error / green check)
- Posts to /api/journal-entries

### 5. `/src/components/accounting/ledger-view.tsx`
- Account selector dropdown (searchable, grouped by nature)
- Date range filter (from/to)
- Table: date, narration, debit, credit, running balance
- Opening balance row, closing balance row
- Balance color-coded (green=positive, red=negative)
- Cancelled entries shown with strikethrough and badge
- Summary stats at bottom (total debit, credit, transaction count)
- Loading, error, empty states

### 6. `/src/components/simple-mode/simple-income.tsx`
- Amount input (large, prominent)
- Category dropdown: Sales, Service, Interest, Other (per spec)
- Received from (party selector) - customers/both
- Payment method: Cash, Bank, Online, Cheque (4-card grid layout per spec)
- Date input, Notes textarea
- VAT inclusive toggle with breakdown
- Auto-creates journal entry (debit Cash/Bank, credit Income)
- Posts to /api/journal-entries with voucherType='receipt'
- Loading, error states

### 7. `/src/components/simple-mode/simple-expense.tsx`
- Amount input (large, prominent)
- Category dropdown: Rent, Salary, Utilities, Supplies, Travel, Other (per spec)
- Paid to (party selector) - suppliers/both
- Payment method: Cash, Bank, Online, Cheque (4-card grid layout per spec)
- Date input, Notes textarea
- VAT inclusive toggle with breakdown
- Auto-creates journal entry (debit Expense, credit Cash/Bank)
- Posts to /api/journal-entries with voucherType='payment'
- Loading, error states

## Key Design Decisions
- All amounts formatted as NPR using `formatNPR()`
- Bilingual labels (Nepali + English) throughout
- Responsive design: mobile-first with sm/md/lg breakpoints
- Used `hasFeature(currentPlan, 'advancedMode')` for plan-gating in dashboard
- Used `cn()` utility for conditional class merging
- Consistent color scheme: green=income/positive, red=expense/negative
- Chart of Accounts colors match spec exactly (Asset=green, Liability=red, Equity=purple, Income=blue, Expense=orange)

## Lint Status
- All 7 new component files pass lint checks
- Pre-existing lint error in report-view.tsx (unrelated)
