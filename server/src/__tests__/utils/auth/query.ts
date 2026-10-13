import { getRefreshTokenModel } from "../../../domain/auth/auth.model.js";
import { MongoAuthRepository } from "../../../domain/auth/auth.repository.js";
import { registerUserModel } from "../../../domain/user/user.model.js";
import { MongoUserRepository } from "../../../domain/user/user.repository.js";

export const authModel = getRefreshTokenModel();

export const userModel = registerUserModel();

export async function truncateAuthAndUser() {
  await Promise.all([authModel.deleteMany(), userModel.deleteMany()]);
}

export const userRepository = new MongoUserRepository(userModel);

export const authRepository = new MongoAuthRepository(authModel);
