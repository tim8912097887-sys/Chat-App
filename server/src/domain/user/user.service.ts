import { MAX_SEARCH_CODE_RETRIES } from './user.constants.js';
import { UserDocument } from './user.model.js';
import type { UserRepository } from './user.repository.js';
import type { RelationshipRepository } from '../relationship/relationship.repository.js';
import type {
  CreateUserInput,
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
import type { SearchUserResponseDto } from './dto/search.js';
import type { SearchFriendResponseDto } from './dto/search-friends.js';

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
  ): Promise<SearchUserResponseDto | null> {
    const user = await this.userRepository.findActiveBySearchCode(searchCode);
    if (!user) return null;

    let state: RelationshipState = RELATIONSHIP_STATE.NONE;
    if (identity.userId === user._id) {
      state = RELATIONSHIP_STATE.SELF;
    } else {
      const pairKey = [identity.userId, user._id.toString()].sort().join(':');
      const relationship = await this.relationshipRepository.findByPairKey(pairKey);
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
  ): Promise<SearchFriendResponseDto[]> {
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
