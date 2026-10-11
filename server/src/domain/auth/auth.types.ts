export interface CreateRefreshTokenRecord {
  id: string;
  familyId: string;
  tokenHash: string;
  parentId: string | null;
  expiredAt: Date;
}

export type TokenRecord = {
  _id: string;
  familyId: string;
  revokedAt: Date | null;
  replacedById: string | null;
};

export type InvalidateTokenRecord = {
  tokenHash: string;
  replacedById: string | null;
};

export type AtomicRefreshTokenRecord = {
  parentId: string;
  familyId: string;
  tokenHash: string;
  newTokenHash: string;
  replacedById: string;
  expiredAt: Date;
};
