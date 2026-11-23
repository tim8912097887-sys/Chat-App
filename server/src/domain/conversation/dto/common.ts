import { z } from 'zod';

export const uuidSchema = z.uuid();

export const groupNameSchema = z.string().trim().min(1).max(80);

export const imageUrlSchema = z.url().max(2048);

export const conversationParamsSchema = z.object({
  conversationId: z.uuid('conversationId must be a valid conversation id'),
});

export const conversationMemberParamsSchema = z.object({
  conversationId: z.uuid('conversationId must be a valid conversation id'),
  memberId: z.uuid('memberId must be a valid member id'),
});

export type ConversationParams = z.infer<typeof conversationParamsSchema>;
export type ConversationMemberParams = z.infer<typeof conversationMemberParamsSchema>;
