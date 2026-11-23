import { RequestHandler, Router } from 'express';
import type { UserController } from './user.controller.js';
import { searchCodeQuerySchema } from './dto/search.js';
import { friendSearchQuerySchema } from './dto/search-friends.js';
import { validateQueryParams } from '../../infrastructure/http/middleware/validate.js';

export const createUserRouter = (deps: {
  controller: UserController;
  accessTokenMiddleware: RequestHandler;
  userValidationMiddleware: RequestHandler;
}): Router => {
  const { controller, accessTokenMiddleware, userValidationMiddleware } = deps;
  const router = Router();

  router.get('/profile', accessTokenMiddleware, userValidationMiddleware, controller.profile);
  router.get(
    '/search',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateQueryParams(searchCodeQuerySchema),
    controller.search,
  );
  router.get(
    '/friend/search',
    accessTokenMiddleware,
    userValidationMiddleware,
    validateQueryParams(friendSearchQuerySchema),
    controller.searchFriends,
  );

  return router;
};
