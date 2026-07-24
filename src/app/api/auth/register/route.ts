import { db } from '@/lib/db'
import { NEPAL_COA_GROUPS, DEFAULT_ACCOUNTS } from '@/lib/nepal-accounting'
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

const SALT = 'hisab-pro-salt'
const SESSION_COOKIE = 'hisab-session'
const SESSION_MAX_AGE = 30 * 24 * 60 * 60

function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, businessName, language } = body

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      )
    }

    const passwordHash = hashPassword(password)

    // Check if this is the first user (becomes super_admin)
    const userCount = await db.user.count()
    const isFirstUser = userCount === 0

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: isFirstUser ? 'super_admin' : 'user',
        isActive: true,
        language: language || 'en',
      }
    })

    // Create organization with the business name
    const orgName = businessName || `${name}'s Business`
    const org = await db.organization.create({
      data: {
        name: orgName,
        currency: 'NPR',
        vatEnabled: true,
        tdsEnabled: true,
        ssfEnabled: false,
        mode: 'simple',
        fiscalYear: '2081/82',
        plan: 'free',
        subscriptionStatus: 'trialing',
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })

    // Create UserOrganization link with admin role
    await db.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'admin',
      }
    })

    // Create FiscalYear
    await db.fiscalYear.create({
      data: {
        organizationId: org.id,
        name: '2081/82',
        startDate: new Date('2024-07-16'),
        endDate: new Date('2025-07-15'),
        isCurrent: true,
      }
    })

    // Seed Nepal COA - Create Account Groups (batch approach to reduce memory)
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

    // Create Default Accounts using createMany for efficiency
    const accountsData = DEFAULT_ACCOUNTS
      .map(account => {
        const groupId = groupMap[account.groupCode]
        if (!groupId) return null
        return {
          organizationId: org.id,
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
        }
      })
      .filter(Boolean) as Array<{
        organizationId: string
        groupId: string
        name: string
        nameNepali: string | null
        code: string
        accountType: string
        subType: string | null
        isSystem: boolean
        isActive: boolean
        allowsDirectPosting: boolean
        openingBalance: number
        currentBalance: number
      }>

    // Create accounts in batches of 5 to avoid memory issues
    for (let i = 0; i < accountsData.length; i += 5) {
      const batch = accountsData.slice(i, i + 5)
      await db.account.createMany({ data: batch })
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

    // Create default Subscription
    await db.subscription.create({
      data: {
        organizationId: org.id,
        plan: 'free',
        status: 'trialing',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }
    })

    // Create response and set session cookie
    const response = NextResponse.json({
      success: true,
      token: user.id, // Client stores this in localStorage for header-based auth
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        language: user.language,
      },
      organizations: [{
        id: org.id,
        name: org.name,
        role: 'admin',
        plan: org.plan,
      }],
    }, { status: 201 })

    // Set session cookie directly (avoid importing shared auth module)
    response.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Failed to register user', details: String(error) },
      { status: 500 }
    )
  }
}
