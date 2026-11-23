import { Router, type RequestHandler } from 'express';
import { ConversationController } from './conversation.controller.js';
import {
  validateBody,
  validatePathParams,
  validateQueryParams,
} from '../../infrastructure/http/middleware/validate.js';
import { conversationMemberParamsSchema, conversationParamsSchema } from './dto/common.js';
import { createConversationBodySchema } from './dto/create-conversation.js';
import { updateConversationBodySchema } from './dto/update-conversation.js';
import { addConversationMemberBodySchema } from './dto/invite-member.js';
import { updateConversationMemberRoleBodySchema } from './dto/update-member-role.js';
import { getConversationsQuerySchema } from './dto/get-conversations.js';

export const createConversationRouter = (deps: {
  controller: ConversationController;
  accessTokenMiddleware: RequestHandler;
  userValidationMiddleware: RequestHandler;
}): Router => {
  const { controller, accessTokenMiddleware, userValidationMiddleware } = deps;
  const router = Router();

  router.post(
    '/',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateBody(createConversationBodySchema),
    controller.createConversation,
  );

  router.get(
    '/',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateQueryParams(getConversationsQuerySchema),
    controller.getConversations,
  );

  router.get(
    '/:conversationId',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationParamsSchema),
    controller.getConversationDetails,
  );

  router.patch(
    '/:conversationId',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationParamsSchema),
    validateBody(updateConversationBodySchema),
    controller.updateConversation,
  );

  router.delete(
    '/:conversationId',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationParamsSchema),
    controller.deleteConversation,
  );

  router.patch(
    '/:conversationId/members/:memberId',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationMemberParamsSchema),
    validateBody(updateConversationMemberRoleBodySchema),
    controller.updateMemberRole,
  );

  router.post(
    '/:conversationId/members',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationParamsSchema),
    validateBody(addConversationMemberBodySchema),
    controller.inviteMember,
  );

  router.delete(
    '/:conversationId/members/me',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationParamsSchema),
    controller.leaveConversation,
  );

  router.delete(
    '/:conversationId/members/:memberId',
    accessTokenMiddleware,
    userValidationMiddleware,
    validatePathParams(conversationMemberParamsSchema),
    controller.kickMember,
  );

  return router;
};
