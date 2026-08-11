import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string({ required_error: 'Email is required' }).trim().email('Must be a valid email address'),
  password: z.string({ required_error: 'Password is required' }).min(1, 'Password cannot be empty'),
});

export type LoginInput = z.infer<typeof LoginSchema>;
