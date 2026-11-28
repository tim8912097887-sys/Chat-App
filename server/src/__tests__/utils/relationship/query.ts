import { FriendshipDocument } from '../../../domain/relationship/friendships.model.js';
import { friendshipModel } from '../common/query.js';
import { buildFriendshipSeedData, buildPairKey, CreateFriendshipSeedOptions } from './factory.js';

export async function insertFriendship(
  options: CreateFriendshipSeedOptions,
): Promise<FriendshipDocument> {
  const seed = buildFriendshipSeedData(options);

  const doc = await friendshipModel.create({
    _id: seed.id,
    requestedBy: seed.requestedBy,
    recipient: seed.recipient,
    status: seed.status,
    pairKey: seed.pairKey,
  });

  if (seed.updatedAt) {
    await friendshipModel.updateOne({ _id: seed.id }, { $set: { updatedAt: seed.updatedAt } });
    const updated = await findFriendshipById(seed.id);
    if (updated) return updated;
  }

  return doc.toObject();
}

export async function findFriendshipById(id: string): Promise<FriendshipDocument | null> {
  return friendshipModel.findById(id).lean<FriendshipDocument>().exec();
}

export async function findFriendshipByUsers(
  userAId: string,
  userBId: string,
): Promise<FriendshipDocument | null> {
  return friendshipModel
    .findOne({ pairKey: buildPairKey(userAId, userBId) })
    .lean<FriendshipDocument>()
    .exec();
}

export async function findAllFriendships(): Promise<FriendshipDocument[]> {
  return friendshipModel.find({}).lean<FriendshipDocument[]>().exec();
}

export async function deleteFriendshipById(id: string): Promise<void> {
  await friendshipModel.deleteOne({ _id: id }).exec();
}
