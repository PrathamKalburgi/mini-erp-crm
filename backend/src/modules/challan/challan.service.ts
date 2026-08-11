import { Prisma } from '@prisma/client';
import prisma from '../../lib/prisma';
import { ChallanStatus, CHALLAN_NUMBER_PREFIX } from '../../constants/enums';
import { BadRequestError, ConflictError, NotFoundError } from '../../utils/errors';
import { buildPaginatedResponse, parsePaginationParams, PaginatedResponse } from '../../utils/pagination';
import { CreateChallanInput, UpdateChallanInput, ChallanListQuerySchema } from './challan.dto';
import { inventoryService } from '../inventory/inventory.service';

export class ChallanService {
  /**
   * Formats a sequence number into CHL-XXXXXX format.
   */
  private formatChallanNumber(seqValue: number): string {
    return `${CHALLAN_NUMBER_PREFIX}${String(seqValue).padStart(6, '0')}`;
  }

  /**
   * Creates a new challan in DRAFT status.
   */
  public async createChallan(data: CreateChallanInput, userId: number): Promise<any> {
    // Validate customer exists
    const customer = await prisma.customer.findUnique({ where: { id: data.customer_id } });
    if (!customer) {
      throw new NotFoundError(`Customer with ID ${data.customer_id} not found`, 'CUSTOMER_NOT_FOUND');
    }

    // Validate all products exist and fetch snapshot data
    const productIds = data.items.map((i) => i.product_id);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    for (const item of data.items) {
      if (!productMap.has(item.product_id)) {
        throw new NotFoundError(`Product with ID ${item.product_id} not found`, 'PRODUCT_NOT_FOUND');
      }
    }

    // Fetch next challan number from PostgreSQL sequence
    const seqResult = await prisma.$queryRaw<Array<{ nextval: bigint }>>(
      Prisma.sql`SELECT nextval('sales_challan_number_seq')`
    );
    const challanNumber = this.formatChallanNumber(Number(seqResult[0].nextval));

    // Calculate total_quantity
    const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);

    // Build item data with snapshots
    const itemsData = data.items.map((item) => {
      const product = productMap.get(item.product_id)!;
      return {
        product_id: item.product_id,
        snapshot_product_name: product.product_name,
        snapshot_sku: product.sku,
        snapshot_unit_price: product.unit_price,
        snapshot_category: product.category,
        quantity: item.quantity,
      };
    });

    // Create challan with nested items
    const challan = await prisma.salesChallan.create({
      data: {
        challan_number: challanNumber,
        customer_id: data.customer_id,
        total_quantity: totalQuantity,
        status: ChallanStatus.DRAFT,
        created_by_user_id: userId,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });

    return this.formatChallanDetail(challan);
  }

  /**
   * Updates a DRAFT challan. Locks the challan row with SELECT FOR UPDATE.
   */
  public async updateChallan(id: number, data: UpdateChallanInput, userId: number): Promise<any> {
    // Lock the challan row and check status
    const locked = await prisma.$queryRaw<Array<{ id: number; status: string }>>(
      Prisma.sql`SELECT id, status FROM sales_challans WHERE id = ${id} FOR UPDATE`
    );

    if (locked.length === 0) {
      throw new NotFoundError(`Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND');
    }

    if (locked[0].status !== ChallanStatus.DRAFT) {
      throw new ConflictError(
        `Challan cannot be edited in ${locked[0].status} status`,
        'INVALID_CHALLAN_STATE'
      );
    }

    // Validate customer if changing
    if (data.customer_id !== undefined) {
      const customer = await prisma.customer.findUnique({ where: { id: data.customer_id } });
      if (!customer) {
        throw new NotFoundError(`Customer with ID ${data.customer_id} not found`, 'CUSTOMER_NOT_FOUND');
      }
    }

    const updatePayload: any = {};
    if (data.customer_id !== undefined) {
      updatePayload.customer_id = data.customer_id;
    }

    // If items are being replaced
    if (data.items) {
      // Validate all products exist
      const productIds = data.items.map((i) => i.product_id);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map(products.map((p) => [p.id, p]));

      for (const item of data.items) {
        if (!productMap.has(item.product_id)) {
          throw new NotFoundError(`Product with ID ${item.product_id} not found`, 'PRODUCT_NOT_FOUND');
        }
      }

      // Delete existing items and create new ones
      await prisma.salesChallanItem.deleteMany({ where: { sales_challan_id: id } });

      const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
      updatePayload.total_quantity = totalQuantity;

      const itemsData = data.items.map((item) => {
        const product = productMap.get(item.product_id)!;
        return {
          product_id: item.product_id,
          snapshot_product_name: product.product_name,
          snapshot_sku: product.sku,
          snapshot_unit_price: product.unit_price,
          snapshot_category: product.category,
          quantity: item.quantity,
        };
      });

      updatePayload.items = {
        create: itemsData,
      };
    }

    const challan = await prisma.salesChallan.update({
      where: { id },
      data: updatePayload,
      include: { items: true },
    });

    return this.formatChallanDetail(challan);
  }

  /**
   * Confirms a DRAFT challan atomically. Locks challan row and deducts stock in one transaction.
   * CONTRACTS.md Section 6.B
   */
  public async confirmChallan(id: number, userId: number): Promise<any> {
    const result = await prisma.$transaction(async (tx) => {
      // Lock the challan row for update
      const lockedChallans = await tx.$queryRaw<Array<{ id: number; status: string; challan_number: string }>>(
        Prisma.sql`SELECT id, status, challan_number FROM sales_challans WHERE id = ${id} FOR UPDATE`
      );

      if (lockedChallans.length === 0) {
        throw new NotFoundError(`Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND');
      }

      const challan = lockedChallans[0];

      if (challan.status === ChallanStatus.CONFIRMED) {
        throw new ConflictError(
          'Challan has already been confirmed',
          'CHALLAN_ALREADY_CONFIRMED'
        );
      }

      if (challan.status !== ChallanStatus.DRAFT) {
        throw new ConflictError(
          `Challan cannot be confirmed in ${challan.status} status`,
          'INVALID_CHALLAN_STATE'
        );
      }

      // Fetch challan items
      const items = await tx.salesChallanItem.findMany({
        where: { sales_challan_id: id },
      });

      if (items.length === 0) {
        throw new ConflictError('Challan has no items', 'INVALID_CHALLAN_STATE');
      }

      // Delegate stock deduction to inventory service (same tx)
      await inventoryService.applyChallanStockDeduction(
        tx,
        id,
        challan.challan_number,
        items.map((item) => ({ product_id: item.product_id, quantity: item.quantity })),
        userId
      );

      // Update challan status to CONFIRMED
      const confirmed = await tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
        include: { items: true },
      });

      return confirmed;
    });

    return this.formatChallanDetail(result);
  }

  /**
   * Cancels a DRAFT challan. Locks challan row with SELECT FOR UPDATE.
   */
  public async cancelChallan(id: number): Promise<any> {
    // Lock the challan row
    const locked = await prisma.$queryRaw<Array<{ id: number; status: string }>>(
      Prisma.sql`SELECT id, status FROM sales_challans WHERE id = ${id} FOR UPDATE`
    );

    if (locked.length === 0) {
      throw new NotFoundError(`Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND');
    }

    if (locked[0].status !== ChallanStatus.DRAFT) {
      throw new ConflictError(
        `Challan cannot be cancelled in ${locked[0].status} status`,
        'INVALID_CHALLAN_STATE'
      );
    }

    const challan = await prisma.salesChallan.update({
      where: { id },
      data: { status: ChallanStatus.CANCELLED },
      include: { items: true },
    });

    return this.formatChallanDetail(challan);
  }

  /**
   * Paginated challan list (summary format, no items).
   */
  public async getChallans(rawQuery: Record<string, unknown>): Promise<PaginatedResponse<any>> {
    const parseResult = ChallanListQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        code: 'INVALID_QUERY_PARAMETER',
        message: err.message,
      }));
      throw new BadRequestError('Unsupported query parameter', 'INVALID_QUERY_PARAMETER', details);
    }

    const { status, customer_id } = parseResult.data;
    const paginationParams = parsePaginationParams(rawQuery);

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (customer_id !== undefined && !isNaN(customer_id)) {
      where.customer_id = customer_id;
    }

    const [totalItems, challans] = await prisma.$transaction([
      prisma.salesChallan.count({ where }),
      prisma.salesChallan.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.take,
        orderBy: { id: 'desc' },
      }),
    ]);

    return buildPaginatedResponse(challans, totalItems, paginationParams);
  }

  /**
   * Single challan detail with items.
   */
  public async getChallanById(id: number): Promise<any> {
    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!challan) {
      throw new NotFoundError(`Challan with ID ${id} not found`, 'CHALLAN_NOT_FOUND');
    }

    return this.formatChallanDetail(challan);
  }

  private formatChallanDetail(challan: any): any {
    return {
      ...challan,
      items: challan.items?.map((item: any) => ({
        ...item,
        snapshot_unit_price: parseFloat(String(item.snapshot_unit_price)),
      })),
    };
  }
}

export const challanService = new ChallanService();
