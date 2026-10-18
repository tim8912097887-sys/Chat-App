import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../utils/common/app.js';
import { createExpiredRefreshCookie, createRefreshCookie } from '../../utils/auth/factory.js';
import { truncateAll, userModel } from '../../utils/common/query.js';
import { LOGOUT_ALL_URL, REFRESH_COOKIE_NAME } from '../../utils/auth/constants.js';
import { expectAuthError, expectSuccessMessageResponse } from '../../utils/common/assertion.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';

describe('logout-all', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when logout-all uses an existing refresh token should revoke it and return 200 with message', async () => {
      const { cookie } = await createRefreshCookie();

      const res = await api().post(LOGOUT_ALL_URL).set('Cookie', cookie);
      const record = await userModel.find({});

      expectSuccessMessageResponse(res, 200, 'Logged out all sessions');
      expect(record[0]?.tokenVersion).toBe(1);
    });
  });

  describe('business logic', () => {
    it('when logout-all uses a refresh token for a user that does not exist should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await userModel.deleteOne({});

      const res = await api().post(LOGOUT_ALL_URL).set('Cookie', cookie);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
      expect(await userModel.findOne({})).toBeNull();
    });

    it('when logout-all uses a refresh token for an inactive user should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await userModel.updateOne({}, { $set: { status: 'DISABLED' } });

      const res = await api().post(LOGOUT_ALL_URL).set('Cookie', cookie);
      const user = await userModel.findOne({});

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
      expect(user?.tokenVersion).toBe(0);
    });

    it('when logout-all uses a refresh token with a mismatched token version should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await userModel.updateOne({}, { $inc: { tokenVersion: 1 } });

      const res = await api().post(LOGOUT_ALL_URL).set('Cookie', cookie);
      const user = await userModel.findOne({});

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
      expect(user?.tokenVersion).toBe(1);
    });

    it('when user logout-all twice in a row first should return 200 with message for both and only increat token version 1 time', async () => {
      const { cookie } = await createRefreshCookie();

      const [first, second] = await Promise.all([
        api().post(LOGOUT_ALL_URL).set('Cookie', cookie),
        api().post(LOGOUT_ALL_URL).set('Cookie', cookie),
      ]);

      const userRecord = await userModel.findOne({});

      expectSuccessMessageResponse(first, 200, 'Logged out all sessions');
      expectSuccessMessageResponse(second, 200, 'Logged out all sessions');
      expect(userRecord?.tokenVersion).toBe(1);
    });
  });

  describe('auth error', () => {
    it.each([
      {
        description:
          'when logout-all receives an empty refresh token should return 401 with authentication error',
        cookie: `${REFRESH_COOKIE_NAME}=`,
        expectedDetail: 'Missing refresh token',
      },
      {
        description:
          'when logout-all receives a token under a different cookie name should return 401 with authentication error',
        cookie: 'other_refresh_token=some-token',
        expectedDetail: 'Missing refresh token',
      },
      {
        description:
          'when logout-all receives an invalid token should return 401 with authentication error',
        cookie: `${REFRESH_COOKIE_NAME}=not-a-valid-token`,
        expectedDetail: 'Invalid refresh token',
      },
      {
        description:
          'when logout-all receives an expired token should return 401 with authentication error',
        cookie: 'expired',
        expectedDetail: 'Invalid refresh token',
      },
      {
        description:
          'when logout-all does not receive a refresh cookie should return 401 with authentication error',
        cookie: undefined,
        expectedDetail: 'Missing refresh token',
      },
    ])('$description', async ({ cookie, expectedDetail }) => {
      const cookieHeader = cookie === 'expired' ? await createExpiredRefreshCookie() : cookie;
      const request = api().post(LOGOUT_ALL_URL);
      if (cookieHeader !== undefined) request.set('Cookie', cookieHeader);

      const res = await request;

      expectAuthError(res, expectedDetail);
    });
  });

  describe('server error', () => {
    it('when user repository fails during logout-all should return 500 with server error', async () => {
      // Arrange
      const { cookie } = await createRefreshCookie();
      const invalidateRefreshTokenSpy = vi
        .spyOn(MongoUserRepository.prototype, 'incrementTokenVersion')
        .mockRejectedValue(new Error('database unavailable'));

      // Act
      const res = await api().post(LOGOUT_ALL_URL).set('Cookie', cookie);

      // Assert
      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'SERVER_ERROR',
          detail: 'An unexpected error occurred. Please try again later.',
        },
        data: null,
      });
      expect(invalidateRefreshTokenSpy).toHaveBeenCalledOnce();
    });
  });
});
