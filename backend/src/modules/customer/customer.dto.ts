import { z } from 'zod';
import { CustomerType, CustomerStatus } from '../../constants/enums';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const CreateCustomerSchema = z.object({
  customer_name: z.string({ required_error: 'customer_name is required' }).trim().min(1, 'customer_name cannot be empty'),
  mobile_number: z.string({ required_error: 'mobile_number is required' }).trim().min(1, 'mobile_number cannot be empty'),
  email: z.string({ required_error: 'email is required' }).trim().email('Must be a valid email address'),
  business_name: z.string({ required_error: 'business_name is required' }).trim().min(1, 'business_name cannot be empty'),
  gst_number: z.string().trim().nullable().optional().transform((val) => (val === '' ? null : val ?? null)),
  customer_type: z.nativeEnum(CustomerType, { required_error: 'customer_type is required' }),
  address: z.string({ required_error: 'address is required' }).trim().min(1, 'address cannot be empty'),
  status: z.nativeEnum(CustomerStatus, { required_error: 'status is required' }),
  follow_up_date: z
    .string({ required_error: 'follow_up_date is required' })
    .trim()
    .regex(DATE_REGEX, 'follow_up_date must be in YYYY-MM-DD format'),
  notes: z.string().trim().optional().default(''),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;

export const CreateFollowUpNoteSchema = z.object({
  note: z.string({ required_error: 'note is required' }).trim().min(1, 'note cannot be empty'),
});

export type CreateFollowUpNoteInput = z.infer<typeof CreateFollowUpNoteSchema>;

const ALLOWED_CUSTOMER_LIST_QUERY_PARAMS = new Set(['page', 'page_size', 'search', 'status', 'customer_type']);

export const CustomerListQuerySchema = z
  .record(z.unknown())
  .superRefine((data, ctx) => {
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!ALLOWED_CUSTOMER_LIST_QUERY_PARAMS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported query parameter '${key}'`,
          path: [key],
        });
      }
    }
  })
  .transform((data) => {
    return {
      page: data.page !== undefined ? String(data.page) : undefined,
      page_size: data.page_size !== undefined ? String(data.page_size) : undefined,
      search: typeof data.search === 'string' ? data.search.trim() : undefined,
      status: typeof data.status === 'string' ? (data.status as CustomerStatus) : undefined,
      customer_type: typeof data.customer_type === 'string' ? (data.customer_type as CustomerType) : undefined,
    };
  });

const ALLOWED_NOTES_QUERY_PARAMS = new Set(['page', 'page_size']);

export const FollowUpNotesQuerySchema = z
  .record(z.unknown())
  .superRefine((data, ctx) => {
    const keys = Object.keys(data);
    for (const key of keys) {
      if (!ALLOWED_NOTES_QUERY_PARAMS.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unsupported query parameter '${key}'`,
          path: [key],
        });
      }
    }
  })
  .transform((data) => {
    return {
      page: data.page !== undefined ? String(data.page) : undefined,
      page_size: data.page_size !== undefined ? String(data.page_size) : undefined,
    };
  });
