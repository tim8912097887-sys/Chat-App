import { z } from 'zod';
import { MAX_LIMIT_PER_PAGE } from '../user.constants.js';

export const searchCodeQuerySchema = z.object({
  q: z
    .string('q must be a string')
    .trim()
    .length(8, 'q must be 8 characters')
    .regex(/^[a-zA-Z0-9]+$/, 'q must contain only letters and numbers'),
});

export const friendSearchQuerySchema = z.object({
  q: z.string('q must be a string').trim().min(1, 'q must not be empty').optional(),
  page: z.coerce
    .number('page must be a number')
    .int('page must be an integer')
    .min(1, `page must be at least 1`)
    .default(1),
  limit: z.coerce
    .number('limit must be a number')
    .int('limit must be an integer')
    .min(1, `limit must be at least 1`)
    .max(MAX_LIMIT_PER_PAGE, `limit must be at most ${MAX_LIMIT_PER_PAGE}`)
    .default(20),
});

export type SearchCodeQuery = z.infer<typeof searchCodeQuerySchema>;
export type FriendSearchQuery = z.infer<typeof friendSearchQuerySchema>;
