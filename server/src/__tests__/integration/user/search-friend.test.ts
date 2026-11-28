import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { mockedRealtimePublisher } from '../../utils/common/app.js';
import { insertUser } from '../../utils/user/query.js';
import { insertFriendship } from '../../utils/relationship/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { searchFriendsRequest } from '../../utils/user/request.js';
import {
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { createFriendSearchQuery } from '../../utils/user/factory.js';
import { MAX_FRIEND_SEARCH_LIMIT } from '../../utils/user/constants.js';
import { invalidFriendSearchQueries } from '../../utils/user/invalid-inputs.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Search Friends By Name', () => {
  beforeEach(async () => {
    await truncateAll();
    vitest.clearAllMocks();
    mockedRealtimePublisher.isUserOnline.mockReset();
    mockedRealtimePublisher.isUserOnline.mockResolvedValue(true);
  });

  describe('Success', () => {
    it('when searching without query should return all active friends sorted by name and id with online status', async () => {
      // Arrange
      const currentUser = await insertUser();
      const charlie = await insertUser({ name: 'Charlie', imageUrl: null });
      const aliceB = await insertUser({
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Alice',
        imageUrl: 'https://cdn.example.com/alice-b.png',
      });
      const aliceA = await insertUser({
        id: '00000000-0000-0000-0000-000000000001',
        name: 'Alice',
        imageUrl: 'https://cdn.example.com/alice-a.png',
      });

      await Promise.all([
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: charlie._id,
          status: 'ACCEPTED',
        }),
        insertFriendship({
          requestedBy: aliceB._id,
          recipient: currentUser._id,
          status: 'ACCEPTED',
        }),
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: aliceA._id,
          status: 'ACCEPTED',
        }),
      ]);

      mockedRealtimePublisher.isUserOnline.mockImplementation(async (userId: string) => {
        return userId !== charlie._id;
      });

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({ accessToken });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          id: aliceA._id,
          name: 'Alice',
          imageUrl: 'https://cdn.example.com/alice-a.png',
          isOnline: true,
        },
        {
          id: aliceB._id,
          name: 'Alice',
          imageUrl: 'https://cdn.example.com/alice-b.png',
          isOnline: true,
        },
        {
          id: charlie._id,
          name: 'Charlie',
          imageUrl: null,
          isOnline: false,
        },
      ]);
    });

    it('when searching with partial name query should match case-insensitively', async () => {
      // Arrange
      const currentUser = await insertUser();
      const alice = await insertUser({ name: 'Alice' });
      const malik = await insertUser({ name: 'Malik' });
      const bob = await insertUser({ name: 'Bob' });

      await Promise.all([
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: alice._id,
          status: 'ACCEPTED',
        }),
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: malik._id,
          status: 'ACCEPTED',
        }),
        insertFriendship({ requestedBy: currentUser._id, recipient: bob._id, status: 'ACCEPTED' }),
      ]);

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ q: 'ALI' }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        { id: alice._id, name: 'Alice', imageUrl: null, isOnline: true },
        { id: malik._id, name: 'Malik', imageUrl: null, isOnline: true },
      ]);
    });

    it('when query has leading and trailing whitespace should trim and match friends', async () => {
      // Arrange
      const currentUser = await insertUser();
      const alice = await insertUser({ name: 'Alice' });
      await insertFriendship({
        requestedBy: currentUser._id,
        recipient: alice._id,
        status: 'ACCEPTED',
      });

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ q: '  alice  ' }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        { id: alice._id, name: 'Alice', imageUrl: null, isOnline: true },
      ]);
    });

    it('when pagination parameters are provided should return requested slice of friends', async () => {
      // Arrange
      const currentUser = await insertUser();
      const friendNames = ['Anna', 'Bella', 'Cara', 'Dana', 'Ella'];
      const friends = await Promise.all(friendNames.map((name) => insertUser({ name })));
      await Promise.all(
        friends.map((friend) =>
          insertFriendship({
            requestedBy: currentUser._id,
            recipient: friend._id,
            status: 'ACCEPTED',
          }),
        ),
      );

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ page: 2, limit: 2 }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        { id: friends[2]._id, name: 'Cara', imageUrl: null, isOnline: true },
        { id: friends[3]._id, name: 'Dana', imageUrl: null, isOnline: true },
      ]);
    });

    it('when limit is set to boundary values 1 and max limit should succeed', async () => {
      // Arrange
      const currentUser = await insertUser();
      const anna = await insertUser({ name: 'Anna' });
      const bella = await insertUser({ name: 'Bella' });
      await Promise.all([
        insertFriendship({ requestedBy: currentUser._id, recipient: anna._id, status: 'ACCEPTED' }),
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: bella._id,
          status: 'ACCEPTED',
        }),
      ]);

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const minLimitResponse = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ limit: 1 }),
      });
      const maxLimitResponse = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ limit: MAX_FRIEND_SEARCH_LIMIT }),
      });

      // Assert
      expectSuccessDataResponse(minLimitResponse, 200, [
        { id: anna._id, name: 'Anna', imageUrl: null, isOnline: true },
      ]);
      expectSuccessDataResponse(maxLimitResponse, 200, [
        { id: anna._id, name: 'Anna', imageUrl: null, isOnline: true },
        { id: bella._id, name: 'Bella', imageUrl: null, isOnline: true },
      ]);
    });

    it('when page exceeds available friends should return empty array', async () => {
      // Arrange
      const currentUser = await insertUser();
      const friend = await insertUser({ name: 'Anna' });
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
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ page: 2, limit: 20 }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, []);
    });
  });

  describe('Validation', () => {
    it.each(invalidFriendSearchQueries)(
      'when $description should return bad request',
      async ({ query, expectedDetail }) => {
        // Arrange
        const currentUser = await insertUser();
        const accessToken = await createAccessToken({
          userId: currentUser._id,
          tokenVersion: currentUser.tokenVersion,
        });

        // Act
        const response = await searchFriendsRequest({ accessToken, query });

        // Assert
        expectValidationError(response, expectedDetail);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) => searchFriendsRequest({ authorizationHeader }),
  });

  describe('Business Logic', () => {
    it('when user has no friends should return empty array without querying online status', async () => {
      // Arrange
      const currentUser = await insertUser({ name: 'Alice' });
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ q: 'Alice' }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, []);
      expect(mockedRealtimePublisher.isUserOnline).not.toHaveBeenCalled();
    });

    it('when relationships are pending, rejected, or belong to other users should exclude them', async () => {
      // Arrange
      const currentUser = await insertUser({ name: 'Current User' });
      const acceptedFriend = await insertUser({ name: 'Match Accepted' });
      const outgoingPending = await insertUser({ name: 'Match Outgoing' });
      const incomingPending = await insertUser({ name: 'Match Incoming' });
      const rejectedUser = await insertUser({ name: 'Match Rejected' });
      const strangerA = await insertUser({ name: 'Match Stranger A' });
      const strangerB = await insertUser({ name: 'Match Stranger B' });

      await Promise.all([
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: acceptedFriend._id,
          status: 'ACCEPTED',
        }),
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: outgoingPending._id,
          status: 'PENDING',
        }),
        insertFriendship({
          requestedBy: incomingPending._id,
          recipient: currentUser._id,
          status: 'PENDING',
        }),
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: rejectedUser._id,
          status: 'REJECTED',
        }),
        insertFriendship({
          requestedBy: strangerA._id,
          recipient: strangerB._id,
          status: 'ACCEPTED',
        }),
      ]);

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ q: 'Match' }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          id: acceptedFriend._id,
          name: 'Match Accepted',
          imageUrl: null,
          isOnline: true,
        },
      ]);
    });

    it('when an accepted friend is DISABLED should exclude disabled friend from results', async () => {
      // Arrange
      const currentUser = await insertUser();
      const activeFriend = await insertUser({ name: 'Friend Active', status: 'ACTIVE' });
      const disabledFriend = await insertUser({ name: 'Friend Disabled', status: 'DISABLED' });

      await Promise.all([
        insertFriendship({
          requestedBy: currentUser._id,
          recipient: activeFriend._id,
          status: 'ACCEPTED',
        }),
        insertFriendship({
          requestedBy: disabledFriend._id,
          recipient: currentUser._id,
          status: 'ACCEPTED',
        }),
      ]);

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });

      // Act
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ q: 'Friend' }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          id: activeFriend._id,
          name: 'Friend Active',
          imageUrl: null,
          isOnline: true,
        },
      ]);
    });

    it('when no friends match the search query should return empty array', async () => {
      // Arrange
      const currentUser = await insertUser({ name: 'Zed' });
      const friend = await insertUser({ name: 'Alice' });
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
      const response = await searchFriendsRequest({
        accessToken,
        query: createFriendSearchQuery({ q: 'Zed' }),
      });

      // Assert
      expectSuccessDataResponse(response, 200, []);
      expect(mockedRealtimePublisher.isUserOnline).not.toHaveBeenCalled();
    });
  });

  describe('Server Error', () => {
    it('when relationship query fails should return server error', async () => {
      // Arrange
      const currentUser = await insertUser();
      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });
      const findFriendshipSpy = vitest.spyOn(friendshipModel, 'find').mockImplementationOnce(() => {
        throw new Error('Friendship query failed');
      });

      try {
        // Act
        const response = await searchFriendsRequest({ accessToken });

        // Assert
        expectServerError(response);
      } finally {
        findFriendshipSpy.mockRestore();
      }
    });

    it('when user query fails should return server error', async () => {
      // Arrange
      const currentUser = await insertUser();
      const friend = await insertUser({ name: 'Alice' });
      await insertFriendship({
        requestedBy: currentUser._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });
      const findUserSpy = vitest.spyOn(userModel, 'find').mockImplementationOnce(() => {
        throw new Error('User query failed');
      });

      try {
        // Act
        const response = await searchFriendsRequest({ accessToken });

        // Assert
        expectServerError(response);
      } finally {
        findUserSpy.mockRestore();
      }
    });

    it('when realtime presence check fails should return server error', async () => {
      // Arrange
      const currentUser = await insertUser();
      const friend = await insertUser({ name: 'Alice' });
      await insertFriendship({
        requestedBy: currentUser._id,
        recipient: friend._id,
        status: 'ACCEPTED',
      });

      const accessToken = await createAccessToken({
        userId: currentUser._id,
        tokenVersion: currentUser.tokenVersion,
      });
      mockedRealtimePublisher.isUserOnline.mockRejectedValueOnce(
        new Error('Realtime service unavailable'),
      );

      // Act
      const response = await searchFriendsRequest({ accessToken });

      // Assert
      expectServerError(response);
    });
  });
});
