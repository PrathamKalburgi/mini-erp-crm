import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { StockMovementType } from '../../constants/enums';
import { BadRequestError, ConflictError, UnprocessableError } from '../../utils/errors';
import { buildPaginatedResponse, parsePaginationParams, PaginatedResponse } from '../../utils/pagination';
import { StockMovementListQuerySchema } from './inventory.dto';

export class InventoryService {
  /**
   * Applies an audited stock edit inside an atomic transaction.
   * Acquires SELECT ... FOR UPDATE lock on the product row before reading stock.
   * CONTRACTS.md Section 6.A
   */
  public async applyStockEdit(
    productId: number,
    requestedStock: number,
    reason: string,
    userId: number
  ): Promise<void> {
    if (requestedStock < 0) {
      throw new UnprocessableError(
        'Stock cannot be set to a negative value',
        'NEGATIVE_STOCK_NOT_ALLOWED',
        [{ field: 'current_stock', code: 'NEGATIVE_STOCK_NOT_ALLOWED', message: 'Stock cannot be set to a negative value' }]
      );
    }

    await prisma.$transaction(async (tx) => {
      // Lock the product row for update
      const lockedProducts = await tx.$queryRaw<Array<{ id: number; current_stock: number }>>(
        Prisma.sql`SELECT id, current_stock FROM products WHERE id = ${productId} FOR UPDATE`
      );

      if (lockedProducts.length === 0) {
        throw new Error(`Product ${productId} not found during stock edit transaction`);
      }

      const persistedStock = lockedProducts[0].current_stock;
      const delta = requestedStock - persistedStock;

      if (delta === 0) {
        // No stock change needed, just return
        return;
      }

      const movementType = delta > 0 ? StockMovementType.IN : StockMovementType.OUT;
      const quantityChanged = Math.abs(delta);

      // Update product stock
      await tx.product.update({
        where: { id: productId },
        data: { current_stock: requestedStock },
      });

      // Create stock movement audit entry
      await tx.stockMovement.create({
        data: {
          product_id: productId,
          quantity_changed: quantityChanged,
          movement_type: movementType,
          reason,
          created_by_user_id: userId,
          sales_challan_id: null,
        },
      });
    });
  }

  /**
   * Applies batch stock deduction for challan confirmation inside a caller-provided transaction.
   * Acquires SELECT ... FOR UPDATE locks on all product rows.
   * CONTRACTS.md Section 6.B
   */
  public async applyChallanStockDeduction(
    tx: Prisma.TransactionClient,
    challanId: number,
    challanNumber: string,
    items: Array<{ product_id: number; quantity: number }>,
    userId: number
  ): Promise<void> {
    // Lock all products used by the challan
    const productIds = items.map((i) => i.product_id);
    const lockedProducts = await tx.$queryRaw<Array<{ id: number; current_stock: number }>>(
      Prisma.sql`SELECT id, current_stock FROM products WHERE id IN (${Prisma.join(productIds)}) FOR UPDATE`
    );

    const productStockMap = new Map<number, number>();
    for (const p of lockedProducts) {
      productStockMap.set(p.id, p.current_stock);
    }

    // Validate all stock is sufficient BEFORE making any changes
    const insufficientItems: Array<{ field: string; code: string; message: string; meta: Record<string, unknown> }> = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const availableStock = productStockMap.get(item.product_id);
      if (availableStock === undefined) {
        throw new Error(`Product ${item.product_id} not found during challan confirmation`);
      }
      if (availableStock < item.quantity) {
        insufficientItems.push({
          field: `items[${i}].quantity`,
          code: 'INSUFFICIENT_STOCK',
          message: 'Requested quantity exceeds available stock.',
          meta: {
            product_id: item.product_id,
            requested_quantity: item.quantity,
            available_quantity: availableStock,
          },
        });
      }
    }

    if (insufficientItems.length > 0) {
      throw new ConflictError(
        'Insufficient stock for one or more products.',
        'INSUFFICIENT_STOCK',
        insufficientItems
      );
    }

    // Deduct stock and create movements for each item
    const reason = `Confirmed challan ${challanNumber}`;
    for (const item of items) {
      const currentStock = productStockMap.get(item.product_id)!;
      await tx.product.update({
        where: { id: item.product_id },
        data: { current_stock: currentStock - item.quantity },
      });

      await tx.stockMovement.create({
        data: {
          product_id: item.product_id,
          quantity_changed: item.quantity,
          movement_type: StockMovementType.OUT,
          reason,
          created_by_user_id: userId,
          sales_challan_id: challanId,
        },
      });
    }
  }

  /**
   * Paginated stock movement list with filters.
   */
  public async getStockMovements(rawQuery: Record<string, unknown>): Promise<PaginatedResponse<any>> {
    const parseResult = StockMovementListQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        code: 'INVALID_QUERY_PARAMETER',
        message: err.message,
      }));
      throw new BadRequestError('Unsupported query parameter', 'INVALID_QUERY_PARAMETER', details);
    }

    const { product_id, movement_type, date_from, date_to } = parseResult.data;
    const paginationParams = parsePaginationParams(rawQuery);

    const where: any = {};
    if (product_id !== undefined && !isNaN(product_id)) {
      where.product_id = product_id;
    }
    if (movement_type) {
      where.movement_type = movement_type;
    }
    if (date_from || date_to) {
      where.created_at = {};
      if (date_from) {
        where.created_at.gte = new Date(`${date_from}T00:00:00.000Z`);
      }
      if (date_to) {
        where.created_at.lte = new Date(`${date_to}T23:59:59.999Z`);
      }
    }

    const [totalItems, movements] = await prisma.$transaction([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.take,
        orderBy: { id: 'desc' },
      }),
    ]);

    return buildPaginatedResponse(movements, totalItems, paginationParams);
  }
}

export const inventoryService = new InventoryService();
