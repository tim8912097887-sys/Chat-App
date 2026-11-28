import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { friendshipModel, truncateAll } from '../../utils/common/query.js';
import { insertUser, updateUserStatusRaw } from '../../utils/user/query.js';
import { DEFAULT_AVATAR_URL } from '../../utils/relationship/constants.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { inviteFriend } from '../../utils/relationship/request.js';
import {
  expectServerConflictError,
  expectServerError,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import {
  findAllFriendships,
  findFriendshipById,
  findFriendshipByUsers,
  insertFriendship,
} from '../../utils/relationship/query.js';
import { buildPairKey } from '../../utils/relationship/factory.js';
import { mockedRealtimePublisher } from '../../utils/common/app.js';
import { FRIEND_REQUEST_CREATED_EVENT } from '../../../realtime/realtime.constants.js';
import { realtimeEventAssertion } from '../../utils/common/realtime.js';
import { invalidInviteFriendInputs } from '../../utils/relationship/invalid-inputs.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Invite Friend', () => {
  beforeEach(async () => {
    await truncateAll();
    vitest.clearAllMocks();
  });

  afterEach(() => {
    vitest.restoreAllMocks();
  });

  describe('Success', () => {
    it('when valid active target user is invited should create pending friend request and publish realtime event', async () => {
      // Arrange
      const requester = await insertUser({
        email: 'requester@example.com',
        name: 'Requester',
        imageUrl: DEFAULT_AVATAR_URL,
      });
      const target = await insertUser({ email: 'target@example.com', name: 'Target' });
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectSuccessMessageResponse(response, 201, 'Friend request sent');

      const friendship = await findFriendshipByUsers(requester._id, target._id);
      expect(friendship).not.toBeNull();
      expect(friendship).toMatchObject({
        requestedBy: requester._id,
        recipient: target._id,
        status: 'PENDING',
        pairKey: buildPairKey(requester._id, target._id),
      });

      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        target._id,
        realtimeEventAssertion(FRIEND_REQUEST_CREATED_EVENT, {
          requestId: friendship?._id,
          requester: {
            id: requester._id,
            name: 'Requester',
            imageUrl: DEFAULT_AVATAR_URL,
          },
        }),
      );
    });

    it('when requester has no imageUrl should publish realtime event with null imageUrl', async () => {
      // Arrange
      const requester = await insertUser({
        email: 'requester@example.com',
        name: 'NoAvatar',
        imageUrl: null,
      });
      const target = await insertUser({ email: 'target@example.com' });
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectSuccessMessageResponse(response, 201, 'Friend request sent');
      const friendship = await findFriendshipByUsers(requester._id, target._id);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        target._id,
        realtimeEventAssertion(FRIEND_REQUEST_CREATED_EVENT, {
          requestId: friendship?._id,
          requester: {
            id: requester._id,
            name: 'NoAvatar',
            imageUrl: null,
          },
        }),
      );
    });

    it('when previous friend request was rejected should reopen existing request as pending', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com', name: 'Requester' });
      const target = await insertUser({ email: 'target@example.com', name: 'Target' });
      const existing = await insertFriendship({
        requestedBy: requester._id,
        recipient: target._id,
        status: 'REJECTED',
      });
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectSuccessMessageResponse(response, 201, 'Friend request sent');

      const allFriendships = await findAllFriendships();
      expect(allFriendships).toHaveLength(1);
      const updated = await findFriendshipById(existing._id);
      expect(updated).toMatchObject({
        _id: existing._id,
        requestedBy: requester._id,
        recipient: target._id,
        status: 'PENDING',
      });
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        target._id,
        realtimeEventAssertion(FRIEND_REQUEST_CREATED_EVENT, {
          requestId: existing._id,
          requester: {
            id: requester._id,
            name: 'Requester',
            imageUrl: null,
          },
        }),
      );
    });

    it('when former recipient invites original requester after rejection should reopen and reverse direction', async () => {
      // Arrange
      const userA = await insertUser({ email: 'a@example.com', name: 'User A' });
      const userB = await insertUser({ email: 'b@example.com', name: 'User B' });
      const existing = await insertFriendship({
        requestedBy: userA._id,
        recipient: userB._id,
        status: 'REJECTED',
      });
      const tokenB = await createAccessToken({ userId: userB._id });

      // Act
      const response = await inviteFriend(tokenB, userA._id);

      // Assert
      expectSuccessMessageResponse(response, 201, 'Friend request sent');

      const allFriendships = await findAllFriendships();
      expect(allFriendships).toHaveLength(1);
      const updated = await findFriendshipById(existing._id);
      expect(updated).toMatchObject({
        _id: existing._id,
        requestedBy: userB._id,
        recipient: userA._id,
        status: 'PENDING',
      });
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        userA._id,
        realtimeEventAssertion(FRIEND_REQUEST_CREATED_EVENT, {
          requestId: existing._id,
          requester: {
            id: userB._id,
            name: 'User B',
            imageUrl: null,
          },
        }),
      );
    });
  });

  describe('Validation', () => {
    it.each(invalidInviteFriendInputs)(
      'when payload has $caseName should return bad request',
      async ({ body, expectedDetail }) => {
        // Arrange
        const requester = await insertUser({ email: 'requester@example.com' });
        const accessToken = await createAccessToken({ userId: requester._id });

        // Act
        const response = await inviteFriend(accessToken, undefined, { body });

        // Assert
        expectValidationError(response, expectedDetail);
        expect(await findAllFriendships()).toHaveLength(0);
        expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      inviteFriend(undefined, randomUUID(), { authHeader: authorizationHeader }),
    assertNoSideEffects: async () => {
      expect(await findAllFriendships()).toHaveLength(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    },
  });

  describe('Business Logic', () => {
    it('when user sends friend request to themselves should return conflict', async () => {
      // Arrange
      const user = await insertUser({ email: 'self@example.com' });
      const accessToken = await createAccessToken({ userId: user._id });

      // Act
      const response = await inviteFriend(accessToken, user._id);

      // Assert
      expectServerConflictError(response, 'A user cannot send a friend request to themselves');
      expect(await findAllFriendships()).toHaveLength(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when target user does not exist should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const accessToken = await createAccessToken({ userId: requester._id });
      const nonExistentUserId = randomUUID();

      // Act
      const response = await inviteFriend(accessToken, nonExistentUserId);

      // Assert
      expectServerConflictError(response, '');
      expect(await findAllFriendships()).toHaveLength(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when target user is not active should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const target = await insertUser({ email: 'inactive-target@example.com' });
      await updateUserStatusRaw(target._id, 'INACTIVE');
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectServerConflictError(response, '');
      expect(await findAllFriendships()).toHaveLength(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when pending friend request in same direction already exists should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const target = await insertUser({ email: 'target@example.com' });
      await insertFriendship({
        requestedBy: requester._id,
        recipient: target._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectServerConflictError(response, 'A friend request or friendship already exists');
      expect(await findAllFriendships()).toHaveLength(1);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when pending friend request in opposite direction already exists should return conflict', async () => {
      // Arrange
      const userA = await insertUser({ email: 'a@example.com' });
      const userB = await insertUser({ email: 'b@example.com' });
      const existing = await insertFriendship({
        requestedBy: userB._id,
        recipient: userA._id,
        status: 'PENDING',
      });
      const tokenA = await createAccessToken({ userId: userA._id });

      // Act
      const response = await inviteFriend(tokenA, userB._id);

      // Assert
      expectServerConflictError(response, 'A friend request or friendship already exists');
      const stored = await findFriendshipById(existing._id);
      expect(stored).toMatchObject({
        requestedBy: userB._id,
        recipient: userA._id,
        status: 'PENDING',
      });
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when users are already friends should return conflict', async () => {
      // Arrange
      const userA = await insertUser({ email: 'a@example.com' });
      const userB = await insertUser({ email: 'b@example.com' });
      const existing = await insertFriendship({
        requestedBy: userB._id,
        recipient: userA._id,
        status: 'ACCEPTED',
      });
      const tokenA = await createAccessToken({ userId: userA._id });

      // Act
      const response = await inviteFriend(tokenA, userB._id);

      // Assert
      expectServerConflictError(response, 'A friend request or friendship already exists');
      const stored = await findFriendshipById(existing._id);
      expect(stored?.status).toBe('ACCEPTED');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });
  });

  describe('Concurrency', () => {
    it('when same requester sends concurrent invites to same target only one should succeed', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const target = await insertUser({ email: 'target@example.com' });
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const responses = await Promise.all([
        inviteFriend(accessToken, target._id),
        inviteFriend(accessToken, target._id),
      ]);

      // Assert
      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
      expectSuccessMessageResponse(successes[0], 201, 'Friend request sent');
      expectServerConflictError(conflicts[0], 'A friend request or friendship already exists');

      const friendships = await findAllFriendships();
      expect(friendships).toHaveLength(1);
      expect(friendships[0]?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });

    it('when two users concurrently invite each other only one should succeed', async () => {
      // Arrange
      const userA = await insertUser({ email: 'a@example.com' });
      const userB = await insertUser({ email: 'b@example.com' });
      const tokenA = await createAccessToken({ userId: userA._id });
      const tokenB = await createAccessToken({ userId: userB._id });

      // Act
      const responses = await Promise.all([
        inviteFriend(tokenA, userB._id),
        inviteFriend(tokenB, userA._id),
      ]);

      // Assert
      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
      expectSuccessMessageResponse(successes[0], 201, 'Friend request sent');
      expectServerConflictError(conflicts[0], 'A friend request or friendship already exists');

      const friendships = await findAllFriendships();
      expect(friendships).toHaveLength(1);
      expect(friendships[0]?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });

    it('when two users concurrently invite each other to reopen rejected request only one should succeed', async () => {
      // Arrange
      const userA = await insertUser({ email: 'a@example.com' });
      const userB = await insertUser({ email: 'b@example.com' });
      await insertFriendship({
        requestedBy: userA._id,
        recipient: userB._id,
        status: 'REJECTED',
      });
      const tokenA = await createAccessToken({ userId: userA._id });
      const tokenB = await createAccessToken({ userId: userB._id });

      // Act
      const responses = await Promise.all([
        inviteFriend(tokenA, userB._id),
        inviteFriend(tokenB, userA._id),
      ]);

      // Assert
      const successes = responses.filter((r) => r.status === 201);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
      expectServerConflictError(conflicts[0], 'A friend request or friendship already exists');

      const friendships = await findAllFriendships();
      expect(friendships).toHaveLength(1);
      expect(friendships[0]?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Server Error', () => {
    it('when database fails while checking existing relationship should return server error', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const target = await insertUser({ email: 'target@example.com' });
      const accessToken = await createAccessToken({ userId: requester._id });
      vitest.spyOn(friendshipModel, 'findOne').mockImplementationOnce(
        () =>
          ({
            exec: vitest.fn().mockRejectedValue(new Error('DB findOne failed')),
          }) as unknown as ReturnType<typeof friendshipModel.findOne>,
      );

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectServerError(response);
      expect(await findAllFriendships()).toHaveLength(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when database fails while creating friend request should return server error', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const target = await insertUser({ email: 'target@example.com' });
      const accessToken = await createAccessToken({ userId: requester._id });
      vitest
        .spyOn(friendshipModel, 'create')
        .mockRejectedValueOnce(new Error('DB create failed') as never);

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectServerError(response);
      expect(await findAllFriendships()).toHaveLength(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when database fails while reopening rejected request should return server error and keep rejected state', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const target = await insertUser({ email: 'target@example.com' });
      const existing = await insertFriendship({
        requestedBy: requester._id,
        recipient: target._id,
        status: 'REJECTED',
      });
      const accessToken = await createAccessToken({ userId: requester._id });
      vitest.spyOn(friendshipModel, 'findOneAndUpdate').mockImplementationOnce(
        () =>
          ({
            exec: vitest.fn().mockRejectedValue(new Error('DB findOneAndUpdate failed')),
          }) as unknown as ReturnType<typeof friendshipModel.findOneAndUpdate>,
      );

      // Act
      const response = await inviteFriend(accessToken, target._id);

      // Assert
      expectServerError(response);
      const stored = await findFriendshipById(existing._id);
      expect(stored?.status).toBe('REJECTED');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });
  });
});
