import { MemberRole } from '../chat-group.model.js';

export class RemoveMemberDto {
  conversationId: string;
  removedMember: { userId: string; name: string; imageUrl: string | null; role: MemberRole };
  removedAt: string;

  private constructor(
    conversationId: string,
    removedMember: { userId: string; name: string; imageUrl: string | null; role: MemberRole },
    removedAt: Date,
  ) {
    this.conversationId = conversationId;
    this.removedMember = {
      userId: removedMember.userId,
      name: removedMember.name,
      imageUrl: removedMember.imageUrl ?? null,
      role: removedMember.role,
    };
    this.removedAt = removedAt.toISOString();
  }

  static toDomainMemberRemoved(
    conversationId: string,
    removedMember: { userId: string; name: string; imageUrl: string | null; role: MemberRole },
    removedAt: Date,
  ): RemoveMemberDto {
    return new RemoveMemberDto(conversationId, removedMember, removedAt);
  }
}
