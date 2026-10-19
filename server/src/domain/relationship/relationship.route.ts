import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  validateBody,
  validatePathParams,
  validateQueryParams,
} from '../../infrastructure/http/middleware/validate.js';
import {
  createFriendRequestSchema,
  friendRequestPathParamsSchema,
  friendRequestQuerySchema,
} from './dto/friend-request.js';
import type { RelationshipController } from './relationship.controller.js';

export const createRelationshipRouter = (deps: {
  controller: RelationshipController;
  accessTokenMiddleware: RequestHandler;
}): Router => {
  const { controller, accessTokenMiddleware } = deps;
  const router = Router();

  router.get(
    '/',
    accessTokenMiddleware,
    validateQueryParams(friendRequestQuerySchema),
    controller.getFriendRequests,
  );
  router.post(
    '/',
    accessTokenMiddleware,
    validateBody(createFriendRequestSchema),
    controller.createFriendRequest,
  );
  router.post(
    '/:requestId/accept',
    accessTokenMiddleware,
    validatePathParams(friendRequestPathParamsSchema),
    controller.acceptFriendRequest,
  );
  router.post(
    '/:requestId/reject',
    accessTokenMiddleware,
    validatePathParams(friendRequestPathParamsSchema),
    controller.rejectFriendRequest,
  );

  return router;
};
