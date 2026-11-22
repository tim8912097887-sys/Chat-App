import { RequestHandler } from 'express';
import { InvalidTokenError } from '../../../domain/auth/error/invalid-token.js';
import { UserRepository } from '../../../domain/user/user.repository.js';
import { InvalidUserTokenError } from '../../../domain/user/error/invalid-user-token.js';

export const createUserValidationMiddleware =
  (deps: { userRepository: UserRepository }): RequestHandler =>
  async (req, _res, next) => {
    if (!req.accessToken) {
      throw new InvalidTokenError('Missing access token');
    }

    const { userId, tokenVersion } = req.accessToken;
    const user = await deps.userRepository.findById(userId);
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== tokenVersion) {
      throw new InvalidUserTokenError('Invalid user token');
    }

    req.user = user;
    next();
  };
