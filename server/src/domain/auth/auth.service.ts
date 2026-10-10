import { randomUUID } from "node:crypto";
import type { UserService } from "../user/user.service.js";
import type { User } from "../user/user.types.js";
import type { PasswordHasher } from "./util/password-hasher.js";
import { SignupInput } from "./dto/signup.js";
import { LoginInput } from "./dto/login.js";
import { InvalidCredentialError } from "./error/invalid-credential.js";
import { InvalidTokenError } from "./error/invalid-token.js";
import { LoginLockedError } from "./error/login-locked.js";
import { TokenPayload, TokenService } from "./util/token-validator.js";
import { AuthTokens } from "./dto/token.js";

export interface AuthServiceOptions {
  maxLoginAttempts: number;
  lockDurationMs: number;
}

export class AuthService {
  private dummyHash: string | undefined;

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasher,
    private readonly options: AuthServiceOptions,
  ) {}

  /**
   * Always resolves the same way whether or not the email already exists,
   * so the endpoint can't be used to enumerate accounts.
   */
  async signup(input: SignupInput): Promise<void> {
    // Hash first so response time doesn't reveal whether the email exists.
    const passwordHash = await this.passwordHasher.hash(input.password);
    await this.userService.register({
      name: input.name,
      email: input.email,
      passwordHash,
      imageUrl: input.imageUrl,
    });
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.userService.findByEmail(input.email);

    if (!user || user.status !== "ACTIVE") {
      await this.burnPasswordCheck(input.password);
      throw new InvalidCredentialError("Email or password is incorrect.");
    }

    const now = new Date();
    if (user.loginLockedAt) {
      const unlockAt =
        user.loginLockedAt.getTime() + this.options.lockDurationMs;
      if (now.getTime() < unlockAt)
        throw new LoginLockedError("Account locked.");
      // Lock expired: start from a clean slate.
      await this.userService.clearLoginState(user.id);
    }

    const passwordOk = await this.passwordHasher.verify(
      input.password,
      user.passwordHash,
    );
    if (!passwordOk) {
      const { locked } = await this.userService.registerFailedLogin(user.id, {
        maxAttempts: this.options.maxLoginAttempts,
        lockedAt: now,
      });
      throw locked
        ? new LoginLockedError("Account locked.")
        : new InvalidCredentialError("Email or password is incorrect.");
    }

    if (user.loginAttempt > 0 && !user.loginLockedAt) {
      await this.userService.clearLoginState(user.id);
    }

    return this.issueTokens(user);
  }

  async refresh(token: TokenPayload): Promise<AuthTokens> {
    const user = await this.requireValidSession(token);
    return this.issueTokens(user);
  }

  async logout(token: TokenPayload): Promise<void> {
    await this.requireValidSession(token);
  }

  async logoutAll(token: TokenPayload): Promise<void> {
    const user = await this.requireValidSession(token);
    await this.userService.revokeAllTokens(user.id);
  }

  /** The user must exist, be active, and the token must carry the current token version. */
  private async requireValidSession(token: TokenPayload): Promise<User> {
    const user = await this.userService.findById(token.userId);
    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.tokenVersion !== token.tokenVersion
    ) {
      throw new InvalidTokenError("Invalid token");
    }
    return user;
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      tokenVersion: user.tokenVersion,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ]);
    return { accessToken, refreshToken };
  }

  /** Spend roughly the same time as a real password check when the user doesn't exist. */
  private async burnPasswordCheck(password: string): Promise<void> {
    this.dummyHash ??= await this.passwordHasher.hash(randomUUID());
    await this.passwordHasher.verify(password, this.dummyHash);
  }
}
