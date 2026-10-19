import { InvalidUserTokenError } from '../user/error/invalid-user-token.js';
import type { UserRepository } from '../user/user.repository.js';
import type {
  CreateFriendRequestInput,
  FriendRequestIdentity,
  FriendRequestListItem,
  FriendRequestPagination,
} from './relationship.types.js';
import type { RelationshipRepository } from './relationship.repository.js';
import { PublicUserRecord } from '../user/user.types.js';
import { SendFriendRequestToSelfError } from './error/send-friend-request-to-self.js';
import { FriendshipAlreadyExistError } from './error/friendship-already-exist.js';
import { InvalidFriendshipChangeError } from './error/invalid-friendship-change.js';

export class RelationshipService {
  constructor(
    private readonly relationshipRepository: RelationshipRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async getFriendRequests(
    identity: FriendRequestIdentity,
    pagination: FriendRequestPagination,
  ): Promise<FriendRequestListItem[]> {
    await this.getVerifiedActiveUser(identity.userId, identity.tokenVersion);
    const requests = await this.relationshipRepository.findFriendRequests(
      identity.userId,
      pagination,
    );
    const otherUserIds = requests.map((request) =>
      request.userIds.find((userId) => userId !== identity.userId),
    );
    const validOtherUserIds = otherUserIds.filter((id): id is string => id !== undefined);
    const users = await this.userRepository.findPublicUsersByIds(validOtherUserIds);
    const userMap = new Map<string, PublicUserRecord>(users.map((user) => [user._id, user]));

    return requests.flatMap((request, index) => {
      const otherUserId = otherUserIds[index];
      if (!otherUserId) return [];

      const user = userMap.get(otherUserId);
      if (!user) return [];

      return [
        {
          id: request._id.toString(),
          name: user.name,
          imageUrl: user.imageUrl ?? null,
        },
      ];
    });
  }

  async createFriendRequest(
    identity: FriendRequestIdentity,
    input: CreateFriendRequestInput,
  ): Promise<void> {
    await this.getVerifiedActiveUser(identity.userId, identity.tokenVersion);
    if (identity.userId === input.targetUserId) {
      throw new SendFriendRequestToSelfError('A user cannot send a friend request to themselves');
    }

    await this.getVerifiedActiveUser(input.targetUserId);

    const pairKey = [identity.userId, input.targetUserId].sort().join(':');

    const existing = await this.relationshipRepository.findByUsers(pairKey);
    if (existing) {
      if (existing.status === 'REJECTED') {
        const reopened = await this.relationshipRepository.reopenRejectedRequest(
          existing._id,
          identity.userId,
        );
        if (reopened) return;
      }
      throw new FriendshipAlreadyExistError('A friend request or friendship already exists');
    }

    await this.relationshipRepository.createFriendRequest(
      identity.userId,
      input.targetUserId,
      pairKey,
    );
  }

  async acceptFriendRequest(identity: FriendRequestIdentity, requestId: string): Promise<void> {
    await this.updateRequestStatus(identity, requestId, 'ACCEPTED');
  }

  async rejectFriendRequest(identity: FriendRequestIdentity, requestId: string): Promise<void> {
    await this.updateRequestStatus(identity, requestId, 'REJECTED');
  }

  private async updateRequestStatus(
    identity: FriendRequestIdentity,
    requestId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<void> {
    await this.getVerifiedActiveUser(identity.userId, identity.tokenVersion);
    const request = await this.relationshipRepository.findPendingRequestById(requestId);
    if (
      !request ||
      !request.userIds.includes(identity.userId) ||
      request.requestedBy === identity.userId
    ) {
      throw new InvalidFriendshipChangeError('Friend request is not available to this user');
    }

    await this.getVerifiedActiveUser(request.requestedBy);
    const updated = await this.relationshipRepository.updatePendingRequestStatus(requestId, status);
    if (!updated) throw new InvalidFriendshipChangeError('Friend request is no longer pending');
  }

  private async getVerifiedActiveUser(userId: string, tokenVersion?: number) {
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== 'ACTIVE') {
      throw new InvalidUserTokenError('Invalid user token');
    }
    if (tokenVersion !== undefined && user.tokenVersion !== tokenVersion) {
      throw new InvalidUserTokenError('Invalid user token');
    }
    return user;
  }
}
