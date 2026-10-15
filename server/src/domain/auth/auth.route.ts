import { Router } from 'express';
import type { RequestHandler } from 'express';
import type { AuthController } from './auth.controller.js';
import { signupSchema } from './dto/signup.js';
import { loginSchema } from './dto/login.js';
import { validateBody } from '../../infrastructure/http/middleware/validate.js';
import { uploadProfileImage } from '../../infrastructure/http/middleware/upload-profile-image.js';

export const createAuthRouter = (deps: {
  controller: AuthController;
  refreshTokenMiddleware: RequestHandler;
}): Router => {
  const { controller, refreshTokenMiddleware } = deps;
  const router = Router();

  router.post(
    '/signup',
    uploadProfileImage.single('image'),
    validateBody(signupSchema),
    controller.signup,
  );
  router.post('/login', validateBody(loginSchema), controller.login);
  router.post('/refresh', refreshTokenMiddleware, controller.refresh);
  router.post('/logout', refreshTokenMiddleware, controller.logout);
  router.post('/logout-all', refreshTokenMiddleware, controller.logoutAll);

  return router;
};
