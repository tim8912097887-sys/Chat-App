import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../utils/common/app.js';
import { LOGOUT_ALL_URL, SIGNUP_URL } from '../../utils/auth/constants.js';
import { truncateAll, userModel } from '../../utils/common/query.js';
import {
  expectAuthError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { signupUserInput } from '../../utils/auth/factory.js';
import { MongoRelationshipRepository } from '../../../domain/relationship/relationship.repository.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';
import { FRIEND_SEARCH_URL, USER_SEARCH_URL } from '../../utils/user/constants.js';
import {
  invalidFriendSearchQueries,
  invalidSearchQueries,
} from '../../utils/user/invalid-inputs.js';
import { friendSearchRequest, signupAndLogin } from '../../utils/user/query.js';

describe('user search', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when search code for non-existent user should return null', async () => {
      const input = signupUserInput({});
      await api().post(SIGNUP_URL).send(input);
      const user = (await userModel
        .findOne({ email: input.email })
        .select({ searchCode: 1 })
        .lean()
        .exec()) as { searchCode: string };

      const response = await api()
        .get(USER_SEARCH_URL)
        .query({ q: user.searchCode.substring(0, 6) + '29' });

      expectSuccessDataResponse(response, 200, null);
    });

    it('when search code for not active user should return null', async () => {
      const input = signupUserInput({});
      await api().post(SIGNUP_URL).send(input);
      await userModel.updateOne({ email: input.email }, { status: 'DISABLED' });
      const user = (await userModel
        .findOne({ email: input.email })
        .select({ searchCode: 1 })
        .lean()
        .exec()) as { searchCode: string };

      const response = await api().get(USER_SEARCH_URL).query({ q: user.searchCode });

      expectSuccessDataResponse(response, 200, null);
    });

    it('when search code for active user should return user', async () => {
      const input = signupUserInput({});
      await api().post(SIGNUP_URL).send(input);
      const user = (await userModel
        .findOne({ email: input.email })
        .select({ searchCode: 1 })
        .lean()
        .exec()) as { searchCode: string };

      const response = await api().get(USER_SEARCH_URL).query({ q: user.searchCode });

      expectSuccessDataResponse(response, 200, {
        id: expect.any(String),
        name: expect.any(String),
        image: null,
      });
    });

    it('when search for friends with no friends should return empty array', async () => {
      const { accessToken } = await signupAndLogin();

      const response = await friendSearchRequest(accessToken);

      expectSuccessDataResponse(response, 200, []);
    });
  });

  describe('validation fail', () => {
    it.each(invalidSearchQueries)(
      'when search receives $description should return 400',
      async ({ query, field }) => {
        const response = await api().get(USER_SEARCH_URL).query(query);

        expectValidationError(response, field);
      },
    );

    it.each(invalidFriendSearchQueries)(
      'when friend search receives $description should return 400',
      async ({ query, field }) => {
        const { accessToken } = await signupAndLogin();
        const response = await friendSearchRequest(accessToken).query(query);

        expectValidationError(response, field);
      },
    );
  });

  describe('authentication fail', () => {
    it.each([
      {
        description: 'no access token',
        authorization: undefined,
        expectedDetail: 'Missing access token',
      },
      {
        description: 'an authorization header that is not Bearer type',
        authorization: 'Basic not-a-valid-token',
        expectedDetail: 'Missing access token',
      },
      {
        description: 'an invalid Bearer token',
        authorization: 'Bearer not-a-valid-token',
        expectedDetail: 'Invalid refresh token',
      },
    ])(
      'when friend search receives $description should return 401',
      async ({ authorization, expectedDetail }) => {
        const request = api().get(FRIEND_SEARCH_URL);
        if (authorization) request.set('Authorization', authorization);

        const response = await request;

        expectAuthError(response, expectedDetail);
      },
    );

    it('when friend search uses a token for a non-existent user should return 401', async () => {
      const { email, accessToken } = await signupAndLogin();
      await userModel.deleteOne({ email });

      const response = await friendSearchRequest(accessToken);

      expectAuthError(response, 'Invalid user token');
    });

    it('when friend search uses a token for an inactive user should return 401', async () => {
      const { email, accessToken } = await signupAndLogin();
      await userModel.updateOne({ email }, { $set: { status: 'DISABLED' } });

      const response = await friendSearchRequest(accessToken);

      expectAuthError(response, 'Invalid user token');
    });

    it('when friend search uses a token with a stale token version should return 401', async () => {
      const { accessToken, refreshCookie } = await signupAndLogin();
      const logoutResponse = await api().post(LOGOUT_ALL_URL).set('Cookie', refreshCookie);
      expect(logoutResponse.status).toBe(200);

      const response = await friendSearchRequest(accessToken);

      expectAuthError(response, 'Invalid user token');
    });
  });

  describe('server error', () => {
    it('when user repository fails during search should return 500 with server error', async () => {
      vi.spyOn(MongoUserRepository.prototype, 'findActiveBySearchCode').mockRejectedValue(
        new Error('database unavailable'),
      );

      const response = await api().get(USER_SEARCH_URL).query({ q: '12345678' });

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        state: 'error',
        error: {
          code: 'SERVER_ERROR',
          detail: 'An unexpected error occurred. Please try again later.',
        },
        data: null,
      });
    });

    it('when relationship repository fails during friend search should return 500 with server error', async () => {
      const { accessToken } = await signupAndLogin();
      const relationshipRepositorySpy = vi
        .spyOn(MongoRelationshipRepository.prototype, 'findById')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await friendSearchRequest(accessToken);

      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        state: 'error',
        error: {
          code: 'SERVER_ERROR',
          detail: 'An unexpected error occurred. Please try again later.',
        },
        data: null,
      });
      expect(relationshipRepositorySpy).toHaveBeenCalledOnce();
    });
  });
});
