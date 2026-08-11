import prisma from '../../lib/prisma';
import { PRODUCT_INITIAL_STOCK } from '../../constants/enums';
import { BadRequestError, ConflictError, NotFoundError, UnprocessableError } from '../../utils/errors';
import { buildPaginatedResponse, parsePaginationParams, PaginatedResponse } from '../../utils/pagination';
import { CreateProductInput, ProductListQuerySchema, UpdateProductInput } from './product.dto';
import { inventoryService } from '../inventory/inventory.service';

export class ProductService {
  public async createProduct(data: CreateProductInput): Promise<any> {
    // Enforce initial stock = 0
    if (data.current_stock !== PRODUCT_INITIAL_STOCK) {
      throw new UnprocessableError(
        `current_stock must be ${PRODUCT_INITIAL_STOCK} when creating a product`,
        'VALIDATION_ERROR',
        [{ field: 'current_stock', code: 'VALIDATION_ERROR', message: `current_stock must be ${PRODUCT_INITIAL_STOCK}` }]
      );
    }

    // Check SKU uniqueness
    const existingProduct = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existingProduct) {
      throw new ConflictError(
        `A product with SKU '${data.sku}' already exists`,
        'SKU_ALREADY_EXISTS',
        [{ field: 'sku', code: 'SKU_ALREADY_EXISTS', message: `A product with SKU '${data.sku}' already exists` }]
      );
    }

    const product = await prisma.product.create({
      data: {
        product_name: data.product_name,
        sku: data.sku,
        category: data.category,
        unit_price: data.unit_price,
        current_stock: PRODUCT_INITIAL_STOCK,
        minimum_stock_alert_quantity: data.minimum_stock_alert_quantity,
        warehouse_location: data.warehouse_location,
      },
    });

    return this.formatProduct(product);
  }

  public async getProducts(rawQuery: Record<string, unknown>): Promise<PaginatedResponse<any>> {
    const parseResult = ProductListQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      const details = parseResult.error.errors.map((err) => ({
        field: err.path.join('.'),
        code: 'INVALID_QUERY_PARAMETER',
        message: err.message,
      }));
      throw new BadRequestError('Unsupported query parameter', 'INVALID_QUERY_PARAMETER', details);
    }

    const { search, category, warehouse_location } = parseResult.data;
    const paginationParams = parsePaginationParams(rawQuery);

    const where: any = {};
    if (category) {
      where.category = category;
    }
    if (warehouse_location) {
      where.warehouse_location = warehouse_location;
    }
    if (search) {
      where.OR = [
        { product_name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip: paginationParams.skip,
        take: paginationParams.take,
        orderBy: { id: 'asc' },
      }),
    ]);

    return buildPaginatedResponse(products.map(this.formatProduct), totalItems, paginationParams);
  }

  public async getProductById(id: number): Promise<any> {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundError(`Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND');
    }
    return this.formatProduct(product);
  }

  public async updateProduct(id: number, data: UpdateProductInput, userId: number): Promise<any> {
    // Verify product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError(`Product with ID ${id} not found`, 'PRODUCT_NOT_FOUND');
    }

    const stockIsChanging = data.current_stock !== undefined && data.current_stock !== existing.current_stock;
    const stockIsUnchanged = data.current_stock !== undefined && data.current_stock === existing.current_stock;

    // Enforce reason rules per CONTRACTS.md Section 6.A
    if (stockIsChanging && !data.reason) {
      throw new UnprocessableError(
        'A reason is required when changing stock',
        'STOCK_CHANGE_REASON_REQUIRED',
        [{ field: 'reason', code: 'STOCK_CHANGE_REASON_REQUIRED', message: 'A reason is required when changing stock' }]
      );
    }

    if (data.reason && data.current_stock === undefined) {
      throw new BadRequestError(
        'reason is not allowed unless current_stock is provided',
        'INVALID_REQUEST',
        [{ field: 'reason', code: 'INVALID_REQUEST', message: 'reason is not allowed unless current_stock is provided' }]
      );
    }

    // Check SKU uniqueness on update
    if (data.sku && data.sku !== existing.sku) {
      const skuConflict = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (skuConflict) {
        throw new ConflictError(
          `A product with SKU '${data.sku}' already exists`,
          'SKU_ALREADY_EXISTS',
          [{ field: 'sku', code: 'SKU_ALREADY_EXISTS', message: `A product with SKU '${data.sku}' already exists` }]
        );
      }
    }

    // Build update payload for non-stock fields
    const updatePayload: any = {};
    if (data.product_name !== undefined) updatePayload.product_name = data.product_name;
    if (data.sku !== undefined) updatePayload.sku = data.sku;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.unit_price !== undefined) updatePayload.unit_price = data.unit_price;
    if (data.minimum_stock_alert_quantity !== undefined) updatePayload.minimum_stock_alert_quantity = data.minimum_stock_alert_quantity;
    if (data.warehouse_location !== undefined) updatePayload.warehouse_location = data.warehouse_location;

    // Apply non-stock field updates first (if any)
    if (Object.keys(updatePayload).length > 0) {
      await prisma.product.update({
        where: { id },
        data: updatePayload,
      });
    }

    // Delegate stock change to inventory service (with FOR UPDATE lock)
    if (stockIsChanging) {
      await inventoryService.applyStockEdit(id, data.current_stock!, data.reason!, userId);
    }

    // If stock was provided but unchanged, just update other fields (already done above), no movement
    // If stock was provided and changed to same value after update, skip

    // Fetch fresh product state
    const updatedProduct = await prisma.product.findUnique({ where: { id } });
    return this.formatProduct(updatedProduct!);
  }

  private formatProduct(product: any): any {
    return {
      ...product,
      unit_price: parseFloat(String(product.unit_price)),
    };
  }
}

export const productService = new ProductService();
