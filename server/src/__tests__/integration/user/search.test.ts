import { beforeEach, describe, it, vi } from 'vitest';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { insertUser } from '../../utils/user/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { searchUserRequest } from '../../utils/user/request.js';
import { createSearchUserQuery } from '../../utils/user/factory.js';
import {
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { RELATIONSHIP_STATE } from '../../../domain/relationship/relationship.constants.js';
import { invalidSearchCodeQueries } from '../../utils/user/invalid-inputs.js';
import { insertFriendship } from '../../utils/relationship/query.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Search User By Search Code', () => {
  beforeEach(async () => {
    await truncateAll();
    vi.clearAllMocks();
  });

  describe('Success', () => {
    it('when searching active user with no relationship should return user with NONE state', async () => {
      // Arrange
      const currentUser = await insertUser();
      const targetUser = await insertUser({
        name: 'Target User',
        imageUrl: 'https://cdn.example.com/target.png',
        searchCode: 'AbCd1234',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('AbCd1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: targetUser._id,
          name: 'Target User',
          imageUrl: 'https://cdn.example.com/target.png',
        },
        state: RELATIONSHIP_STATE.NONE,
      });
    });

    it('when search code has leading and trailing whitespace should trim and return user', async () => {
      // Arrange
      const currentUser = await insertUser();
      const targetUser = await insertUser({
        name: 'Trimmed Target',
        imageUrl: null,
        searchCode: 'Trim1234',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('  Trim1234  '),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: targetUser._id,
          name: 'Trimmed Target',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.NONE,
      });
    });
  });

  describe('Validation', () => {
    it.each(invalidSearchCodeQueries)(
      'when $description should return bad request',
      async ({ query, expectedDetail }) => {
        // Arrange
        const currentUser = await insertUser();
        const accessToken = await createAccessToken({
          userId: currentUser._id,
          tokenVersion: currentUser.tokenVersion,
        });

        // Act
        const response = await searchUserRequest({ accessToken, query });

        // Assert
        expectValidationError(response, expectedDetail);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      searchUserRequest({
        authorizationHeader,
        query: createSearchUserQuery('AbCd1234'),
      }),
  });

  describe('Business Logic', () => {
    it('when no user matches search code should return null', async () => {
      // Arrange
      const currentUser = await insertUser();
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('NoMatch1'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, null);
    });

    it('when search code casing differs from stored code should return null', async () => {
      // Arrange
      const currentUser = await insertUser();
      await insertUser({ searchCode: 'Case1234' });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('case1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, null);
    });

    it('when target user is DISABLED should return null', async () => {
      // Arrange
      const currentUser = await insertUser();
      await insertUser({ status: 'DISABLED', searchCode: 'Disa1234' });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Disa1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, null);
    });

    it('when searching own search code should return user with SELF state', async () => {
      // Arrange
      const currentUser = await insertUser({
        name: 'Self User',
        searchCode: 'Self1234',
        imageUrl: null,
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Self1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: currentUser._id,
          name: 'Self User',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.SELF,
      });
    });

    it('when target user is an accepted friend requested by current user should return FRIEND state', async () => {
      // Arrange
      const currentUser = await insertUser();
      const friend = await insertUser({ name: 'Friend A', searchCode: 'Frnd1234' });
      await insertFriendship({
        requestedBy: currentUser._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Frnd1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: friend._id,
          name: 'Friend A',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.FRIEND,
      });
    });

    it('when target user is an accepted friend who invited current user should return FRIEND state', async () => {
      // Arrange
      const currentUser = await insertUser();
      const friend = await insertUser({ name: 'Friend B', searchCode: 'Frnd5678' });
      await insertFriendship({
        requestedBy: friend._id,
        recipient: currentUser._id,
        status: 'ACCEPTED',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Frnd5678'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: friend._id,
          name: 'Friend B',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.FRIEND,
      });
    });

    it('when current user has a pending outgoing invite to target should return INVITE state', async () => {
      // Arrange
      const currentUser = await insertUser();
      const target = await insertUser({ name: 'Invited User', searchCode: 'Invt1234' });
      await insertFriendship({
        requestedBy: currentUser._id,
        recipient: target._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Invt1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: target._id,
          name: 'Invited User',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.INVITE,
      });
    });

    it('when target user sent a pending invite to current user should return RECIPIENT state', async () => {
      // Arrange
      const currentUser = await insertUser();
      const sender = await insertUser({ name: 'Sender User', searchCode: 'Recv1234' });
      await insertFriendship({
        requestedBy: sender._id,
        recipient: currentUser._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Recv1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: sender._id,
          name: 'Sender User',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.RECIPIENT,
      });
    });

    it('when previous friend request was rejected should return NONE state', async () => {
      // Arrange
      const currentUser = await insertUser();
      const target = await insertUser({ name: 'Rejected User', searchCode: 'Rejt1234' });
      await insertFriendship({
        requestedBy: currentUser._id,
        recipient: target._id,
        status: 'REJECTED',
      });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchUserRequest({
        accessToken,
        query: createSearchUserQuery('Rejt1234'),
      });

      // Assert
      expectSuccessDataResponse(response, 200, {
        user: {
          id: target._id,
          name: 'Rejected User',
          imageUrl: null,
        },
        state: RELATIONSHIP_STATE.NONE,
      });
    });
  });

  describe('Server Error', () => {
    it('when user database query fails should return server error', async () => {
      // Arrange
      const currentUser = await insertUser();
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });
      const findOneUserSpy = vi.spyOn(userModel, 'findOne').mockImplementationOnce(() => {
        throw new Error('User query failed');
      });

      try {
        // Act
        const response = await searchUserRequest({
          accessToken,
          query: createSearchUserQuery('AbCd1234'),
        });

        // Assert
        expectServerError(response);
      } finally {
        findOneUserSpy.mockRestore();
      }
    });

    it('when relationship database query fails should return server error', async () => {
      // Arrange
      const currentUser = await insertUser();
      await insertUser({ searchCode: 'AbCd1234' });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });
      const findOneFriendshipSpy = vi
        .spyOn(friendshipModel, 'findOne')
        .mockImplementationOnce(() => {
          throw new Error('Relationship query failed');
        });

      try {
        // Act
        const response = await searchUserRequest({
          accessToken,
          query: createSearchUserQuery('AbCd1234'),
        });

        // Assert
        expectServerError(response);
      } finally {
        findOneFriendshipSpy.mockRestore();
      }
    });
  });
});
