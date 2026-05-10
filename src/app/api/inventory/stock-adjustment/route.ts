import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST /api/inventory/stock-adjustment - Create stock adjustment
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      orgId, productId, warehouseId, adjustmentType,
      quantity, notes, batchNumber, expiryDate, costPrice,
    } = body

    if (!orgId || !productId || !warehouseId || !adjustmentType || quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: orgId, productId, warehouseId, adjustmentType, quantity' },
        { status: 400 }
      )
    }

    if (!['adjustment', 'transfer_in', 'transfer_out', 'return_in', 'return_out'].includes(adjustmentType)) {
      return NextResponse.json(
        { error: 'Invalid adjustmentType. Must be: adjustment, transfer_in, transfer_out, return_in, return_out' },
        { status: 400 }
      )
    }

    const product = await db.product.findUnique({
      where: { id: productId, organizationId: orgId, isActive: true },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const warehouse = await db.warehouse.findUnique({
      where: { id: warehouseId, organizationId: orgId, isActive: true },
    })
    if (!warehouse) {
      return NextResponse.json({ error: 'Warehouse not found' }, { status: 404 })
    }

    const result = await db.$transaction(async (tx) => {
      // Create stock transaction
      const transaction = await tx.stockTransaction.create({
        data: {
          organizationId: orgId,
          productId,
          warehouseId,
          transactionType: adjustmentType,
          quantity: Math.abs(quantity),
          referenceType: 'adjustment',
          batchNumber: batchNumber || null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          costPrice: costPrice || null,
          notes: notes || null,
        },
      })

      // Update or create stock level
      const stockLevel = await tx.stockLevel.findUnique({
        where: {
          productId_warehouseId_batchNumber: {
            productId,
            warehouseId,
            batchNumber: batchNumber || null,
          },
        },
      })

      if (stockLevel) {
        let adjustment = quantity
        // For transfer_out, return_out, reduce stock
        if (adjustmentType === 'transfer_out' || adjustmentType === 'return_out') {
          adjustment = -Math.abs(quantity)
        }
        // For others, increase stock (or adjust by the signed quantity)
        if (adjustmentType === 'adjustment') {
          adjustment = quantity // can be positive or negative
        }

        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: { quantity: { increment: adjustment } },
        })
      } else {
        // Create new stock level
        let initialQty = quantity
        if (adjustmentType === 'transfer_out' || adjustmentType === 'return_out') {
          return { error: 'Cannot reduce stock for a product with no existing stock level' }
        }

        await tx.stockLevel.create({
          data: {
            organizationId: orgId,
            productId,
            warehouseId,
            quantity: initialQty,
            batchNumber: batchNumber || null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            costPrice: costPrice || null,
          },
        })
      }

      return transaction
    })

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Stock adjustment error:', error)
    return NextResponse.json(
      { error: 'Failed to create stock adjustment', details: String(error) },
      { status: 500 }
    )
  }
}

// GET /api/inventory/stock-adjustment?orgId=xxx - Get stock transactions
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const productId = searchParams.get('productId')
    const warehouseId = searchParams.get('warehouseId')
    const transactionType = searchParams.get('transactionType')

    if (!orgId) {
      return NextResponse.json({ error: 'orgId is required' }, { status: 400 })
    }

    const where: Record<string, unknown> = { organizationId: orgId }
    if (productId) where.productId = productId
    if (warehouseId) where.warehouseId = warehouseId
    if (transactionType) where.transactionType = transactionType

    const transactions = await db.stockTransaction.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, code: true, unit: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Stock transactions GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock transactions', details: String(error) },
      { status: 500 }
    )
  }
}
