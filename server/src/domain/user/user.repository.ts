import type {
  CreateUserRecord,
  CreateUserResult,
  FailedLoginResult,
} from "./user.types.js";
import type { UserDocument, UserModel } from "./user.model.js";
import { isDuplicateKeyError } from "./user.utils.js";

export interface UserRepository {
  findById(id: string): Promise<UserDocument | null>;
  findByEmail(email: string): Promise<UserDocument | null>;
  create(record: CreateUserRecord): Promise<CreateUserResult>;
  /** Atomically bumps the attempt counter; locks the account and resets the counter at the limit. */
  registerFailedLogin(
    id: string,
    options: { maxAttempts: number; lockedAt: Date },
  ): Promise<FailedLoginResult>;
  clearLoginState(id: string): Promise<void>;
  incrementTokenVersion(id: string): Promise<void>;
}

export class MongoUserRepository implements UserRepository {
  constructor(private readonly userModel: UserModel) {}

  async findById(id: string): Promise<UserDocument | null> {
    const doc = await this.userModel.findById(id).lean<UserDocument>().exec();
    return doc ? doc : null;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const doc = await this.userModel
      .findOne({ email })
      .lean<UserDocument>()
      .exec();
    return doc ? doc : null;
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
      return { status: "CREATED", user: doc.toObject() };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        // Don't depend on driver-specific error metadata; just check whether the email is the culprit.
        const existing = await this.findByEmail(record.email);
        return existing
          ? { status: "EMAIL_TAKEN" }
          : { status: "SEARCH_CODE_TAKEN" };
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
    const session = await this.userModel.db.startSession();

    try {
      let isLocked = false;

      await session.withTransaction(async () => {
        const user = await this.userModel
          .findById(id)
          .session(session)
          .lean<UserDocument>()
          .exec();

        if (!user) return;

        const newAttempts = (user.login_attempt || 0) + 1;

        if (newAttempts < options.maxAttempts) {
          await this.userModel.updateOne(
            { _id: id },
            { $set: { login_attempt: newAttempts } },
            { session },
          );
          isLocked = false;
        } else {
          await this.userModel.updateOne(
            { _id: id },
            { $set: { login_attempt: 0, login_locked_at: options.lockedAt } },
            { session },
          );
          isLocked = true;
        }
      });

      return { locked: isLocked };
    } finally {
      await session.endSession();
    }
  }

  async clearLoginState(id: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        { $set: { login_attempt: 0, login_locked_at: null } },
      )
      .exec();
  }

  async incrementTokenVersion(id: string): Promise<void> {
    await this.userModel
      .updateOne({ _id: id }, { $inc: { token_version: 1 } })
      .exec();
  }
}
