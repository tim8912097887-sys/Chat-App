import type { RequestHandler } from 'express';
import { TokenService } from '../../../domain/auth/util/token-validator.js';
import { InvalidTokenError } from '../../../domain/auth/error/invalid-token.js';

export const createAccessTokenMiddleware =
  (deps: { tokenService: TokenService }): RequestHandler =>
  async (req, _res, next) => {
    const bearer = req.headers.authorization?.split(' ');

    if (!bearer || bearer[0] !== 'Bearer' || bearer.length !== 2) {
      throw new InvalidTokenError('Missing access token');
    }

    const token = bearer[1];

    const payload = await deps.tokenService.verifyAccessToken(token);
    if (!payload) throw new InvalidTokenError('Invalid refresh token');

    req.accessToken = { ...payload };
    next();
  };
