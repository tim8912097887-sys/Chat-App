import type { CookieOptions, Request, RequestHandler, Response } from 'express';
import type { AuthService } from './auth.service.js';
import { SignupInput } from './dto/signup.js';
import { LoginInput } from './dto/login.js';
import { InvalidTokenError } from './error/auth.js';
import { AuthDto, LoginResponseDto } from './dto/common.js';
import { RefreshCookieOptions } from './auth.types.js';
import { sendResponse } from '../shared/controller.js';

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookie: RefreshCookieOptions,
  ) {}

  signup: RequestHandler = async (req, res) => {
    const image = req.file;
    await this.authService.signup(
      req.validatedBody as SignupInput,
      image
        ? {
            buffer: image.buffer,
            mimetype: image.mimetype,
          }
        : undefined,
    );
    sendResponse(res, 201, { message: 'Signed up' });
  };

  login: RequestHandler = async (req, res) => {
    const authDto = await this.authService.login(req.validatedBody as LoginInput);
    this.sendTokens(res, authDto);
  };

  refresh: RequestHandler = async (req, res) => {
    const authDto = await this.authService.refresh(this.requireRefreshToken(req));
    this.sendTokens(res, authDto);
  };

  logout: RequestHandler = async (req, res) => {
    await this.authService.logout(this.requireRefreshToken(req));
    this.clearRefreshCookie(res);
    sendResponse(res, 200, { message: 'Logged out' });
  };

  logoutAll: RequestHandler = async (req, res) => {
    const token = this.requireRefreshToken(req);
    await this.authService.logoutAll({
      userId: token.userId,
      tokenVersion: token.tokenVersion,
    });
    this.clearRefreshCookie(res);
    sendResponse(res, 200, { message: 'Logged out all sessions' });
  };

  private requireRefreshToken(req: Request) {
    // Set by the refresh-token middleware; guards against the route being wired without it.
    if (!req.refreshToken) throw new InvalidTokenError('Missing refresh token');
    return req.refreshToken;
  }

  private sendTokens(res: Response, authDto: AuthDto): void {
    res.cookie(this.cookie.name, authDto.tokens.refreshToken, {
      ...this.baseCookieOptions(),
      maxAge: this.cookie.maxAgeMs,
    });
    const response: LoginResponseDto = {
      accessToken: authDto.tokens.accessToken,
      user: authDto.user,
    };
    sendResponse(res, 200, response);
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.cookie.name, this.baseCookieOptions());
  }

  private baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookie.secure,
      sameSite: 'lax',
      path: this.cookie.path,
    };
  }
}
