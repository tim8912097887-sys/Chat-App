import { z } from 'zod';
import { ChatGroupDocument, ChatGroupLastMessageDocument } from '../chat-group.model.js';
import { GroupType } from './create-conversation.js';

export const getConversationsQuerySchema = z
  .object({
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export type GetConversationsQuery = z.infer<typeof getConversationsQuerySchema>;

export class GetAllConversationsDto {
  conversationId: string;
  type: GroupType;
  name: string | null;
  imageUrl: string | null;
  lastMessage: ChatGroupLastMessageDocument | null;
  updatedAt: string;

  private constructor(
    conversation: ChatGroupDocument,
    name: string | null,
    imageUrl: string | null,
  ) {
    this.conversationId = conversation._id.toString();
    this.type = conversation.type;
    this.name = name;
    this.imageUrl = imageUrl;
    this.lastMessage = conversation.lastMessage ?? null;
    this.updatedAt = new Date(conversation.updatedAt).toISOString();
  }

  static toDomainConversation(
    conversation: ChatGroupDocument,
    name: string | null,
    imageUrl: string | null,
  ): GetAllConversationsDto {
    return new GetAllConversationsDto(conversation, name, imageUrl);
  }
}
