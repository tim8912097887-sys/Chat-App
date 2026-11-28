import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAll } from '../../utils/common/query.js';
import {
  createWrongTypeCookie,
  findRefreshTokensByUserId,
  insertAuthenticatedSession,
  insertRefreshToken,
  insertSessionForUser,
} from '../../utils/auth/query.js';
import { logoutAllRequest } from '../../utils/auth/request.js';
import {
  expectAuthError,
  expectServerError,
  expectSuccessMessageResponse,
} from '../../utils/common/assertion.js';
import {
  createExpiredRefreshCookie,
  createRefreshCookieHeader,
  extractCookieValue,
} from '../../utils/auth/factory.js';
import { REFRESH_COOKIE_NAME } from '../../utils/auth/constants.js';
import { findUserById } from '../../utils/user/query.js';
import { invalidRefreshCookieCases } from '../../utils/auth/invalid-inputs.js';
import { MongoAuthSessionRepository } from '../../../domain/auth/auth-session.repository.js';

describe('Logout All', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when_logout_all_is_called_should_increment_token_version_revoke_all_user_tokens_and_clear_cookie', async () => {
      // Arrange
      const { user, cookie } = await insertAuthenticatedSession({
        user: { email: 'user-a@example.com' },
      });
      await insertSessionForUser(user);

      const { user: otherUser, record: otherUserToken } = await insertAuthenticatedSession({
        user: { email: 'user-b@example.com' },
      });

      // Act
      const res = await logoutAllRequest(cookie);

      // Assert
      expect(res.status).toBe(200);
      expectSuccessMessageResponse(res, 200, 'Logged out all sessions');
      expect(extractCookieValue(res.headers['set-cookie'], REFRESH_COOKIE_NAME)).toBe('');

      const updatedUser = await findUserById(user._id);
      expect(updatedUser?.tokenVersion).toBe(1);

      const userTokens = await findRefreshTokensByUserId(user._id);
      expect(userTokens).toHaveLength(2);
      expect(userTokens.every((token) => token.revokedAt instanceof Date)).toBe(true);

      const untouchedOtherUser = await findUserById(otherUser._id);
      const untouchedOtherTokens = await findRefreshTokensByUserId(otherUser._id);
      expect(untouchedOtherUser?.tokenVersion).toBe(0);
      expect(untouchedOtherTokens).toHaveLength(1);
      expect(untouchedOtherTokens[0]?._id).toBe(otherUserToken._id);
      expect(untouchedOtherTokens[0]?.revokedAt).toBeNull();
    });
  });

  describe('Authentication', () => {
    it.each(invalidRefreshCookieCases)('$description', async ({ kind, cookie, expectedDetail }) => {
      // Arrange
      const { user, record } = await insertAuthenticatedSession();
      let cookieHeader = cookie;
      if (kind === 'expired') {
        cookieHeader = await createExpiredRefreshCookie();
      } else if (kind === 'wrong-token-type') {
        cookieHeader = await createWrongTypeCookie(user._id);
      }

      // Act
      const res = await logoutAllRequest(cookieHeader);

      // Assert
      expect(res.status).toBe(401);
      expectAuthError(res, expectedDetail);

      const dbUser = await findUserById(user._id);
      const userTokens = await findRefreshTokensByUserId(user._id);
      expect(dbUser?.tokenVersion).toBe(0);
      expect(userTokens[0]?._id).toBe(record._id);
      expect(userTokens[0]?.revokedAt).toBeNull();
    });
  });

  describe('Business Logic', () => {
    it('when_logout_all_uses_token_for_nonexistent_user_should_return_401', async () => {
      // Arrange
      const missingUserId = randomUUID();
      const { tokenHash, cookie } = await createRefreshCookieHeader({ userId: missingUserId });
      await insertRefreshToken({ userId: missingUserId, tokenHash });

      // Act
      const res = await logoutAllRequest(cookie);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
      expect(await findUserById(missingUserId)).toBeNull();
    });

    it('when_logout_all_uses_token_for_disabled_user_should_return_401_and_not_modify_state', async () => {
      // Arrange
      const { user, cookie } = await insertAuthenticatedSession({
        user: { status: 'DISABLED' },
      });

      // Act
      const res = await logoutAllRequest(cookie);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });

      const dbUser = await findUserById(user._id);
      const tokens = await findRefreshTokensByUserId(user._id);
      expect(dbUser?.tokenVersion).toBe(0);
      expect(tokens[0]?.revokedAt).toBeNull();
    });

    it('when_logout_all_uses_token_with_mismatched_token_version_should_return_401', async () => {
      // Arrange
      const { user, cookie } = await insertAuthenticatedSession({
        user: { tokenVersion: 1 },
        jwtTokenVersion: 0,
      });

      // Act
      const res = await logoutAllRequest(cookie);

      // Assert
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });

      const dbUser = await findUserById(user._id);
      const tokens = await findRefreshTokensByUserId(user._id);
      expect(dbUser?.tokenVersion).toBe(1);
      expect(tokens[0]?.revokedAt).toBeNull();
    });
  });

  describe('Concurrency', () => {
    it('when_two_concurrent_logout_all_requests_use_same_token_should_increment_token_version_once_and_revoke_all_tokens', async () => {
      // Arrange
      const { user, cookie } = await insertAuthenticatedSession();
      await insertSessionForUser(user);

      // Act
      const responses = await Promise.all([logoutAllRequest(cookie), logoutAllRequest(cookie)]);

      // Assert
      const [first, second] = [...responses].sort((a, b) => a.status - b.status);
      expect(first?.status).toBe(200);
      expectSuccessMessageResponse(first!, 200, 'Logged out all sessions');
      expect([200, 401]).toContain(second?.status);

      const dbUser = await findUserById(user._id);
      const userTokens = await findRefreshTokensByUserId(user._id);
      expect(dbUser?.tokenVersion).toBe(1);
      expect(userTokens).toHaveLength(2);
      expect(userTokens.every((token) => token.revokedAt instanceof Date)).toBe(true);
    });
  });

  describe('Server Error', () => {
    it('when_revoked_all_session_fails_should_return_500_and_not_revoke_tokens', async () => {
      // Arrange
      const { user, cookie } = await insertAuthenticatedSession();
      const incrementSpy = vi
        .spyOn(MongoAuthSessionRepository.prototype, 'revokeAllSessions')
        .mockRejectedValue(new Error('database unavailable'));

      // Act
      const res = await logoutAllRequest(cookie);

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(incrementSpy).toHaveBeenCalledOnce();

      const dbUser = await findUserById(user._id);
      const tokens = await findRefreshTokensByUserId(user._id);
      expect(dbUser?.tokenVersion).toBe(0);
      expect(tokens[0]?.revokedAt).toBeNull();
    });
  });
});
