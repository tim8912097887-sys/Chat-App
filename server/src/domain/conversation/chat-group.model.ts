import { randomUUID } from 'node:crypto';
import mongoose, { model, Schema, type InferSchemaType, type Model } from 'mongoose';

export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';

const chatGroupMemberSchema = new Schema(
  {
    userId: { type: String, required: true },
    role: {
      type: String,
      enum: {
        values: ['OWNER', 'ADMIN', 'MEMBER'],
        message: 'Invalid member role',
      },
      required: true,
    },
    joinedAt: { type: Date, required: true, default: () => new Date() },
    lastReadMessageId: { type: String },
    lastReadAt: { type: Date },
  },
  { _id: false },
);

const chatGroupLastMessageSchema = new Schema(
  {
    messageId: { type: String, required: true },
    senderId: { type: String, required: true },
    contentPreview: { type: String, required: true },
    createdAt: { type: Date, required: true },
  },
  { _id: false },
);

const chatGroupSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    type: {
      type: String,
      enum: {
        values: ['DIRECT', 'GROUP'],
        message: 'Invalid conversation type',
      },
      required: true,
    },
    name: { type: String },
    imageUrl: { type: String },
    creatorId: { type: String, required: true },
    members: {
      type: [chatGroupMemberSchema],
      required: true,
      default: [],
    },
    lastMessage: {
      type: chatGroupLastMessageSchema,
      default: undefined,
    },
    pairKey: {
      type: String,
    },
    version: {
      type: Number,
      required: true,
      default: 0,
    },

    deletedAt: {
      type: Date,
      default: undefined,
    },
  },
  { collection: 'chat_groups', timestamps: true, versionKey: false },
);

chatGroupSchema.index({
  'members.userId': 1,
  deletedAt: 1,
  updatedAt: -1,
  _id: 1,
});
chatGroupSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { type: 'DIRECT' } },
);

export type ChatGroupDocument = InferSchemaType<typeof chatGroupSchema>;
export type ChatGroupMembersDocument = InferSchemaType<typeof chatGroupMemberSchema>;
export type ChatGroupLastMessageDocument = InferSchemaType<typeof chatGroupLastMessageSchema>;
export type ChatGroupModel = Model<ChatGroupDocument>;

export function registerChatGroupsModel(): ChatGroupModel {
  return (
    (mongoose.models.ChatGroup as ChatGroupModel) ??
    model<ChatGroupDocument, ChatGroupModel>('ChatGroup', chatGroupSchema)
  );
}
