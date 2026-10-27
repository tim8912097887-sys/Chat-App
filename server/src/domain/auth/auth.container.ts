import type { RequestHandler } from 'express';
import type { UserService } from '../user/user.service.js';
import type { PasswordHasher } from './util/password-hasher.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { TokenService } from './util/token-validator.js';
import { createRefreshTokenMiddleware } from '../../infrastructure/http/middleware/refresh-token.js';
import { AppConfig } from '../../config/env/index.js';
import { getRefreshTokenModel } from './auth.model.js';
import { MongoAuthRepository } from './auth.repository.js';
import { CloudinaryImageStorage } from './image.service.js';
import { PresenceService } from '../../realtime/presence.service.js';

export interface AuthContainer {
  authService: AuthService;
  authController: AuthController;
  refreshTokenMiddleware: RequestHandler;
}

export interface AuthContainerDeps {
  config: AppConfig;
  userService: UserService;
  tokenService: TokenService;
  passwordHasher: PasswordHasher;
  presenceService: PresenceService;
}

export const createAuthContainer = (deps: AuthContainerDeps): AuthContainer => {
  const { config, userService, tokenService, passwordHasher, presenceService } = deps;
  const authRepository = new MongoAuthRepository(getRefreshTokenModel());

  const imageService = new CloudinaryImageStorage();
  const authService = new AuthService(
    userService,
    imageService,
    authRepository,
    tokenService,
    passwordHasher,
    {
      maxLoginAttempts: config.auth.maxLoginAttempts,
      lockDurationMs: config.auth.lockDurationMs,
      refreshTtlSeconds: config.jwt.refreshTtlSeconds,
    },
    presenceService,
  );

  const authController = new AuthController(authService, {
    name: config.auth.refreshCookieName,
    path: config.auth.refreshCookiePath,
    secure: config.isProduction,
    maxAgeMs: config.jwt.refreshTtlSeconds * 1000,
  });

  const refreshTokenMiddleware = createRefreshTokenMiddleware({
    tokenService,
    cookieName: config.auth.refreshCookieName,
  });

  return { authService, authController, refreshTokenMiddleware };
};
