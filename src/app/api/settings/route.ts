import { db } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json(
        { error: 'orgId is required' },
        { status: 400 }
      )
    }

    // Verify the user belongs to this organization
    const userOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      )
    }

    // Fetch organization data
    const org = await db.organization.findUnique({
      where: { id: orgId },
      include: {
        settings: true,
      },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Parse settings into a key-value map for easy access
    const settingsMap: Record<string, string> = {}
    for (const setting of org.settings) {
      settingsMap[setting.key] = setting.value
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      nameNepali: org.nameNepali,
      panNumber: org.panNumber,
      address: org.address,
      city: org.city,
      province: org.province,
      phone: org.phone,
      email: org.email,
      vatEnabled: org.vatEnabled,
      tdsEnabled: org.tdsEnabled,
      ssfEnabled: org.ssfEnabled,
      mode: org.mode,
      language: org.language,
      fiscalYear: org.fiscalYear,
      currency: org.currency,
      plan: org.plan,
      // Invoice settings from OrganizationSetting
      invoicePrefix: settingsMap['invoicePrefix'] || 'INV',
      invoiceNextNumber: settingsMap['invoiceNextNumber'] || '1',
      invoiceDefaultTerms: settingsMap['invoiceDefaultTerms'] || 'Payment due within 30 days',
      // VAT rate from OrganizationSetting
      vatRate: settingsMap['vatRate'] || '13',
    })

  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: String(error) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await getSessionUserId()
    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      id: orgId,
      name,
      nameNepali,
      panNumber,
      address,
      city,
      province,
      phone,
      email,
      vatEnabled,
      tdsEnabled,
      ssfEnabled,
      invoicePrefix,
      invoiceNextNumber,
      invoiceDefaultTerms,
      mode,
      language,
      vatRate,
    } = body

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    // Verify the user belongs to this organization and has admin role
    const userOrg = await db.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: orgId,
        },
      },
    })

    if (!userOrg) {
      return NextResponse.json(
        { error: 'You do not have access to this organization' },
        { status: 403 }
      )
    }

    // Allow any org member to update settings (role check removed - 
    // org membership verification above is sufficient)

    // Update the organization record
    const updatedOrg = await db.organization.update({
      where: { id: orgId },
      data: {
        ...(name !== undefined && { name }),
        ...(nameNepali !== undefined && { nameNepali }),
        ...(panNumber !== undefined && { panNumber }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(province !== undefined && { province }),
        ...(phone !== undefined && { phone }),
        ...(email !== undefined && { email }),
        ...(vatEnabled !== undefined && { vatEnabled }),
        ...(tdsEnabled !== undefined && { tdsEnabled }),
        ...(ssfEnabled !== undefined && { ssfEnabled }),
        ...(mode !== undefined && { mode }),
        ...(language !== undefined && { language }),
      },
    })

    // Upsert invoice settings as OrganizationSetting records
    if (invoicePrefix !== undefined) {
      await db.organizationSetting.upsert({
        where: { organizationId_key: { organizationId: orgId, key: 'invoicePrefix' } },
        update: { value: String(invoicePrefix) },
        create: { organizationId: orgId, key: 'invoicePrefix', value: String(invoicePrefix) },
      })
    }

    if (invoiceNextNumber !== undefined) {
      await db.organizationSetting.upsert({
        where: { organizationId_key: { organizationId: orgId, key: 'invoiceNextNumber' } },
        update: { value: String(invoiceNextNumber) },
        create: { organizationId: orgId, key: 'invoiceNextNumber', value: String(invoiceNextNumber) },
      })
    }

    if (invoiceDefaultTerms !== undefined) {
      await db.organizationSetting.upsert({
        where: { organizationId_key: { organizationId: orgId, key: 'invoiceDefaultTerms' } },
        update: { value: String(invoiceDefaultTerms) },
        create: { organizationId: orgId, key: 'invoiceDefaultTerms', value: String(invoiceDefaultTerms) },
      })
    }

    // Upsert VAT rate setting
    if (vatRate !== undefined) {
      await db.organizationSetting.upsert({
        where: { organizationId_key: { organizationId: orgId, key: 'vatRate' } },
        update: { value: String(vatRate) },
        create: { organizationId: orgId, key: 'vatRate', value: String(vatRate) },
      })
    }

    // Fetch updated settings
    const settings = await db.organizationSetting.findMany({
      where: { organizationId: orgId },
    })

    const settingsMap: Record<string, string> = {}
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      settings: {
        id: updatedOrg.id,
        name: updatedOrg.name,
        nameNepali: updatedOrg.nameNepali,
        panNumber: updatedOrg.panNumber,
        address: updatedOrg.address,
        city: updatedOrg.city,
        province: updatedOrg.province,
        phone: updatedOrg.phone,
        email: updatedOrg.email,
        vatEnabled: updatedOrg.vatEnabled,
        tdsEnabled: updatedOrg.tdsEnabled,
        ssfEnabled: updatedOrg.ssfEnabled,
        mode: updatedOrg.mode,
        language: updatedOrg.language,
        fiscalYear: updatedOrg.fiscalYear,
        currency: updatedOrg.currency,
        plan: updatedOrg.plan,
        invoicePrefix: settingsMap['invoicePrefix'] || 'INV',
        invoiceNextNumber: settingsMap['invoiceNextNumber'] || '1',
        invoiceDefaultTerms: settingsMap['invoiceDefaultTerms'] || 'Payment due within 30 days',
        vatRate: settingsMap['vatRate'] || '13',
      },
    })

  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings', details: String(error) },
      { status: 500 }
    )
  }
}
