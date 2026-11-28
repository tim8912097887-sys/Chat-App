import { randomUUID } from 'node:crypto';
import { UserStatus } from '../../../domain/user/user.types.js';
import { generateSearchCode } from '../../../domain/user/user.utils.js';
import { DEFAULT_USER_NAME, DEFAULT_USER_PASSWORD } from '../auth/constants.js';

export interface CreateUserSeedOptions {
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  imageUrl?: string | null;
  searchCode?: string;
  status?: UserStatus;
  tokenVersion?: number;
}

export function buildUserSeedData(
  overrides: CreateUserSeedOptions = {},
): Required<CreateUserSeedOptions> {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    name: overrides.name ?? DEFAULT_USER_NAME,
    email: (overrides.email ?? `user-${id}@example.com`).trim().toLowerCase(),
    password: overrides.password ?? DEFAULT_USER_PASSWORD,
    imageUrl: overrides.imageUrl ?? null,
    searchCode: overrides.searchCode ?? generateSearchCode(),
    status: overrides.status ?? 'ACTIVE',
    tokenVersion: overrides.tokenVersion ?? 0,
  };
}

export function createSearchUserQuery(q: string): { q: string } {
  return { q };
}

export function createFriendSearchQuery(
  overrides: Partial<{ q: string; page: number | string; limit: number | string }> = {},
): Record<string, unknown> {
  return { ...overrides };
}
