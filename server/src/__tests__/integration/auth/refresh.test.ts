import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../utils/auth/app.js';
import { createExpiredRefreshCookie, createRefreshCookie } from '../../utils/auth/factory.js';
import { authModel, truncateAuthAndUser, userModel } from '../../utils/auth/query.js';
import { REFRESH_COOKIE_NAME, REFRESH_URL } from '../../utils/auth/constants.js';
import { expectSuccessDataResponse } from '../../utils/common/assertion.js';
import { MongoAuthRepository } from '../../../domain/auth/auth.repository.js';

describe('refresh', () => {
  beforeEach(async () => {
    await truncateAuthAndUser();
  });

  describe('success', () => {
    it('when refresh uses an existing refresh token should revoke it and return 200 with access token', async () => {
      const { cookie } = await createRefreshCookie();

      const res = await api().post(REFRESH_URL).set('Cookie', cookie);
      const userRecord = await userModel.find({});
      const authRecord = await authModel.find({});
      const invalidateRefreshToken = authRecord.find((r) => r.revokedAt !== null);
      const newRefreshToken = authRecord.find((r) => r.revokedAt === null);

      expectSuccessDataResponse(res, 200, {
        accessToken: expect.any(String),
      });
      expect(userRecord[0]?.tokenVersion).toBe(0);
      expect(newRefreshToken?.revokedAt).toBeNull();
      expect(invalidateRefreshToken?.revokedAt).not.toBeNull();
    });
  });

  describe('business logic', () => {
    it('when refresh uses a refresh token for a user that does not exist should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await userModel.deleteOne({});

      const res = await api().post(REFRESH_URL).set('Cookie', cookie);

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

    it('when refresh uses a refresh token for an inactive user should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await userModel.updateOne({}, { $set: { status: 'DISABLED' } });

      const res = await api().post(REFRESH_URL).set('Cookie', cookie);
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

    it('when refresh uses a refresh token record that does not exist should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await authModel.deleteOne({});

      const res = await api().post(REFRESH_URL).set('Cookie', cookie);

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
      expect(await authModel.findOne({})).toBeNull();
    });

    it('when refresh reuses a previously used refresh token should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();

      const firstRes = await api().post(REFRESH_URL).set('Cookie', cookie);
      const secondRes = await api().post(REFRESH_URL).set('Cookie', cookie);

      expectSuccessDataResponse(firstRes, 200, {
        accessToken: expect.any(String),
      });
      expect(secondRes.status).toBe(401);
      expect(secondRes.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
      const tokens = await authModel.find({});
      expect(tokens.every((token) => token.revokedAt !== null)).toBe(true);
    });

    it('when refresh uses a refresh token with a mismatched token version should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();
      await userModel.updateOne({}, { $inc: { tokenVersion: 1 } });

      const res = await api().post(REFRESH_URL).set('Cookie', cookie);
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

    it('when user refresh twice in a row first should return 200 with access token and second should return 401 with authentication error', async () => {
      const { cookie } = await createRefreshCookie();

      const res = await Promise.all([
        api().post(REFRESH_URL).set('Cookie', cookie),
        api().post(REFRESH_URL).set('Cookie', cookie),
      ]);
      const [first, second] = res.sort((a, b) => a.status - b.status);

      expectSuccessDataResponse(first, 200, {
        accessToken: expect.any(String),
      });
      expect(second.status).toBe(401);
      expect(second.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });
    });
  });

  describe('auth error', () => {
    it.each([
      {
        description:
          'when refresh receives an empty refresh token should return 401 with authentication error',
        cookie: `${REFRESH_COOKIE_NAME}=`,
        expectedDetail: 'Missing refresh token',
      },
      {
        description:
          'when refresh receives a token under a different cookie name should return 401 with authentication error',
        cookie: 'other_refresh_token=some-token',
        expectedDetail: 'Missing refresh token',
      },
      {
        description:
          'when refresh receives an invalid token should return 401 with authentication error',
        cookie: `${REFRESH_COOKIE_NAME}=not-a-valid-token`,
        expectedDetail: 'Invalid refresh token',
      },
      {
        description:
          'when refresh receives an expired token should return 401 with authentication error',
        cookie: 'expired',
        expectedDetail: 'Invalid refresh token',
      },
      {
        description:
          'when refresh does not receive a refresh cookie should return 401 with authentication error',
        cookie: undefined,
        expectedDetail: 'Missing refresh token',
      },
    ])('$description', async ({ cookie, expectedDetail }) => {
      const cookieHeader = cookie === 'expired' ? await createExpiredRefreshCookie() : cookie;
      const request = api().post(REFRESH_URL);
      if (cookieHeader !== undefined) request.set('Cookie', cookieHeader);

      const res = await request;

      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: expectedDetail,
        },
        data: null,
      });
    });
  });

  describe('server error', () => {
    it('when auth repository fails during refresh should return 500 with server error and not revoke refresh token', async () => {
      // Arrange
      const { cookie } = await createRefreshCookie();
      const invalidateRefreshTokenSpy = vi
        .spyOn(MongoAuthRepository.prototype, 'atomicUpdateRefreshToken')
        .mockRejectedValue(new Error('database unavailable'));

      // Act
      const res = await api().post(REFRESH_URL).set('Cookie', cookie);
      const token = await authModel.findOne({});

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
      expect(token?.revokedAt).toBeNull();
    });
  });
});
