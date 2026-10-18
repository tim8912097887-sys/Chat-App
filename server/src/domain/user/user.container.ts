import { registerUserModel } from './user.model.js';
import { MongoUserRepository } from './user.repository.js';
import type { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { createAccessTokenMiddleware } from '../../infrastructure/http/middleware/access-token.js';
import { TokenService } from '../auth/util/token-validator.js';
import { RequestHandler } from 'express';
import { registerFriendshipsModel } from '../relationship/friendships.model.js';
import { MongoRelationshipRepository } from '../relationship/relationship.repository.js';
import type { RelationshipRepository } from '../relationship/relationship.repository.js';

export interface UserContainer {
  userRepository: UserRepository;
  relationshipRepository: RelationshipRepository;
  userService: UserService;
  userController: UserController;
  accessTokenMiddleware: RequestHandler;
}

export interface UserContainerDeps {
  tokenService: TokenService;
}

export const createUserContainer = (deps: UserContainerDeps): UserContainer => {
  const { tokenService } = deps;
  const userModel = registerUserModel();
  const userRepository = new MongoUserRepository(userModel);
  const relationshipRepository = new MongoRelationshipRepository(registerFriendshipsModel());
  const userService = new UserService(userRepository, relationshipRepository);
  const userController = new UserController(userService);
  const accessTokenMiddleware = createAccessTokenMiddleware({ tokenService });
  return { userRepository, relationshipRepository, userService, userController, accessTokenMiddleware };
};
