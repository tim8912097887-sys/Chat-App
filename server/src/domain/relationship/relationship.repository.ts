import { isDuplicateKeyError } from '../../shared/utils/error.js';
import { FriendshipAlreadyExistError } from './error/friendship-already-exist.js';
import { FriendshipDocument, FriendshipModel } from './friendships.model.js';
import type { FriendRequestPagination } from './relationship.types.js';

export interface RelationshipRepository {
  findFriendsByUserId(id: string): Promise<FriendshipDocument[]>;
  findFriendRequests(
    userId: string,
    pagination: FriendRequestPagination,
  ): Promise<FriendshipDocument[]>;
  findByUsers(pairKey: string): Promise<FriendshipDocument | null>;
  findPendingRequestById(requestId: string): Promise<FriendshipDocument | null>;
  createFriendRequest(
    requesterId: string,
    recipientId: string,
    pairKey: string,
  ): Promise<FriendshipDocument>;
  reopenRejectedRequest(requestId: string, requesterId: string): Promise<boolean>;
  updatePendingRequestStatus(requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<boolean>;
}

export class MongoRelationshipRepository implements RelationshipRepository {
  constructor(private readonly friendshipModel: FriendshipModel) {}

  async findFriendsByUserId(id: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({ userIds: id, status: 'ACCEPTED' })
      .select({ userIds: 1 })
      .sort({ updatedAt: -1, _id: 1 })
      .exec();
  }

  async findFriendRequests(
    userId: string,
    pagination: FriendRequestPagination,
  ): Promise<FriendshipDocument[]> {
    const filter =
      pagination.direction === 'incoming'
        ? { userIds: userId, requestedBy: { $ne: userId }, status: 'PENDING' as const }
        : { userIds: userId, requestedBy: userId, status: 'PENDING' as const };

    return this.friendshipModel
      .find(filter)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .exec();
  }

  async findByUsers(pairKey: string): Promise<FriendshipDocument | null> {
    return this.friendshipModel.findOne({ pairKey }).exec();
  }

  async findPendingRequestById(requestId: string): Promise<FriendshipDocument | null> {
    return this.friendshipModel.findOne({ _id: requestId, status: 'PENDING' }).exec();
  }

  async createFriendRequest(
    requesterId: string,
    recipientId: string,
    pairKey: string,
  ): Promise<FriendshipDocument> {
    try {
      const friendship = await this.friendshipModel.create({
        userIds: [requesterId, recipientId],
        requestedBy: requesterId,
        status: 'PENDING',
        pairKey,
      });

      return friendship;
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new FriendshipAlreadyExistError('A friend request or friendship already exists');
      }
      throw err;
    }
  }

  async reopenRejectedRequest(requestId: string, requesterId: string): Promise<boolean> {
    const result = await this.friendshipModel
      .updateOne(
        { _id: requestId, status: 'REJECTED' },
        { $set: { requestedBy: requesterId, status: 'PENDING' } },
      )
      .exec();
    return result.modifiedCount > 0;
  }

  async updatePendingRequestStatus(
    requestId: string,
    status: 'ACCEPTED' | 'REJECTED',
  ): Promise<boolean> {
    const result = await this.friendshipModel
      .updateOne({ _id: requestId, status: 'PENDING' }, { $set: { status } })
      .exec();
    return result.modifiedCount > 0;
  }
}
