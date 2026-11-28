import { createHash, randomUUID } from 'node:crypto';
import type { UserService } from '../user/user.service.js';
import type { User } from '../user/user.types.js';
import type { AuthRepository } from './auth.repository.js';
import type { PasswordHasher } from './util/password-hasher.js';
import { SignupInput } from './dto/signup.js';
import { LoginInput } from './dto/login.js';
import { InvalidCredentialError, InvalidTokenError } from './error/auth.js';
import { RefreshTokenInput, TokenPayload, TokenService } from './util/token-validator.js';
import { AuthDto, AuthTokens } from './dto/common.js';
import { CloudinaryImageStorage, StoredImage } from './image.service.js';
import { logger } from '../../config/logger/logger.js';
import { PresenceService } from '../../realtime/presence.service.js';
import { TokenRecord } from './auth.types.js';
import { AuthSessionRepository } from './auth-session.repository.js';

export interface AuthServiceDeps {
  userService: UserService;
  imageService: CloudinaryImageStorage;
  authRepository: AuthRepository;
  authSessionRepository: AuthSessionRepository;
  tokenService: TokenService;
  passwordHasher: PasswordHasher;
  presenceService: PresenceService;
}

export interface AuthServiceOptions {
  maxLoginAttempts: number;
  lockDurationMs: number;
  refreshTtlSeconds: number;
}

export class AuthService {
  private readonly userService: UserService;
  private readonly imageService: CloudinaryImageStorage;
  private readonly authRepository: AuthRepository;
  private readonly authSessionRepository: AuthSessionRepository;
  private readonly tokenService: TokenService;
  private readonly passwordHasher: PasswordHasher;
  private readonly presenceService: PresenceService;
  private readonly options: AuthServiceOptions;
  private dummyHash: string | undefined;
  private readonly refreshGracePeriodMs = 5 * 60 * 1000;

  constructor(deps: AuthServiceDeps, options: AuthServiceOptions) {
    this.userService = deps.userService;
    this.imageService = deps.imageService;
    this.authRepository = deps.authRepository;
    this.authSessionRepository = deps.authSessionRepository;
    this.tokenService = deps.tokenService;
    this.passwordHasher = deps.passwordHasher;
    this.presenceService = deps.presenceService;
    this.options = options;
  }

  /**
   * Always resolves the same way whether or not the email already exists,
   * so the endpoint can't be used to enumerate accounts.
   */
  async signup(input: SignupInput, image?: { buffer: Buffer; mimetype: string }): Promise<void> {
    // Hash first so response time doesn't reveal whether the email exists.
    const passwordHash = await this.passwordHasher.hash(input.password);

    let uploadedImage: StoredImage | undefined;

    if (image) {
      uploadedImage = await this.imageService.uploadProfileImage(image.buffer, image.mimetype);
    }

    try {
      const created = await this.userService.register({
        name: input.name,
        email: input.email,
        passwordHash,
        imageUrl: uploadedImage?.url ?? null,
      });

      // Preserve the existing non-enumerating signup response.
      // A duplicate email must not leave an orphaned image.
      if (!created && uploadedImage) {
        await this.imageService.deleteImage(uploadedImage.publicId);
      }
    } catch (error) {
      if (uploadedImage) {
        try {
          await this.imageService.deleteImage(uploadedImage.publicId);
        } catch (cleanupError) {
          logger.error({ error: cleanupError }, 'Failed to cleanup image.');
        }
      }

      throw error;
    }
  }

  async login(input: LoginInput): Promise<AuthDto> {
    const user = await this.userService.findByEmail(input.email);

    if (!user || user.status !== 'ACTIVE') {
      await this.burnPasswordCheck(input.password);
      throw new InvalidCredentialError('Email or password is incorrect.');
    }

    const passwordOk = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new InvalidCredentialError('Email or password is incorrect.');
    }

    const tokens = await this.issueTokens(user);
    await this.createRefreshTokenRecord(tokens.refreshToken, randomUUID(), user.id);

    return {
      tokens,
      user: {
        id: user.id,
        name: user.name,
        imageUrl: user.imageUrl,
        searchCode: user.searchCode,
      },
    };
  }

  async refresh(token: RefreshTokenInput): Promise<AuthDto> {
    const user = await this.requireValidSession({
      userId: token.userId,
      tokenVersion: token.tokenVersion,
    });
    const parent = await this.authRepository.findRefreshTokenByHash(
      this.hashRefreshToken(token.refreshToken),
    );

    if (!parent) {
      throw new InvalidTokenError('Invalid token');
    }
    // Detect revoked or replaced tokens
    if (this.isRefreshTokenReuse(parent)) {
      await this.authRepository.invalidateAllRefreshTokensByFamilyId(parent.familyId);
      throw new InvalidTokenError('Invalid token');
    }

    const replacedById = randomUUID();

    const tokens = await this.issueTokens(user);

    await this.authRepository.atomicUpdateRefreshToken({
      tokenHash: this.hashRefreshToken(token.refreshToken),
      newTokenHash: this.hashRefreshToken(tokens.refreshToken),
      replacedById,
      familyId: parent.familyId,
      userId: user.id,
      parentId: parent._id,
      expiredAt: new Date(Date.now() + this.options.refreshTtlSeconds * 1000),
    });

    return {
      tokens,
      user: {
        id: user.id,
        name: user.name,
        imageUrl: user.imageUrl,
        searchCode: user.searchCode,
      },
    };
  }

  async logout(token: RefreshTokenInput): Promise<void> {
    await this.authRepository.invalidateRefreshToken({
      tokenHash: this.hashRefreshToken(token.refreshToken),
      replacedById: null,
    });
  }

  async logoutAll(token: TokenPayload): Promise<void> {
    const user = await this.requireValidSession(token);
    await this.authSessionRepository.revokeAllSessions(user.id, user.tokenVersion);
    this.presenceService.disconnectUser(user.id);
  }

  /** The user must exist, be active, and the token must carry the current token version. */
  private async requireValidSession(token: TokenPayload): Promise<User> {
    const user = await this.userService.findById(token.userId);
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== token.tokenVersion) {
      throw new InvalidTokenError('Invalid token');
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

  private async createRefreshTokenRecord(
    refreshToken: string,
    id: string,
    userId: string,
    parent?: { id: string; familyId: string } | null,
  ): Promise<void> {
    const expiredAt = new Date(Date.now() + this.options.refreshTtlSeconds * 1000);

    await this.authRepository.createRefreshToken({
      id,
      familyId: parent?.familyId ?? randomUUID(),
      userId,
      tokenHash: this.hashRefreshToken(refreshToken),
      parentId: parent?.id ?? null,
      expiredAt,
    });
  }

  private hashRefreshToken(refreshToken: string): string {
    return createHash('sha256').update(refreshToken).digest('hex');
  }

  /** Spend roughly the same time as a real password check when the user doesn't exist. */
  private async burnPasswordCheck(password: string): Promise<void> {
    this.dummyHash ??= await this.passwordHasher.hash(randomUUID());
    await this.passwordHasher.verify(password, this.dummyHash);
  }

  private isRefreshTokenReuse(parent: TokenRecord, now: Date = new Date()): boolean {
    if (!parent.replacedById || !parent.revokedAt) {
      return false;
    }

    const elapsedMs = now.getTime() - parent.revokedAt.getTime();

    return elapsedMs > this.refreshGracePeriodMs;
  }
}
