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
import { RealtimeEventPublisher } from '../../realtime/realtime-event-publisher.js';
import { createRealtimeEvent } from '../../realtime/realtime.types.js';
import {
  FRIEND_REQUEST_ACCEPTED_EVENT,
  FRIEND_REQUEST_CREATED_EVENT,
  FRIEND_REQUEST_REJECTED_EVENT,
} from '../../realtime/realtime.constants.js';

export class RelationshipService {
  constructor(
    private readonly relationshipRepository: RelationshipRepository,
    private readonly userRepository: UserRepository,
    private readonly realtimeEvents: RealtimeEventPublisher,
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
          requestId: request._id.toString(),
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
    const requester = await this.getVerifiedActiveUser(identity.userId, identity.tokenVersion);
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
        if (reopened) {
          this.realtimeEvents.publishToUser(
            input.targetUserId,
            createRealtimeEvent(FRIEND_REQUEST_CREATED_EVENT, {
              requestId: reopened._id.toString(),
              requester: {
                id: requester._id.toString(),
                name: requester.name,
                imageUrl: requester.imageUrl ?? null,
              },
            }),
          );
          return;
        }
      }
      throw new FriendshipAlreadyExistError('A friend request or friendship already exists');
    }

    const friendRequest = await this.relationshipRepository.createFriendRequest(
      identity.userId,
      input.targetUserId,
      pairKey,
    );

    this.realtimeEvents.publishToUser(
      input.targetUserId,
      createRealtimeEvent(FRIEND_REQUEST_CREATED_EVENT, {
        requestId: friendRequest._id.toString(),
        requester: {
          id: requester._id.toString(),
          name: requester.name,
          imageUrl: requester.imageUrl ?? null,
        },
      }),
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
    const user = await this.getVerifiedActiveUser(identity.userId, identity.tokenVersion);
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

    const eventStatus =
      status === 'ACCEPTED' ? FRIEND_REQUEST_ACCEPTED_EVENT : FRIEND_REQUEST_REJECTED_EVENT;
    this.realtimeEvents.publishToUser(
      request.requestedBy,
      createRealtimeEvent(eventStatus, {
        requestId: request._id.toString(),
        actor: {
          id: user._id.toString(),
          name: user.name,
          imageUrl: user.imageUrl ?? null,
        },
      }),
    );
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
