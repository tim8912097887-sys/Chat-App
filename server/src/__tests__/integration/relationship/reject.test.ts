import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { friendshipModel, truncateAll } from '../../utils/common/query.js';
import { insertUser } from '../../utils/user/query.js';
import { DEFAULT_AVATAR_URL } from '../../utils/relationship/constants.js';
import { findFriendshipById, insertFriendship } from '../../utils/relationship/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { rejectRelationship } from '../../utils/relationship/request.js';
import {
  expectServerConflictError,
  expectServerError,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { mockedRealtimePublisher } from '../../utils/common/app.js';
import { realtimeEventAssertion } from '../../utils/common/realtime.js';
import { FRIEND_REQUEST_REJECTED_EVENT } from '../../../realtime/realtime.constants.js';
import { invalidUpdateFriendRequestInputs } from '../../utils/relationship/invalid-inputs.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Reject Friend Request', () => {
  beforeEach(async () => {
    await truncateAll();
    vitest.clearAllMocks();
  });

  afterEach(() => {
    vitest.restoreAllMocks();
  });

  describe('Success', () => {
    it('when recipient rejects pending friend request should update status to rejected and publish realtime event', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com', name: 'Requester' });
      const recipient = await insertUser({
        email: 'recipient@example.com',
        name: 'Recipient',
        imageUrl: DEFAULT_AVATAR_URL,
      });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await rejectRelationship(recipientToken, requester._id);

      // Assert
      expectSuccessMessageResponse(response, 200, 'Friend request rejected');

      const updated = await findFriendshipById(friendship._id);
      expect(updated).toMatchObject({
        _id: friendship._id,
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'REJECTED',
      });

      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        requester._id,
        realtimeEventAssertion(FRIEND_REQUEST_REJECTED_EVENT, {
          requestId: friendship._id,
          actor: {
            id: recipient._id,
            name: 'Recipient',
            imageUrl: DEFAULT_AVATAR_URL,
          },
        }),
      );
    });

    it('when recipient has no imageUrl should publish realtime event with null imageUrl', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({
        email: 'recipient@example.com',
        name: 'NoAvatar',
        imageUrl: null,
      });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await rejectRelationship(recipientToken, requester._id);

      // Assert
      expectSuccessMessageResponse(response, 200, 'Friend request rejected');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        requester._id,
        realtimeEventAssertion(FRIEND_REQUEST_REJECTED_EVENT, {
          requestId: friendship._id,
          actor: {
            id: recipient._id,
            name: 'NoAvatar',
            imageUrl: null,
          },
        }),
      );
    });
  });

  describe('Validation', () => {
    it.each(invalidUpdateFriendRequestInputs)(
      'when payload has $caseName should return bad request',
      async ({ body, expectedDetail }) => {
        // Arrange
        const user = await insertUser({ email: 'user@example.com' });
        const accessToken = await createAccessToken({ userId: user._id });

        // Act
        const response = await rejectRelationship(accessToken, undefined, { body });

        // Assert
        expectValidationError(response, expectedDetail);
        expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      rejectRelationship(undefined, randomUUID(), { authHeader: authorizationHeader }),
    assertNoSideEffects: () => {
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    },
  });

  describe('Authorization', () => {
    it('when unrelated third user attempts to reject friend request should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const outsider = await insertUser({ email: 'outsider@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const outsiderToken = await createAccessToken({ userId: outsider._id });

      // Act
      const response = await rejectRelationship(outsiderToken, requester._id);

      // Assert
      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await findFriendshipById(friendship._id))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when original requester attempts to reject their own outgoing request should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const requesterToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await rejectRelationship(requesterToken, recipient._id);

      // Assert
      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await findFriendshipById(friendship._id))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });
  });

  describe('Business Logic', () => {
    it('when no pending friend request exists between users should return conflict', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const otherUser = await insertUser({ email: 'other@example.com' });
      const recipientToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await rejectRelationship(recipientToken, otherUser._id);

      // Assert
      expectServerConflictError(response, 'Friend request is not available to this user');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when user attempts to reject request with own userId as requesterId should return conflict', async () => {
      // Arrange
      const user = await insertUser({ email: 'self@example.com' });
      const accessToken = await createAccessToken({ userId: user._id });

      // Act
      const response = await rejectRelationship(accessToken, user._id);

      // Assert
      expectServerConflictError(response, 'Friend request is not available to this user');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when friend request is already rejected should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'REJECTED',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await rejectRelationship(recipientToken, requester._id);

      // Assert
      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await findFriendshipById(friendship._id))?.status).toBe('REJECTED');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when friend request is already accepted should return conflict', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'ACCEPTED',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await rejectRelationship(recipientToken, requester._id);

      // Assert
      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await findFriendshipById(friendship._id))?.status).toBe('ACCEPTED');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });
  });

  describe('Concurrency', () => {
    it('when recipient sends concurrent reject requests for same pending request only one should succeed', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });

      // Act
      const responses = await Promise.all([
        rejectRelationship(recipientToken, requester._id),
        rejectRelationship(recipientToken, requester._id),
      ]);

      // Assert
      const successes = responses.filter((r) => r.status === 200);
      const conflicts = responses.filter((r) => r.status === 409);

      expect(successes).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
      expectSuccessMessageResponse(successes[0], 200, 'Friend request rejected');
      expectServerConflictError(conflicts[0], '');

      const stored = await findFriendshipById(friendship._id);
      expect(stored?.status).toBe('REJECTED');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('Server Error', () => {
    it('when database fails while finding pending request should return server error', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });
      vitest.spyOn(friendshipModel, 'findOne').mockImplementationOnce(
        () =>
          ({
            exec: vitest.fn().mockRejectedValue(new Error('DB findOne failed')),
          }) as unknown as ReturnType<typeof friendshipModel.findOne>,
      );

      // Act
      const response = await rejectRelationship(recipientToken, requester._id);

      // Assert
      expectServerError(response);
      expect((await findFriendshipById(friendship._id))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when database fails while updating pending request status should return server error', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const recipientToken = await createAccessToken({ userId: recipient._id });
      vitest.spyOn(friendshipModel, 'updateOne').mockImplementationOnce(
        () =>
          ({
            exec: vitest.fn().mockRejectedValue(new Error('DB updateOne failed')),
          }) as unknown as ReturnType<typeof friendshipModel.updateOne>,
      );

      // Act
      const response = await rejectRelationship(recipientToken, requester._id);

      // Assert
      expectServerError(response);
      expect((await findFriendshipById(friendship._id))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });
  });
});
