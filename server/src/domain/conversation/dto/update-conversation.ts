import { z } from 'zod';
import { groupNameSchema, imageUrlSchema } from './common.js';

export const updateConversationBodySchema = z
  .object({
    name: groupNameSchema.nullable().optional(),
    imageUrl: imageUrlSchema.nullable().optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined || data.imageUrl !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateConversationBody = z.infer<typeof updateConversationBodySchema>;

export class UpdateConversationDto {
  conversationId: string;
  changes: { name: string | null; imageUrl: string | null };
  updatedBy: string;
  updatedAt: string;

  private constructor(
    conversationId: string,
    changes: { name: string | null; imageUrl: string | null },
    updatedBy: string,
    updatedAt: Date,
  ) {
    this.conversationId = conversationId;
    this.changes = changes;
    this.updatedBy = updatedBy;
    this.updatedAt = updatedAt.toISOString();
  }

  static toDomainConversationUpdated(
    conversationId: string,
    changes: { name: string | null; imageUrl: string | null },
    updatedBy: string,
    updatedAt: Date,
  ): UpdateConversationDto {
    return new UpdateConversationDto(conversationId, changes, updatedBy, updatedAt);
  }
}
