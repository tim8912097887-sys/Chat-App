import { hashPassword } from '../../../domain/auth/util/password-hasher.js';
import { UserDocument } from '../../../domain/user/user.model.js';
import { TEST_PASSWORD_HASH_COST } from '../auth/constants.js';
import { userModel } from '../common/query.js';
import { buildUserSeedData, CreateUserSeedOptions } from './factory.js';

export async function insertUser(options: CreateUserSeedOptions = {}): Promise<UserDocument> {
  const seed = buildUserSeedData(options);
  const passwordHash = await hashPassword(seed.password, TEST_PASSWORD_HASH_COST);

  const doc = await userModel.create({
    _id: seed.id,
    name: seed.name,
    email: seed.email,
    passwordHash,
    imageUrl: seed.imageUrl,
    searchCode: seed.searchCode,
    status: seed.status,
    tokenVersion: seed.tokenVersion,
  });

  return doc.toObject();
}

export async function findUserByEmail(email: string): Promise<UserDocument | null> {
  return userModel.findOne({ email: email.trim().toLowerCase() }).lean().exec();
}

export async function findUserById(id: string): Promise<UserDocument | null> {
  return userModel.findById(id).lean().exec();
}

export async function findAllUsers(): Promise<UserDocument[]> {
  return userModel.find({}).lean().exec();
}

export async function deleteUserById(id: string): Promise<void> {
  await userModel.deleteOne({ _id: id }).exec();
}

export async function updateUserStatusRaw(userId: string, status: string): Promise<void> {
  await userModel.updateOne({ _id: userId }, { status });
}
