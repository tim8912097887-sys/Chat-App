import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../../utils/common/app.js';
import { LOGOUT_ALL_URL, SIGNUP_URL } from '../../utils/auth/constants.js';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import {
  expectAuthError,
  expectServerError,
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
import { acceptRelationship, inviteFriend } from '../../utils/relationship/query.js';

describe('user search', () => {
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
        imageUrl: null,
      });
    });

    it('when search for friends with no friends should return empty array', async () => {
      const { accessToken } = await signupAndLogin();

      const response = await friendSearchRequest(accessToken);

      expectSuccessDataResponse(response, 200, []);
    });

    it('when searching friends by name across pages should return distinct matching friends', async () => {
      const { accessToken: ownerAccessToken, email: ownerEmail } = await signupAndLogin();
      const owner = await userModel.findOne({ email: ownerEmail });
      expect(owner).not.toBeNull();
      const friends: Array<{ id: string; name: string; imageUrl: null }> = [];

      for (const suffix of ['A', 'B', 'C']) {
        const { accessToken: friendAccessToken, email } = await signupAndLogin();
        const friend = await userModel.findOneAndUpdate(
          { email },
          { $set: { name: `Pagination Friend ${suffix}` } },
          { returnDocument: 'after' },
        );
        expect(friend).not.toBeNull();

        const inviteResponse = await inviteFriend(ownerAccessToken, friend!._id.toString());
        expect(inviteResponse.status).toBe(201);
        const request = await friendshipModel.findOne({
          userIds: { $all: [owner!._id.toString(), friend!._id.toString()], $size: 2 },
        });
        expect(request).not.toBeNull();
        const acceptResponse = await acceptRelationship(friendAccessToken, request!._id.toString());
        expect(acceptResponse.status).toBe(200);

        friends.push({
          id: friend!._id.toString(),
          name: friend!.name,
          imageUrl: null,
        });
      }

      const firstPage = await friendSearchRequest(ownerAccessToken).query({
        q: 'Pagination Friend',
        page: 1,
        limit: 2,
      });
      const secondPage = await friendSearchRequest(ownerAccessToken).query({
        q: 'Pagination Friend',
        page: 2,
        limit: 2,
      });

      expectSuccessDataResponse(firstPage, 200, friends.slice(0, 2));
      expectSuccessDataResponse(secondPage, 200, friends.slice(2));
      expect(
        firstPage.body.data.some((first: { id: string }) =>
          secondPage.body.data.some((second: { id: string }) => second.id === first.id),
        ),
      ).toBe(false);
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

      expectServerError(response);
    });

    it('when relationship repository fails during friend search should return 500 with server error', async () => {
      const { accessToken } = await signupAndLogin();
      const relationshipRepositorySpy = vi
        .spyOn(MongoRelationshipRepository.prototype, 'findFriendsByUserId')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await friendSearchRequest(accessToken);

      expectServerError(response);
      expect(relationshipRepositorySpy).toHaveBeenCalledOnce();
    });
  });
});
