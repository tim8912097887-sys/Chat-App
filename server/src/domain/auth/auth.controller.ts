import type { CookieOptions, Request, RequestHandler, Response } from "express";
import type { AuthService } from "./auth.service.js";
import { SignupInput } from "./dto/signup.js";
import { LoginInput } from "./dto/login.js";
import { successResponse } from "../../shared/http/success.js";
import { InvalidTokenError } from "./error/invalid-token.js";
import { AuthTokens } from "./dto/token.js";

export interface RefreshCookieOptions {
  name: string;
  path: string;
  secure: boolean;
  maxAgeMs: number;
}

export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookie: RefreshCookieOptions,
  ) {}

  signup: RequestHandler = async (req, res) => {
    await this.authService.signup(req.body as SignupInput);
    this.sendResponse(res, 200, { message: "Signed up" });
  };

  login: RequestHandler = async (req, res) => {
    const tokens = await this.authService.login(req.body as LoginInput);
    this.sendTokens(res, tokens);
  };

  refresh: RequestHandler = async (req, res) => {
    const tokens = await this.authService.refresh(
      this.requireRefreshToken(req),
    );
    this.sendTokens(res, tokens);
  };

  logout: RequestHandler = async (req, res) => {
    await this.authService.logout(this.requireRefreshToken(req));
    this.clearRefreshCookie(res);
    this.sendResponse(res, 200, { message: "Logged out" });
  };

  logoutAll: RequestHandler = async (req, res) => {
    await this.authService.logoutAll(this.requireRefreshToken(req));
    this.clearRefreshCookie(res);
    this.sendResponse(res, 200, { message: "Logged out all sessions" });
  };

  private requireRefreshToken(req: Request) {
    // Set by the refresh-token middleware; guards against the route being wired without it.
    if (!req.refreshToken) throw new InvalidTokenError("Missing refresh token");
    return req.refreshToken;
  }

  private sendTokens(res: Response, tokens: AuthTokens): void {
    res.cookie(this.cookie.name, tokens.refreshToken, {
      ...this.baseCookieOptions(),
      maxAge: this.cookie.maxAgeMs,
    });
    this.sendResponse(res, 200, tokens);
  }

  private sendResponse<T>(res: Response, status: number, data: T): void {
    res.status(status).json(successResponse(data));
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(this.cookie.name, this.baseCookieOptions());
  }

  private baseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.cookie.secure,
      sameSite: "lax",
      path: this.cookie.path,
    };
  }
}
