import { Router } from 'express';
import type { RequestHandler } from 'express';
import {
  validateBody,
  validateQueryParams,
} from '../../infrastructure/http/middleware/validate.js';
import { friendRequestQuerySchema } from './dto/get-friend-requests.js';
import { createFriendRequestSchema } from './dto/create-friend-request.js';
import { updateFriendRequestSchema } from './dto/update-friend-request.js';
import type { RelationshipController } from './relationship.controller.js';

export const createRelationshipRouter = (deps: {
  controller: RelationshipController;
  accessTokenMiddleware: RequestHandler;
  userValidationMiddleware: RequestHandler;
}): Router => {
  const { controller, accessTokenMiddleware, userValidationMiddleware } = deps;
  const router = Router();

  router.get(
    '/',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateQueryParams(friendRequestQuerySchema),
    controller.getFriendRequests,
  );
  router.post(
    '/',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateBody(createFriendRequestSchema),
    controller.createFriendRequest,
  );
  router.post(
    '/accept',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateBody(updateFriendRequestSchema),
    controller.acceptFriendRequest,
  );
  router.post(
    '/reject',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateBody(updateFriendRequestSchema),
    controller.rejectFriendRequest,
  );

  return router;
};
