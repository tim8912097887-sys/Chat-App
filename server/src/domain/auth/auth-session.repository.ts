import { UserModel } from '../user/user.model.js';
import { RefreshTokenModel } from './auth.model.js';
import { InvalidTokenError } from './error/auth.js';

export interface AuthSessionRepository {
  revokeAllSessions(userId: string, expectedTokenVersion: number): Promise<void>;
}

export class MongoAuthSessionRepository implements AuthSessionRepository {
  constructor(
    private readonly userModel: UserModel,
    private readonly refreshTokenModel: RefreshTokenModel,
  ) {}

  async revokeAllSessions(userId: string, expectedTokenVersion: number): Promise<void> {
    const session = await this.userModel.db.startSession();

    try {
      await session.withTransaction(async () => {
        const result = await this.userModel.updateOne(
          {
            _id: userId,
            tokenVersion: expectedTokenVersion,
          },
          {
            $inc: { tokenVersion: 1 },
          },
          { session },
        );

        if (result.modifiedCount !== 1) {
          throw new InvalidTokenError('Invalid token');
        }

        await this.refreshTokenModel.updateMany(
          {
            userId,
            revokedAt: null,
          },
          {
            $set: { revokedAt: new Date() },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
