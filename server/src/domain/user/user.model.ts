import { randomUUID } from "node:crypto";
import mongoose, { Schema } from "mongoose";
import type { Connection, Model } from "mongoose";
import type { UserStatus } from "./user.types.js";

/** Shape of a document as stored in MongoDB (field names follow the storage spec). */
export interface UserDocument {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  imageUrl?: string | null;
  searchCode: string;
  status: UserStatus;
  token_version: number;
  login_attempt: number;
  login_locked_at: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type UserModel = Model<UserDocument>;

const userSchema = new Schema<UserDocument>(
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
        message: "Search code must only contain letters and numbers",
      },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DISABLED"],
      default: "ACTIVE",
      required: true,
    },
    token_version: { type: Number, default: 0, required: true },
    login_attempt: { type: Number, default: 0, required: true },
    login_locked_at: { type: Date, default: null },
  },
  { collection: "users", timestamps: true, versionKey: false },
);

export const registerUserModel = (): UserModel =>
  mongoose.model<UserDocument>("User", userSchema);
