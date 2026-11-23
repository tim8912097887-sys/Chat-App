import { z } from 'zod';

export const updateFriendRequestSchema = z.object({
  requesterId: z.uuid('requesterId must be a valid user id'),
});

export type UpdateFriendRequestBody = z.infer<typeof updateFriendRequestSchema>;
