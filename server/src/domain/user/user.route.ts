import { RequestHandler, Router } from 'express';
import type { UserController } from './user.controller.js';
import { friendSearchQuerySchema, searchCodeQuerySchema } from './dto/query-params.js';
import { validateQueryParams } from '../../infrastructure/http/middleware/validate.js';

export const createUserRouter = (deps: {
  controller: UserController;
  accessTokenMiddleware: RequestHandler;
}): Router => {
  const { controller, accessTokenMiddleware } = deps;
  const router = Router();

  router.get('/search', validateQueryParams(searchCodeQuerySchema), controller.search);
  router.get(
    '/friend/search',
    accessTokenMiddleware,
    validateQueryParams(friendSearchQuerySchema),
    controller.searchFriends,
  );

  return router;
};
