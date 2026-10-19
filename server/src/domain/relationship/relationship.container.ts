import type { RequestHandler } from 'express';
import { createAccessTokenMiddleware } from '../../infrastructure/http/middleware/access-token.js';
import type { TokenService } from '../auth/util/token-validator.js';
import type { UserRepository } from '../user/user.repository.js';
import { registerFriendshipsModel } from './friendships.model.js';
import { RelationshipController } from './relationship.controller.js';
import { MongoRelationshipRepository } from './relationship.repository.js';
import type { RelationshipRepository } from './relationship.repository.js';
import { RelationshipService } from './relationship.service.js';

export interface RelationshipContainer {
  relationshipRepository: RelationshipRepository;
  relationshipService: RelationshipService;
  relationshipController: RelationshipController;
  accessTokenMiddleware: RequestHandler;
}

export interface RelationshipContainerDeps {
  userRepository: UserRepository;
  tokenService: TokenService;
}

export const createRelationshipContainer = (
  deps: RelationshipContainerDeps,
): RelationshipContainer => {
  const relationshipRepository = new MongoRelationshipRepository(registerFriendshipsModel());
  const relationshipService = new RelationshipService(relationshipRepository, deps.userRepository);
  const relationshipController = new RelationshipController(relationshipService);
  const accessTokenMiddleware = createAccessTokenMiddleware({ tokenService: deps.tokenService });

  return {
    relationshipRepository,
    relationshipService,
    relationshipController,
    accessTokenMiddleware,
  };
};
