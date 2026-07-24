// Hisab Pro - Comprehensive Seed File
// Creates dummy data for development and testing

import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'
import { NEPAL_COA_GROUPS, DEFAULT_ACCOUNTS } from '../src/lib/nepal-accounting'

const db = new PrismaClient()

const SALT = 'hisab-pro-salt'

function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

// Plan hierarchy for inheritance logic
const PLAN_HIERARCHY: Record<string, number> = { free: 0, pro: 1, enterprise: 2 }

// ──────────────────────────────────────────────
// User Definitions
// ──────────────────────────────────────────────
const USERS = [
  { email: 'admin@hisabpro.com', password: 'admin123', name: 'Super Admin', role: 'super_admin', language: 'en' },
  { email: 'ramesh@sharma.com.np', password: 'ramesh123', name: 'Ramesh Sharma', role: 'user', language: 'ne' },
  { email: 'sita@kirana.com.np', password: 'sita123', name: 'Sita Adhikari', role: 'user', language: 'ne' },
  { email: 'hari@staff.com.np', password: 'hari123', name: 'Hari Poudel', role: 'user', language: 'en' },
  { email: 'maya@accountant.com.np', password: 'maya123', name: 'Maya Thapa', role: 'user', language: 'ne' },
  { email: 'binod@viewer.com.np', password: 'binod123', name: 'Binod Karki', role: 'user', language: 'en' },
  { email: 'ceo@bigcorp.com.np', password: 'ceo123', name: 'Prakash CEO', role: 'user', language: 'en' },
  { email: 'geeta@smallshop.com.np', password: 'geeta123', name: 'Geeta Maharjan', role: 'user', language: 'ne' },
]

// ──────────────────────────────────────────────
// Organization Definitions
// ──────────────────────────────────────────────
const ORGS = [
  { name: 'Sharma Trading', nameNepali: 'शर्मा ट्रेडिङ', plan: 'pro', panNumber: '301234567', address: 'Teku, Kathmandu', city: 'Kathmandu', province: 'Bagmati', phone: '01-4234567', email: 'info@sharmatrading.np', vatEnabled: true, vatNumber: 'VAT301234567', tdsEnabled: true, ssfEnabled: true, industry: 'trading', mode: 'advanced', language: 'ne', currency: 'NPR', fiscalYear: '2081/82' },
  { name: 'Sita Kirana Store', nameNepali: 'सिता किराना स्टोर', plan: 'free', panNumber: '402345678', address: 'Asan, Kathmandu', city: 'Kathmandu', province: 'Bagmati', phone: '01-4345678', email: 'sita@kirana.np', vatEnabled: false, tdsEnabled: false, ssfEnabled: false, industry: 'retail', mode: 'simple', language: 'ne', currency: 'NPR', fiscalYear: '2081/82' },
  { name: 'BigCorp Nepal', nameNepali: 'बिगकर्प नेपाल', plan: 'enterprise', panNumber: '503456789', address: 'Hattisar, Kathmandu', city: 'Kathmandu', province: 'Bagmati', phone: '01-4456789', email: 'info@bigcorp.np', vatEnabled: true, vatNumber: 'VAT503456789', tdsEnabled: true, ssfEnabled: true, industry: 'manufacturing', mode: 'advanced', language: 'en', currency: 'NPR', fiscalYear: '2081/82' },
  { name: 'Geeta\'s Small Shop', nameNepali: 'गीताको सानो पसल', plan: 'free', panNumber: '604567890', address: 'Bhaktapur', city: 'Bhaktapur', province: 'Bagmati', phone: '01-661234', email: 'geeta@smallshop.np', vatEnabled: false, tdsEnabled: false, ssfEnabled: false, industry: 'retail', mode: 'simple', language: 'ne', currency: 'NPR', fiscalYear: '2081/82' },
]

// ──────────────────────────────────────────────
// User-Organization Membership Definitions
// ──────────────────────────────────────────────
const MEMBERSHIPS = [
  // ramesh is admin of Sharma Trading (Pro)
  { userEmail: 'ramesh@sharma.com.np', orgName: 'Sharma Trading', orgRole: 'admin' },
  // sita is admin of Sita Kirana Store (Free)
  { userEmail: 'sita@kirana.com.np', orgName: 'Sita Kirana Store', orgRole: 'admin' },
  // hari is staff in Sharma Trading
  { userEmail: 'hari@staff.com.np', orgName: 'Sharma Trading', orgRole: 'staff' },
  // maya is accountant in Sharma Trading
  { userEmail: 'maya@accountant.com.np', orgName: 'Sharma Trading', orgRole: 'accountant' },
  // binod is viewer in Sharma Trading
  { userEmail: 'binod@viewer.com.np', orgName: 'Sharma Trading', orgRole: 'viewer' },
  // ceo is admin of BigCorp Nepal (Enterprise)
  { userEmail: 'ceo@bigcorp.com.np', orgName: 'BigCorp Nepal', orgRole: 'admin' },
  // geeta is admin of Geeta's Small Shop (Free)
  { userEmail: 'geeta@smallshop.com.np', orgName: 'Geeta\'s Small Shop', orgRole: 'admin' },
]

// ──────────────────────────────────────────────
// Party Definitions per Org
// ──────────────────────────────────────────────
const PARTIES: Record<string, Array<{
  name: string; nameNepali: string; panNumber?: string; partyType: string;
  phone?: string; address?: string; city?: string; creditLimit?: number;
  isTdsApplicable?: boolean; tdsRate?: number; tdsCategory?: string;
  isSSFAplicable?: boolean; bankName?: string; bankAccount?: string;
}>> = {
  'Sharma Trading': [
    { name: 'Himal Suppliers', nameNepali: 'हिमाल आपूर्तिकर्ता', panNumber: '402345678', partyType: 'supplier', phone: '01-4345678', address: 'Tripureshwor, Kathmandu', city: 'Kathmandu', creditLimit: 1000000, isTdsApplicable: true, tdsRate: 1.5, tdsCategory: 'contract', bankName: 'Nabil Bank', bankAccount: '1234567890' },
    { name: 'Gorkha Enterprises', nameNepali: 'गोरखा उद्यम', panNumber: '503456789', partyType: 'customer', phone: '01-4456789', address: 'Putalisadak, Kathmandu', city: 'Kathmandu', creditLimit: 300000, isTdsApplicable: false },
    { name: 'Nepal General Store', nameNepali: 'नेपाल जनरल स्टोर', panNumber: '604567890', partyType: 'customer', phone: '056-523456', address: 'Butwal Chowk, Butwal', city: 'Butwal', creditLimit: 200000 },
    { name: 'Pokhara Trading Co.', nameNepali: 'पोखरा ट्रेडिङ कम्पनी', panNumber: '705678901', partyType: 'both', phone: '061-523456', address: 'Chipledhunga, Pokhara', city: 'Pokhara', creditLimit: 500000, isTdsApplicable: true, tdsRate: 1.5, tdsCategory: 'contract' },
    { name: 'Sunrise Suppliers', nameNepali: 'सुनराइज आपूर्तिकर्ता', panNumber: '806789012', partyType: 'supplier', phone: '01-4567890', address: 'Baneshwor, Kathmandu', city: 'Kathmandu', creditLimit: 800000, isTdsApplicable: true, tdsRate: 15, tdsCategory: 'rent' },
    { name: 'Ramesh (Employee)', nameNepali: 'रमेश (कर्मचारी)', partyType: 'employee', phone: '9841234567', address: 'Teku, Kathmandu', city: 'Kathmandu', isSSFAplicable: true },
  ],
  'Sita Kirana Store': [
    { name: 'Local Wholesaler', nameNepali: 'स्थानीय थोक विक्रेता', partyType: 'supplier', phone: '01-412345', address: 'Asan, Kathmandu', city: 'Kathmandu', creditLimit: 200000 },
    { name: 'Neighbour Customer', nameNepali: 'छिमेकी ग्राहक', partyType: 'customer', phone: '01-412346', address: 'Asan, Kathmandu', city: 'Kathmandu', creditLimit: 50000 },
  ],
  'BigCorp Nepal': [
    { name: 'Global Materials Inc.', nameNepali: 'ग्लोबल मटेरियल्स इन्क.', panNumber: '907890123', partyType: 'supplier', phone: '01-4678901', address: 'Hattisar, Kathmandu', city: 'Kathmandu', creditLimit: 5000000, isTdsApplicable: true, tdsRate: 1.5, tdsCategory: 'contract', bankName: 'Global Bank Nepal', bankAccount: '9876543210' },
    { name: 'National Distributors', nameNepali: 'नेशनल वितरक', panNumber: '108901234', partyType: 'supplier', phone: '01-4789012', address: 'Kalanki, Kathmandu', city: 'Kathmandu', creditLimit: 3000000, isTdsApplicable: true, tdsRate: 1.5, tdsCategory: 'transport' },
    { name: 'Chitwan Agro Products', nameNepali: 'चितवन एग्रो प्रोडक्ट्स', panNumber: '119012345', partyType: 'customer', phone: '056-534567', address: 'Bharatpur, Chitwan', city: 'Chitwan', creditLimit: 1000000 },
    { name: 'Dharan Retail Chain', nameNepali: 'धरान रिटेल चेन', panNumber: '120123456', partyType: 'customer', phone: '025-534567', address: 'Dharan, Sunsari', city: 'Dharan', creditLimit: 2000000 },
    { name: 'Prakash (Employee)', nameNepali: 'प्रकाश (कर्मचारी)', partyType: 'employee', phone: '9851234567', address: 'Hattisar, Kathmandu', city: 'Kathmandu', isSSFAplicable: true },
  ],
  'Geeta\'s Small Shop': [
    { name: 'Bhaktapur Wholesaler', nameNepali: 'भक्तपुर थोक विक्रेता', partyType: 'supplier', phone: '01-661235', address: 'Taumadhi, Bhaktapur', city: 'Bhaktapur', creditLimit: 100000 },
    { name: 'Local Customer', nameNepali: 'स्थानीय ग्राहक', partyType: 'customer', phone: '01-661236', address: 'Bhaktapur', city: 'Bhaktapur', creditLimit: 30000 },
  ],
}

// ──────────────────────────────────────────────
// Product Definitions per Org
// ──────────────────────────────────────────────
const PRODUCTS: Record<string, Array<{
  name: string; nameNepali: string; code: string; unit?: string;
  hsnCode?: string; category?: string; brand?: string;
  productType: string; isVatable?: boolean; vatRate?: number;
  sellingPrice?: number; costPrice?: number; minStockLevel?: number;
  maxStockLevel?: number; description?: string;
}>> = {
  'Sharma Trading': [
    { name: 'Office Paper A4', nameNepali: 'कार्यालय कागज A4', code: 'SKU-001', unit: 'ream', hsnCode: '4802', category: 'Office Supplies', productType: 'goods', isVatable: true, sellingPrice: 500, costPrice: 400, minStockLevel: 10, maxStockLevel: 200 },
    { name: 'Printer Ink Cartridge', nameNepali: 'प्रिन्टर इंक कार्ट्रिज', code: 'SKU-002', unit: 'pcs', hsnCode: '3219', category: 'Office Supplies', productType: 'goods', isVatable: true, sellingPrice: 2500, costPrice: 1800, minStockLevel: 5, maxStockLevel: 50 },
    { name: 'Stapler', nameNepali: 'स्टेपलर', code: 'SKU-003', unit: 'pcs', hsnCode: '8205', category: 'Office Supplies', productType: 'goods', isVatable: true, sellingPrice: 350, costPrice: 200, minStockLevel: 20 },
    { name: 'Consulting Service', nameNepali: 'परामर्श सेवा', code: 'SRV-001', unit: 'hour', category: 'Services', productType: 'service', isVatable: true, sellingPrice: 5000, costPrice: 0 },
    { name: 'Steel Pipes', nameNepali: 'स्टिल पाइप', code: 'SKU-004', unit: 'meter', hsnCode: '7304', category: 'Industrial', brand: 'Nepal Steel', productType: 'goods', isVatable: true, sellingPrice: 1200, costPrice: 900, minStockLevel: 50, maxStockLevel: 500 },
    { name: 'Cement Bag', nameNepali: 'सिमेन्ट बोरा', code: 'SKU-005', unit: 'bag', hsnCode: '2523', category: 'Construction', brand: 'Himal Cement', productType: 'goods', isVatable: true, sellingPrice: 600, costPrice: 480, minStockLevel: 100, maxStockLevel: 1000 },
  ],
  'Sita Kirana Store': [
    { name: 'Rice (Basmati)', nameNepali: 'चामल (बासमती)', code: 'SKU-101', unit: 'kg', category: 'Food', productType: 'goods', sellingPrice: 120, costPrice: 100, minStockLevel: 50 },
    { name: 'Cooking Oil', nameNepali: 'खाना तेल', code: 'SKU-102', unit: 'ltr', category: 'Food', productType: 'goods', sellingPrice: 180, costPrice: 150, minStockLevel: 20 },
    { name: 'Soap', nameNepali: 'साबुन', code: 'SKU-103', unit: 'pcs', category: 'Household', productType: 'goods', sellingPrice: 50, costPrice: 35, minStockLevel: 100 },
  ],
  'BigCorp Nepal': [
    { name: 'Industrial Motor', nameNepali: 'इन्डस्ट्रियल मोटर', code: 'SKU-201', unit: 'pcs', hsnCode: '8501', category: 'Industrial', brand: 'Siemens', productType: 'goods', isVatable: true, sellingPrice: 50000, costPrice: 40000, minStockLevel: 2, maxStockLevel: 20 },
    { name: 'Steel Sheet', nameNepali: 'स्टिल शीट', code: 'SKU-202', unit: 'sqft', hsnCode: '7210', category: 'Construction', productType: 'goods', isVatable: true, sellingPrice: 250, costPrice: 200, minStockLevel: 100, maxStockLevel: 2000 },
    { name: 'Manufacturing Service', nameNepali: 'निर्माण सेवा', code: 'SRV-201', unit: 'hour', category: 'Services', productType: 'service', isVatable: true, sellingPrice: 15000 },
    { name: 'PVC Pipes', nameNepali: 'PVC पाइप', code: 'SKU-203', unit: 'meter', hsnCode: '3917', category: 'Construction', brand: 'Nepal PVC', productType: 'goods', isVatable: true, sellingPrice: 350, costPrice: 280, minStockLevel: 200, maxStockLevel: 5000 },
  ],
  'Geeta\'s Small Shop': [
    { name: 'Tea', nameNepali: 'चिया', code: 'SKU-301', unit: 'kg', category: 'Food', productType: 'goods', sellingPrice: 200, costPrice: 160, minStockLevel: 10 },
    { name: 'Sugar', nameNepali: 'चिनी', code: 'SKU-302', unit: 'kg', category: 'Food', productType: 'goods', sellingPrice: 80, costPrice: 65, minStockLevel: 50 },
    { name: 'Salt', nameNepali: 'नुन', code: 'SKU-303', unit: 'kg', category: 'Food', productType: 'goods', sellingPrice: 30, costPrice: 22, minStockLevel: 30 },
  ],
}

// ──────────────────────────────────────────────
// Journal Entry Definitions per Org
// ──────────────────────────────────────────────
interface JournalEntryDef {
  entryNumber: string; date: string; narration: string; voucherType: string;
  lines: Array<{ accountCode: string; debit: number; credit: number; narration: string }>;
}

const JOURNAL_ENTRIES: Record<string, JournalEntryDef[]> = {
  'Sharma Trading': [
    {
      entryNumber: 'JE-001', date: '2024-08-01', narration: 'Capital introduced by Ramesh Sharma', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 500000, credit: 0, narration: 'Cash received' },
        { accountCode: '31001', debit: 0, credit: 500000, narration: 'Capital introduced' },
      ],
    },
    {
      entryNumber: 'JE-002', date: '2024-08-15', narration: 'Cash sales with VAT', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 56500, credit: 0, narration: 'Cash received' },
        { accountCode: '41001', debit: 0, credit: 50000, narration: 'Sales revenue' },
        { accountCode: '22003', debit: 0, credit: 6500, narration: 'Output VAT 13%' },
      ],
    },
    {
      entryNumber: 'JE-003', date: '2024-09-01', narration: 'Credit sales to Gorkha Enterprises', voucherType: 'sales',
      lines: [
        { accountCode: '12001', debit: 113000, credit: 0, narration: 'Amount receivable' },
        { accountCode: '41001', debit: 0, credit: 100000, narration: 'Sales revenue' },
        { accountCode: '22003', debit: 0, credit: 13000, narration: 'Output VAT 13%' },
      ],
    },
    {
      entryNumber: 'JE-004', date: '2024-09-30', narration: 'Salary payment for Ashad', voucherType: 'payment',
      lines: [
        { accountCode: '52001', debit: 80000, credit: 0, narration: 'Salary expense' },
        { accountCode: '11001', debit: 0, credit: 80000, narration: 'Cash paid' },
      ],
    },
    {
      entryNumber: 'JE-005', date: '2024-10-01', narration: 'Office rent payment', voucherType: 'payment',
      lines: [
        { accountCode: '52002', debit: 25000, credit: 0, narration: 'Rent expense' },
        { accountCode: '11001', debit: 0, credit: 25000, narration: 'Cash paid' },
      ],
    },
    {
      entryNumber: 'JE-006', date: '2024-10-10', narration: 'Purchase from Himal Suppliers with VAT', voucherType: 'purchase',
      lines: [
        { accountCode: '13001', debit: 150000, credit: 0, narration: 'Inventory purchased' },
        { accountCode: '22002', debit: 19500, credit: 0, narration: 'Input VAT 13%' },
        { accountCode: '21001', debit: 0, credit: 169500, narration: 'Amount payable' },
      ],
    },
    {
      entryNumber: 'JE-007', date: '2024-11-15', narration: 'Payment received from Gorkha Enterprises', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 113000, credit: 0, narration: 'Cash received' },
        { accountCode: '12001', debit: 0, credit: 113000, narration: 'Receivable cleared' },
      ],
    },
    {
      entryNumber: 'JE-008', date: '2024-11-20', narration: 'Payment to Himal Suppliers', voucherType: 'payment',
      lines: [
        { accountCode: '21001', debit: 169500, credit: 0, narration: 'Payable cleared' },
        { accountCode: '11001', debit: 0, credit: 169500, narration: 'Cash paid' },
      ],
    },
    {
      entryNumber: 'JE-009', date: '2024-12-01', narration: 'Utilities expense', voucherType: 'payment',
      lines: [
        { accountCode: '52003', debit: 5000, credit: 0, narration: 'Electricity & internet' },
        { accountCode: '11001', debit: 0, credit: 5000, narration: 'Cash paid' },
      ],
    },
    {
      entryNumber: 'JE-010', date: '2025-01-10', narration: 'Consulting service income', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 28250, credit: 0, narration: 'Cash received' },
        { accountCode: '42001', debit: 0, credit: 25000, narration: 'Service revenue' },
        { accountCode: '22003', debit: 0, credit: 3250, narration: 'Output VAT 13%' },
      ],
    },
  ],
  'Sita Kirana Store': [
    {
      entryNumber: 'JE-001', date: '2024-08-01', narration: 'Capital introduced by Sita', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 100000, credit: 0, narration: 'Cash received' },
        { accountCode: '31001', debit: 0, credit: 100000, narration: 'Capital introduced' },
      ],
    },
    {
      entryNumber: 'JE-002', date: '2024-08-15', narration: 'Cash sales', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 15000, credit: 0, narration: 'Cash received' },
        { accountCode: '41001', debit: 0, credit: 15000, narration: 'Sales revenue' },
      ],
    },
    {
      entryNumber: 'JE-003', date: '2024-09-30', narration: 'Purchase from wholesaler', voucherType: 'payment',
      lines: [
        { accountCode: '13001', debit: 80000, credit: 0, narration: 'Inventory purchased' },
        { accountCode: '11001', debit: 0, credit: 80000, narration: 'Cash paid' },
      ],
    },
  ],
  'BigCorp Nepal': [
    {
      entryNumber: 'JE-001', date: '2024-08-01', narration: 'Capital introduced by Prakash', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 2000000, credit: 0, narration: 'Cash received' },
        { accountCode: '31001', debit: 0, credit: 2000000, narration: 'Capital introduced' },
      ],
    },
    {
      entryNumber: 'JE-002', date: '2024-08-15', narration: 'Bank deposit', voucherType: 'contra',
      lines: [
        { accountCode: '11002', debit: 1500000, credit: 0, narration: 'Bank deposit' },
        { accountCode: '11001', debit: 0, credit: 1500000, narration: 'Cash withdrawn' },
      ],
    },
    {
      entryNumber: 'JE-003', date: '2024-09-01', narration: 'Credit sales to Chitwan Agro with VAT', voucherType: 'sales',
      lines: [
        { accountCode: '12001', debit: 565000, credit: 0, narration: 'Amount receivable' },
        { accountCode: '41001', debit: 0, credit: 500000, narration: 'Sales revenue' },
        { accountCode: '22003', debit: 0, credit: 65000, narration: 'Output VAT 13%' },
      ],
    },
    {
      entryNumber: 'JE-004', date: '2024-10-10', narration: 'Purchase from Global Materials with VAT', voucherType: 'purchase',
      lines: [
        { accountCode: '13001', debit: 800000, credit: 0, narration: 'Inventory purchased' },
        { accountCode: '22002', debit: 104000, credit: 0, narration: 'Input VAT 13%' },
        { accountCode: '21001', debit: 0, credit: 904000, narration: 'Amount payable' },
      ],
    },
    {
      entryNumber: 'JE-005', date: '2024-09-30', narration: 'Salary payments', voucherType: 'payment',
      lines: [
        { accountCode: '52001', debit: 300000, credit: 0, narration: 'Salary expense' },
        { accountCode: '11002', debit: 0, credit: 300000, narration: 'Bank payment' },
      ],
    },
    {
      entryNumber: 'JE-006', date: '2024-12-01', narration: 'Rent expense', voucherType: 'payment',
      lines: [
        { accountCode: '52002', debit: 50000, credit: 0, narration: 'Factory rent' },
        { accountCode: '11002', debit: 0, credit: 50000, narration: 'Bank payment' },
      ],
    },
  ],
  'Geeta\'s Small Shop': [
    {
      entryNumber: 'JE-001', date: '2024-08-01', narration: 'Capital introduced by Geeta', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 50000, credit: 0, narration: 'Cash received' },
        { accountCode: '31001', debit: 0, credit: 50000, narration: 'Capital introduced' },
      ],
    },
    {
      entryNumber: 'JE-002', date: '2024-08-20', narration: 'Daily sales', voucherType: 'receipt',
      lines: [
        { accountCode: '11001', debit: 5000, credit: 0, narration: 'Cash received' },
        { accountCode: '41001', debit: 0, credit: 5000, narration: 'Sales revenue' },
      ],
    },
  ],
}

// ──────────────────────────────────────────────
// Helper: Create Nepal COA for an organization
// ──────────────────────────────────────────────
async function createNepalCOA(orgId: string): Promise<Record<string, string>> {
  const groupMap: Record<string, string> = {}

  for (const group of NEPAL_COA_GROUPS) {
    const created = await db.accountGroup.create({
      data: {
        organizationId: orgId,
        name: group.name,
        nameNepali: group.nameNepali,
        code: group.code,
        nature: group.nature,
        parentGroupId: group.parent ? groupMap[group.parent] : null,
        isSystem: ['1', '2', '3', '4', '5'].includes(group.code),
        sortOrder: parseInt(group.code) || 0,
      },
    })
    groupMap[group.code] = created.id
  }

  for (const account of DEFAULT_ACCOUNTS) {
    const groupId = groupMap[account.groupCode]
    if (!groupId) continue

    await db.account.create({
      data: {
        organizationId: orgId,
        groupId,
        name: account.name,
        nameNepali: account.nameNepali,
        code: account.code,
        accountType: NEPAL_COA_GROUPS.find(g => g.code === account.groupCode)?.nature || 'asset',
        subType: account.subType,
        isSystem: account.isSystem,
        isActive: true,
        allowsDirectPosting: true,
        openingBalance: 0,
        currentBalance: 0,
      },
    })
  }

  return groupMap
}

// ──────────────────────────────────────────────
// Helper: Create default tax rates for an org
// ──────────────────────────────────────────────
async function createTaxRates(orgId: string, vatEnabled: boolean, tdsEnabled: boolean, ssfEnabled: boolean) {
  const taxRates: Array<{ organizationId: string; name: string; nameNepali?: string; taxType: string; rate: number; isDefault: boolean; isActive: boolean }> = []

  if (vatEnabled) {
    taxRates.push(
      { organizationId: orgId, name: 'VAT 13%', nameNepali: 'भ्याट 13%', taxType: 'vat', rate: 13, isDefault: true, isActive: true },
    )
  }

  if (tdsEnabled) {
    taxRates.push(
      { organizationId: orgId, name: 'TDS - Contract 1.5%', nameNepali: 'टीडीएस - कन्ट्रक्ट 1.5%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true },
      { organizationId: orgId, name: 'TDS - Rent 15%', nameNepali: 'टीडीएस - भाडा 15%', taxType: 'tds', rate: 15, isDefault: false, isActive: true },
      { organizationId: orgId, name: 'TDS - Consultancy 15%', nameNepali: 'टीडीएस - परामर्श 15%', taxType: 'tds', rate: 15, isDefault: false, isActive: true },
      { organizationId: orgId, name: 'TDS - Transport 1.5%', nameNepali: 'टीडीएस - यातायात 1.5%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true },
    )
  }

  if (ssfEnabled) {
    taxRates.push(
      { organizationId: orgId, name: 'SSF Total 31%', nameNepali: 'SSF कुल 31%', taxType: 'ssf', rate: 31, isDefault: false, isActive: true },
      { organizationId: orgId, name: 'SSF Employee 20%', nameNepali: 'SSF कर्मचारी 20%', taxType: 'ssf', rate: 20, isDefault: false, isActive: true },
      { organizationId: orgId, name: 'SSF Employer 11%', nameNepali: 'SSF रोजगारदाता 11%', taxType: 'ssf', rate: 11, isDefault: false, isActive: true },
    )
  }

  // Always add a default inactive SSF entry
  if (!ssfEnabled) {
    taxRates.push(
      { organizationId: orgId, name: 'SSF Total 31%', taxType: 'ssf', rate: 31, isDefault: false, isActive: false },
    )
  }

  if (taxRates.length > 0) {
    await db.taxRate.createMany({ data: taxRates })
  }
}

// ──────────────────────────────────────────────
// Helper: Create default warehouse
// ──────────────────────────────────────────────
async function createDefaultWarehouse(orgId: string) {
  await db.warehouse.create({
    data: {
      organizationId: orgId,
      name: 'Main Warehouse',
      nameNepali: 'मुख्य गोदाम',
      isDefault: true,
    },
  })
}

// ──────────────────────────────────────────────
// Helper: Create fiscal year
// ──────────────────────────────────────────────
async function createFiscalYear(orgId: string, fiscalYearName: string) {
  const fyMap: Record<string, { start: string; end: string }> = {
    '2081/82': { start: '2024-07-16', end: '2025-07-15' },
    '2080/81': { start: '2023-07-17', end: '2024-07-15' },
  }
  const dates = fyMap[fiscalYearName] || fyMap['2081/82']

  const fy = await db.fiscalYear.create({
    data: {
      organizationId: orgId,
      name: fiscalYearName,
      startDate: new Date(dates.start),
      endDate: new Date(dates.end),
      isCurrent: true,
    },
  })
  return fy
}

// ──────────────────────────────────────────────
// Helper: Create subscription for org
// ──────────────────────────────────────────────
async function createSubscription(orgId: string, plan: string) {
  const now = new Date()
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const subscriptionData = {
    organizationId: orgId,
    plan,
    status: plan === 'free' ? 'trialing' : 'active',
    currentPeriodStart: now,
    currentPeriodEnd: plan === 'free' ? thirtyDays : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    trialEndsAt: plan === 'free' ? thirtyDays : null,
  }

  await db.subscription.create({ data: subscriptionData })
}

// ──────────────────────────────────────────────
// Helper: Create journal entries and update balances
// ──────────────────────────────────────────────
async function createJournalEntries(orgId: string, fiscalYearId: string, entries: JournalEntryDef[]) {
  // Get account ID map for this org
  const accounts = await db.account.findMany({ where: { organizationId: orgId } })
  const accountMap: Record<string, string> = {}
  for (const acc of accounts) {
    accountMap[acc.code] = acc.id
  }

  for (const entry of entries) {
    const totalDebit = entry.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = entry.lines.reduce((sum, l) => sum + l.credit, 0)

    const linesData = entry.lines
      .map(l => {
        const accountId = accountMap[l.accountCode]
        if (!accountId) return null
        return { accountId, debit: l.debit, credit: l.credit, narration: l.narration }
      })
      .filter(Boolean) as Array<{ accountId: string; debit: number; credit: number; narration: string }>

    if (linesData.length === 0) continue

    await db.journalEntry.create({
      data: {
        organizationId: orgId,
        fiscalYearId,
        entryNumber: entry.entryNumber,
        date: new Date(entry.date),
        narration: entry.narration,
        voucherType: entry.voucherType,
        totalDebit,
        totalCredit,
        isPosted: true,
        lines: {
          create: linesData,
        },
      },
    })
  }

  // Update account balances based on journal entries
  const accountsWithLines = await db.account.findMany({
    where: { organizationId: orgId },
    include: { journalLines: true },
  })

  for (const account of accountsWithLines) {
    let balance = account.openingBalance
    for (const line of account.journalLines) {
      if (account.accountType === 'asset' || account.accountType === 'expense') {
        balance += line.debit - line.credit
      } else {
        balance += line.credit - line.debit
      }
    }
    await db.account.update({
      where: { id: account.id },
      data: { currentBalance: balance },
    })
  }
}

// ──────────────────────────────────────────────
// Helper: Create parties for an org
// ──────────────────────────────────────────────
async function createParties(orgId: string, parties: Array<{
  name: string; nameNepali: string; panNumber?: string; partyType: string;
  phone?: string; address?: string; city?: string; creditLimit?: number;
  isTdsApplicable?: boolean; tdsRate?: number; tdsCategory?: string;
  isSSFAplicable?: boolean; bankName?: string; bankAccount?: string;
}>) {
  for (const party of parties) {
    await db.party.create({
      data: {
        organizationId: orgId,
        name: party.name,
        nameNepali: party.nameNepali,
        panNumber: party.panNumber || null,
        partyType: party.partyType,
        phone: party.phone || null,
        address: party.address || null,
        city: party.city || null,
        creditLimit: party.creditLimit || null,
        currentBalance: 0,
        isTdsApplicable: party.isTdsApplicable || false,
        tdsRate: party.tdsRate || null,
        tdsCategory: party.tdsCategory || null,
        isSSFAplicable: party.isSSFAplicable || false,
        bankName: party.bankName || null,
        bankAccount: party.bankAccount || null,
        isActive: true,
      },
    })
  }
}

// ──────────────────────────────────────────────
// Helper: Create products for an org
// ──────────────────────────────────────────────
async function createProducts(orgId: string, products: Array<{
  name: string; nameNepali: string; code: string; unit?: string;
  hsnCode?: string; category?: string; brand?: string;
  productType: string; isVatable?: boolean; vatRate?: number;
  sellingPrice?: number; costPrice?: number; minStockLevel?: number;
  maxStockLevel?: number; description?: string;
}>) {
  for (const product of products) {
    await db.product.create({
      data: {
        organizationId: orgId,
        name: product.name,
        nameNepali: product.nameNepali,
        code: product.code,
        unit: product.unit || null,
        hsnCode: product.hsnCode || null,
        category: product.category || null,
        brand: product.brand || null,
        productType: product.productType,
        isVatable: product.isVatable ?? true,
        vatRate: product.vatRate || null,
        sellingPrice: product.sellingPrice || null,
        costPrice: product.costPrice || null,
        minStockLevel: product.minStockLevel || null,
        maxStockLevel: product.maxStockLevel || null,
        costingMethod: product.productType === 'service' ? 'fifo' : 'fifo',
        isActive: true,
      },
    })
  }
}

// ──────────────────────────────────────────────
// Main seed function
// ──────────────────────────────────────────────
async function main() {
  console.log('🌱 Starting Hisab Pro comprehensive seed...')

  // Clean existing data (order matters for foreign key constraints)
  console.log('🗑️  Cleaning existing data...')
  await db.journalEntryLine.deleteMany()
  await db.journalEntry.deleteMany()
  await db.invoiceLine.deleteMany()
  await db.invoice.deleteMany()
  await db.purchaseBillLine.deleteMany()
  await db.purchaseBill.deleteMany()
  await db.stockTransaction.deleteMany()
  await db.stockLevel.deleteMany()
  await db.auditLog.deleteMany()
  await db.taxRate.deleteMany()
  await db.product.deleteMany()
  await db.party.deleteMany()
  await db.warehouse.deleteMany()
  await db.account.deleteMany()
  await db.accountGroup.deleteMany()
  await db.fiscalYear.deleteMany()
  await db.subscription.deleteMany()
  await db.userOrganization.deleteMany()
  await db.organizationSetting.deleteMany()
  await db.organization.deleteMany()
  await db.user.deleteMany()
  console.log('✅ Existing data cleaned')

  // ── Step 1: Create Users ──
  console.log('👤 Creating users...')
  const userMap: Record<string, string> = {}
  for (const u of USERS) {
    const user = await db.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash: hashPassword(u.password),
        role: u.role,
        language: u.language,
        isActive: true,
      },
    })
    userMap[u.email] = user.id
    console.log(`  ✓ Created user: ${u.name} (${u.email}) - role: ${u.role}`)
  }

  // ── Step 2: Create Organizations ──
  console.log('🏢 Creating organizations...')
  const orgMap: Record<string, string> = {}
  const orgFyMap: Record<string, string> = {}
  for (const o of ORGS) {
    const now = new Date()
    const org = await db.organization.create({
      data: {
        name: o.name,
        nameNepali: o.nameNepali || null,
        panNumber: o.panNumber || null,
        address: o.address || null,
        city: o.city || null,
        province: o.province || null,
        phone: o.phone || null,
        email: o.email || null,
        vatEnabled: o.vatEnabled,
        vatNumber: o.vatNumber || null,
        tdsEnabled: o.tdsEnabled,
        ssfEnabled: o.ssfEnabled,
        mode: o.mode,
        industry: o.industry || null,
        language: o.language,
        currency: o.currency,
        fiscalYear: o.fiscalYear,
        plan: o.plan,
        subscriptionStatus: o.plan === 'free' ? 'trialing' : 'active',
        subscriptionStart: now,
        subscriptionEnd: o.plan === 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        trialEndsAt: o.plan === 'free' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      },
    })
    orgMap[o.name] = org.id
    console.log(`  ✓ Created org: ${o.name} (${o.plan})`)

    // ── Step 2a: Create Fiscal Year ──
    const fy = await createFiscalYear(org.id, o.fiscalYear)
    orgFyMap[o.name] = fy.id
    console.log(`  ✓ Created fiscal year: ${o.fiscalYear}`)

    // ── Step 2b: Create Nepal COA ──
    await createNepalCOA(org.id)
    console.log(`  ✓ Created Nepal Chart of Accounts`)

    // ── Step 2c: Create Tax Rates ──
    await createTaxRates(org.id, o.vatEnabled, o.tdsEnabled, o.ssfEnabled)
    console.log(`  ✓ Created tax rates`)

    // ── Step 2d: Create Default Warehouse ──
    await createDefaultWarehouse(org.id)
    console.log(`  ✓ Created default warehouse`)

    // ── Step 2e: Create Subscription ──
    await createSubscription(org.id, o.plan)
    console.log(`  ✓ Created subscription (${o.plan})`)
  }

  // ── Step 3: Create User-Organization memberships ──
  console.log('🔗 Creating user-org memberships...')
  for (const m of MEMBERSHIPS) {
    const userId = userMap[m.userEmail]
    const orgId = orgMap[m.orgName]
    if (!userId || !orgId) {
      console.log(`  ⚠ Skipping membership: ${m.userEmail} -> ${m.orgName} (missing id)`)
      continue
    }

    await db.userOrganization.create({
      data: {
        userId,
        organizationId: orgId,
        role: m.orgRole,
      },
    })
    console.log(`  ✓ ${m.userEmail} -> ${m.orgName} (${m.orgRole})`)
  }

  // ── Step 4: Create Parties ──
  console.log('👥 Creating parties...')
  for (const [orgName, parties] of Object.entries(PARTIES)) {
    const orgId = orgMap[orgName]
    if (!orgId) continue
    await createParties(orgId, parties)
    console.log(`  ✓ Created ${parties.length} parties for ${orgName}`)
  }

  // ── Step 5: Create Products ──
  console.log('📦 Creating products...')
  for (const [orgName, products] of Object.entries(PRODUCTS)) {
    const orgId = orgMap[orgName]
    if (!orgId) continue
    await createProducts(orgId, products)
    console.log(`  ✓ Created ${products.length} products for ${orgName}`)
  }

  // ── Step 6: Create Journal Entries ──
  console.log('📒 Creating journal entries...')
  for (const [orgName, entries] of Object.entries(JOURNAL_ENTRIES)) {
    const orgId = orgMap[orgName]
    const fyId = orgFyMap[orgName]
    if (!orgId || !fyId) continue
    await createJournalEntries(orgId, fyId, entries)
    console.log(`  ✓ Created ${entries.length} journal entries for ${orgName}`)
  }

  // ── Step 7: Create audit logs for seed operation ──
  console.log('📝 Creating seed audit logs...')
  const adminUserId = userMap['admin@hisabpro.com']
  for (const [orgName, orgId] of Object.entries(orgMap)) {
    await db.auditLog.create({
      data: {
        organizationId: orgId,
        userId: adminUserId || null,
        action: 'create',
        module: 'system',
        recordType: 'seed',
        details: JSON.stringify({
          action: 'database_seed',
          description: 'Comprehensive seed data created',
          performedBy: 'admin@hisabpro.com',
        }),
      },
    })
  }

  console.log('\n✅ Seed completed successfully!')
  console.log('───────────────────────────────────')
  console.log(`Users created:       ${USERS.length}`)
  console.log(`Organizations:       ${ORGS.length}`)
  console.log(`Memberships:         ${MEMBERSHIPS.length}`)
  console.log(`Parties per org:     ${Object.values(PARTIES).map(p => p.length).join('/')}`)
  console.log(`Products per org:    ${Object.values(PRODUCTS).map(p => p.length).join('/')}`)
  console.log(`Journal entries/org: ${Object.values(JOURNAL_ENTRIES).map(e => e.length).join('/')}`)
  console.log('───────────────────────────────────')

  console.log('\n🔐 Test Login Credentials:')
  console.log('───────────────────────────────────')
  for (const u of USERS) {
    console.log(`  ${u.email} / ${u.password} (${u.role})`)
  }
  console.log('───────────────────────────────────')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
