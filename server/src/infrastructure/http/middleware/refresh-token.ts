import type { RequestHandler } from "express";
import { TokenService } from "../../../domain/auth/util/token-validator.js";
import { InvalidTokenError } from "../../../domain/auth/error/invalid-token.js";

export const createRefreshTokenMiddleware =
  (deps: { tokenService: TokenService; cookieName: string }): RequestHandler =>
  async (req, _res, next) => {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[deps.cookieName];

    if (typeof token !== "string" || token.length === 0) {
      throw new InvalidTokenError("Missing refresh token");
    }

    const payload = await deps.tokenService.verifyRefreshToken(token);
    if (!payload) throw new InvalidTokenError("Invalid refresh token");

    req.refreshToken = { ...payload, refreshToken: token };
    next();
  };
