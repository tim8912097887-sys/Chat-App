import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { truncateAll } from '../../utils/common/query.js';
import { logoutRequest } from '../../utils/auth/request.js';
import {
  createUnstoredRefreshCookie,
  createWrongTypeCookie,
  findAllRefreshTokens,
  findRefreshTokenById,
  insertAuthenticatedSession,
  insertSessionForUser,
} from '../../utils/auth/query.js';
import {
  expectAuthError,
  expectServerError,
  expectSuccessMessageResponse,
} from '../../utils/common/assertion.js';
import { createExpiredRefreshCookie, extractCookieValue } from '../../utils/auth/factory.js';
import { REFRESH_COOKIE_NAME } from '../../utils/auth/constants.js';
import { insertUser } from '../../utils/user/query.js';
import { invalidRefreshCookieCases } from '../../utils/auth/invalid-inputs.js';
import { MongoAuthRepository } from '../../../domain/auth/auth.repository.js';
import { mockedRealtimePublisher } from '../../utils/common/app.js';
import { FRIEND_OFFLINE_EVENT } from '../../../realtime/realtime.constants.js';
import { realtimeEventAssertion } from '../../utils/common/realtime.js';

describe('Logout', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when_logout_uses_existing_refresh_token_should_revoke_token_and_clear_cookie', async () => {
      // Arrange
      const { user, record, cookie } = await insertAuthenticatedSession();

      // Act
      const res = await logoutRequest(cookie);

      // Assert
      expect(res.status).toBe(200);
      expectSuccessMessageResponse(res, 200, 'Logged out');
      expect(extractCookieValue(res.headers['set-cookie'], REFRESH_COOKIE_NAME)).toBe('');

      const dbRecord = await findRefreshTokenById(record._id);
      expect(dbRecord).toEqual(
        expect.objectContaining({
          _id: record._id,
          userId: user._id,
          revokedAt: expect.any(Date),
          replacedById: null,
        }),
      );
    });

    it('when_logout_uses_valid_token_without_stored_record_should_return_200_and_clear_cookie', async () => {
      // Arrange
      const user = await insertUser();
      const cookie = await createUnstoredRefreshCookie(user._id, user.tokenVersion);

      // Act
      const res = await logoutRequest(cookie);

      // Assert
      expect(res.status).toBe(200);
      expectSuccessMessageResponse(res, 200, 'Logged out');
      expect(extractCookieValue(res.headers['set-cookie'], REFRESH_COOKIE_NAME)).toBe('');
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });

    it('when_user_has_multiple_sessions_logout_should_only_revoke_current_session_token', async () => {
      // Arrange
      const {
        user,
        record: sessionOneRecord,
        cookie: sessionOneCookie,
      } = await insertAuthenticatedSession();
      const { record: sessionTwoRecord } = await insertSessionForUser(user);

      // Act
      const res = await logoutRequest(sessionOneCookie);

      // Assert
      expect(res.status).toBe(200);
      expectSuccessMessageResponse(res, 200, 'Logged out');

      const dbSessionOne = await findRefreshTokenById(sessionOneRecord._id);
      const dbSessionTwo = await findRefreshTokenById(sessionTwoRecord._id);
      expect(dbSessionOne?.revokedAt).toBeInstanceOf(Date);
      expect(dbSessionOne?.replacedById).toBeNull();
      expect(dbSessionTwo?.revokedAt).toBeNull();
    });
  });

  describe('Authentication', () => {
    it.each(invalidRefreshCookieCases)('$description', async ({ kind, cookie, expectedDetail }) => {
      // Arrange
      const { record } = await insertAuthenticatedSession();
      let cookieHeader = cookie;
      if (kind === 'expired') {
        cookieHeader = await createExpiredRefreshCookie();
      } else if (kind === 'wrong-token-type') {
        cookieHeader = await createWrongTypeCookie(record.userId);
      }

      // Act
      const res = await logoutRequest(cookieHeader);

      // Assert
      expect(res.status).toBe(401);
      expectAuthError(res, expectedDetail);

      const dbRecord = await findRefreshTokenById(record._id);
      expect(dbRecord?.revokedAt).toBeNull();
    });
  });

  describe('Concurrency', () => {
    it('when_two_concurrent_logout_requests_use_same_token_should_return_200_for_both', async () => {
      // Arrange
      const { record, cookie } = await insertAuthenticatedSession();

      // Act
      const [firstRes, secondRes] = await Promise.all([
        logoutRequest(cookie),
        logoutRequest(cookie),
      ]);

      // Assert
      expect(firstRes.status).toBe(200);
      expect(secondRes.status).toBe(200);
      expectSuccessMessageResponse(firstRes, 200, 'Logged out');
      expectSuccessMessageResponse(secondRes, 200, 'Logged out');

      const authRecords = await findAllRefreshTokens();
      expect(authRecords).toHaveLength(1);
      expect(authRecords[0]?._id).toBe(record._id);
      expect(authRecords[0]?.revokedAt).toBeInstanceOf(Date);
      expect(authRecords[0]?.replacedById).toBeNull();
    });
  });

  describe('Server Error', () => {
    it('when_auth_repository_fails_during_logout_should_return_500_and_keep_token_active', async () => {
      // Arrange
      const { user, record, cookie } = await insertAuthenticatedSession();
      const invalidateSpy = vi
        .spyOn(MongoAuthRepository.prototype, 'invalidateRefreshToken')
        .mockRejectedValue(new Error('database unavailable'));

      // Act
      const res = await logoutRequest(cookie);

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(invalidateSpy).toHaveBeenCalledOnce();
      expect(mockedRealtimePublisher.publishToUsers).not.toHaveBeenCalledWith(
        [],
        realtimeEventAssertion(FRIEND_OFFLINE_EVENT, { userId: user._id }),
      );

      const dbRecord = await findRefreshTokenById(record._id);
      expect(dbRecord?.revokedAt).toBeNull();
    });
  });
});
