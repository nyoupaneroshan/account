# Task: Rebuild Frontend Components for Hisab Pro

## Summary
Rebuilt all 8 frontend components for the Nepal-compliant accounting SaaS "Hisab Pro" with production-quality code, proper loading/error/empty states, and Nepal-specific formatting.

## Files Created/Updated

### 1. `/home/z/my-project/src/components/sales/invoice-list.tsx`
- Full invoice list with table: invoiceNumber, date, party name, totalAmount, vatAmount, status, amountDue
- Status badges with proper colors (draft=gray, sent=blue, paid=green, overdue=red, cancelled=line-through)
- Date range filter via popover
- Search by invoice #, party name, PAN
- Status filter dropdown
- Click row to view/edit
- Summary cards with total value
- Error state with retry button
- Pagination

### 2. `/home/z/my-project/src/components/sales/invoice-form.tsx`
- Auto-generated invoice number (INV-YYMM-XXXX)
- Invoice date, due date fields
- Party selector with searchable combobox
- PAN number auto-fill from party
- Billing address + shipping address with "same as billing" toggle
- Line items table with product selector, description, qty, unit, price, discount%, VAT%
- Running totals: subtotal, discounts, taxable, VAT, grand total
- Notes and terms fields
- Save as Draft / Create & Send buttons
- Mobile responsive with card-based layout for line items

### 3. `/home/z/my-project/src/components/purchase/purchase-list.tsx`
- Purchase bills table: billNumber, date, supplier, totalAmount, vatAmount, status, amountDue
- Date range filter
- Status filter with cancelled line-through
- Search by bill #, supplier, ref
- Supplier bill reference shown inline
- Summary cards with total VAT
- Pagination and error states

### 4. `/home/z/my-project/src/components/purchase/purchase-form.tsx`
- Auto-generated bill number (PUR-YYMM-XXXX)
- Bill date, due date
- Supplier searchable selector
- Supplier bill # reference field
- Warehouse selector with default auto-selection
- Line items with cost price (instead of selling price)
- Running totals with taxable amount
- Save as Draft / Create Purchase Bill buttons
- Mobile responsive

### 5. `/home/z/my-project/src/components/parties/party-list.tsx`
- Table: name (with Nepali), PAN, type, phone, city, balance
- Summary cards: total parties, receivable, payable, customer count
- Filter tabs: All, Customers, Suppliers, Employees
- Search by name, PAN, phone
- Click row to view balance details in dialog
- Party detail dialog with full info, balance display, bank details
- Quick actions: create invoice, create purchase, edit
- Pagination

### 6. `/home/z/my-project/src/components/parties/party-form.tsx` **(FULL REBUILD from placeholder)**
- Basic info: name, nameNepali, PAN number (required for Nepal compliance), party type
- Contact: email, phone, address, city, province (Nepal 7 provinces), contact person, credit limit
- Banking: bank name, bank account number
- Tax & Compliance: TDS toggle with category selector and auto-rate, SSF toggle
- Notes
- Full validation and POST to /api/parties

### 7. `/home/z/my-project/src/components/inventory/inventory-view.tsx`
- Products table: code/SKU, name, category, unit, stock qty, cost price, selling price, stock value, status
- Low stock alerts with red highlighting
- Out-of-stock items highlighted
- Summary cards: total products, stock value, low stock, out of stock
- Filters: search, category, stock status (all/low/out)
- Stock Adjustment button on each row with dialog
- Stock adjustment dialog: add/subtract, quantity, reason, preview new stock
- Pagination

### 8. `/home/z/my-project/src/components/inventory/product-form.tsx`
- Name, nameNepali, code/SKU, unit (expanded list), HSN code
- Category, brand
- Product type (goods/service) radio
- VAT toggle with Nepal 13% default, VAT preview on selling price
- Selling price with inclusive-VAT preview, cost price with margin calculation
- Min/max stock levels
- Costing method (FIFO/weighted average)
- Batch/expiry tracking toggles
- Description textarea

## Common Patterns Applied
- All components start with `'use client'`
- Use `useAppStore` from `@/store/app-store`
- Use `formatNPR`, `calculateVAT`, `NEPAL_VAT_RATE` from `@/lib/nepal-accounting`
- All amounts formatted with `formatNPR()`
- Proper loading skeletons, error states with retry, empty states with CTAs
- Responsive design (mobile card layouts, desktop table layouts)
- shadcn/ui components throughout
- Consistent pagination pattern
- Cancelled items have line-through and reduced opacity
