import { type Response } from 'supertest';
import { describe } from 'vitest';
import { expectAuthError } from './assertion.js';
import { it } from 'vitest';
import { insertUser } from '../user/query.js';
import {
  createAccessToken,
  createExpiredAccessToken,
  createInvalidSecretAccessToken,
  createSignedRefreshToken,
} from '../auth/factory.js';
import { randomUUID } from 'crypto';
import { config } from '../../../config/env/index.js';

export interface InvalidAuthHeaderCase {
  caseName: string;
  authorizationHeader?: string;
  expectedDetail: string;
}

export const invalidAuthHeaderCases: InvalidAuthHeaderCase[] = [
  {
    caseName: 'authorization header is missing',
    authorizationHeader: undefined,
    expectedDetail: 'Missing access token',
  },
  {
    caseName: 'authorization header is empty',
    authorizationHeader: '',
    expectedDetail: 'Missing access token',
  },
  {
    caseName: 'authorization header uses non-Bearer scheme',
    authorizationHeader: 'Basic dXNlcjpwYXNz',
    expectedDetail: 'Missing access token',
  },
  {
    caseName: 'authorization header has Bearer prefix without token',
    authorizationHeader: 'Bearer',
    expectedDetail: 'Missing access token',
  },
  {
    caseName: 'authorization header has extra space-separated parts',
    authorizationHeader: 'Bearer token1 token2',
    expectedDetail: 'Missing access token',
  },
  {
    caseName: 'authorization header has Bearer prefix with empty token',
    authorizationHeader: 'Bearer ',
    expectedDetail: 'Missing access token',
  },
  {
    caseName: 'access token is not a valid JWT string',
    authorizationHeader: 'Bearer invalid.jwt.token',
    expectedDetail: 'Invalid access token',
  },
];

export interface DescribeAuthTestsOptions {
  /**
   * Executes the endpoint request using the provided Authorization header
   * (or omitting it when `authorizationHeader` is `undefined`).
   */
  sendRequest: (params: { authorizationHeader?: string }) => Promise<Response>;

  /**
   * Optional assertions to verify no DB mutations or realtime events occurred.
   */
  assertNoSideEffects?: () => Promise<void> | void;
}

const toBearerHeader = (token: string): string => `Bearer ${token}`;

export const describeAuthenticationTests = ({
  sendRequest,
  assertNoSideEffects,
}: DescribeAuthTestsOptions): void => {
  describe('Authentication', () => {
    it.each(invalidAuthHeaderCases)(
      'when $caseName should return unauthorized',
      async ({ authorizationHeader, expectedDetail }) => {
        // Act
        const res = await sendRequest({ authorizationHeader });

        // Assert
        expectAuthError(res, expectedDetail);
        await assertNoSideEffects?.();
      },
    );

    it('when access token has invalid signature should return unauthorized', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createInvalidSecretAccessToken(user._id, user.tokenVersion);

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(token) });

      // Assert
      expectAuthError(res, 'Invalid access token');
      await assertNoSideEffects?.();
    });

    it('when access token is expired should return unauthorized', async () => {
      // Arrange
      const user = await insertUser();
      const token = await createExpiredAccessToken(user._id, user.tokenVersion);

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(token) });

      // Assert
      expectAuthError(res, 'Invalid access token');
      await assertNoSideEffects?.();
    });

    it('when refresh token signed with refresh secret is sent as access token should return unauthorized', async () => {
      // Arrange
      const user = await insertUser();
      const refreshToken = await createSignedRefreshToken({
        userId: user._id,
        tokenVersion: user.tokenVersion,
        type: 'refresh',
      });

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(refreshToken) });

      // Assert
      expectAuthError(res, 'Invalid access token');
      await assertNoSideEffects?.();
    });

    it('when refresh token signed with access secret is sent as access token should return unauthorized', async () => {
      // Arrange
      const user = await insertUser();
      const wrongTypeToken = await createSignedRefreshToken({
        userId: user._id,
        tokenVersion: user.tokenVersion,
        type: 'refresh',
        secret: config.jwt.accessSecret,
      });

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(wrongTypeToken) });

      // Assert
      expectAuthError(res, 'Invalid access token');
      await assertNoSideEffects?.();
    });

    it('when authenticated user does not exist should return unauthorized', async () => {
      // Arrange
      const token = await createAccessToken({ userId: randomUUID() });

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(token) });

      // Assert
      expectAuthError(res, 'Invalid token');
      await assertNoSideEffects?.();
    });

    it('when authenticated user status is DISABLED should return unauthorized', async () => {
      // Arrange
      const user = await insertUser({ status: 'DISABLED' });
      const token = await createAccessToken({
        userId: user._id,
        tokenVersion: user.tokenVersion,
      });

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(token) });

      // Assert
      expectAuthError(res, 'Invalid token');
      await assertNoSideEffects?.();
    });

    it('when access token tokenVersion mismatches user tokenVersion should return unauthorized', async () => {
      // Arrange
      const user = await insertUser({ tokenVersion: 2 });
      const token = await createAccessToken({
        userId: user._id,
        tokenVersion: 1,
      });

      // Act
      const res = await sendRequest({ authorizationHeader: toBearerHeader(token) });

      // Assert
      expectAuthError(res, 'Invalid token');
      await assertNoSideEffects?.();
    });
  });
};
