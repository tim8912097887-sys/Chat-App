import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoRelationshipRepository } from '../../../domain/relationship/relationship.repository.js';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { api, mockedRealtimePublisher } from '../../utils/common/app.js';
import { signupAndLogin } from '../../utils/user/query.js';
import { acceptRelationship, createPendingRequest } from '../../utils/relationship/query.js';
import { acceptRelationshipUrl } from '../../utils/relationship/constants.js';
import { LOGOUT_ALL_URL } from '../../utils/auth/constants.js';
import {
  expectAuthError,
  expectServerConflictError,
  expectServerError,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { realtimeEventAssertion } from '../../utils/common/realtime.js';
import { FRIEND_REQUEST_ACCEPTED_EVENT } from '../../../realtime/realtime.constants.js';

describe('accept relationship', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when the recipient accepts a pending request should return 200 and mark it accepted', async () => {
      const { recipientAccessToken, requester, requestId, recipient } =
        await createPendingRequest();

      const response = await acceptRelationship(recipientAccessToken, requester._id.toString());
      const relationship = await friendshipModel.findById(requestId);

      expectSuccessMessageResponse(response, 200, 'Friend request accepted');
      expect(relationship?.status).toBe('ACCEPTED');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(2);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        relationship?.requestedBy,
        realtimeEventAssertion(FRIEND_REQUEST_ACCEPTED_EVENT, {
          requestId: relationship?._id.toString(),
          actor: {
            id: recipient._id.toString(),
            name: recipient.name,
            imageUrl: recipient.imageUrl,
          },
        }),
      );
    });

    it('when the recipient concurrently accepts a request twice should accept it once', async () => {
      const { recipientAccessToken, requester, recipient, requestId } =
        await createPendingRequest();

      const responses = await Promise.all([
        acceptRelationship(recipientAccessToken, requester._id.toString()),
        acceptRelationship(recipientAccessToken, requester._id.toString()),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ServerConflictError',
      );
      expect((await friendshipModel.findById(requestId))?.status).toBe('ACCEPTED');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(2);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        requester._id.toString(),
        realtimeEventAssertion(FRIEND_REQUEST_ACCEPTED_EVENT, {
          requestId,
          actor: {
            id: recipient._id.toString(),
            name: recipient.name,
            imageUrl: recipient.imageUrl ?? null,
          },
        }),
      );
    });
  });

  describe('validation error', () => {
    it.each([
      { description: 'missing requesterId', body: {} },
      { description: 'a non-UUID requesterId', body: { requesterId: 'not-a-uuid' } },
      {
        description: 'a Mongo-style requesterId',
        body: { requesterId: '507f1f77bcf86cd799439011' },
      },
    ])('when requesterId is $description should return 400', async ({ body }) => {
      const { recipientAccessToken } = await createPendingRequest();

      const response = await api()
        .post(acceptRelationshipUrl)
        .set('Authorization', `Bearer ${recipientAccessToken}`)
        .send(body);

      expectValidationError(response, 'requesterId');
      expect((await friendshipModel.findOne({}))?.status).toBe('PENDING');
    });
  });

  describe('auth error', () => {
    it.each([
      {
        description: 'no access token',
        authorization: undefined,
        expectedDetail: 'Missing access token',
      },
      {
        description: 'an authorization header that is not Bearer',
        authorization: 'Basic not-a-valid-token',
        expectedDetail: 'Missing access token',
      },
      {
        description: 'an invalid access token',
        authorization: 'Bearer not-a-valid-token',
        expectedDetail: 'Invalid refresh token',
      },
    ])(
      'when accept receives $description should return 401',
      async ({ authorization, expectedDetail }) => {
        const { requester, requestId } = await createPendingRequest();
        const request = api()
          .post(acceptRelationshipUrl)
          .send({ requesterId: requester._id.toString() });
        if (authorization) request.set('Authorization', authorization);

        const response = await request;

        expectAuthError(response, expectedDetail);
        expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
      },
    );

    it.each([
      { description: 'has been deleted', userState: 'deleted' },
      { description: 'is inactive', userState: 'inactive' },
      { description: 'has a stale token version', userState: 'stale-token' },
    ])('when the accepting user $description should return 401', async ({ userState }) => {
      const { recipientAccessToken, recipientEmail, recipientRefreshCookie, requester, requestId } =
        await createPendingRequest();

      if (userState === 'deleted') {
        await userModel.deleteOne({ email: recipientEmail });
      } else if (userState === 'inactive') {
        await userModel.updateOne({ email: recipientEmail }, { $set: { status: 'DISABLED' } });
      } else {
        const logoutResponse = await api()
          .post(LOGOUT_ALL_URL)
          .set('Cookie', recipientRefreshCookie);
        expectSuccessMessageResponse(logoutResponse, 200, 'Logged out all sessions');
      }

      const response = await acceptRelationship(recipientAccessToken, requester._id.toString());

      expectAuthError(response, 'Invalid user token');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
    });
  });

  describe('business logic error', () => {
    it.each([
      { description: 'does not exist', status: null },
      { description: 'has already been accepted', status: 'ACCEPTED' as const },
      { description: 'has already been rejected', status: 'REJECTED' as const },
    ] as const)('when the request $description should return 409', async ({ status }) => {
      const { recipientAccessToken, requester, requestId } = await createPendingRequest();

      if (status) {
        await friendshipModel.updateOne({ _id: requestId }, { $set: { status } });
      }

      const response = await acceptRelationship(
        recipientAccessToken,
        status ? requester._id.toString() : crypto.randomUUID(),
      );

      expectServerConflictError(response, 'Friend request is not available to this user');
      expect(status ? (await friendshipModel.findById(requestId))?.status : null).toBe(status);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });

    it('when a user outside the relationship tries to accept should return 409', async () => {
      const { recipient, requester, requestId } = await createPendingRequest();
      const { accessToken: otherUserAccessToken } = await signupAndLogin();
      expect(await userModel.countDocuments()).toBe(3);

      const response = await acceptRelationship(otherUserAccessToken, requester._id.toString());

      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
      expect((await friendshipModel.findById(requestId))?.recipient).toBe(
        recipient._id.toString(),
      );
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });

    it('when the requester tries to accept should return 409 without changing status', async () => {
      const { requesterAccessToken, requester, requestId } = await createPendingRequest();

      const response = await acceptRelationship(requesterAccessToken, requester._id.toString());

      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });

    it('when the pending status update loses a race should return 409 and keep the status unchanged', async () => {
      const { recipientAccessToken, requester, requestId } = await createPendingRequest();
      vi.spyOn(
        MongoRelationshipRepository.prototype,
        'updatePendingRequestStatus',
      ).mockResolvedValue(false);

      const response = await acceptRelationship(recipientAccessToken, requester._id.toString());

      expectServerConflictError(response, 'Friend request is no longer pending');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });
  });

  describe('server error', () => {
    it('when updating the relationship fails should return 500 and leave it pending', async () => {
      const { recipientAccessToken, requester, requestId } = await createPendingRequest();
      const updatePendingRequestStatus = vi
        .spyOn(MongoRelationshipRepository.prototype, 'updatePendingRequestStatus')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await acceptRelationship(recipientAccessToken, requester._id.toString());

      expectServerError(response);
      expect(updatePendingRequestStatus).toHaveBeenCalledOnce();
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(1);
    });
  });
});
