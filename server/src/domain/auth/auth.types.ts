export interface CreateRefreshTokenRecord {
  id: string;
  familyId: string;
  userId: string;
  tokenHash: string;
  parentId: string | null;
  expiredAt: Date;
}

export type TokenRecord = {
  _id: string;
  familyId: string;
  revokedAt: Date | null;
  replacedById: string | null;
  expiredAt: Date;
};

export type InvalidateTokenRecord = {
  tokenHash: string;
  replacedById: string | null;
};

export type AtomicRefreshTokenRecord = {
  parentId: string;
  familyId: string;
  userId: string;
  tokenHash: string;
  newTokenHash: string;
  replacedById: string;
  expiredAt: Date;
};

export interface RefreshCookieOptions {
  name: string;
  path: string;
  secure: boolean;
  maxAgeMs: number;
}
