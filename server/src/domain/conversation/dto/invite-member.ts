import { z } from 'zod';
import { MemberRole } from '../chat-group.model.js';
import { uuidSchema } from './common.js';

export const addConversationMemberBodySchema = z.object({ userId: uuidSchema }).strict();

export type AddConversationMemberBody = z.infer<typeof addConversationMemberBodySchema>;

export class InviteMemberDto {
  conversationId: string;
  member: {
    userId: string;
    name: string;
    imageUrl: string | null;
    role: MemberRole;
    joinedAt: string;
    lastReadMessageId: string | null;
    lastReadAt: string | null;
  };

  private constructor(
    conversationId: string,
    member: {
      userId: string;
      name: string;
      imageUrl: string | null;
      role: MemberRole;
      joinedAt: Date;
      lastReadMessageId?: string | null;
      lastReadAt?: Date | null;
    },
  ) {
    this.conversationId = conversationId;
    this.member = {
      userId: member.userId,
      name: member.name,
      imageUrl: member.imageUrl ?? null,
      role: member.role,
      joinedAt: new Date(member.joinedAt).toISOString(),
      lastReadMessageId: member.lastReadMessageId ?? null,
      lastReadAt: member.lastReadAt ? new Date(member.lastReadAt).toISOString() : null,
    };
  }

  static toDomainMemberInvited(
    conversationId: string,
    member: {
      userId: string;
      name: string;
      imageUrl: string | null;
      role: MemberRole;
      joinedAt: Date;
      lastReadMessageId?: string | null;
      lastReadAt?: Date | null;
    },
  ): InviteMemberDto {
    return new InviteMemberDto(conversationId, member);
  }
}
