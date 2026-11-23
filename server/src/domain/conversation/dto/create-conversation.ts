import { z } from 'zod';
import {
  ChatGroupDocument,
  ChatGroupLastMessageDocument,
  ChatGroupMembersDocument,
} from '../chat-group.model.js';
import { groupNameSchema, imageUrlSchema, uuidSchema } from './common.js';

export const groupType = z.enum(['DIRECT', 'GROUP']);
export type GroupType = z.infer<typeof groupType>;

export const createConversationBodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('DIRECT'), targetUserId: uuidSchema }).strict(),
  z
    .object({
      type: z.literal('GROUP'),
      name: groupNameSchema,
      imageUrl: imageUrlSchema.optional(),
    })
    .strict(),
]);

export type CreateConversationBody = z.infer<typeof createConversationBodySchema>;

export class ReturnConversationDto {
  conversationId: string;
  type: GroupType;
  name: string | null;
  imageUrl: string | null;
  creatorId: string;
  members: ChatGroupMembersDocument[];
  lastMessage: ChatGroupLastMessageDocument | null;
  createdAt: string;
  updatedAt: string;

  private constructor(conversation: ChatGroupDocument) {
    this.conversationId = conversation._id.toString();
    this.type = conversation.type;
    this.name = conversation.name ?? null;
    this.imageUrl = conversation.imageUrl ?? null;
    this.creatorId = conversation.creatorId;
    this.members = conversation.members.map((member) => ({
      ...member,
      lastReadMessageId: member.lastReadMessageId ?? null,
      lastReadAt: member.lastReadAt ?? null,
    }));
    this.lastMessage = conversation.lastMessage ?? null;
    this.createdAt = new Date(conversation.createdAt).toISOString();
    this.updatedAt = new Date(conversation.updatedAt).toISOString();
  }

  static toDomainConversation(conversation: ChatGroupDocument): ReturnConversationDto {
    return new ReturnConversationDto(conversation);
  }
}
