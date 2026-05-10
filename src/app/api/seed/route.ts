import { db } from '@/lib/db'
import { NEPAL_COA_GROUPS, DEFAULT_ACCOUNTS } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const orgName = body.name || 'My Business'
    const orgMode = body.mode || 'simple'

    // Check if org already exists
    const existingOrg = await db.organization.findFirst({ where: { name: orgName } })
    if (existingOrg) {
      return NextResponse.json({ error: 'Organization already exists', organization: existingOrg }, { status: 400 })
    }

    // Create organization
    const org = await db.organization.create({
      data: {
        name: orgName,
        currency: 'NPR',
        vatEnabled: true,
        tdsEnabled: true,
        ssfEnabled: false,
        mode: orgMode,
        fiscalYear: '2081/82',
      }
    })

    // Create default fiscal year
    await db.fiscalYear.create({
      data: {
        organizationId: org.id,
        name: '2081/82',
        startDate: new Date('2024-07-16'),
        endDate: new Date('2025-07-15'),
        isCurrent: true,
      }
    })

    // Create Chart of Account Groups
    const groupMap: Record<string, string> = {}
    for (const group of NEPAL_COA_GROUPS) {
      const created = await db.accountGroup.create({
        data: {
          organizationId: org.id,
          name: group.name,
          nameNepali: group.nameNepali,
          code: group.code,
          nature: group.nature,
          parentGroupId: group.parent ? groupMap[group.parent] : null,
          isSystem: ['1', '2', '3', '4', '5'].includes(group.code),
          sortOrder: parseInt(group.code) || 0,
        }
      })
      groupMap[group.code] = created.id
    }

    // Create Default Accounts
    for (const account of DEFAULT_ACCOUNTS) {
      const groupId = groupMap[account.groupCode]
      if (!groupId) continue

      await db.account.create({
        data: {
          organizationId: org.id,
          groupId: groupId,
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
        }
      })
    }

    // Create default tax rates
    await db.taxRate.createMany({
      data: [
        { organizationId: org.id, name: 'VAT 13%', taxType: 'vat', rate: 13, isDefault: true, isActive: true },
        { organizationId: org.id, name: 'TDS - Contract 1.5%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'TDS - Rent 15%', taxType: 'tds', rate: 15, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'TDS - Consultancy 15%', taxType: 'tds', rate: 15, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'TDS - Transport 1.5%', taxType: 'tds', rate: 1.5, isDefault: false, isActive: true },
        { organizationId: org.id, name: 'SSF Total 31%', taxType: 'ssf', rate: 31, isDefault: false, isActive: false },
      ]
    })

    // Create default warehouse
    await db.warehouse.create({
      data: {
        organizationId: org.id,
        name: 'Main Warehouse',
        nameNepali: 'मुख्य गोदाम',
        isDefault: true,
      }
    })

    // Create default user
    const user = await db.user.create({
      data: {
        email: 'admin@hisabpro.com',
        name: 'Admin User',
        nameNepali: 'प्रशासक',
        isActive: true,
      }
    })

    await db.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'admin',
      }
    })

    // Create sample parties
    await db.party.createMany({
      data: [
        {
          organizationId: org.id,
          name: 'Sharma Trading',
          nameNepali: 'शर्मा ट्रेडिङ',
          panNumber: '301234567',
          partyType: 'both',
          phone: '01-4234567',
          address: 'Teku, Kathmandu',
          city: 'Kathmandu',
          creditLimit: 500000,
          currentBalance: 0,
          isTdsApplicable: true,
          tdsRate: 1.5,
        },
        {
          organizationId: org.id,
          name: 'Himal Suppliers',
          nameNepali: 'हिमाल आपूर्तिकर्ता',
          panNumber: '402345678',
          partyType: 'supplier',
          phone: '01-4345678',
          address: 'Tripureshwor, Kathmandu',
          city: 'Kathmandu',
          creditLimit: 1000000,
          currentBalance: 0,
          isTdsApplicable: true,
          tdsRate: 1.5,
        },
        {
          organizationId: org.id,
          name: 'Gorkha Enterprises',
          nameNepali: 'गोरखा उद्यम',
          panNumber: '503456789',
          partyType: 'customer',
          phone: '01-4456789',
          address: 'Putalisadak, Kathmandu',
          city: 'Kathmandu',
          creditLimit: 300000,
          currentBalance: 0,
        },
        {
          organizationId: org.id,
          name: 'Nepal General Store',
          nameNepali: 'नेपाल जनरल स्टोर',
          panNumber: '604567890',
          partyType: 'customer',
          phone: '056-523456',
          address: 'Butwal Chowk, Butwal',
          city: 'Butwal',
          creditLimit: 200000,
          currentBalance: 0,
        },
      ]
    })

    // Create sample products
    await db.product.createMany({
      data: [
        {
          organizationId: org.id,
          name: 'Office Paper A4',
          nameNepali: 'कार्यालय कागज A4',
          code: 'SKU-001',
          unit: 'ream',
          category: 'Office Supplies',
          productType: 'goods',
          isVatable: true,
          sellingPrice: 500,
          costPrice: 400,
          costingMethod: 'fifo',
        },
        {
          organizationId: org.id,
          name: 'Printer Ink Cartridge',
          nameNepali: 'प्रिन्टर इंक कार्ट्रिज',
          code: 'SKU-002',
          unit: 'pcs',
          category: 'Office Supplies',
          productType: 'goods',
          isVatable: true,
          sellingPrice: 2500,
          costPrice: 1800,
          costingMethod: 'fifo',
        },
        {
          organizationId: org.id,
          name: 'Stapler',
          nameNepali: 'स्टेपलर',
          code: 'SKU-003',
          unit: 'pcs',
          category: 'Office Supplies',
          productType: 'goods',
          isVatable: true,
          sellingPrice: 350,
          costPrice: 200,
          costingMethod: 'fifo',
        },
        {
          organizationId: org.id,
          name: 'Consulting Service',
          nameNepali: 'परामर्श सेवा',
          code: 'SRV-001',
          unit: 'hour',
          category: 'Services',
          productType: 'service',
          isVatable: true,
          sellingPrice: 5000,
          costPrice: 0,
        },
      ]
    })

    // Create sample journal entries
    const cashAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '11001' } })
    const capitalAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '31001' } })
    const salesAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '41001' } })
    const receivableAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '12001' } })
    const cogsAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '51001' } })
    const inventoryAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '13001' } })
    const salaryAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '52001' } })
    const rentAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '52002' } })
    const payableAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '21001' } })
    const vatOutputAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '22003' } })
    const vatInputAccount = await db.account.findFirst({ where: { organizationId: org.id, code: '22002' } })

    if (cashAccount && capitalAccount) {
      // Capital introduction
      const je1 = await db.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: 'JE-001',
          date: new Date('2024-08-01'),
          narration: 'Capital introduced by owner',
          voucherType: 'receipt',
          totalDebit: 500000,
          totalCredit: 500000,
          lines: {
            create: [
              { accountId: cashAccount.id, debit: 500000, credit: 0, narration: 'Cash received' },
              { accountId: capitalAccount.id, debit: 0, credit: 500000, narration: 'Capital introduced' },
            ]
          }
        }
      })
    }

    if (cashAccount && salesAccount && vatOutputAccount) {
      // Cash sales with VAT
      await db.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: 'JE-002',
          date: new Date('2024-08-15'),
          narration: 'Cash sales with VAT',
          voucherType: 'receipt',
          totalDebit: 56500,
          totalCredit: 56500,
          lines: {
            create: [
              { accountId: cashAccount.id, debit: 56500, credit: 0, narration: 'Cash received' },
              { accountId: salesAccount.id, debit: 0, credit: 50000, narration: 'Sales revenue' },
              { accountId: vatOutputAccount.id, debit: 0, credit: 6500, narration: 'Output VAT 13%' },
            ]
          }
        }
      })
    }

    if (receivableAccount && salesAccount && vatOutputAccount) {
      // Credit sales
      await db.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: 'JE-003',
          date: new Date('2024-09-01'),
          narration: 'Credit sales to Gorkha Enterprises',
          voucherType: 'sales',
          totalDebit: 113000,
          totalCredit: 113000,
          lines: {
            create: [
              { accountId: receivableAccount.id, debit: 113000, credit: 0, narration: 'Amount receivable' },
              { accountId: salesAccount.id, debit: 0, credit: 100000, narration: 'Sales revenue' },
              { accountId: vatOutputAccount.id, debit: 0, credit: 13000, narration: 'Output VAT 13%' },
            ]
          }
        }
      })
    }

    if (salaryAccount && cashAccount) {
      // Salary payment
      await db.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: 'JE-004',
          date: new Date('2024-09-30'),
          narration: 'Salary payment for Ashad',
          voucherType: 'payment',
          totalDebit: 80000,
          totalCredit: 80000,
          lines: {
            create: [
              { accountId: salaryAccount.id, debit: 80000, credit: 0, narration: 'Salary expense' },
              { accountId: cashAccount.id, debit: 0, credit: 80000, narration: 'Cash paid' },
            ]
          }
        }
      })
    }

    if (rentAccount && cashAccount) {
      // Rent payment
      await db.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: 'JE-005',
          date: new Date('2024-10-01'),
          narration: 'Office rent payment',
          voucherType: 'payment',
          totalDebit: 25000,
          totalCredit: 25000,
          lines: {
            create: [
              { accountId: rentAccount.id, debit: 25000, credit: 0, narration: 'Rent expense' },
              { accountId: cashAccount.id, debit: 0, credit: 25000, narration: 'Cash paid' },
            ]
          }
        }
      })
    }

    if (inventoryAccount && payableAccount && vatInputAccount) {
      // Purchase on credit with VAT
      await db.journalEntry.create({
        data: {
          organizationId: org.id,
          entryNumber: 'JE-006',
          date: new Date('2024-10-10'),
          narration: 'Purchase from Himal Suppliers with VAT',
          voucherType: 'purchase',
          totalDebit: 169500,
          totalCredit: 169500,
          lines: {
            create: [
              { accountId: inventoryAccount.id, debit: 150000, credit: 0, narration: 'Inventory purchased' },
              { accountId: vatInputAccount.id, debit: 19500, credit: 0, narration: 'Input VAT 13%' },
              { accountId: payableAccount.id, debit: 0, credit: 169500, narration: 'Amount payable' },
            ]
          }
        }
      })
    }

    // Update account balances based on journal entries
    const accounts = await db.account.findMany({
      where: { organizationId: org.id },
      include: {
        journalLines: true,
      }
    })

    for (const account of accounts) {
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
        data: { currentBalance: balance }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Organization seeded successfully with Nepal Chart of Accounts',
      organizationId: org.id,
      accountsCreated: DEFAULT_ACCOUNTS.length,
      groupsCreated: NEPAL_COA_GROUPS.length,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed organization', details: String(error) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const orgs = await db.organization.findMany({
      include: {
        _count: {
          select: { accounts: true, parties: true, journalEntries: true, products: true }
        }
      }
    })
    return NextResponse.json(orgs)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
}
