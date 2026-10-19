import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoRelationshipRepository } from '../../../domain/relationship/relationship.repository.js';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { api } from '../../utils/common/app.js';
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

describe('accept relationship', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when the recipient accepts a pending request should return 200 and mark it accepted', async () => {
      const { recipientAccessToken, requestId } = await createPendingRequest();

      const response = await acceptRelationship(recipientAccessToken, requestId);
      const relationship = await friendshipModel.findById(requestId);

      expectSuccessMessageResponse(response, 200, 'Friend request accepted');
      expect(relationship?.status).toBe('ACCEPTED');
    });

    it('when the recipient concurrently accepts a request twice should accept it once', async () => {
      const { recipientAccessToken, requestId } = await createPendingRequest();

      const responses = await Promise.all([
        acceptRelationship(recipientAccessToken, requestId),
        acceptRelationship(recipientAccessToken, requestId),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ServerConflictError',
      );
      expect((await friendshipModel.findById(requestId))?.status).toBe('ACCEPTED');
    });
  });

  describe('validation error', () => {
    it.each([
      { description: 'a non-UUID requestId', requestId: 'not-a-uuid' },
      { description: 'a Mongo-style object id', requestId: '507f1f77bcf86cd799439011' },
    ])('when requestId is $description should return 400', async ({ requestId }) => {
      const { recipientAccessToken } = await createPendingRequest();

      const response = await api()
        .post(acceptRelationshipUrl(requestId))
        .set('Authorization', `Bearer ${recipientAccessToken}`);

      expectValidationError(response, 'requestId');
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
        const { requestId } = await createPendingRequest();
        const request = api().post(acceptRelationshipUrl(requestId));
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
      const { recipientAccessToken, recipientEmail, recipientRefreshCookie, requestId } =
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

      const response = await acceptRelationship(recipientAccessToken, requestId);

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
      const { recipientAccessToken, requestId } = await createPendingRequest();

      if (status) {
        await friendshipModel.updateOne({ _id: requestId }, { $set: { status } });
      }

      const response = await acceptRelationship(
        recipientAccessToken,
        status ? requestId : crypto.randomUUID(),
      );

      expectServerConflictError(response, 'Friend request is not available to this user');
      expect(status ? (await friendshipModel.findById(requestId))?.status : null).toBe(status);
    });

    it('when a user outside the relationship tries to accept should return 409', async () => {
      const { recipient, requestId } = await createPendingRequest();
      const { accessToken: otherUserAccessToken } = await signupAndLogin();
      expect(await userModel.countDocuments()).toBe(3);

      const response = await acceptRelationship(otherUserAccessToken, requestId);

      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
      expect((await friendshipModel.findById(requestId))?.userIds).toContain(
        recipient._id.toString(),
      );
    });

    it('when the requester tries to accept should return 409 without changing status', async () => {
      const { requesterAccessToken, requestId } = await createPendingRequest();

      const response = await acceptRelationship(requesterAccessToken, requestId);

      expectServerConflictError(response, 'Friend request is not available to this user');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
    });

    it('when the pending status update loses a race should return 409 and keep the status unchanged', async () => {
      const { recipientAccessToken, requestId } = await createPendingRequest();
      vi.spyOn(
        MongoRelationshipRepository.prototype,
        'updatePendingRequestStatus',
      ).mockResolvedValue(false);

      const response = await acceptRelationship(recipientAccessToken, requestId);

      expectServerConflictError(response, 'Friend request is no longer pending');
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
    });
  });

  describe('server error', () => {
    it('when updating the relationship fails should return 500 and leave it pending', async () => {
      const { recipientAccessToken, requestId } = await createPendingRequest();
      const updatePendingRequestStatus = vi
        .spyOn(MongoRelationshipRepository.prototype, 'updatePendingRequestStatus')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await acceptRelationship(recipientAccessToken, requestId);

      expectServerError(response);
      expect(updatePendingRequestStatus).toHaveBeenCalledOnce();
      expect((await friendshipModel.findById(requestId))?.status).toBe('PENDING');
    });
  });
});
