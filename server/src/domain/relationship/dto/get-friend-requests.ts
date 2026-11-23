import { z } from 'zod';
import { MAX_LIMIT_PER_PAGE } from '../../user/user.constants.js';

export const friendRequestQuerySchema = z.object({
  direction: z.enum(['incoming', 'outgoing']),
  page: z.coerce.number('page must be a number').int('page must be an integer').min(1).default(1),
  limit: z.coerce
    .number('limit must be a number')
    .int('limit must be an integer')
    .min(1)
    .max(MAX_LIMIT_PER_PAGE)
    .default(20),
});

export type FriendRequestQuery = z.infer<typeof friendRequestQuerySchema>;

export interface FriendRequestResponseDto {
  requestId: string;
  userId: string;
  name: string;
  imageUrl: string | null;
}
