import { UserDocument } from "./user.model.js";

export type UserStatus = "ACTIVE" | "DISABLED";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  imageUrl: string | null;
  searchCode: string;
  status: UserStatus;
  tokenVersion: number;
  loginAttempt: number;
  loginLockedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  imageUrl?: string | undefined;
}

export type CreateUserRecord = CreateUserInput & { searchCode: string };

export type CreateUserResult =
  | { status: "CREATED"; user: UserDocument }
  | { status: "EMAIL_TAKEN" }
  | { status: "SEARCH_CODE_TAKEN" };

export interface FailedLoginResult {
  locked: boolean;
}
