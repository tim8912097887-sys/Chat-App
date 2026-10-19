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
        validator: function (this: { requestedBy: string }, v: string[]) {
          let isValid = true;
          if (v.length !== 2 || !v.includes(this.requestedBy) || v[0] === v[1]) isValid = false;
          return isValid;
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
    pairKey: {
      type: String,
      required: true,
      unique: true,
    },
  },
  { collection: 'friendships', timestamps: true, versionKey: false },
);

friendshipSchema.index({ userIds: 1, status: 1, updatedAt: -1, _id: 1 });

friendshipSchema.index({ userIds: 1, requestedBy: 1, status: 1, updatedAt: -1, _id: 1 });

export function registerFriendshipsModel(): FriendshipModel {
  return (
    (mongoose.models.Friendship as FriendshipModel) ??
    model<FriendshipDocument, FriendshipModel>('Friendship', friendshipSchema)
  );
}
