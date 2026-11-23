import { z } from 'zod';
import { MemberRole } from '../chat-group.model.js';

export const updateConversationMemberRoleBodySchema = z
  .object({ role: z.enum(['ADMIN', 'MEMBER']) })
  .strict();

export type UpdateConversationMemberRoleBody = z.infer<
  typeof updateConversationMemberRoleBodySchema
>;

export class UpdateMemberRoleDto {
  conversationId: string;
  member: { userId: string; role: MemberRole };
  updatedAt: string;

  private constructor(conversationId: string, userId: string, role: MemberRole, updatedAt: Date) {
    this.conversationId = conversationId;
    this.member = { userId, role };
    this.updatedAt = updatedAt.toISOString();
  }

  static toDomainMemberRoleUpdated(
    conversationId: string,
    userId: string,
    role: MemberRole,
    updatedAt: Date,
  ): UpdateMemberRoleDto {
    return new UpdateMemberRoleDto(conversationId, userId, role, updatedAt);
  }
}
