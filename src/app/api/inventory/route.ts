import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/inventory?orgId=xxx&category=xxx&search=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = {
      organizationId: orgId,
      isActive: true,
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nameNepali: { contains: search } },
        { code: { contains: search } },
        { brand: { contains: search } },
      ]
    }

    const products = await db.product.findMany({
      where,
      include: {
        stockLevels: {
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ name: 'asc' }],
    })

    // Enrich with total stock quantity
    const result = products.map((product) => {
      const totalQuantity = product.stockLevels.reduce((sum, sl) => sum + sl.quantity, 0)
      const totalReserved = product.stockLevels.reduce((sum, sl) => sum + sl.reservedQty, 0)
      const availableQuantity = totalQuantity - totalReserved

      return {
        ...product,
        totalQuantity,
        totalReserved,
        availableQuantity,
        stockLevels: product.stockLevels,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory', details: String(error) },
      { status: 500 }
    )
  }
}

// POST /api/inventory - Create product
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orgId, name, nameNepali, code, unit, hsnCode,
      category, brand, productType, isVatable, vatRate,
      sellingPrice, costPrice, minStockLevel, maxStockLevel,
      costingMethod, hasBatch, hasExpiry, description,
    } = body

    if (!orgId || !name) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, name' },
        { status: 400 }
      )
    }

    // Check for duplicate code within organization
    if (code) {
      const existing = await db.product.findFirst({
        where: { organizationId: orgId, code },
      })
      if (existing) {
        return NextResponse.json(
          { error: `Product with code "${code}" already exists` },
          { status: 409 }
        )
      }
    }

    const product = await db.product.create({
      data: {
        organizationId: orgId,
        name,
        nameNepali: nameNepali || null,
        code: code || null,
        unit: unit || null,
        hsnCode: hsnCode || null,
        category: category || null,
        brand: brand || null,
        productType: productType || 'goods',
        isVatable: isVatable !== undefined ? isVatable : true,
        vatRate: vatRate || null,
        sellingPrice: sellingPrice || null,
        costPrice: costPrice || null,
        minStockLevel: minStockLevel || null,
        maxStockLevel: maxStockLevel || null,
        costingMethod: costingMethod || 'fifo',
        hasBatch: hasBatch || false,
        hasExpiry: hasExpiry || false,
        isActive: true,
        description: description || null,
      },
      include: {
        stockLevels: {
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error) {
    console.error('Inventory POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create product', details: String(error) },
      { status: 500 }
    )
  }
}

// PUT /api/inventory - Update product
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const allowedFields = [
      'name', 'nameNepali', 'code', 'unit', 'hsnCode',
      'category', 'brand', 'productType', 'isVatable', 'vatRate',
      'sellingPrice', 'costPrice', 'minStockLevel', 'maxStockLevel',
      'costingMethod', 'hasBatch', 'hasExpiry', 'isActive', 'description',
    ]

    const data: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        data[field] = updateData[field]
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Check for duplicate code if changing
    if (data.code && data.code !== existing.code) {
      const duplicate = await db.product.findFirst({
        where: { organizationId: existing.organizationId, code: data.code as string },
      })
      if (duplicate) {
        return NextResponse.json(
          { error: `Product with code "${data.code}" already exists` },
          { status: 409 }
        )
      }
    }

    const updated = await db.product.update({
      where: { id },
      data,
      include: {
        stockLevels: {
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Inventory PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update product', details: String(error) },
      { status: 500 }
    )
  }
}

// DELETE /api/inventory - Soft delete product
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Product id is required' }, { status: 400 })
    }

    const existing = await db.product.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check if product has been used in invoices or purchase bills
    const [invoiceLineCount, purchaseBillLineCount] = await Promise.all([
      db.invoiceLine.count({ where: { productId: id } }),
      db.purchaseBillLine.count({ where: { productId: id } }),
    ])

    if (invoiceLineCount > 0 || purchaseBillLineCount > 0) {
      await db.product.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({
        message: 'Product deactivated (has existing transactions)',
        deactivated: true,
      })
    }

    await db.product.delete({ where: { id } })
    return NextResponse.json({ message: 'Product deleted successfully', deleted: true })
  } catch (error) {
    console.error('Inventory DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete product', details: String(error) },
      { status: 500 }
    )
  }
}
