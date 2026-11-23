import type { RequestHandler } from 'express';
import { ConversationRepository, MongoConversationRepository } from './conversation.repository.js';
import { ConversationService } from './conversation.service.js';
import { ConversationController } from './conversation.controller.js';
import { RelationshipRepository } from '../relationship/relationship.repository.js';
import { UserRepository } from '../user/user.repository.js';
import { TokenService } from '../auth/util/token-validator.js';
import { RealtimeEventPublisher } from '../../realtime/realtime-event-publisher.js';
import { registerChatGroupsModel } from './chat-group.model.js';
import { createAccessTokenMiddleware } from '../../infrastructure/http/middleware/access-token.js';
import { createUserValidationMiddleware } from '../../infrastructure/http/middleware/user-validation.js';

export interface ConversationContainer {
  conversationRepository: ConversationRepository;
  conversationService: ConversationService;
  conversationController: ConversationController;
  accessTokenMiddleware: RequestHandler;
  userValidationMiddleware: RequestHandler;
}

export interface ConversationContainerDeps {
  relationshipRepository: RelationshipRepository;
  userRepository: UserRepository;
  tokenService: TokenService;
  realtimeEvents: RealtimeEventPublisher;
}

export const createConversationContainer = (
  deps: ConversationContainerDeps,
): ConversationContainer => {
  const conversationRepository = new MongoConversationRepository(registerChatGroupsModel());

  const conversationService = new ConversationService(
    conversationRepository,
    deps.relationshipRepository,
    deps.userRepository,
    deps.realtimeEvents,
  );

  const conversationController = new ConversationController(conversationService);

  const accessTokenMiddleware = createAccessTokenMiddleware({
    tokenService: deps.tokenService,
  });

  const userValidationMiddleware = createUserValidationMiddleware({
    userRepository: deps.userRepository,
  });

  return {
    conversationRepository,
    conversationService,
    conversationController,
    accessTokenMiddleware,
    userValidationMiddleware,
  };
};
