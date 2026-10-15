import { createHash, randomUUID } from 'node:crypto';
import type { UserService } from '../user/user.service.js';
import type { User } from '../user/user.types.js';
import type { AuthRepository } from './auth.repository.js';
import type { PasswordHasher } from './util/password-hasher.js';
import { SignupInput } from './dto/signup.js';
import { LoginInput } from './dto/login.js';
import { InvalidCredentialError } from './error/invalid-credential.js';
import { InvalidTokenError } from './error/invalid-token.js';
import { LoginLockedError } from './error/login-locked.js';
import { RefreshTokenInput, TokenPayload, TokenService } from './util/token-validator.js';
import { AuthTokens } from './dto/token.js';
import { CloudinaryImageStorage, StoredImage } from './image.service.js';
import { logger } from '../../config/logger/logger.js';

export interface AuthServiceOptions {
  maxLoginAttempts: number;
  lockDurationMs: number;
  refreshTtlSeconds: number;
}

export class AuthService {
  private dummyHash: string | undefined;

  constructor(
    private readonly userService: UserService,
    private readonly imageService: CloudinaryImageStorage,
    private readonly authRepository: AuthRepository,
    private readonly tokenService: TokenService,
    private readonly passwordHasher: PasswordHasher,
    private readonly options: AuthServiceOptions,
  ) {}

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

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.userService.findByEmail(input.email);

    if (!user || user.status !== 'ACTIVE') {
      await this.burnPasswordCheck(input.password);
      throw new InvalidCredentialError('Email or password is incorrect.');
    }

    const now = new Date();
    if (user.loginLockedAt) {
      const unlockAt = user.loginLockedAt.getTime() + this.options.lockDurationMs;
      if (now.getTime() < unlockAt) throw new LoginLockedError('Account locked.');
      // Lock expired: start from a clean slate.
      await this.userService.clearLoginState(user.id);
    }

    const passwordOk = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!passwordOk) {
      const { locked } = await this.userService.registerFailedLogin(user.id, {
        maxAttempts: this.options.maxLoginAttempts,
        lockedAt: now,
      });
      throw locked
        ? new LoginLockedError('Account locked.')
        : new InvalidCredentialError('Email or password is incorrect.');
    }

    if (user.loginAttempt > 0 && !user.loginLockedAt) {
      await this.userService.clearLoginState(user.id);
    }

    const tokens = await this.issueTokens(user);
    await this.createRefreshTokenRecord(tokens.refreshToken, randomUUID());
    return tokens;
  }

  async refresh(token: RefreshTokenInput): Promise<AuthTokens> {
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
    if (
      parent.replacedById ||
      (parent.revokedAt && new Date().getMinutes() - parent.revokedAt.getMinutes() > 5)
    ) {
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
      parentId: parent._id,
      expiredAt: new Date(Date.now() + this.options.refreshTtlSeconds * 1000),
    });

    return tokens;
  }

  async logout(token: RefreshTokenInput): Promise<void> {
    await this.authRepository.invalidateRefreshToken({
      tokenHash: this.hashRefreshToken(token.refreshToken),
      replacedById: null,
    });
  }

  async logoutAll(token: TokenPayload): Promise<void> {
    const user = await this.requireValidSession(token);
    await this.userService.incrementTokenVersion(user.id, token.tokenVersion);
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
    parent?: { id: string; familyId: string } | null,
  ): Promise<void> {
    const expiredAt = new Date(Date.now() + this.options.refreshTtlSeconds * 1000);

    await this.authRepository.createRefreshToken({
      id,
      familyId: parent?.familyId ?? randomUUID(),
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
}
