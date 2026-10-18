import { randomUUID } from 'node:crypto';
import mongoose, { model, Schema } from 'mongoose';
import type { Model } from 'mongoose';
import { InferSchemaType } from 'mongoose';

export type FriendshipDocument = InferSchemaType<typeof friendshipSchema>;

export type FriendshipModel = Model<FriendshipDocument>;

const friendshipSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userIds: {
      type: [String],
      validate: {
        validator: function (v: string[]) {
          return v.length === 2;
        },
        message: 'Friendship must have exactly two users',
      },
      required: true,
    },
    requestedBy: { type: String, required: true },
    status: {
      type: String,
      enum: {
        values: ['PENDING', 'ACCEPTED', 'REJECTED'],
        message: 'Invalid status',
      },
      required: true,
    },
  },
  { collection: 'friendships', timestamps: true, versionKey: false },
);

export function registerFriendshipsModel(): FriendshipModel {
  return (
    (mongoose.models.Friendship as FriendshipModel) ??
    model<FriendshipDocument, FriendshipModel>('Friendship', friendshipSchema)
  );
}
