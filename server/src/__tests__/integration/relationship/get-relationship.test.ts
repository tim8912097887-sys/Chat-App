import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vitest } from 'vitest';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { insertUser, updateUserStatusRaw } from '../../utils/user/query.js';
import { DEFAULT_AVATAR_URL, DEFAULT_PAGE_LIMIT } from '../../utils/relationship/constants.js';
import { insertFriendship } from '../../utils/relationship/query.js';
import { createAccessToken } from '../../utils/auth/factory.js';
import { friendRequestsRequest } from '../../utils/relationship/request.js';
import {
  expectServerError,
  expectSuccessDataResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { mockedRealtimePublisher } from '../../utils/common/app.js';
import { invalidGetFriendRequestsQueries } from '../../utils/relationship/invalid-inputs.js';
import { describeAuthenticationTests } from '../../utils/common/invalid-inputs.js';

describe('Get Friend Requests', () => {
  beforeEach(async () => {
    await truncateAll();
    vitest.clearAllMocks();
  });

  afterEach(() => {
    vitest.restoreAllMocks();
  });

  describe('Success', () => {
    it('when direction is incoming and pending requests exist should return incoming requests with requester info', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const requesterWithAvatar = await insertUser({
        email: 'req1@example.com',
        name: 'Alice',
        imageUrl: DEFAULT_AVATAR_URL,
      });
      const requesterWithoutAvatar = await insertUser({
        email: 'req2@example.com',
        name: 'Bob',
        imageUrl: null,
      });
      const req1 = await insertFriendship({
        requestedBy: requesterWithAvatar._id,
        recipient: recipient._id,
        status: 'PENDING',
        updatedAt: new Date('2026-01-01T10:00:00.000Z'),
      });
      const req2 = await insertFriendship({
        requestedBy: requesterWithoutAvatar._id,
        recipient: recipient._id,
        status: 'PENDING',
        updatedAt: new Date('2026-01-02T10:00:00.000Z'),
      });
      const accessToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          requestId: req2._id,
          userId: requesterWithoutAvatar._id,
          name: 'Bob',
          imageUrl: null,
        },
        {
          requestId: req1._id,
          userId: requesterWithAvatar._id,
          name: 'Alice',
          imageUrl: DEFAULT_AVATAR_URL,
        },
      ]);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when direction is outgoing and pending requests exist should return outgoing requests with recipient info', async () => {
      // Arrange
      const requester = await insertUser({ email: 'requester@example.com' });
      const recipient = await insertUser({
        email: 'target@example.com',
        name: 'Charlie',
        imageUrl: DEFAULT_AVATAR_URL,
      });
      const friendship = await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({ userId: requester._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'outgoing' },
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          requestId: friendship._id,
          userId: recipient._id,
          name: 'Charlie',
          imageUrl: DEFAULT_AVATAR_URL,
        },
      ]);
    });

    it('when user has no pending friend requests should return empty array', async () => {
      // Arrange
      const user = await insertUser({ email: 'lonely@example.com' });
      const accessToken = await createAccessToken({ userId: user._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expectSuccessDataResponse(response, 200, []);
    });

    it('when multiple pending requests share same updatedAt should sort by updatedAt descending then id ascending', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const userA = await insertUser({ email: 'a@example.com', name: 'User A' });
      const userB = await insertUser({ email: 'b@example.com', name: 'User B' });
      const userC = await insertUser({ email: 'c@example.com', name: 'User C' });

      const sameTimestamp = new Date('2026-01-02T00:00:00.000Z');
      const reqOlder = await insertFriendship({
        id: '00000000-0000-4000-8000-000000000001',
        requestedBy: userA._id,
        recipient: recipient._id,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      const reqTieHigherId = await insertFriendship({
        id: '00000000-0000-4000-8000-000000000009',
        requestedBy: userB._id,
        recipient: recipient._id,
        updatedAt: sameTimestamp,
      });
      const reqTieLowerId = await insertFriendship({
        id: '00000000-0000-4000-8000-000000000002',
        requestedBy: userC._id,
        recipient: recipient._id,
        updatedAt: sameTimestamp,
      });
      const accessToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.data.map((item: { requestId: string }) => item.requestId)).toEqual([
        reqTieLowerId._id,
        reqTieHigherId._id,
        reqOlder._id,
      ]);
    });

    it('when page and limit are provided should return requested paginated slice', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const createdIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const sender = await insertUser({ email: `sender${i}@example.com`, name: `Sender ${i}` });
        const doc = await insertFriendship({
          requestedBy: sender._id,
          recipient: recipient._id,
          updatedAt: new Date(2026, 0, i + 1),
        });
        createdIds.unshift(doc._id);
      }
      const accessToken = await createAccessToken({ userId: recipient._id });

      // Act
      const page2Response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming', page: 2, limit: 2 },
      });
      const outOfRangeResponse = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming', page: 4, limit: 2 },
      });

      // Assert
      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data).toHaveLength(2);
      expect(page2Response.body.data.map((item: { requestId: string }) => item.requestId)).toEqual(
        createdIds.slice(2, 4),
      );

      expectSuccessDataResponse(outOfRangeResponse, 200, []);
    });

    it('when page and limit are omitted should apply default limit of 20', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      for (let i = 0; i < DEFAULT_PAGE_LIMIT + 1; i++) {
        const sender = await insertUser({ email: `user${i}@example.com` });
        await insertFriendship({
          requestedBy: sender._id,
          recipient: recipient._id,
        });
      }
      const accessToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.state).toBe('success');
      expect(response.body.data).toHaveLength(DEFAULT_PAGE_LIMIT);
    });
  });

  describe('Validation', () => {
    it.each(invalidGetFriendRequestsQueries)(
      'when query has $caseName should return bad request',
      async ({ query, expectedDetail }) => {
        // Arrange
        const user = await insertUser({ email: 'user@example.com' });
        const accessToken = await createAccessToken({ userId: user._id });

        // Act
        const response = await friendRequestsRequest(accessToken, { query });

        // Assert
        expectValidationError(response, expectedDetail);
      },
    );
  });

  describeAuthenticationTests({
    sendRequest: ({ authorizationHeader }) =>
      friendRequestsRequest(undefined, {
        authHeader: authorizationHeader,
        query: { direction: 'incoming' },
      }),
  });

  describe('Business Logic', () => {
    it('when accepted or rejected relationships exist should exclude them from pending requests', async () => {
      // Arrange
      const user = await insertUser({ email: 'user@example.com' });
      const pendingSender = await insertUser({ email: 'pending@example.com', name: 'Pending' });
      const acceptedSender = await insertUser({ email: 'accepted@example.com', name: 'Accepted' });
      const rejectedSender = await insertUser({ email: 'rejected@example.com', name: 'Rejected' });

      const pendingReq = await insertFriendship({
        requestedBy: pendingSender._id,
        recipient: user._id,
        status: 'PENDING',
      });
      await insertFriendship({
        requestedBy: acceptedSender._id,
        recipient: user._id,
        status: 'ACCEPTED',
      });
      await insertFriendship({
        requestedBy: rejectedSender._id,
        recipient: user._id,
        status: 'REJECTED',
      });
      const accessToken = await createAccessToken({ userId: user._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          requestId: pendingReq._id,
          userId: pendingSender._id,
          name: 'Pending',
          imageUrl: null,
        },
      ]);
    });

    it('when user has both incoming and outgoing requests should filter strictly by direction', async () => {
      // Arrange
      const user = await insertUser({ email: 'user@example.com' });
      const incomingUser = await insertUser({ email: 'in@example.com', name: 'Incoming User' });
      const outgoingUser = await insertUser({ email: 'out@example.com', name: 'Outgoing User' });
      const unrelatedA = await insertUser({ email: 'ua@example.com' });
      const unrelatedB = await insertUser({ email: 'ub@example.com' });

      const incomingReq = await insertFriendship({
        requestedBy: incomingUser._id,
        recipient: user._id,
        status: 'PENDING',
      });
      const outgoingReq = await insertFriendship({
        requestedBy: user._id,
        recipient: outgoingUser._id,
        status: 'PENDING',
      });
      await insertFriendship({
        requestedBy: unrelatedA._id,
        recipient: unrelatedB._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({ userId: user._id });

      // Act
      const incomingRes = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });
      const outgoingRes = await friendRequestsRequest(accessToken, {
        query: { direction: 'outgoing' },
      });

      // Assert
      expectSuccessDataResponse(incomingRes, 200, [
        {
          requestId: incomingReq._id,
          userId: incomingUser._id,
          name: 'Incoming User',
          imageUrl: null,
        },
      ]);
      expectSuccessDataResponse(outgoingRes, 200, [
        {
          requestId: outgoingReq._id,
          userId: outgoingUser._id,
          name: 'Outgoing User',
          imageUrl: null,
        },
      ]);
    });

    it('when counterparty user is inactive or missing should omit that request from response', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const inactiveSender = await insertUser({ email: 'inactive@example.com' });
      const activeSender = await insertUser({ email: 'active@example.com', name: 'Active Sender' });
      await updateUserStatusRaw(inactiveSender._id, 'INACTIVE');

      await insertFriendship({
        requestedBy: inactiveSender._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      await insertFriendship({
        requestedBy: randomUUID(),
        recipient: recipient._id,
        status: 'PENDING',
      });
      const validReq = await insertFriendship({
        requestedBy: activeSender._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({ userId: recipient._id });

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expectSuccessDataResponse(response, 200, [
        {
          requestId: validReq._id,
          userId: activeSender._id,
          name: 'Active Sender',
          imageUrl: null,
        },
      ]);
    });
  });

  describe('Server Error', () => {
    it('when database fails while querying friend requests should return server error', async () => {
      // Arrange
      const user = await insertUser({ email: 'user@example.com' });
      const accessToken = await createAccessToken({ userId: user._id });
      vitest.spyOn(friendshipModel, 'find').mockImplementationOnce(
        () =>
          ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  exec: vitest.fn().mockRejectedValue(new Error('DB find failed')),
                }),
              }),
            }),
          }) as unknown as ReturnType<typeof friendshipModel.find>,
      );

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expectServerError(response);
    });

    it('when database fails while querying counterparty user profiles should return server error', async () => {
      // Arrange
      const recipient = await insertUser({ email: 'recipient@example.com' });
      const requester = await insertUser({ email: 'requester@example.com' });
      await insertFriendship({
        requestedBy: requester._id,
        recipient: recipient._id,
        status: 'PENDING',
      });
      const accessToken = await createAccessToken({ userId: recipient._id });
      vitest.spyOn(userModel, 'find').mockImplementationOnce(
        () =>
          ({
            select: () => ({
              lean: () => ({
                exec: vitest.fn().mockRejectedValue(new Error('DB user query failed')),
              }),
            }),
          }) as unknown as ReturnType<typeof userModel.find>,
      );

      // Act
      const response = await friendRequestsRequest(accessToken, {
        query: { direction: 'incoming' },
      });

      // Assert
      expectServerError(response);
    });
  });
});
