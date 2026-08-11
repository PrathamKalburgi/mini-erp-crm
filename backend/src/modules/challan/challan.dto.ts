import { z } from 'zod';
import { ChallanStatus } from '../../constants/enums';

const itemSchema = z.object({
  product_id: z.number({ required_error: 'product_id is required' }).int().min(1, 'product_id must be a positive integer'),
  quantity: z.number({ required_error: 'quantity is required' }).int().min(1, 'quantity must be at least 1'),
});

export const CreateChallanSchema = z.object({
  customer_id: z.number({ required_error: 'customer_id is required' }).int().min(1, 'customer_id must be a positive integer'),
  items: z
    .array(itemSchema, { required_error: 'items is required' })
    .min(1, 'At least one item is required')
    .superRefine((items, ctx) => {
      const productIds = new Set<number>();
      for (let i = 0; i < items.length; i++) {
        if (productIds.has(items[i].product_id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate product_id ${items[i].product_id} in items`,
            path: [i, 'product_id'],
          });
        }
        productIds.add(items[i].product_id);
      }
    }),
});

export type CreateChallanInput = z.infer<typeof CreateChallanSchema>;

export const UpdateChallanSchema = z
  .object({
    customer_id: z.number().int().min(1, 'customer_id must be a positive integer').optional(),
    items: z
      .array(itemSchema)
      .min(1, 'At least one item is required')
      .superRefine((items, ctx) => {
        const productIds = new Set<number>();
        for (let i = 0; i < items.length; i++) {
          if (productIds.has(items[i].product_id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate product_id ${items[i].product_id} in items`,
              path: [i, 'product_id'],
            });
          }
          productIds.add(items[i].product_id);
        }
      })
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateChallanInput = z.infer<typeof UpdateChallanSchema>;

const ALLOWED_CHALLAN_QUERY_PARAMS = new Set(['page', 'page_size', 'status', 'customer_id']);

export const ChallanListQuerySchema = z
  .record(z.unknown())
  .superRefine((data, ctx) => {
    for (const key of Object.keys(data)) {
      if (!ALLOWED_CHALLAN_QUERY_PARAMS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported query parameter '${key}'`,
          path: [key],
        });
      }
    }

    if (typeof data.status === 'string') {
      if (!Object.values(ChallanStatus).includes(data.status as ChallanStatus)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid status value '${data.status}'. Must be DRAFT, CONFIRMED, or CANCELLED`,
          path: ['status'],
        });
      }
    }
  })
  .transform((data) => ({
    page: data.page !== undefined ? String(data.page) : undefined,
    page_size: data.page_size !== undefined ? String(data.page_size) : undefined,
    status: typeof data.status === 'string' ? (data.status as ChallanStatus) : undefined,
    customer_id: data.customer_id !== undefined ? Number(data.customer_id) : undefined,
  }));
