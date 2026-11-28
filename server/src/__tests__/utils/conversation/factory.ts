import { randomUUID } from 'crypto';
import { buildPairKey } from '../relationship/factory.js';
import { DEFAULT_GROUP_NAME, UPDATED_GROUP_NAME } from './constants.js';
import { GetConversationsQuery } from '../../../domain/conversation/dto/get-conversations.js';
import { UpdateConversationMemberRoleBody } from '../../../domain/conversation/dto/update-member-role.js';
import { MemberRole } from '../../../domain/conversation/chat-group.model.js';
import { AddConversationMemberBody } from '../../../domain/conversation/dto/invite-member.js';
import { UpdateConversationBody } from '../../../domain/conversation/dto/update-conversation.js';
import { CreateConversationBody } from '../../../domain/conversation/dto/create-conversation.js';

export interface ConversationMemberSeed {
  userId: string;
  role: MemberRole;
  joinedAt?: Date;
  lastReadMessageId?: string;
  lastReadAt?: Date;
}

export interface ConversationLastMessageSeed {
  messageId: string;
  senderId: string;
  contentPreview: string;
  createdAt: Date;
}

export interface CreateGroupConversationSeedOptions {
  id?: string;
  name?: string | null;
  imageUrl?: string | null;
  creatorId: string;
  members?: ConversationMemberSeed[];
  lastMessage?: ConversationLastMessageSeed;
  version?: number;
  deletedAt?: Date;
  updatedAt?: Date;
}

export interface CreateDirectConversationSeedOptions {
  id?: string;
  creatorId: string;
  targetUserId: string;
  lastMessage?: ConversationLastMessageSeed;
  version?: number;
  deletedAt?: Date;
  updatedAt?: Date;
}

export function createDirectConversationInput(
  targetUserId: string = randomUUID(),
): CreateConversationBody {
  return {
    type: 'DIRECT',
    targetUserId,
  };
}

export function createGroupConversationInput(
  overrides: Partial<Extract<CreateConversationBody, { type: 'GROUP' }>> = {},
): CreateConversationBody {
  return {
    type: 'GROUP',
    name: overrides.name ?? DEFAULT_GROUP_NAME,
    ...(overrides.imageUrl !== undefined ? { imageUrl: overrides.imageUrl } : {}),
  };
}

export function createUpdateConversationInput(
  overrides: Partial<UpdateConversationBody> = {},
): UpdateConversationBody {
  if (Object.keys(overrides).length === 0) {
    return { name: UPDATED_GROUP_NAME };
  }
  return { ...overrides };
}

export function createInviteMemberInput(userId: string = randomUUID()): AddConversationMemberBody {
  return { userId };
}

export function createUpdateMemberRoleInput(
  role: Exclude<MemberRole, 'OWNER'> = 'ADMIN',
): UpdateConversationMemberRoleBody {
  return { role };
}

export function createGetConversationsQuery(
  overrides: Partial<GetConversationsQuery> = {},
): Record<string, unknown> {
  return { ...overrides };
}

export function buildGroupConversationSeedData(options: CreateGroupConversationSeedOptions) {
  const now = new Date();
  const members = options.members ?? [
    {
      userId: options.creatorId,
      role: 'OWNER' as const,
      joinedAt: now,
    },
  ];

  return {
    _id: options.id ?? randomUUID(),
    type: 'GROUP' as const,
    name: options.name === undefined ? DEFAULT_GROUP_NAME : options.name,
    imageUrl: options.imageUrl === undefined ? undefined : options.imageUrl,
    creatorId: options.creatorId,
    members: members.map((m) => ({
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt ?? now,
      ...(m.lastReadMessageId !== undefined ? { lastReadMessageId: m.lastReadMessageId } : {}),
      ...(m.lastReadAt !== undefined ? { lastReadAt: m.lastReadAt } : {}),
    })),
    ...(options.lastMessage ? { lastMessage: options.lastMessage } : {}),
    version: options.version ?? 0,
    ...(options.deletedAt ? { deletedAt: options.deletedAt } : {}),
    updatedAt: options.updatedAt,
  };
}

export function buildDirectConversationSeedData(options: CreateDirectConversationSeedOptions) {
  const now = new Date();
  return {
    _id: options.id ?? randomUUID(),
    type: 'DIRECT' as const,
    creatorId: options.creatorId,
    pairKey: buildPairKey(options.creatorId, options.targetUserId),
    members: [
      { userId: options.creatorId, role: 'MEMBER' as const, joinedAt: now },
      { userId: options.targetUserId, role: 'MEMBER' as const, joinedAt: now },
    ],
    ...(options.lastMessage ? { lastMessage: options.lastMessage } : {}),
    version: options.version ?? 0,
    ...(options.deletedAt ? { deletedAt: options.deletedAt } : {}),
    updatedAt: options.updatedAt,
  };
}

export function createLastMessageSeed(
  senderId: string,
  overrides: Partial<ConversationLastMessageSeed> = {},
): ConversationLastMessageSeed {
  return {
    messageId: overrides.messageId ?? randomUUID(),
    senderId,
    contentPreview: overrides.contentPreview ?? 'Hello world',
    createdAt: overrides.createdAt ?? new Date(),
  };
}
