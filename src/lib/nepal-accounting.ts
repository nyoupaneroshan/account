// Nepal-specific accounting constants and helpers

// VAT Configuration
export const NEPAL_VAT_RATE = 0.13 // 13% standard rate
export const NEPAL_VAT_THRESHOLD = 5000000 // NPR 50 lakh threshold
export const NEPAL_CORPORATE_TAX = 0.25 // 25% corporate tax

// TDS Rates by category
export const TDS_RATES: Record<string, number> = {
  contract: 0.015,        // 1.5% for contract work
  rent: 0.15,             // 15% for rent
  interest: 0.15,         // 15% for interest
  commission: 0.15,       // 15% for commission
  consultancy: 0.15,      // 15% for consultancy
  transport: 0.015,       // 1.5% for transport
  others: 0.15,           // 15% default
}

// SSF (Social Security Fund)
export const SSF_EMPLOYEE_RATE = 0.20  // 20% employee contribution
export const SSF_EMPLOYER_RATE = 0.11  // 11% employer contribution
export const SSF_TOTAL_RATE = 0.31     // 31% total

// Nepal Fiscal Year (starts mid-July)
export const NEPAL_FISCAL_YEARS = [
  { label: '2081/82', start: '2024-07-16', end: '2025-07-15' },
  { label: '2080/81', start: '2023-07-17', end: '2024-07-15' },
  { label: '2079/80', start: '2022-07-17', end: '2023-07-16' },
]

// Standard Nepal Chart of Accounts Groups
export const NEPAL_COA_GROUPS = [
  { code: '1', name: 'Assets', nameNepali: 'सम्पत्ति', nature: 'asset' },
  { code: '11', name: 'Current Assets', nameNepali: 'चालू सम्पत्ति', nature: 'asset', parent: '1' },
  { code: '110', name: 'Cash & Cash Equivalents', nameNepali: 'नगद तथा नगद समकक्ष', nature: 'asset', parent: '11' },
  { code: '120', name: 'Accounts Receivable', nameNepali: 'प्राप्य खाता', nature: 'asset', parent: '11' },
  { code: '130', name: 'Inventory', nameNepali: 'इन्भेन्ट्री', nature: 'asset', parent: '11' },
  { code: '140', name: 'Prepaid Expenses', nameNepali: 'अग्रिम खर्च', nature: 'asset', parent: '11' },
  { code: '15', name: 'Non-Current Assets', nameNepali: 'चालू नभएको सम्पत्ति', nature: 'asset', parent: '1' },
  { code: '150', name: 'Property, Plant & Equipment', nameNepali: 'सम्पत्ति, बिर्ता र उपकरण', nature: 'asset', parent: '15' },
  { code: '160', name: 'Intangible Assets', nameNepali: 'अमूर्त सम्पत्ति', nature: 'asset', parent: '15' },

  { code: '2', name: 'Liabilities', nameNepali: 'दायित्व', nature: 'liability' },
  { code: '21', name: 'Current Liabilities', nameNepali: 'चालू दायित्व', nature: 'liability', parent: '2' },
  { code: '210', name: 'Accounts Payable', nameNepali: 'देय खाता', nature: 'liability', parent: '21' },
  { code: '220', name: 'VAT Payable', nameNepali: 'भ्याट देय', nature: 'liability', parent: '21' },
  { code: '230', name: 'TDS Payable', nameNepali: 'टीडीएस देय', nature: 'liability', parent: '21' },
  { code: '240', name: 'Accrued Expenses', nameNepali: 'जम्मा खर्च', nature: 'liability', parent: '21' },
  { code: '25', name: 'Non-Current Liabilities', nameNepali: 'चालू नभएको दायित्व', nature: 'liability', parent: '2' },
  { code: '250', name: 'Long-term Loans', nameNepali: 'दीर्घकालिन ऋण', nature: 'liability', parent: '25' },

  { code: '3', name: 'Equity', nameNepali: 'इक्विटी', nature: 'equity' },
  { code: '310', name: 'Capital', nameNepali: 'पूँजी', nature: 'equity', parent: '3' },
  { code: '320', name: 'Retained Earnings', nameNepali: 'सञ्चित आम्दानी', nature: 'equity', parent: '3' },
  { code: '330', name: 'Reserves & Surplus', nameNepali: 'रिजर्भ र सरप्लस', nature: 'equity', parent: '3' },

  { code: '4', name: 'Income', nameNepali: 'आम्दानी', nature: 'income' },
  { code: '410', name: 'Sales Revenue', nameNepali: 'बिक्री आम्दानी', nature: 'income', parent: '4' },
  { code: '420', name: 'Service Revenue', nameNepali: 'सेवा आम्दानी', nature: 'income', parent: '4' },
  { code: '430', name: 'Other Income', nameNepali: 'अन्य आम्दानी', nature: 'income', parent: '4' },
  { code: '440', name: 'Discount Received', nameNepali: 'छुट प्राप्त', nature: 'income', parent: '4' },

  { code: '5', name: 'Expenses', nameNepali: 'खर्च', nature: 'expense' },
  { code: '510', name: 'Cost of Goods Sold', nameNepali: 'बेचिएको वस्तुको लागत', nature: 'expense', parent: '5' },
  { code: '520', name: 'Administrative Expenses', nameNepali: 'प्रशासनिक खर्च', nature: 'expense', parent: '5' },
  { code: '530', name: 'Selling & Distribution', nameNepali: 'बिक्री तथा वितरण खर्च', nature: 'expense', parent: '5' },
  { code: '540', name: 'Financial Expenses', nameNepali: 'वित्तीय खर्च', nature: 'expense', parent: '5' },
  { code: '550', name: 'Tax Expenses', nameNepali: 'कर खर्च', nature: 'expense', parent: '5' },
  { code: '560', name: 'Depreciation', nameNepali: 'ह्रास', nature: 'expense', parent: '5' },
]

// Default accounts that should be created for every organization
export const DEFAULT_ACCOUNTS = [
  { code: '11001', name: 'Cash in Hand', nameNepali: 'हातमा नगद', groupCode: '110', subType: 'cash', isSystem: true },
  { code: '11002', name: 'Cash at Bank - Nabil', nameNepali: 'बैंकमा नगद - नबिल', groupCode: '110', subType: 'bank', isSystem: false },
  { code: '11003', name: 'Petty Cash', nameNepali: 'सानो नगद', groupCode: '110', subType: 'cash', isSystem: true },
  { code: '12001', name: 'Accounts Receivable', nameNepali: 'प्राप्य खाता', groupCode: '120', subType: 'receivable', isSystem: true },
  { code: '13001', name: 'Inventory', nameNepali: 'इन्भेन्ट्री', groupCode: '130', subType: 'inventory', isSystem: true },
  { code: '21001', name: 'Accounts Payable', nameNepali: 'देय खाता', groupCode: '210', subType: 'payable', isSystem: true },
  { code: '22001', name: 'VAT Payable', nameNepali: 'भ्याट देय', groupCode: '220', subType: 'vat', isSystem: true },
  { code: '22002', name: 'Input VAT (Credit)', nameNepali: 'आगत भ्याट', groupCode: '220', subType: 'vat_input', isSystem: true },
  { code: '22003', name: 'Output VAT (Debit)', nameNepali: 'निर्गत भ्याट', groupCode: '220', subType: 'vat_output', isSystem: true },
  { code: '23001', name: 'TDS Payable', nameNepali: 'टीडीएस देय', groupCode: '230', subType: 'tds', isSystem: true },
  { code: '31001', name: 'Owner Capital', nameNepali: 'स्वामीको पूँजी', groupCode: '310', subType: 'capital', isSystem: true },
  { code: '32001', name: 'Retained Earnings', nameNepali: 'सञ्चित आम्दानी', groupCode: '320', subType: 'retained_earnings', isSystem: true },
  { code: '41001', name: 'Sales Revenue', nameNepali: 'बिक्री आम्दानी', groupCode: '410', subType: 'sales', isSystem: true },
  { code: '42001', name: 'Service Revenue', nameNepali: 'सेवा आम्दानी', groupCode: '420', subType: 'service_income', isSystem: true },
  { code: '51001', name: 'Cost of Goods Sold', nameNepali: 'बेचिएको वस्तुको लागत', groupCode: '510', subType: 'cogs', isSystem: true },
  { code: '52001', name: 'Salary & Wages', nameNepali: 'तलब तथा ज्याला', groupCode: '520', subType: 'salary', isSystem: false },
  { code: '52002', name: 'Rent Expense', nameNepali: 'भाडा खर्च', groupCode: '520', subType: 'rent', isSystem: false },
  { code: '52003', name: 'Utilities', nameNepali: 'उपयोगिता खर्च', groupCode: '520', subType: 'utilities', isSystem: false },
  { code: '52004', name: 'Office Supplies', nameNepali: 'कार्यालय सामग्री', groupCode: '520', subType: 'supplies', isSystem: false },
  { code: '52005', name: 'Travel & Conveyance', nameNepali: 'यात्रा र ढुवानी', groupCode: '520', subType: 'travel', isSystem: false },
]

// Format NPR currency
export function formatNPR(amount: number): string {
  // Nepali number formatting: 1,23,45,678.00
  const isNegative = amount < 0
  const absAmount = Math.abs(amount)
  const parts = absAmount.toFixed(2).split('.')
  let integerPart = parts[0]
  const decimalPart = parts[1]

  // Apply Indian/Nepali numbering system
  const digits = integerPart.split('')
  let result = ''

  // Last 3 digits
  if (digits.length <= 3) {
    result = digits.join('')
  } else {
    result = digits.slice(-3).join('')
    digits.splice(-3)

    // Groups of 2 from right
    while (digits.length > 0) {
      if (digits.length <= 2) {
        result = digits.join('') + ',' + result
        break
      }
      result = digits.slice(-2).join('') + ',' + result
      digits.splice(-2)
    }
  }

  return `${isNegative ? '-' : ''}Rs. ${result}.${decimalPart}`
}

// Calculate VAT
export function calculateVAT(amount: number, rate: number = NEPAL_VAT_RATE): {
  taxableAmount: number
  vatAmount: number
  totalAmount: number
} {
  return {
    taxableAmount: amount,
    vatAmount: Math.round(amount * rate * 100) / 100,
    totalAmount: Math.round(amount * (1 + rate) * 100) / 100,
  }
}

// Calculate TDS
export function calculateTDS(amount: number, category: string): number {
  const rate = TDS_RATES[category] || TDS_RATES.others
  return Math.round(amount * rate * 100) / 100
}

// Voucher type labels
export const VOUCHER_TYPE_LABELS: Record<string, string> = {
  payment: 'Payment Voucher',
  receipt: 'Receipt Voucher',
  journal: 'Journal Voucher',
  contra: 'Contra Entry',
  sales: 'Sales Invoice',
  purchase: 'Purchase Bill',
}

export const VOUCHER_TYPE_LABELS_NEPALI: Record<string, string> = {
  payment: 'भुक्तानी भौचर',
  receipt: 'प्राप्ति भौचर',
  journal: 'जर्नल भौचर',
  contra: 'कन्ट्रा प्रविष्टि',
  sales: 'बिक्री बिल',
  purchase: 'खरिद बिल',
}

// Account nature helpers
export function isDebitNature(accountType: string): boolean {
  return accountType === 'asset' || accountType === 'expense'
}

export function isCreditNature(accountType: string): boolean {
  return accountType === 'liability' || accountType === 'equity' || accountType === 'income'
}
