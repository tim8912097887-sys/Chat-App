import { beforeEach, describe, it, vitest } from 'vitest';
import { truncateAll, userModel } from '../../utils/common/query.js';
import { insertUser } from '../../utils/user/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { getProfileRequest } from '../../utils/user/request.js';
import { expectServerError, expectSuccessDataResponse } from '../../utils/common/assertion.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Get User Profile', () => {
  beforeEach(async () => {
    await truncateAll();
    vitest.clearAllMocks();
  });

  describe('Success', () => {
    it('when user has full profile including imageUrl should return user profile', async () => {
      // Arrange
      const user = await insertUser({
        name: 'Alice',
        email: 'alice@example.com',
        imageUrl: 'https://cdn.example.com/alice.png',
      });
      const accessToken = await createAccessToken({
        userId: user._id,
        tokenVersion: user.tokenVersion,
      });

      // Act
      const response = await getProfileRequest({ accessToken });

      // Assert
      expectSuccessDataResponse(response, 200, {
        id: user._id,
        name: 'Alice',
        email: 'alice@example.com',
        searchCode: user.searchCode,
        imageUrl: 'https://cdn.example.com/alice.png',
      });
    });

    it('when user has no imageUrl should return profile with null imageUrl', async () => {
      // Arrange
      const user = await insertUser({
        name: 'Bob',
        email: 'bob@example.com',
        imageUrl: null,
      });
      const accessToken = await createAccessToken({
        userId: user._id,
        tokenVersion: user.tokenVersion,
      });

      // Act
      const response = await getProfileRequest({ accessToken });

      // Assert
      expectSuccessDataResponse(response, 200, {
        id: user._id,
        name: 'Bob',
        email: 'bob@example.com',
        searchCode: user.searchCode,
        imageUrl: null,
      });
    });
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) => getProfileRequest({ authorizationHeader }),
  });

  describe('Server Error', () => {
    it('when database fails during user validation should return server error', async () => {
      // Arrange
      const user = await insertUser();
      const accessToken = await createAccessToken({
        userId: user._id,
        tokenVersion: user.tokenVersion,
      });
      const findByIdSpy = vitest.spyOn(userModel, 'findById').mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      try {
        // Act
        const response = await getProfileRequest({ accessToken });

        // Assert
        expectServerError(response);
      } finally {
        findByIdSpy.mockRestore();
      }
    });
  });
});
