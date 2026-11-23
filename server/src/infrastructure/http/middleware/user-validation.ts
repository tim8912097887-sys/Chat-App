import { RequestHandler } from 'express';
import {
  InvalidUserTokenError,
  UserNotActiveError,
  UserNotExistError,
} from '../../../domain/user/error/user.js';
import { UserRepository } from '../../../domain/user/user.repository.js';
import { InvalidTokenError } from '../../../domain/auth/error/auth.js';

export const createUserValidationMiddleware =
  (deps: { userRepository: UserRepository }): RequestHandler =>
  async (req, _res, next) => {
    if (!req.accessToken) {
      throw new InvalidTokenError('Missing access token');
    }

    const { userId, tokenVersion } = req.accessToken;
    const user = await deps.userRepository.findById(userId);
    if (!user) {
      throw new UserNotExistError(userId);
    }
    if (user.status !== 'ACTIVE') {
      throw new UserNotActiveError(userId);
    }
    if (user.tokenVersion !== tokenVersion) {
      throw new InvalidUserTokenError('Token version conflict');
    }

    req.user = user;
    next();
  };
