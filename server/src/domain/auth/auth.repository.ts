import type { RefreshTokenModel } from './auth.model.js';
import type {
  AtomicRefreshTokenRecord,
  CreateRefreshTokenRecord,
  InvalidateTokenRecord,
  TokenRecord,
} from './auth.types.js';
import { InvalidTokenError } from './error/invalid-token.js';

export interface AuthRepository {
  createRefreshToken(record: CreateRefreshTokenRecord): Promise<void>;
  findRefreshTokenByHash(tokenHash: string): Promise<TokenRecord | null>;
  findRefreshTokenByUserId(userId: string): Promise<TokenRecord[]>;
  invalidateRefreshToken(invalidateTokenRecord: InvalidateTokenRecord): Promise<void>;
  invalidateAllRefreshTokensByFamilyId(familyId: string): Promise<void>;
  invalidateAllRefreshTokensByUserId(userId: string): Promise<void>;
  atomicUpdateRefreshToken(atomicRefreshTokenRecord: AtomicRefreshTokenRecord): Promise<void>;
  countActiveSessionsByUserId(userId: string): Promise<number>;
}

export class MongoAuthRepository implements AuthRepository {
  constructor(private readonly refreshTokenModel: RefreshTokenModel) {}

  async createRefreshToken(record: CreateRefreshTokenRecord): Promise<void> {
    await this.refreshTokenModel.create({
      _id: record.id,
      familyId: record.familyId,
      userId: record.userId,
      tokenHash: record.tokenHash,
      parentId: record.parentId,
      expiredAt: record.expiredAt,
    });
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<TokenRecord | null> {
    const record = await this.refreshTokenModel
      .findOne({ tokenHash, expiredAt: { $gt: new Date() } })
      .select({ _id: 1, familyId: 1, revokedAt: 1, replacedById: 1, expiredAt: 1 })
      .lean()
      .exec();
    return record
      ? {
          _id: record._id,
          familyId: record.familyId,
          revokedAt: record.revokedAt ?? null,
          replacedById: record.replacedById ?? null,
          expiredAt: record.expiredAt,
        }
      : null;
  }

  async findRefreshTokenByUserId(userId: string): Promise<TokenRecord[]> {
    const records = await this.refreshTokenModel
      .find({ userId })
      .select({ _id: 1, familyId: 1, revokedAt: 1, replacedById: 1, expiredAt: 1 })
      .lean()
      .exec();

    return records.map((record) => ({
      _id: record._id,
      familyId: record.familyId,
      revokedAt: record.revokedAt ?? null,
      replacedById: record.replacedById ?? null,
      expiredAt: record.expiredAt,
    }));
  }

  async countActiveSessionsByUserId(userId: string): Promise<number> {
    const now = new Date();

    const families = await this.refreshTokenModel.distinct('familyId', {
      userId,
      revokedAt: null,
      replacedById: null,
      expiredAt: { $gt: now },
    });

    return families.length;
  }

  async invalidateRefreshToken(invalidateTokenRecord: InvalidateTokenRecord): Promise<void> {
    const { tokenHash, replacedById } = invalidateTokenRecord;
    await this.refreshTokenModel.updateOne({ tokenHash }, { revokedAt: new Date(), replacedById });
  }

  async invalidateAllRefreshTokensByFamilyId(familyId: string): Promise<void> {
    await this.refreshTokenModel.updateMany({ familyId }, { revokedAt: new Date() });
  }

  async invalidateAllRefreshTokensByUserId(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany({ userId }, { revokedAt: new Date() });
  }

  async atomicUpdateRefreshToken(atomicRefreshTokenRecord: AtomicRefreshTokenRecord) {
    const { tokenHash, replacedById, familyId, parentId, expiredAt, newTokenHash, userId } =
      atomicRefreshTokenRecord;
    const session = await this.refreshTokenModel.db.startSession();
    try {
      await session.withTransaction(async () => {
        const result = await this.refreshTokenModel
          .findOneAndUpdate(
            { tokenHash, revokedAt: null, replacedById: null },
            { revokedAt: new Date(), replacedById },
          )
          .session(session);

        if (!result) {
          throw new InvalidTokenError('Invalid token');
        }
        await this.refreshTokenModel.create(
          [
            {
              _id: replacedById,
              familyId,
              userId,
              tokenHash: newTokenHash,
              parentId,
              expiredAt,
            },
          ],
          {
            session,
          },
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
