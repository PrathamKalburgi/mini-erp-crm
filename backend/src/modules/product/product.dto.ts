import { z } from 'zod';
import { PRODUCT_INITIAL_STOCK } from '../../constants/enums';

export const CreateProductSchema = z.object({
  product_name: z.string({ required_error: 'product_name is required' }).trim().min(1, 'product_name cannot be empty'),
  sku: z.string({ required_error: 'sku is required' }).trim().min(1, 'sku cannot be empty'),
  category: z.string({ required_error: 'category is required' }).trim().min(1, 'category cannot be empty'),
  unit_price: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return num;
    })
    .refine((val) => !isNaN(val) && val >= 0, { message: 'unit_price must be a non-negative number' }),
  current_stock: z
    .number({ required_error: 'current_stock is required' })
    .int('current_stock must be an integer')
    .refine((val) => val === PRODUCT_INITIAL_STOCK, {
      message: `current_stock must be ${PRODUCT_INITIAL_STOCK} when creating a product`,
    }),
  minimum_stock_alert_quantity: z
    .number({ required_error: 'minimum_stock_alert_quantity is required' })
    .int('minimum_stock_alert_quantity must be an integer')
    .min(0, 'minimum_stock_alert_quantity must be >= 0'),
  warehouse_location: z.string({ required_error: 'warehouse_location is required' }).trim().min(1, 'warehouse_location cannot be empty'),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;

export const UpdateProductSchema = z
  .object({
    product_name: z.string().trim().min(1, 'product_name cannot be empty').optional(),
    sku: z.string().trim().min(1, 'sku cannot be empty').optional(),
    category: z.string().trim().min(1, 'category cannot be empty').optional(),
    unit_price: z
      .union([z.string(), z.number()])
      .transform((val) => {
        const num = typeof val === 'string' ? parseFloat(val) : val;
        return num;
      })
      .refine((val) => !isNaN(val) && val >= 0, { message: 'unit_price must be a non-negative number' })
      .optional(),
    current_stock: z
      .number()
      .int('current_stock must be an integer')
      .optional(),
    minimum_stock_alert_quantity: z
      .number()
      .int('minimum_stock_alert_quantity must be an integer')
      .min(0, 'minimum_stock_alert_quantity must be >= 0')
      .optional(),
    warehouse_location: z.string().trim().min(1, 'warehouse_location cannot be empty').optional(),
    reason: z.string().trim().min(1, 'reason cannot be empty').optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;

const ALLOWED_PRODUCT_LIST_QUERY_PARAMS = new Set(['page', 'page_size', 'search', 'category', 'warehouse_location']);

export const ProductListQuerySchema = z
  .record(z.unknown())
  .superRefine((data, ctx) => {
    for (const key of Object.keys(data)) {
      if (!ALLOWED_PRODUCT_LIST_QUERY_PARAMS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported query parameter '${key}'`,
          path: [key],
        });
      }
    }
  })
  .transform((data) => ({
    page: data.page !== undefined ? String(data.page) : undefined,
    page_size: data.page_size !== undefined ? String(data.page_size) : undefined,
    search: typeof data.search === 'string' ? data.search.trim() : undefined,
    category: typeof data.category === 'string' ? data.category : undefined,
    warehouse_location: typeof data.warehouse_location === 'string' ? data.warehouse_location : undefined,
  }));
