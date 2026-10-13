import { randomUUID } from 'node:crypto';
import mongoose, { model, Schema } from 'mongoose';
import type { Model } from 'mongoose';
import { InferSchemaType } from 'mongoose';

/** Shape of a document as stored in MongoDB (field names follow the storage spec). */
export type UserDocument = InferSchemaType<typeof userSchema>;

export type UserModel = Model<UserDocument>;

const userSchema = new Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: { type: String, required: true },
    imageUrl: { type: String, default: null },
    searchCode: {
      type: String,
      length: 8,
      required: true,
      unique: true,
      validate: {
        validator: (v: string) => /^[a-zA-Z0-9]+$/.test(v),
        message: 'Search code must only contain letters and numbers',
      },
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DISABLED'],
      default: 'ACTIVE',
      required: true,
    },
    tokenVersion: { type: Number, default: 0, required: true },
    loginAttempt: { type: Number, default: 0, required: true },
    loginLockedAt: { type: Date, default: null },
  },
  { collection: 'users', timestamps: true, versionKey: false },
);

export function registerUserModel(): UserModel {
  return (mongoose.models.User as UserModel) ?? model<UserDocument, UserModel>('User', userSchema);
}
