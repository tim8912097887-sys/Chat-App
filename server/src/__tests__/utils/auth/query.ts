import { randomUUID } from 'node:crypto';
import { UserDocument } from '../../../domain/user/user.model.js';
import { RefreshTokenDocument } from '../../../domain/auth/auth.model.js';
import { authModel } from '../common/query.js';
import { DEFAULT_REFRESH_TTL_MS } from './constants.js';
import { createRefreshCookieHeader, createSignedRefreshToken, hashToken } from './factory.js';
import { insertUser } from '../user/query.js';
import { CreateUserSeedOptions } from '../user/factory.js';

export interface InsertRefreshTokenOptions {
  id?: string;
  familyId?: string;
  userId: string;
  tokenHash: string;
  parentId?: string | null;
  replacedById?: string | null;
  revokedAt?: Date | null;
  expiredAt?: Date;
}

export interface AuthenticatedSession {
  user: UserDocument;
  record: RefreshTokenDocument;
  token: string;
  tokenHash: string;
  cookie: string;
}

export interface InsertAuthenticatedSessionOptions {
  user?: CreateUserSeedOptions;
  token?: Partial<Omit<InsertRefreshTokenOptions, 'userId' | 'tokenHash'>>;
  jwtTokenVersion?: number;
  jwtExpiresInSeconds?: number;
}

export async function insertRefreshToken(
  options: InsertRefreshTokenOptions,
): Promise<RefreshTokenDocument> {
  const doc = await authModel.create({
    _id: options.id ?? randomUUID(),
    familyId: options.familyId ?? randomUUID(),
    userId: options.userId,
    tokenHash: options.tokenHash,
    parentId: options.parentId ?? null,
    replacedById: options.replacedById ?? null,
    revokedAt: options.revokedAt ?? null,
    expiredAt: options.expiredAt ?? new Date(Date.now() + DEFAULT_REFRESH_TTL_MS),
  });

  return doc.toObject();
}

export async function insertSessionForUser(
  user: UserDocument,
  options: Omit<InsertAuthenticatedSessionOptions, 'user'> = {},
): Promise<Omit<AuthenticatedSession, 'user'>> {
  const { token, tokenHash, cookie } = await createRefreshCookieHeader({
    userId: user._id,
    tokenVersion: options.jwtTokenVersion ?? user.tokenVersion,
    expiresInSeconds: options.jwtExpiresInSeconds,
  });

  const record = await insertRefreshToken({
    userId: user._id,
    tokenHash,
    ...options.token,
  });

  return { record, token, tokenHash, cookie };
}

export async function insertAuthenticatedSession(
  options: InsertAuthenticatedSessionOptions = {},
): Promise<AuthenticatedSession> {
  const user = await insertUser(options.user);
  const session = await insertSessionForUser(user, options);

  return {
    user,
    ...session,
  };
}

export async function createUnstoredRefreshCookie(
  userId: string,
  tokenVersion = 0,
): Promise<string> {
  const { cookie } = await createRefreshCookieHeader({ userId, tokenVersion });
  return cookie;
}

export async function createWrongTypeCookie(userId: string): Promise<string> {
  const token = await createSignedRefreshToken({ userId, type: 'access' });
  return `refresh_token=${token}`;
}

export async function findRefreshTokenById(id: string): Promise<RefreshTokenDocument | null> {
  return authModel.findById(id).lean().exec();
}

export async function findRefreshTokenByHash(
  tokenHash: string,
): Promise<RefreshTokenDocument | null> {
  return authModel.findOne({ tokenHash }).lean().exec();
}

export async function findRefreshTokenByRawToken(
  rawToken: string,
): Promise<RefreshTokenDocument | null> {
  return findRefreshTokenByHash(hashToken(rawToken));
}

export async function findRefreshTokensByUserId(userId: string): Promise<RefreshTokenDocument[]> {
  return authModel.find({ userId }).lean().exec();
}

export async function findRefreshTokensByFamilyId(
  familyId: string,
): Promise<RefreshTokenDocument[]> {
  return authModel.find({ familyId }).lean().exec();
}

export async function findAllRefreshTokens(): Promise<RefreshTokenDocument[]> {
  return authModel.find({}).lean().exec();
}
