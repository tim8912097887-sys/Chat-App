import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoAuthRepository } from '../../../domain/auth/auth.repository.js';
import { api, mockedRealtimePublisher } from '../../utils/common/app.js';
import { createExpiredRefreshCookie, createRefreshCookie } from '../../utils/auth/factory.js';
import { authModel, truncateAll } from '../../utils/common/query.js';
import { LOGOUT_URL, REFRESH_COOKIE_NAME } from '../../utils/auth/constants.js';
import {
  expectAuthError,
  expectServerError,
  expectSuccessMessageResponse,
} from '../../utils/common/assertion.js';
import { realtimeEventAssertion } from '../../utils/common/realtime.js';
import { FRIEND_OFFLINE_EVENT } from '../../../realtime/realtime.constants.js';

describe('logout', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when logout uses an existing refresh token should revoke it and return 200 with message', async () => {
      const { cookie, recordId } = await createRefreshCookie();

      const res = await api().post(LOGOUT_URL).set('Cookie', cookie);
      const record = await authModel.findById(recordId);

      expectSuccessMessageResponse(res, 200, 'Logged out');
      expect(record?.revokedAt).toBeInstanceOf(Date);
      expect(record?.replacedById).toBeNull();
      expect(record?.userId).toBeTruthy();
    });

    it('when logout uses a refresh token without a stored record should return 200 with message', async () => {
      const { cookie, recordId } = await createRefreshCookie();
      await authModel.deleteOne({ _id: recordId });

      const res = await api().post(LOGOUT_URL).set('Cookie', cookie);

      expectSuccessMessageResponse(res, 200, 'Logged out');
      expect(await authModel.findById(recordId)).toBeNull();
    });

    it('when same user logout twice in a row should return 200 with message', async () => {
      const { cookie } = await createRefreshCookie();

      const [firstRes, secondRes] = await Promise.all([
        api().post(LOGOUT_URL).set('Cookie', cookie),
        api().post(LOGOUT_URL).set('Cookie', cookie),
      ]);
      const authRecords = await authModel.find({});

      expectSuccessMessageResponse(firstRes, 200, 'Logged out');
      expectSuccessMessageResponse(secondRes, 200, 'Logged out');
      expect(authRecords.length).toBe(1);
      expect(authRecords[0]?.revokedAt).toBeInstanceOf(Date);
    });
  });

  describe('auth error', () => {
    it.each([
      {
        description:
          'when logout receives an empty refresh token should return 401 with authentication error',
        cookie: `${REFRESH_COOKIE_NAME}=`,
        expectedDetail: 'Missing refresh token',
      },
      {
        description:
          'when logout receives a token under a different cookie name should return 401 with authentication error',
        cookie: 'other_refresh_token=some-token',
        expectedDetail: 'Missing refresh token',
      },
      {
        description:
          'when logout receives an invalid token should return 401 with authentication error',
        cookie: `${REFRESH_COOKIE_NAME}=not-a-valid-token`,
        expectedDetail: 'Invalid refresh token',
      },
      {
        description:
          'when logout receives an expired token should return 401 with authentication error',
        cookie: 'expired',
        expectedDetail: 'Invalid refresh token',
      },
      {
        description:
          'when logout does not receive a refresh cookie should return 401 with authentication error',
        cookie: undefined,
        expectedDetail: 'Missing refresh token',
      },
    ])('$description', async ({ cookie, expectedDetail }) => {
      const cookieHeader = cookie === 'expired' ? await createExpiredRefreshCookie() : cookie;
      const request = api().post(LOGOUT_URL);
      if (cookieHeader !== undefined) request.set('Cookie', cookieHeader);

      const res = await request;

      expectAuthError(res, expectedDetail);
    });
  });

  describe('server error', () => {
    it('when auth repository fails during logout should return 500 with server error', async () => {
      // Arrange
      const { cookie, recordId } = await createRefreshCookie();
      const userId = (await authModel.findById(recordId))?.userId;
      const invalidateRefreshTokenSpy = vi
        .spyOn(MongoAuthRepository.prototype, 'invalidateRefreshToken')
        .mockRejectedValue(new Error('database unavailable'));

      // Act
      const res = await api().post(LOGOUT_URL).set('Cookie', cookie);

      // Assert
      expectServerError(res);
      expect(invalidateRefreshTokenSpy).toHaveBeenCalledOnce();
      expect(mockedRealtimePublisher.publishToUsers).not.toHaveBeenCalledWith(
        [],
        realtimeEventAssertion(FRIEND_OFFLINE_EVENT, { userId }),
      );
    });
  });
});
