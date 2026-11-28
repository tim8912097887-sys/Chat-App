import { ChatGroupDocument } from '../../../domain/conversation/chat-group.model.js';
import { chatGroupModel } from '../common/query.js';
import { buildPairKey } from '../relationship/factory.js';
import {
  buildDirectConversationSeedData,
  buildGroupConversationSeedData,
  CreateDirectConversationSeedOptions,
  CreateGroupConversationSeedOptions,
} from './factory.js';

export async function insertGroupConversation(
  options: CreateGroupConversationSeedOptions,
): Promise<ChatGroupDocument> {
  const { updatedAt, ...seed } = buildGroupConversationSeedData(options);
  const doc = await chatGroupModel.create(seed);

  if (updatedAt) {
    await chatGroupModel.updateOne({ _id: seed._id }, { $set: { updatedAt } });
    const updated = await findConversationById(seed._id);
    if (updated) return updated;
  }

  return doc.toObject();
}

export async function insertDirectConversation(
  options: CreateDirectConversationSeedOptions,
): Promise<ChatGroupDocument> {
  const { updatedAt, ...seed } = buildDirectConversationSeedData(options);
  const doc = await chatGroupModel.create(seed);

  if (updatedAt) {
    await chatGroupModel.updateOne({ _id: seed._id }, { $set: { updatedAt } });
    const updated = await findConversationById(seed._id);
    if (updated) return updated;
  }

  return doc.toObject();
}

export async function findConversationById(
  conversationId: string,
): Promise<ChatGroupDocument | null> {
  return chatGroupModel.findById(conversationId).lean<ChatGroupDocument>().exec();
}

export async function findDirectConversationByUsers(
  userAId: string,
  userBId: string,
): Promise<ChatGroupDocument | null> {
  return chatGroupModel
    .findOne({ pairKey: buildPairKey(userAId, userBId), type: 'DIRECT' })
    .lean<ChatGroupDocument>()
    .exec();
}

export async function findAllConversations(): Promise<ChatGroupDocument[]> {
  return chatGroupModel.find({}).lean<ChatGroupDocument[]>().exec();
}

export async function findConversationsByUserId(userId: string): Promise<ChatGroupDocument[]> {
  return chatGroupModel.find({ 'members.userId': userId }).lean<ChatGroupDocument[]>().exec();
}

export async function bumpConversationVersionRaw(
  conversationId: string,
  changes: Record<string, unknown> = {},
): Promise<void> {
  await chatGroupModel.updateOne({ _id: conversationId }, { $set: changes, $inc: { version: 1 } });
}
