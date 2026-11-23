import { randomUUID } from 'crypto';
import { ChatGroupDocument, ChatGroupModel, MemberRole } from './chat-group.model.js';
import { GetConversationsQuery } from './dto/get-conversations.js';
import { isDuplicateKeyError } from '../../shared/utils/error.js';
import { UpdateConversationBody } from './dto/update-conversation.js';

export interface CreateDirectConversationRecord {
  creatorId: string;
  pairKey: string;
  memberIds: [string, string];
}

export interface CreateGroupConversationRecord {
  creatorId: string;
  name: string;
  imageUrl?: string | null;
  members: Array<{
    userId: string;
    role: MemberRole;
    joinedAt: Date;
  }>;
}

export interface AddGroupMemberRecord {
  userId: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface CreateDirectConversationResult {
  conversation: ChatGroupDocument;
  created: boolean;
}

export interface ConversationRepository {
  findById(conversationId: string): Promise<ChatGroupDocument | null>;
  findDirectByPairKey(pairKey: string): Promise<ChatGroupDocument | null>;
  findByUserId(userId: string, pagination: GetConversationsQuery): Promise<ChatGroupDocument[]>;
  createDirectConversation(
    record: CreateDirectConversationRecord,
  ): Promise<CreateDirectConversationResult>;
  createGroupConversation(record: CreateGroupConversationRecord): Promise<ChatGroupDocument>;
  updateGroupConversation(
    conversationId: string,
    changes: UpdateConversationBody,
  ): Promise<ChatGroupDocument | null>;
  softDeleteGroupConversation(
    conversationId: string,
    deletedAt: Date,
  ): Promise<ChatGroupDocument | null>;
  updateMemberRole(
    conversationId: string,
    memberId: string,
    role: Exclude<MemberRole, 'OWNER'>,
  ): Promise<ChatGroupDocument | null>;
  addGroupMember(
    conversationId: string,
    member: AddGroupMemberRecord,
  ): Promise<ChatGroupDocument | null>;
  removeGroupMember(conversationId: string, memberId: string): Promise<ChatGroupDocument | null>;
}

export class MongoConversationRepository implements ConversationRepository {
  constructor(private readonly chatGroupModel: ChatGroupModel) {}

  async findById(conversationId: string): Promise<ChatGroupDocument | null> {
    return this.chatGroupModel.findById(conversationId).lean<ChatGroupDocument>().exec();
  }

  async findDirectByPairKey(pairKey: string): Promise<ChatGroupDocument | null> {
    return this.chatGroupModel
      .findOne({ pairKey, type: 'DIRECT', deletedAt: null })
      .lean<ChatGroupDocument>()
      .exec();
  }

  async findByUserId(
    userId: string,
    pagination: GetConversationsQuery,
  ): Promise<ChatGroupDocument[]> {
    return this.chatGroupModel
      .find({ 'members.userId': userId, deletedAt: null })
      .sort({ updatedAt: -1, _id: 1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .lean<ChatGroupDocument[]>()
      .exec();
  }

  async createDirectConversation(
    record: CreateDirectConversationRecord,
  ): Promise<CreateDirectConversationResult> {
    const now = new Date();

    try {
      const doc = await this.chatGroupModel.create({
        _id: randomUUID(),
        type: 'DIRECT',
        creatorId: record.creatorId,
        pairKey: record.pairKey,
        members: record.memberIds.map((userId) => ({
          userId,
          role: 'MEMBER',
          joinedAt: now,
        })),
      });

      return {
        conversation: doc.toObject(),
        created: true,
      };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await this.findDirectByPairKey(record.pairKey);
        if (existing) {
          return {
            conversation: existing,
            created: false,
          };
        }
      }
      throw err;
    }
  }

  async createGroupConversation(record: CreateGroupConversationRecord): Promise<ChatGroupDocument> {
    const doc = await this.chatGroupModel.create({
      _id: randomUUID(),
      type: 'GROUP',
      name: record.name,
      imageUrl: record.imageUrl ?? undefined,
      creatorId: record.creatorId,
      members: record.members,
    });

    return doc.toObject();
  }

  async updateGroupConversation(
    conversationId: string,
    changes: UpdateConversationBody,
  ): Promise<ChatGroupDocument | null> {
    const setPayload: Record<string, unknown> = {};

    if (changes.name !== undefined) {
      setPayload.name = changes.name;
    }
    if (changes.imageUrl !== undefined) {
      setPayload.imageUrl = changes.imageUrl;
    }

    if (Object.keys(setPayload).length === 0) {
      return this.chatGroupModel
        .findOne({ _id: conversationId, type: 'GROUP', deletedAt: null })
        .lean<ChatGroupDocument>()
        .exec();
    }

    return this.chatGroupModel
      .findOneAndUpdate(
        { _id: conversationId, type: 'GROUP', deletedAt: null },
        { $set: setPayload },
        { new: true },
      )
      .lean<ChatGroupDocument>()
      .exec();
  }

  async softDeleteGroupConversation(
    conversationId: string,
    deletedAt: Date,
  ): Promise<ChatGroupDocument | null> {
    return this.chatGroupModel
      .findOneAndUpdate(
        { _id: conversationId, type: 'GROUP', deletedAt: null },
        { $set: { deletedAt } },
        { new: true },
      )
      .lean<ChatGroupDocument>()
      .exec();
  }

  async updateMemberRole(
    conversationId: string,
    memberId: string,
    role: Exclude<MemberRole, 'OWNER'>,
  ): Promise<ChatGroupDocument | null> {
    return this.chatGroupModel
      .findOneAndUpdate(
        {
          _id: conversationId,
          type: 'GROUP',
          deletedAt: null,
          'members.userId': memberId,
        },
        {
          $set: { 'members.$.role': role },
        },
        { new: true },
      )
      .lean<ChatGroupDocument>()
      .exec();
  }

  async addGroupMember(
    conversationId: string,
    member: AddGroupMemberRecord,
  ): Promise<ChatGroupDocument | null> {
    return this.chatGroupModel
      .findOneAndUpdate(
        {
          _id: conversationId,
          type: 'GROUP',
          deletedAt: null,
          'members.userId': { $ne: member.userId },
        },
        {
          $push: { members: member },
        },
        { new: true },
      )
      .lean<ChatGroupDocument>()
      .exec();
  }

  async removeGroupMember(
    conversationId: string,
    memberId: string,
  ): Promise<ChatGroupDocument | null> {
    return this.chatGroupModel
      .findOneAndUpdate(
        {
          _id: conversationId,
          type: 'GROUP',
          deletedAt: null,
          'members.userId': memberId,
        },
        {
          $pull: { members: { userId: memberId } },
        },
        { new: true },
      )
      .lean<ChatGroupDocument>()
      .exec();
  }
}
