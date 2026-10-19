import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import { successResponse } from './shared/http/success.js';
import { corsConfig } from './config/cors/cors.js';
import { notFoundHandler } from './infrastructure/http/middleware/not-found-handler.js';
import { errorHandler } from './infrastructure/http/middleware/error-handler.js';
import { AppContainer } from './container.js';
import { createAuthRouter } from './domain/auth/auth.route.js';
import { createUserRouter } from './domain/user/user.route.js';
import { createRelationshipRouter } from './domain/relationship/relationship.route.js';

export const createApp = (container: AppContainer): Express => {
  const app = express();

  app.use(helmet());
  app.use(cors(corsConfig));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json(successResponse({ uptime: process.uptime() }));
  });

  // Routes
  app.use(
    '/api/v1/auth',
    createAuthRouter({
      controller: container.auth.authController,
      refreshTokenMiddleware: container.auth.refreshTokenMiddleware,
    }),
  );
  app.use(
    '/api/v1/users',
    createUserRouter({
      controller: container.user.userController,
      accessTokenMiddleware: container.user.accessTokenMiddleware,
    }),
  );
  app.use(
    '/api/v1/friend-requests',
    createRelationshipRouter({
      controller: container.relationship.relationshipController,
      accessTokenMiddleware: container.relationship.accessTokenMiddleware,
    }),
  );

  app.use(errorHandler);
  app.use(notFoundHandler);

  return app;
};
