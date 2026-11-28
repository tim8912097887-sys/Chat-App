import { SignJWT } from 'jose';
import { LoginInput } from '../../../domain/auth/dto/login.js';
import type { SignupInput } from '../../../domain/auth/dto/signup.js';
import { config } from '../../../config/env/index.js';
import {
  DEFAULT_USER_EMAIL,
  DEFAULT_USER_NAME,
  DEFAULT_USER_PASSWORD,
  REFRESH_COOKIE_NAME,
} from './constants.js';
import { createHash, randomUUID } from 'crypto';

export function createSignupInput(overrides: Partial<SignupInput> = {}): SignupInput {
  return {
    name: DEFAULT_USER_NAME,
    email: DEFAULT_USER_EMAIL,
    password: DEFAULT_USER_PASSWORD,
    ...overrides,
  };
}

export function createLoginInput(overrides: Partial<LoginInput> = {}): LoginInput {
  return {
    email: DEFAULT_USER_EMAIL,
    password: DEFAULT_USER_PASSWORD,
    ...overrides,
  };
}

export interface RefreshJwtOptions {
  userId: string;
  tokenVersion?: number;
  issuedAtOffsetSeconds?: number;
  expiresInSeconds?: number;
  type?: 'access' | 'refresh';
  secret?: string;
}

export async function createSignedRefreshToken(options: RefreshJwtOptions): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const issuedAt = now + (options.issuedAtOffsetSeconds ?? 0);
  const expiresAt = now + (options.expiresInSeconds ?? 3600);
  const secret = options.secret ?? config.jwt.refreshSecret;

  const jwt = new SignJWT({
    ver: options.tokenVersion ?? 0,
    typ: options.type ?? 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(options.userId)
    .setIssuer(config.jwt.issuer)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt);

  if ((options.type ?? 'refresh') === 'refresh') {
    jwt.setJti(randomUUID());
  }

  return jwt.sign(new TextEncoder().encode(secret));
}

export async function createRefreshCookieHeader(options: RefreshJwtOptions): Promise<{
  token: string;
  tokenHash: string;
  cookie: string;
}> {
  const token = await createSignedRefreshToken(options);
  return {
    token,
    tokenHash: hashToken(token),
    cookie: `${REFRESH_COOKIE_NAME}=${token}`,
  };
}

export async function createExpiredRefreshCookie(userId = 'expired-user'): Promise<string> {
  const token = await createSignedRefreshToken({
    userId,
    issuedAtOffsetSeconds: -3600,
    expiresInSeconds: -1,
  });
  return `${REFRESH_COOKIE_NAME}=${token}`;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function extractCookieValue(
  setCookieHeader: string | string[] | undefined,
  cookieName: string,
): string | null {
  if (!setCookieHeader) return null;
  const headers = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  const target = headers.find((header) => header.startsWith(`${cookieName}=`));
  if (!target) return null;
  const rawPair = target.split(';')[0];
  if (!rawPair) return null;
  return rawPair.slice(`${cookieName}=`.length);
}

export interface AccessTokenOptions {
  userId: string;
  tokenVersion?: number;
  issuedAtOffsetSeconds?: number;
  expiresInSeconds?: number;
  secret?: string;
}

export async function createAccessToken(options: AccessTokenOptions): Promise<string> {
  return createSignedRefreshToken({
    userId: options.userId,
    tokenVersion: options.tokenVersion ?? 0,
    issuedAtOffsetSeconds: options.issuedAtOffsetSeconds,
    expiresInSeconds: options.expiresInSeconds ?? 900,
    type: 'access',
    secret: options.secret ?? config.jwt.accessSecret,
  });
}

export async function createExpiredAccessToken(userId: string, tokenVersion = 0): Promise<string> {
  return createAccessToken({
    userId,
    tokenVersion,
    issuedAtOffsetSeconds: -3600,
    expiresInSeconds: -1,
  });
}

export async function createInvalidSecretAccessToken(
  userId: string,
  tokenVersion = 0,
): Promise<string> {
  return createAccessToken({
    userId,
    tokenVersion,
    secret: 'invalid-test-access-secret',
  });
}
