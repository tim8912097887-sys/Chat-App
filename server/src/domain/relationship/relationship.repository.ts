import { randomUUID } from 'node:crypto';
import { isDuplicateKeyError } from '../../shared/utils/error.js';
import { FriendshipAlreadyExistError } from './error/relationship.js';
import { FriendshipDocument, FriendshipModel } from './friendships.model.js';
import { FriendRequestQuery } from './dto/get-friend-requests.js';

export interface RelationshipRepository {
  findFriendsByUserId(id: string): Promise<FriendshipDocument[]>;
  findFriendRequests(userId: string, pagination: FriendRequestQuery): Promise<FriendshipDocument[]>;
  findByUsers(userId: string, otherUserId: string): Promise<FriendshipDocument | null>;
  findPendingRequestByUsers(
    requesterId: string,
    recipientId: string,
  ): Promise<FriendshipDocument | null>;
  createFriendRequest(
    requesterId: string,
    recipientId: string,
    pairKey: string,
  ): Promise<FriendshipDocument>;
  reopenRejectedRequest(
    requestId: string,
    requesterId: string,
    recipientId: string,
  ): Promise<FriendshipDocument | null>;
  updatePendingRequestStatus(requestId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<boolean>;
}

export class MongoRelationshipRepository implements RelationshipRepository {
  constructor(private readonly friendshipModel: FriendshipModel) {}

  async findFriendsByUserId(id: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({ $or: [{ requestedBy: id }, { recipient: id }], status: 'ACCEPTED' })
      .select({ requestedBy: 1, recipient: 1 })
      .sort({ updatedAt: -1, _id: 1 })
      .exec();
  }

  async findFriendRequests(
    userId: string,
    pagination: FriendRequestQuery,
  ): Promise<FriendshipDocument[]> {
    const filter =
      pagination.direction === 'incoming'
        ? { recipient: userId, status: 'PENDING' as const }
        : { requestedBy: userId, status: 'PENDING' as const };

    return this.friendshipModel
      .find(filter)
      .sort({ updatedAt: -1, _id: 1 })
      .skip((pagination.page - 1) * pagination.limit)
      .limit(pagination.limit)
      .exec();
  }

  async findByUsers(userId: string, otherUserId: string): Promise<FriendshipDocument | null> {
    return this.friendshipModel
      .findOne({
        $or: [
          { requestedBy: userId, recipient: otherUserId },
          { requestedBy: otherUserId, recipient: userId },
        ],
      })
      .exec();
  }

  async findPendingRequestByUsers(
    requesterId: string,
    recipientId: string,
  ): Promise<FriendshipDocument | null> {
    return this.friendshipModel
      .findOne({ requestedBy: requesterId, recipient: recipientId, status: 'PENDING' })
      .exec();
  }

  async createFriendRequest(
    requesterId: string,
    recipientId: string,
    pairKey: string,
  ): Promise<FriendshipDocument> {
    try {
      const friendship = await this.friendshipModel.create({
        _id: randomUUID(),
        requestedBy: requesterId,
        recipient: recipientId,
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

  async reopenRejectedRequest(
    requestId: string,
    requesterId: string,
    recipientId: string,
  ): Promise<FriendshipDocument | null> {
    const result = await this.friendshipModel
      .findOneAndUpdate(
        { _id: requestId, status: 'REJECTED' },
        { $set: { requestedBy: requesterId, recipient: recipientId, status: 'PENDING' } },
        { new: true }, // Returns the updated document
      )
      .exec();
    return result;
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
