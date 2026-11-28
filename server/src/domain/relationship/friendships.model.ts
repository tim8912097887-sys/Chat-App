import { randomUUID } from 'node:crypto';
import mongoose, { model, Schema } from 'mongoose';
import type { Model } from 'mongoose';
import { InferSchemaType } from 'mongoose';

export type FriendshipDocument = InferSchemaType<typeof friendshipSchema>;

export type FriendshipModel = Model<FriendshipDocument>;

const friendshipSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    requestedBy: { type: String, required: true },
    recipient: { type: String, required: true },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'ACCEPTED', 'REJECTED'],
        message: 'Invalid status',
      },
      required: true,
    },
    pairKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { collection: 'friendships', timestamps: true, versionKey: false },
);

friendshipSchema.index({ requestedBy: 1, status: 1, updatedAt: -1, _id: 1 });
friendshipSchema.index({ recipient: 1, status: 1, updatedAt: -1, _id: 1 });

export function registerFriendshipsModel(): FriendshipModel {
  return (
    (mongoose.models.Friendship as FriendshipModel) ??
    model<FriendshipDocument, FriendshipModel>('Friendship', friendshipSchema)
  );
}
