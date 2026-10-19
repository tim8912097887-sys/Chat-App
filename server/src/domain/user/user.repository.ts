import type {
  CreateUserRecord,
  CreateUserResult,
  FailedLoginResult,
  PaginationOptions,
  PublicUserRecord,
  UserSearchRecord,
} from './user.types.js';
import type { UserDocument, UserModel } from './user.model.js';
import { isDuplicateKeyError } from '../../shared/utils/error.js';

export interface UserRepository {
  findById(id: string): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findPublicUsersByIds(userIds: string[]): Promise<PublicUserRecord[]>;
  findActiveBySearchCode(searchCode: string): Promise<UserSearchRecord | null>;
  searchFriendByName(friendsId: string[], options: PaginationOptions): Promise<UserSearchRecord[]>;
  create(record: CreateUserRecord): Promise<CreateUserResult>;
  /** Atomically bumps the attempt counter; locks the account and resets the counter at the limit. */
  registerFailedLogin(
    id: string,
    options: { maxAttempts: number; lockedAt: Date },
  ): Promise<FailedLoginResult>;
  clearLoginState(id: string): Promise<void>;
  incrementTokenVersion(id: string, tokenVersion: number): Promise<void>;
}

export class MongoUserRepository implements UserRepository {
  constructor(private readonly userModel: UserModel) {}

  async findById(id: string): Promise<UserDocument | null> {
    const doc = await this.userModel.findById(id).lean<UserDocument>().exec();
    return doc ? doc : null;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const doc = await this.userModel.findOne({ email }).lean<UserDocument>().exec();
    return doc ? doc : null;
  }

  async findPublicUsersByIds(userIds: string[]): Promise<PublicUserRecord[]> {
    if (userIds.length === 0) return [];
    return this.userModel
      .find({ _id: { $in: userIds }, status: 'ACTIVE' })
      .select({ _id: 1, name: 1, imageUrl: 1 })
      .lean<PublicUserRecord[]>()
      .exec();
  }

  async findActiveBySearchCode(searchCode: string): Promise<UserSearchRecord | null> {
    const doc = await this.userModel
      .findOne({ searchCode, status: 'ACTIVE' })
      .select({ _id: 1, name: 1, imageUrl: 1 })
      .lean<UserSearchRecord | null>()
      .exec();
    return doc ? doc : null;
  }

  async searchFriendByName(
    friendsId: string[],
    options: PaginationOptions,
  ): Promise<UserSearchRecord[]> {
    const { name, page, limit } = options;
    const filter = {
      status: 'ACTIVE' as const,
      _id: { $in: friendsId },
      ...(name && { name: { $regex: name, $options: 'i' } }),
    };

    return this.userModel
      .find(filter)
      .select({ _id: 1, name: 1, imageUrl: 1 })
      .sort({ name: 1, _id: 1 })
      .skip(page)
      .limit(limit)
      .lean<UserSearchRecord[]>()
      .exec();
  }

  async create(record: CreateUserRecord): Promise<CreateUserResult> {
    try {
      const doc = await this.userModel.create({
        name: record.name,
        email: record.email,
        passwordHash: record.passwordHash,
        imageUrl: record.imageUrl ?? null,
        searchCode: record.searchCode,
      });
      return { status: 'CREATED', user: doc.toObject() };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        // Don't depend on driver-specific error metadata; just check whether the email is the culprit.
        const existing = await this.findByEmail(record.email);
        return existing ? { status: 'EMAIL_TAKEN' } : { status: 'SEARCH_CODE_TAKEN' };
      }
      throw err;
    }
  }

  /**
   * Uses only single-document atomic operations (no transactions), so it also works on a
   * standalone mongod, not just replica sets.
   */
  async registerFailedLogin(
    id: string,
    options: { maxAttempts: number; lockedAt: Date },
  ): Promise<FailedLoginResult> {
    const increment = await this.userModel
      .updateOne(
        {
          _id: id,
          loginLockedAt: null,
          loginAttempt: { $lt: options.maxAttempts - 1 },
        },
        { $inc: { loginAttempt: 1 } },
      )
      .exec();

    if (increment.modifiedCount > 0) {
      return { locked: false };
    }

    const lock = await this.userModel
      .updateOne(
        {
          _id: id,
          loginLockedAt: null,
          loginAttempt: { $gte: options.maxAttempts - 1 },
        },
        { $set: { loginAttempt: 0, loginLockedAt: options.lockedAt } },
      )
      .exec();

    if (lock.modifiedCount > 0) {
      return { locked: true };
    }

    const user = await this.findById(id);
    return { locked: user?.loginLockedAt != null };
  }

  async clearLoginState(id: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: id }, { $set: { loginAttempt: 0, loginLockedAt: null } })
      .exec();
  }

  async incrementTokenVersion(id: string, tokenVersion: number): Promise<void> {
    await this.userModel.updateOne({ _id: id, tokenVersion }, { $inc: { tokenVersion: 1 } }).exec();
  }
}
