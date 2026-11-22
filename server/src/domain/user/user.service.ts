import { MAX_SEARCH_CODE_RETRIES } from './user.constants.js';
import { UserDocument } from './user.model.js';
import type { UserRepository } from './user.repository.js';
import type { RelationshipRepository } from '../relationship/relationship.repository.js';
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
import { RealtimeEventPublisher } from '../../realtime/realtime-event-publisher.js';
import type { RelationshipState } from '../relationship/relationship.constants.js';
import { RELATIONSHIP_STATE } from '../relationship/relationship.constants.js';

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly relationshipRepository: RelationshipRepository,
    private readonly realtimeEvents: RealtimeEventPublisher,
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

  async searchActiveBySearchCode(
    identity: UserIdentity,
    searchCode: string,
  ): Promise<{ user: PublicUser; state: RelationshipState } | null> {
    const user = await this.userRepository.findActiveBySearchCode(searchCode);
    if (!user) return null;

    let state: RelationshipState = RELATIONSHIP_STATE.NONE;
    if (identity.userId === user._id) {
      state = RELATIONSHIP_STATE.SELF;
    } else {
      const relationship = await this.relationshipRepository.findByUsers(identity.userId, user._id);
      if (relationship?.status === 'ACCEPTED') {
        state = RELATIONSHIP_STATE.FRIEND;
      } else if (relationship?.status === 'PENDING') {
        state =
          relationship.requestedBy === identity.userId
            ? RELATIONSHIP_STATE.INVITE
            : RELATIONSHIP_STATE.RECIPIENT;
      }
    }
    return {
      user: this.toPublicUser(user),
      state,
    };
  }

  async searchFriendsByName(
    identity: UserIdentity,
    pagination: PaginationOptions,
  ): Promise<(PublicUser & { isOnline: boolean })[]> {
    const relationships = await this.relationshipRepository.findFriendsByUserId(identity.userId);
    const friendsId = relationships.map((relationship) =>
      relationship.requestedBy === identity.userId
        ? relationship.recipient
        : relationship.requestedBy,
    );

    if (friendsId.length === 0) return [];
    const users = await this.userRepository.searchFriendByName(friendsId, {
      name: pagination.name,
      page: (pagination.page - 1) * pagination.limit,
      limit: pagination.limit,
    });

    const userDto = [];

    for (const user of users) {
      const isOnline = await this.realtimeEvents.isUserOnline(user._id.toString());
      userDto.push({
        ...this.toPublicUser(user),
        isOnline,
      });
    }
    return userDto;
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
      id: userDocument._id.toString(),
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
