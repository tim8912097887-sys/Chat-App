import { FriendshipDocument, FriendshipModel } from './friendships.model.js';

export interface RelationshipRepository {
  findById(id: string): Promise<FriendshipDocument[]>;
}

export class MongoRelationshipRepository implements RelationshipRepository {
  constructor(private readonly friendshipModel: FriendshipModel) {}

  async findById(id: string): Promise<FriendshipDocument[]> {
    return this.friendshipModel
      .find({ userIds: id, status: 'ACCEPTED' })
      .select({ userIds: 1 })
      .exec();
  }
}
