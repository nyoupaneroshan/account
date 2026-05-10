# Task 6: Reports, Settings, Parties Components (Agent: Frontend Developer)

## Summary
Created 6 major UI components for Hisab Pro Nepal accounting software: Reports viewer, Party list, Party form, Settings, Organization view, and Users view. All components follow the existing project architecture with shadcn/ui components, Zustand store integration, and Nepal-specific formatting.

## Files Created

1. **`/src/components/reports/report-view.tsx`**
   - Unified report viewer that renders different reports based on `activeModule`
   - Report Overview: Cards for each report type with icon, title, Nepali subtitle, description
   - Trial Balance: Date range filter, table with Account Code/Name/Debit/Credit, group subtotals, grand total row, balance validation badge
   - Profit & Loss: Income section (green), Expense section (red), Gross Profit, Net Profit, profit margin percentages
   - Balance Sheet: Assets (Current + Non-Current) with subtotals, Liabilities (Current + Non-Current) with subtotals, Equity with retained earnings, balance validation
   - Cash Flow: Operating/Investing/Financing activities with inflow/outflow details, net change, opening/closing cash balances
   - VAT Report: Output VAT (sales) and Input VAT (purchases) with transaction details, net VAT payable/refundable with color coding
   - TDS Report: Parties with TDS applicable, TDS rates, PAN numbers, current balances
   - All reports have Print button (window.print()), loading/error states, empty data handling

2. **`/src/components/parties/party-list.tsx`**
   - Header with "Add Party" button (navigates to party-new)
   - Filter tabs: All, Customers, Suppliers, Employees
   - Search bar for name/PAN/phone
   - Table: Name, PAN, Party Type (colored badge), Phone, Balance, Actions
   - Balance: green (receivable) / red (payable) with arrow indicators
   - Actions: View/Edit, Create Invoice (for customers), Create Purchase (for suppliers)
   - Summary footer with total parties, receivable, payable

3. **`/src/components/parties/party-form.tsx`**
   - Complete party creation form with sections:
     - Basic Information: Name, Name (Nepali), Party Type, PAN Number
     - Contact Details: Email, Phone, Address, City, Province (7 provinces), Contact Person
     - Financial Details: Credit Limit, Opening Balance + Balance Type (Debit/Credit)
     - Tax Configuration: TDS Applicable (switch), TDS Rate, TDS PAN; SSF Applicable (switch)
     - Banking Details: Bank Name, Bank Account Number
     - Notes
   - Form validation, loading state, success toast, navigation to party list on success
   - POST to `/api/parties`

4. **`/src/components/settings/settings-view.tsx`**
   - Organization Settings: Link card navigating to organization module
   - Preferences: Default Mode (Simple/Advanced switch), Currency (NPR fixed), Default VAT Rate (13%), Date Format
   - Tax Configuration: VAT/TDS/SSF toggles with Nepali descriptions, list of tax rates with type badges
   - Fiscal Year: Current FY display, Lock FY button with toast
   - Data Management: Export Data and Backup placeholder buttons

5. **`/src/components/organizations/organization-view.tsx`**
   - Organization details form: Name, Name (Nepali), PAN, Address, City, Province, Phone, Email
   - Industry type selection (Trading, Manufacturing, Service, etc.)
   - Logo upload placeholder
   - Tax Settings: VAT Enabled + VAT Number, TDS Enabled, SSF Enabled
   - Fiscal Year Management section with current FY display and lock button
   - Save button with loading state

6. **`/src/components/settings/users-view.tsx`**
   - User list table: Name, Email, Role, Last Login, Status, Actions
   - Add User dialog (name + email + role)
   - Roles with descriptions and icons: Admin, Accountant, Staff, Viewer
   - Role cards with Nepali translations and access level descriptions
   - Status badges: Active (green), Inactive (gray)
   - Inline role change via Select dropdown
   - Graceful fallback when API doesn't exist yet

## Key Implementation Details
- All components use `'use client'` directive
- Zustand store integration: `useAppStore()` for `currentOrgId`, `activeModule`, `setActiveModule`, `mode`, `setMode`
- `formatNPR()` from `@/lib/nepal-accounting` for all currency display
- shadcn/ui components: Card, Table, Button, Input, Select, Badge, Tabs, Switch, Dialog, Label, Textarea, Skeleton, Separator
- Sonner toast for notifications
- Responsive design with Tailwind responsive prefixes
- Professional report layouts with print-friendly styling (`print:shadow-none print:border-0`)
- Loading skeletons and empty state handling
- API integration: `/api/reports`, `/api/parties`, `/api/seed`
- Nepal-specific: 7 provinces, PAN numbers, TDS/SSF compliance, Nepali translations
- Lint passes cleanly (only pre-existing error in app-header.tsx)
