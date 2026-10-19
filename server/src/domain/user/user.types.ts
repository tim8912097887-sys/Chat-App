import { UserDocument } from './user.model.js';

export type UserStatus = 'ACTIVE' | 'DISABLED';

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

export interface UserSearchRecord {
  _id: string;
  name: string;
  imageUrl: string | null;
}

export interface PublicUserRecord {
  _id: string;
  name: string;
  imageUrl: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  imageUrl: string | null;
}

export interface PaginationOptions {
  name?: string;
  page: number;
  limit: number;
}

export interface UserIdentity {
  userId: string;
  tokenVersion: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  imageUrl?: string | null;
}

export type CreateUserRecord = CreateUserInput & { searchCode: string };

export type CreateUserResult =
  | { status: 'CREATED'; user: UserDocument }
  | { status: 'EMAIL_TAKEN' }
  | { status: 'SEARCH_CODE_TAKEN' };

export interface FailedLoginResult {
  locked: boolean;
}
