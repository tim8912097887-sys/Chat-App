import { RequestHandler } from 'express';
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
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== tokenVersion) {
      throw new InvalidTokenError('Invalid token');
    }

    req.user = user;
    next();
  };
