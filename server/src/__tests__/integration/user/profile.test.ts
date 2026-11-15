import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';
import { LOGOUT_ALL_URL } from '../../utils/auth/constants.js';
import {
  expectAuthError,
  expectServerError,
  expectSuccessDataResponse,
} from '../../utils/common/assertion.js';
import { api } from '../../utils/common/app.js';
import { truncateAll, userModel } from '../../utils/common/query.js';
import { USER_PROFILE_URL } from '../../utils/user/constants.js';
import { profileRequest, signupAndLogin } from '../../utils/user/query.js';

describe('user profile', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when profile is requested with a valid access token should return profile fields', async () => {
      const { accessToken, email } = await signupAndLogin();
      const user = await userModel.findOne({ email });
      expect(user).not.toBeNull();

      const response = await profileRequest(accessToken);

      expectSuccessDataResponse(response, 200, {
        id: user!._id.toString(),
        name: user!.name,
        email: user!.email,
        imageUrl: null,
        searchCode: user!.searchCode,
      });
    });
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
        description: 'an invalid access token',
        authorization: 'Bearer not-a-valid-token',
        expectedDetail: 'Invalid refresh token',
      },
    ])(
      'when profile is requested with $description should return 401',
      async ({ authorization, expectedDetail }) => {
        const request = api().get(USER_PROFILE_URL);
        if (authorization) request.set('Authorization', authorization);

        const response = await request;

        expectAuthError(response, expectedDetail);
      },
    );
  });

  describe('business logic fail', () => {
    it('when profile is requested for a user that does not exist should return 401', async () => {
      const { accessToken, email } = await signupAndLogin();
      await userModel.deleteOne({ email });

      const response = await profileRequest(accessToken);

      expectAuthError(response, 'Invalid user token');
    });

    it('when profile is requested for an inactive user should return 401', async () => {
      const { accessToken, email } = await signupAndLogin();
      await userModel.updateOne({ email }, { $set: { status: 'DISABLED' } });

      const response = await profileRequest(accessToken);

      expectAuthError(response, 'Invalid user token');
    });

    it('when profile is requested with a stale token version should return 401', async () => {
      const { accessToken, refreshCookie } = await signupAndLogin();
      const logoutResponse = await api().post(LOGOUT_ALL_URL).set('Cookie', refreshCookie);
      expect(logoutResponse.status).toBe(200);

      const response = await profileRequest(accessToken);

      expectAuthError(response, 'Invalid user token');
    });
  });

  describe('server error', () => {
    it('when the user repository fails during profile lookup should return 500', async () => {
      const { accessToken } = await signupAndLogin();
      const findById = vi
        .spyOn(MongoUserRepository.prototype, 'findById')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await profileRequest(accessToken);

      expectServerError(response);
      expect(findById).toHaveBeenCalledOnce();
    });
  });
});
