import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAll } from '../../utils/common/query.js';
import { findUserById, insertUser } from '../../utils/user/query.js';
import { createLoginInput, extractCookieValue, hashToken } from '../../utils/auth/factory.js';
import { loginRequest } from '../../utils/auth/request.js';
import {
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { findAllRefreshTokens, findRefreshTokensByUserId } from '../../utils/auth/query.js';
import { REFRESH_COOKIE_NAME } from '../../utils/auth/constants.js';
import { invalidLoginInputs } from '../../utils/auth/invalid-inputs.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';
import { MongoAuthRepository } from '../../../domain/auth/auth.repository.js';

describe('Login', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when_login_with_valid_credentials_should_return_200_tokens_and_create_refresh_token_record', async () => {
      // Arrange
      const user = await insertUser();
      const input = createLoginInput({ email: user.email });

      // Act
      const res = await loginRequest(input);

      // Assert
      expect(res.status).toBe(200);
      expectSuccessDataResponse(res, 200, {
        accessToken: expect.any(String),
        user: {
          id: user._id,
          name: user.name,
          imageUrl: null,
          searchCode: user.searchCode,
        },
      });

      const refreshCookie = extractCookieValue(res.headers['set-cookie'], REFRESH_COOKIE_NAME);
      expect(refreshCookie).toBeTruthy();

      const setCookieHeaders = res.headers['set-cookie'];
      const cookieHeaderStr = Array.isArray(setCookieHeaders)
        ? setCookieHeaders.join(';')
        : (setCookieHeaders ?? '');
      expect(cookieHeaderStr).toContain('HttpOnly');

      const tokens = await findRefreshTokensByUserId(user._id);
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual(
        expect.objectContaining({
          _id: expect.any(String),
          familyId: expect.any(String),
          userId: user._id,
          tokenHash: hashToken(refreshCookie!),
          parentId: null,
          replacedById: null,
          revokedAt: null,
          expiredAt: expect.any(Date),
        }),
      );
      expect(tokens[0]!.expiredAt.getTime()).toBeGreaterThan(Date.now());
    });

    it.each([
      {
        description: 'when_login_uses_minimum_password_length_should_return_200',
        userOverrides: { password: '12345678' },
        loginOverrides: { password: '12345678' },
      },
      {
        description: 'when_login_uses_maximum_password_length_should_return_200',
        userOverrides: { password: 'a'.repeat(72) },
        loginOverrides: { password: 'a'.repeat(72) },
      },
      {
        description: 'when_login_uses_padded_and_uppercase_email_should_normalize_and_return_200',
        userOverrides: { email: 'test@example.com' },
        loginOverrides: { email: '  TEST@EXAMPLE.COM  ' },
      },
      {
        description: 'when_login_uses_254_character_email_should_return_200',
        userOverrides: {
          email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
        },
        loginOverrides: {
          email: `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(61)}`,
        },
      },
      {
        description: 'when_login_for_user_with_image_url_should_return_user_image_url',
        userOverrides: { imageUrl: 'https://res.cloudinary.com/demo/image/upload/avatar.jpg' },
        loginOverrides: {},
      },
    ])('$description', async ({ userOverrides, loginOverrides }) => {
      // Arrange
      const user = await insertUser(userOverrides);
      const input = createLoginInput({ email: user.email, ...loginOverrides });

      // Act
      const res = await loginRequest(input);

      // Assert
      expect(res.status).toBe(200);
      expectSuccessDataResponse(res, 200, {
        accessToken: expect.any(String),
        user: {
          id: user._id,
          name: user.name,
          imageUrl: user.imageUrl,
          searchCode: user.searchCode,
        },
      });

      const tokens = await findRefreshTokensByUserId(user._id);
      expect(tokens).toHaveLength(1);
    });
  });

  describe('Validation', () => {
    it.each(invalidLoginInputs)('$description', async ({ input, expectedDetail }) => {
      // Arrange
      // Act
      const res = await loginRequest(input);

      // Assert
      expect(res.status).toBe(400);
      expectValidationError(res, expectedDetail);
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });
  });

  describe('Business Logic', () => {
    it('when_login_uses_nonexistent_email_should_return_400_with_invalid_credentials', async () => {
      // Arrange
      const input = createLoginInput({ email: 'missing@example.com' });

      // Act
      const res = await loginRequest(input);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'BadRequestError',
          detail: 'Email or password is incorrect.',
        },
        data: null,
      });
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });

    it('when_login_uses_disabled_user_credentials_should_return_400_with_invalid_credentials', async () => {
      // Arrange
      const user = await insertUser({ status: 'DISABLED' });
      const input = createLoginInput({ email: user.email });

      // Act
      const res = await loginRequest(input);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'BadRequestError',
          detail: 'Email or password is incorrect.',
        },
        data: null,
      });

      expect(await findAllRefreshTokens()).toHaveLength(0);
    });

    it('when_login_uses_incorrect_password_should_return_400_with_invalid_credentials', async () => {
      // Arrange
      const user = await insertUser();
      const input = createLoginInput({ email: user.email, password: 'WrongPassword123!' });

      // Act
      const res = await loginRequest(input);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'BadRequestError',
          detail: 'Email or password is incorrect.',
        },
        data: null,
      });

      expect(await findAllRefreshTokens()).toHaveLength(0);
    });
  });

  describe('Concurrency', () => {
    it('when_same_user_logs_in_concurrently_should_return_200_and_create_distinct_refresh_tokens', async () => {
      // Arrange
      const user = await insertUser();
      const input = createLoginInput({ email: user.email });

      // Act
      const [res1, res2] = await Promise.all([loginRequest(input), loginRequest(input)]);

      // Assert
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expectSuccessDataResponse(res1, 200, {
        accessToken: expect.any(String),
        user: {
          id: user._id,
          name: user.name,
          imageUrl: null,
          searchCode: user.searchCode,
        },
      });
      expectSuccessDataResponse(res2, 200, {
        accessToken: expect.any(String),
        user: {
          id: user._id,
          name: user.name,
          imageUrl: null,
          searchCode: user.searchCode,
        },
      });

      const tokens = await findRefreshTokensByUserId(user._id);
      expect(tokens).toHaveLength(2);
      expect(tokens[0]?.familyId).not.toBe(tokens[1]?.familyId);
      expect(tokens[0]?.tokenHash).not.toBe(tokens[1]?.tokenHash);
    });
  });

  describe('Server Error', () => {
    it('when_user_repository_fails_during_login_should_return_500_and_not_create_token', async () => {
      // Arrange
      vi.spyOn(MongoUserRepository.prototype, 'findByEmail').mockRejectedValue(
        new Error('database unavailable'),
      );

      // Act
      const res = await loginRequest(createLoginInput({ email: 'server-error@example.com' }));

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });

    it('when_auth_repository_fails_creating_refresh_token_should_return_500_and_not_persist_token', async () => {
      // Arrange
      const user = await insertUser();
      vi.spyOn(MongoAuthRepository.prototype, 'createRefreshToken').mockRejectedValue(
        new Error('database unavailable'),
      );

      // Act
      const res = await loginRequest(createLoginInput({ email: user.email }));

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });
  });
});
