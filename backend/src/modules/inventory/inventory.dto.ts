import { z } from 'zod';
import { StockMovementType } from '../../constants/enums';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const ALLOWED_MOVEMENT_QUERY_PARAMS = new Set(['page', 'page_size', 'product_id', 'movement_type', 'date_from', 'date_to']);

export const StockMovementListQuerySchema = z
  .record(z.unknown())
  .superRefine((data, ctx) => {
    for (const key of Object.keys(data)) {
      if (!ALLOWED_MOVEMENT_QUERY_PARAMS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported query parameter '${key}'`,
          path: [key],
        });
      }
    }

    if (typeof data.movement_type === 'string') {
      if (!Object.values(StockMovementType).includes(data.movement_type as StockMovementType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid movement_type value '${data.movement_type}'. Must be IN or OUT`,
          path: ['movement_type'],
        });
      }
    }

    if (typeof data.date_from === 'string' && !DATE_REGEX.test(data.date_from)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date_from must be in YYYY-MM-DD format',
        path: ['date_from'],
      });
    }

    if (typeof data.date_to === 'string' && !DATE_REGEX.test(data.date_to)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'date_to must be in YYYY-MM-DD format',
        path: ['date_to'],
      });
    }

    if (typeof data.date_from === 'string' && typeof data.date_to === 'string') {
      if (DATE_REGEX.test(data.date_from) && DATE_REGEX.test(data.date_to)) {
        if (data.date_from > data.date_to) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'date_from must not be after date_to',
            path: ['date_from'],
          });
        }
      }
    }
  })
  .transform((data) => ({
    page: data.page !== undefined ? String(data.page) : undefined,
    page_size: data.page_size !== undefined ? String(data.page_size) : undefined,
    product_id: data.product_id !== undefined ? Number(data.product_id) : undefined,
    movement_type: typeof data.movement_type === 'string' ? (data.movement_type as StockMovementType) : undefined,
    date_from: typeof data.date_from === 'string' ? data.date_from : undefined,
    date_to: typeof data.date_to === 'string' ? data.date_to : undefined,
  }));
