import { MAX_SEARCH_CODE_RETRIES } from './user.constants.js';
import { UserDocument } from './user.model.js';
import type { UserRepository } from './user.repository.js';
import type { RelationshipRepository } from '../relationship/relationship.repository.js';
import { InvalidUserTokenError } from './error/invalid-user-token.js';
import type {
  CreateUserInput,
  FailedLoginResult,
  PaginationOptions,
  PublicUser,
  User,
  UserIdentity,
  UserSearchRecord,
} from './user.types.js';
import { generateSearchCode } from './user.utils.js';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly relationshipRepository: RelationshipRepository,
  ) {}

  async findById(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    if (!user) return null;
    return this.toUserDomain(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) return null;
    return this.toUserDomain(user);
  }

  async searchActiveBySearchCode(searchCode: string): Promise<PublicUser | null> {
    const user = await this.userRepository.findActiveBySearchCode(searchCode);
    return user ? this.toPublicUser(user) : null;
  }

  async searchFriendsByName(
    identity: UserIdentity,
    pagination: PaginationOptions,
  ): Promise<PublicUser[]> {
    const user = await this.userRepository.findById(identity.userId);
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== identity.tokenVersion) {
      throw new InvalidUserTokenError('Invalid user token');
    }

    const relationships = await this.relationshipRepository.findFriendsByUserId(identity.userId);
    const friendsId = relationships
      .map((relationship) => relationship.userIds.find((id) => id !== identity.userId))
      .filter((id): id is string => id !== undefined);

    if (friendsId.length === 0) return [];
    const users = await this.userRepository.searchFriendByName(friendsId, {
      name: pagination.name,
      page: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit,
    });
    return users.map((user) => this.toPublicUser(user));
  }

  /** Returns true when a user was created, false when the email was already registered. */
  async register(input: CreateUserInput): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_SEARCH_CODE_RETRIES; attempt++) {
      const result = await this.userRepository.create({
        ...input,
        searchCode: generateSearchCode(),
      });
      if (result.status === 'CREATED') return true;
      if (result.status === 'EMAIL_TAKEN') return false;
      // SEARCH_CODE_TAKEN -> try again with a fresh code
    }
    throw new Error('Unable to generate a unique search code');
  }

  registerFailedLogin(
    userId: string,
    options: { maxAttempts: number; lockedAt: Date },
  ): Promise<FailedLoginResult> {
    return this.userRepository.registerFailedLogin(userId, options);
  }

  clearLoginState(userId: string): Promise<void> {
    return this.userRepository.clearLoginState(userId);
  }

  incrementTokenVersion(userId: string, tokenVersion: number): Promise<void> {
    return this.userRepository.incrementTokenVersion(userId, tokenVersion);
  }

  private toUserDomain(userDocument: UserDocument): User {
    return {
      id: userDocument._id,
      name: userDocument.name,
      email: userDocument.email,
      passwordHash: userDocument.passwordHash,
      imageUrl: userDocument.imageUrl ?? null,
      searchCode: userDocument.searchCode,
      status: userDocument.status,
      tokenVersion: userDocument.tokenVersion,
      loginAttempt: userDocument.loginAttempt,
      loginLockedAt: userDocument.loginLockedAt ?? null,
      createdAt: userDocument.createdAt,
      updatedAt: userDocument.updatedAt,
    };
  }

  private toPublicUser(user: UserSearchRecord): PublicUser {
    return {
      id: user._id.toString(),
      name: user.name,
      imageUrl: user.imageUrl ?? null,
    };
  }
}
