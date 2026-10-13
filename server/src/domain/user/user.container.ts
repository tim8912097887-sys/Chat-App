import { registerUserModel } from './user.model.js';
import { MongoUserRepository } from './user.repository.js';
import type { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';

export interface UserContainer {
  userRepository: UserRepository;
  userService: UserService;
}

export const createUserContainer = (): UserContainer => {
  const userModel = registerUserModel();
  const userRepository = new MongoUserRepository(userModel);
  const userService = new UserService(userRepository);
  return { userRepository, userService };
};
