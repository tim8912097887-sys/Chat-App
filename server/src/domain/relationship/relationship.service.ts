import type { UserRepository } from '../user/user.repository.js';
import type { FriendRequestIdentity } from './relationship.types.js';
import type { FriendRequestQuery, FriendRequestResponseDto } from './dto/get-friend-requests.js';
import type { RelationshipRepository } from './relationship.repository.js';
import type { PublicUserRecord } from '../user/user.types.js';
import type { UserDocument } from '../user/user.model.js';
import type { FriendshipDocument } from './friendships.model.js';
import {
  FriendshipAlreadyExistError,
  InvalidFriendshipChangeError,
  SendFriendRequestToSelfError,
} from './error/relationship.js';
import { RealtimeEventPublisher } from '../../realtime/realtime-event-publisher.js';
import { createRealtimeEvent } from '../../realtime/realtime.types.js';
import {
  FRIEND_REQUEST_ACCEPTED_EVENT,
  FRIEND_REQUEST_CREATED_EVENT,
  FRIEND_REQUEST_REJECTED_EVENT,
} from '../../realtime/realtime.constants.js';
import { UserNotActiveError, UserNotExistError } from '../user/error/user.js';
import { CreateFriendRequestBody } from './dto/create-friend-request.js';

export class RelationshipService {
  constructor(
    private readonly relationshipRepository: RelationshipRepository,
    private readonly userRepository: UserRepository,
    private readonly realtimeEvents: RealtimeEventPublisher,
  ) {}

  async getFriendRequests(
    identity: FriendRequestIdentity,
    pagination: FriendRequestQuery,
  ): Promise<FriendRequestResponseDto[]> {
    const requests = await this.relationshipRepository.findFriendRequests(
      identity.userId,
      pagination,
    );
    const otherUserIds = requests.map((request) =>
      request.requestedBy === identity.userId ? request.recipient : request.requestedBy,
    );
    const users = await this.userRepository.findPublicUsersByIds(otherUserIds);
    const userMap = new Map<string, PublicUserRecord>(users.map((user) => [user._id, user]));

    return requests.flatMap((request, index) => {
      const otherUserId = otherUserIds[index];
      if (!otherUserId) return [];

      const user = userMap.get(otherUserId);
      if (!user) return [];

      return [
        {
          requestId: request._id.toString(),
          userId: otherUserId,
          name: user.name,
          imageUrl: user.imageUrl ?? null,
        },
      ];
    });
  }

  async createFriendRequest(
    requester: UserDocument,
    input: CreateFriendRequestBody,
  ): Promise<void> {
    const requesterId = requester._id.toString();
    if (requesterId === input.targetUserId) {
      throw new SendFriendRequestToSelfError('A user cannot send a friend request to themselves');
    }

    const targetUser = await this.userRepository.findById(input.targetUserId);
    if (!targetUser) {
      throw new UserNotActiveError(input.targetUserId);
    }
    if (targetUser.status !== 'ACTIVE') {
      throw new UserNotExistError(input.targetUserId);
    }
    const pairKey = [requesterId, input.targetUserId].sort().join(':');

    const existing = await this.relationshipRepository.findByPairKey(pairKey);
    if (existing) {
      if (existing.status === 'REJECTED') {
        const reopened = await this.relationshipRepository.reopenRejectedRequest(
          existing._id,
          requesterId,
          input.targetUserId,
        );
        if (reopened) {
          this.realtimeEvents.publishToUser(
            input.targetUserId,
            createRealtimeEvent(FRIEND_REQUEST_CREATED_EVENT, {
              requestId: reopened._id.toString(),
              requester: {
                id: requesterId,
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
      requesterId,
      input.targetUserId,
      pairKey,
    );

    this.realtimeEvents.publishToUser(
      input.targetUserId,
      createRealtimeEvent(FRIEND_REQUEST_CREATED_EVENT, {
        requestId: friendRequest._id.toString(),
        requester: {
          id: requesterId,
          name: requester.name,
          imageUrl: requester.imageUrl ?? null,
        },
      }),
    );
  }

  async acceptFriendRequest(responseUser: UserDocument, requesterId: string): Promise<void> {
    await this.updateRequestStatus(responseUser, requesterId, 'ACCEPTED');
  }

  async rejectFriendRequest(responseUser: UserDocument, requesterId: string): Promise<void> {
    await this.updateRequestStatus(responseUser, requesterId, 'REJECTED');
  }

  private async updateRequestStatus(
    responseUser: UserDocument,
    requesterId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<void> {
    const pairKey = [requesterId, responseUser._id.toString()].sort().join(':');
    const request = await this.relationshipRepository.findPendingRequestByPairKey(pairKey);
    if (!request || request.requestedBy === responseUser._id.toString()) {
      throw new InvalidFriendshipChangeError('Friend request is not available to this user');
    }

    await this.completeRequestStatusUpdate(responseUser, request, status);
  }

  private async completeRequestStatusUpdate(
    user: UserDocument,
    request: FriendshipDocument,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<void> {
    const updated = await this.relationshipRepository.updatePendingRequestStatus(
      request._id,
      request.requestedBy,
      request.recipient,
      status,
    );
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
}
