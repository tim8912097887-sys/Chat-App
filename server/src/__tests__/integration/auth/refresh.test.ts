import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authModel, truncateAll } from '../../utils/common/query.js';
import { refreshRequest } from '../../utils/auth/request.js';
import {
  createUnstoredRefreshCookie,
  createWrongTypeCookie,
  findAllRefreshTokens,
  findRefreshTokenById,
  findRefreshTokensByFamilyId,
  insertAuthenticatedSession,
  insertRefreshToken,
} from '../../utils/auth/query.js';
import {
  expectAuthError,
  expectServerError,
  expectSuccessDataResponse,
} from '../../utils/common/assertion.js';
import {
  createExpiredRefreshCookie,
  createRefreshCookieHeader,
  extractCookieValue,
  hashToken,
} from '../../utils/auth/factory.js';
import { findUserById, insertUser } from '../../utils/user/query.js';
import { invalidRefreshCookieCases } from '../../utils/auth/invalid-inputs.js';
import { MongoAuthRepository } from '../../../domain/auth/auth.repository.js';
import { REFRESH_COOKIE_NAME } from '../../utils/auth/constants.js';

describe('Refresh', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Success', () => {
    it('when_refresh_uses_valid_token_should_rotate_token_and_return_200_with_access_token', async () => {
      // Arrange
      const { user, record, cookie } = await insertAuthenticatedSession();

      // Act
      const res = await refreshRequest(cookie);

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

      const newRawToken = extractCookieValue(res.headers['set-cookie'], REFRESH_COOKIE_NAME);
      expect(newRawToken).toBeTruthy();

      const updatedUser = await findUserById(user._id);
      expect(updatedUser?.tokenVersion).toBe(0);

      const allTokens = await findAllRefreshTokens();
      expect(allTokens).toHaveLength(2);

      const oldRecord = allTokens.find((item) => item._id === record._id);
      const newRecord = allTokens.find((item) => item._id !== record._id);

      expect(oldRecord).toEqual(
        expect.objectContaining({
          _id: record._id,
          familyId: record.familyId,
          userId: user._id,
          revokedAt: expect.any(Date),
          replacedById: newRecord?._id,
        }),
      );
      expect(newRecord).toEqual(
        expect.objectContaining({
          _id: oldRecord?.replacedById,
          familyId: record.familyId,
          userId: user._id,
          parentId: record._id,
          tokenHash: hashToken(newRawToken!),
          replacedById: null,
          revokedAt: null,
        }),
      );
    });
  });

  describe('Authentication', () => {
    it.each(invalidRefreshCookieCases)('$description', async ({ kind, cookie, expectedDetail }) => {
      // Arrange
      let cookieHeader = cookie;
      if (kind === 'expired') {
        cookieHeader = await createExpiredRefreshCookie();
      } else if (kind === 'wrong-token-type') {
        cookieHeader = await createWrongTypeCookie('some-user-id');
      }

      // Act
      const res = await refreshRequest(cookieHeader);

      // Assert
      expect(res.status).toBe(401);
      expectAuthError(res, expectedDetail);
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });
  });

  describe('Business Logic', () => {
    it('when_refresh_uses_token_for_nonexistent_user_should_return_401', async () => {
      // Arrange
      const missingUserId = randomUUID();
      const { tokenHash, cookie } = await createRefreshCookieHeader({ userId: missingUserId });
      await insertRefreshToken({ userId: missingUserId, tokenHash });

      // Act
      const res = await refreshRequest(cookie);

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

    it('when_refresh_uses_token_for_disabled_user_should_return_401_and_not_revoke_token', async () => {
      // Arrange
      const { user, record, cookie } = await insertAuthenticatedSession({
        user: { status: 'DISABLED' },
      });

      // Act
      const res = await refreshRequest(cookie);

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
      const dbToken = await findRefreshTokenById(record._id);
      expect(dbUser?.tokenVersion).toBe(0);
      expect(dbToken?.revokedAt).toBeNull();
      expect(await findAllRefreshTokens()).toHaveLength(1);
    });

    it('when_refresh_uses_token_with_mismatched_token_version_should_return_401', async () => {
      // Arrange
      const { user, record, cookie } = await insertAuthenticatedSession({
        user: { tokenVersion: 1 },
        jwtTokenVersion: 0,
      });

      // Act
      const res = await refreshRequest(cookie);

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
      const dbToken = await findRefreshTokenById(record._id);
      expect(dbUser?.tokenVersion).toBe(1);
      expect(dbToken?.revokedAt).toBeNull();
    });

    it('when_refresh_uses_token_without_db_record_should_return_401', async () => {
      // Arrange
      const user = await insertUser();
      const cookie = await createUnstoredRefreshCookie(user._id, user.tokenVersion);

      // Act
      const res = await refreshRequest(cookie);

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
      expect(await findAllRefreshTokens()).toHaveLength(0);
    });

    it('when_refresh_uses_expired_db_token_record_should_return_401', async () => {
      // Arrange
      const { cookie } = await insertAuthenticatedSession({
        token: { expiredAt: new Date(Date.now() - 1000) },
      });

      // Act
      const res = await refreshRequest(cookie);

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
      expect(await findAllRefreshTokens()).toHaveLength(1);
    });

    it('when_refresh_reuses_already_replaced_token_should_return_401_and_revoke_token_family', async () => {
      // Arrange
      const user = await insertUser();
      const familyId = randomUUID();
      const parentId = randomUUID();
      const childId = randomUUID();

      const { tokenHash: parentHash, cookie: parentCookie } = await createRefreshCookieHeader({
        userId: user._id,
        tokenVersion: user.tokenVersion,
      });
      const { tokenHash: childHash } = await createRefreshCookieHeader({
        userId: user._id,
        tokenVersion: user.tokenVersion,
      });

      await insertRefreshToken({
        id: parentId,
        familyId,
        userId: user._id,
        tokenHash: parentHash,
        revokedAt: new Date(Date.now() - 6 * 60 * 1000),
        replacedById: childId,
      });
      await insertRefreshToken({
        id: childId,
        familyId,
        userId: user._id,
        tokenHash: childHash,
        parentId,
        revokedAt: null,
        replacedById: null,
      });

      // Act
      const res = await refreshRequest(parentCookie);

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

      const familyTokens = await findRefreshTokensByFamilyId(familyId);
      expect(familyTokens).toHaveLength(2);
      expect(familyTokens.every((token) => token.revokedAt !== null)).toBe(true);
    });

    it('when_refresh_uses_revoked_logged_out_token_should_return_401_and_not_create_token', async () => {
      // Arrange
      const { record, cookie } = await insertAuthenticatedSession({
        token: { revokedAt: new Date(), replacedById: null },
      });

      // Act
      const res = await refreshRequest(cookie);

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

      const allTokens = await findAllRefreshTokens();
      expect(allTokens).toHaveLength(1);
      expect(allTokens[0]?._id).toBe(record._id);
    });
  });

  describe('Concurrency', () => {
    it('when_two_concurrent_refresh_requests_use_same_token_should_allow_only_one_and_prevent_duplicate_tokens', async () => {
      // Arrange
      const { user, record, cookie } = await insertAuthenticatedSession();

      // Act
      const responses = await Promise.all([refreshRequest(cookie), refreshRequest(cookie)]);

      // Assert
      const [succeeded, rejected] = [...responses].sort((a, b) => a.status - b.status);
      expect(succeeded?.status).toBe(200);
      expectSuccessDataResponse(succeeded!, 200, {
        accessToken: expect.any(String),
        user: {
          id: user._id,
          name: user.name,
          imageUrl: null,
          searchCode: user.searchCode,
        },
      });
      expect(rejected?.status).toBe(401);
      expect(rejected?.body).toMatchObject({
        state: 'error',
        error: {
          code: 'UnauthenticationError',
          detail: 'Invalid token',
        },
        data: null,
      });

      const tokens = await findAllRefreshTokens();
      expect(tokens).toHaveLength(2);

      const original = tokens.find((token) => token._id === record._id);
      const child = tokens.find((token) => token._id !== record._id);
      expect(original?.revokedAt).toBeInstanceOf(Date);
      expect(original?.replacedById).toBe(child?._id);
    });
  });

  describe('Server Error', () => {
    it('when_atomic_update_fails_during_refresh_should_return_500_and_not_revoke_token', async () => {
      // Arrange
      const { record, cookie } = await insertAuthenticatedSession();
      const atomicUpdateSpy = vi
        .spyOn(MongoAuthRepository.prototype, 'atomicUpdateRefreshToken')
        .mockRejectedValue(new Error('database unavailable'));

      // Act
      const res = await refreshRequest(cookie);

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);
      expect(atomicUpdateSpy).toHaveBeenCalledOnce();

      const dbToken = await findRefreshTokenById(record._id);
      expect(dbToken?.revokedAt).toBeNull();
      expect(dbToken?.replacedById).toBeNull();
      expect(await findAllRefreshTokens()).toHaveLength(1);
    });

    it('when_transaction_fails_creating_replacement_token_should_rollback_revocation_and_return_500', async () => {
      // Arrange
      const { record, cookie } = await insertAuthenticatedSession();
      vi.spyOn(authModel, 'create').mockRejectedValueOnce(new Error('insert failed'));

      // Act
      const res = await refreshRequest(cookie);

      // Assert
      expect(res.status).toBe(500);
      expectServerError(res);

      const dbToken = await findRefreshTokenById(record._id);
      expect(dbToken?.revokedAt).toBeNull();
      expect(dbToken?.replacedById).toBeNull();
      expect(await findAllRefreshTokens()).toHaveLength(1);
    });
  });
});
