import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  validateBody,
  validateQueryParams,
} from '../../infrastructure/http/middleware/validate.js';
import {
  createFriendRequestSchema,
  friendRequestQuerySchema,
  updateFriendRequestSchema,
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
    '/accept',
    accessTokenMiddleware,
    validateBody(updateFriendRequestSchema),
    controller.acceptFriendRequest,
  );
  router.post(
    '/reject',
    accessTokenMiddleware,
    validateBody(updateFriendRequestSchema),
    controller.rejectFriendRequest,
  );

  return router;
};
