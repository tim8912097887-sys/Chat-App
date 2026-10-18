import { getRefreshTokenModel } from '../../../domain/auth/auth.model.js';
import { MongoAuthRepository } from '../../../domain/auth/auth.repository.js';
import { registerFriendshipsModel } from '../../../domain/relationship/friendships.model.js';
import { registerUserModel } from '../../../domain/user/user.model.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';

export const authModel = getRefreshTokenModel();

export const userModel = registerUserModel();

export const friendshipModel = registerFriendshipsModel();

export async function truncateAll() {
  await Promise.all([authModel.deleteMany(), userModel.deleteMany(), friendshipModel.deleteMany()]);
}

export const userRepository = new MongoUserRepository(userModel);

export const authRepository = new MongoAuthRepository(authModel);
