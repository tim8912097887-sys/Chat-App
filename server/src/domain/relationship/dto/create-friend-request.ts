import { z } from 'zod';

export const createFriendRequestSchema = z.object({
  targetUserId: z.uuid('targetUserId must be a valid user id'),
});

export type CreateFriendRequestBody = z.infer<typeof createFriendRequestSchema>;
