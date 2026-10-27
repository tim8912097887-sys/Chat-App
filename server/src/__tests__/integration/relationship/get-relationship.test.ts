import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoRelationshipRepository } from '../../../domain/relationship/relationship.repository.js';
import { MongoUserRepository } from '../../../domain/user/user.repository.js';
import { LOGOUT_ALL_URL } from '../../utils/auth/constants.js';
import {
  expectAuthError,
  expectServerError,
  expectSuccessDataResponse,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { api } from '../../utils/common/app.js';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { createPendingRequest, friendRequestsRequest } from '../../utils/relationship/query.js';
import { signupAndLogin } from '../../utils/user/query.js';

describe('get relationship requests', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it.each([
      { direction: 'incoming', userRole: 'recipient' },
      { direction: 'outgoing', userRole: 'requester' },
    ] as const)(
      'when direction is $direction should return the matching pending request',
      async ({ direction, userRole }) => {
        const { requester, recipient, requesterAccessToken, recipientAccessToken, requestId } =
          await createPendingRequest();
        const accessToken = userRole === 'recipient' ? recipientAccessToken : requesterAccessToken;
        const otherUser = userRole === 'recipient' ? requester : recipient;

        const response = await friendRequestsRequest(accessToken).query({ direction });

        expectSuccessDataResponse(response, 200, [
          {
            requestId: requestId,
            name: otherUser.name,
            imageUrl: null,
          },
        ]);
      },
    );

    it('when no requests match the direction should return an empty array', async () => {
      const { requesterAccessToken } = await createPendingRequest();

      const response = await friendRequestsRequest(requesterAccessToken).query({
        direction: 'incoming',
      });

      expectSuccessDataResponse(response, 200, []);
    });

    it('should include only pending requests in the requested direction', async () => {
      const { requester, recipient, recipientAccessToken } = await createPendingRequest();
      const { email: otherEmail } = await signupAndLogin();
      const otherUser = await userModel.findOne({ email: otherEmail });
      expect(otherUser).not.toBeNull();

      await friendshipModel.create({
        userIds: [recipient._id.toString(), otherUser!._id.toString()],
        requestedBy: otherUser!._id.toString(),
        status: 'ACCEPTED',
        pairKey: [recipient._id.toString(), otherUser!._id.toString()].sort().join(':'),
      });

      const incomingResponse = await friendRequestsRequest(recipientAccessToken).query({
        direction: 'incoming',
      });

      expectSuccessDataResponse(incomingResponse, 200, [
        {
          requestId: expect.any(String),
          name: requester.name,
          imageUrl: null,
        },
      ]);
    });

    it('should return distinct pages with the requested page size', async () => {
      const { email: recipientEmail, accessToken } = await signupAndLogin();
      const recipient = await userModel.findOne({ email: recipientEmail });
      expect(recipient).not.toBeNull();
      const requestIds: string[] = [];

      for (let index = 0; index < 3; index += 1) {
        const { email } = await signupAndLogin();
        const requester = await userModel.findOne({ email });
        expect(requester).not.toBeNull();
        const request = await friendshipModel.create({
          userIds: [requester!._id.toString(), recipient!._id.toString()],
          requestedBy: requester!._id.toString(),
          status: 'PENDING',
          pairKey: [requester!._id.toString(), recipient!._id.toString()].sort().join(':'),
          createdAt: new Date(Date.now() + index * 1000),
        });
        requestIds.push(request._id.toString());
      }

      const firstPage = await friendRequestsRequest(accessToken).query({
        direction: 'incoming',
        page: 1,
        limit: 2,
      });
      const secondPage = await friendRequestsRequest(accessToken).query({
        direction: 'incoming',
        page: 2,
        limit: 2,
      });
      const beyondLastPage = await friendRequestsRequest(accessToken).query({
        direction: 'incoming',
        page: 3,
        limit: 2,
      });
      expect(firstPage.status).toBe(200);
      expect(secondPage.status).toBe(200);
      expect(firstPage.body.data).toHaveLength(2);
      expect(secondPage.body.data).toHaveLength(1);
      const firstPageIds = firstPage.body.data.map(
        (request: { requestId: string }) => request.requestId,
      );
      const secondPageIds = secondPage.body.data.map(
        (request: { requestId: string }) => request.requestId,
      );

      expect(new Set([...firstPageIds, ...secondPageIds])).toEqual(new Set(requestIds));
      expect(firstPageIds.some((id: string) => secondPageIds.includes(id))).toBe(false);
      expectSuccessDataResponse(beyondLastPage, 200, []);
    });

    it('should default page and limit when omitted', async () => {
      const { recipientAccessToken, requestId, requester } = await createPendingRequest();

      const response = await friendRequestsRequest(recipientAccessToken).query({
        direction: 'incoming',
      });

      expectSuccessDataResponse(response, 200, [
        {
          requestId: requestId,
          name: requester.name,
          imageUrl: null,
        },
      ]);
    });

    it('should accept the maximum page limit', async () => {
      const { recipientAccessToken } = await createPendingRequest();

      const response = await friendRequestsRequest(recipientAccessToken).query({
        direction: 'incoming',
        limit: 50,
      });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('validation error', () => {
    it.each([
      { description: 'no direction', query: {}, field: 'direction' },
      { description: 'an unsupported direction', query: { direction: 'both' }, field: 'direction' },
      {
        description: 'a non-numeric page',
        query: { direction: 'incoming', page: 'abc' },
        field: 'page',
      },
      {
        description: 'a fractional page',
        query: { direction: 'incoming', page: '1.5' },
        field: 'page',
      },
      { description: 'a zero page', query: { direction: 'incoming', page: '0' }, field: 'page' },
      {
        description: 'a non-numeric limit',
        query: { direction: 'incoming', limit: 'abc' },
        field: 'limit',
      },
      {
        description: 'a fractional limit',
        query: { direction: 'incoming', limit: '1.5' },
        field: 'limit',
      },
      { description: 'a zero limit', query: { direction: 'incoming', limit: '0' }, field: 'limit' },
      {
        description: 'a limit above the maximum',
        query: { direction: 'incoming', limit: '51' },
        field: 'limit',
      },
    ])('when the query contains $description should return 400', async ({ query, field }) => {
      const { accessToken } = await signupAndLogin();

      const response = await friendRequestsRequest(accessToken).query(query);

      expectValidationError(response, field);
    });

    it('should reject invalid query parameters only after authenticating', async () => {
      const response = await friendRequestsRequest().query({ direction: 'invalid' });

      expectAuthError(response, 'Missing access token');
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
      'when get requests receives $description should return 401',
      async ({ authorization, expectedDetail }) => {
        const request = friendRequestsRequest();
        if (authorization) request.set('Authorization', authorization);

        const response = await request.query({ direction: 'incoming' });

        expectAuthError(response, expectedDetail);
      },
    );

    it.each([
      { description: 'has been deleted', userState: 'deleted' },
      { description: 'is inactive', userState: 'inactive' },
      { description: 'has a stale token version', userState: 'stale-token' },
    ])('when the requesting user $description should return 401', async ({ userState }) => {
      const { accessToken, email, refreshCookie } = await signupAndLogin();

      if (userState === 'deleted') {
        await userModel.deleteOne({ email });
      } else if (userState === 'inactive') {
        await userModel.updateOne({ email }, { $set: { status: 'DISABLED' } });
      } else {
        const logoutResponse = await api().post(LOGOUT_ALL_URL).set('Cookie', refreshCookie);
        expectSuccessMessageResponse(logoutResponse, 200, 'Logged out all sessions');
      }

      const response = await friendRequestsRequest(accessToken).query({ direction: 'incoming' });

      expectAuthError(response, 'Invalid user token');
    });
  });

  describe('server error', () => {
    it('when the relationship repository fails should return 500', async () => {
      const { accessToken } = await signupAndLogin();
      const findFriendRequests = vi
        .spyOn(MongoRelationshipRepository.prototype, 'findFriendRequests')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await friendRequestsRequest(accessToken).query({ direction: 'incoming' });

      expectServerError(response);
      expect(findFriendRequests).toHaveBeenCalledOnce();
    });

    it('when looking up request users fails should return 500', async () => {
      const { recipientAccessToken } = await createPendingRequest();
      const findPublicUsersByIds = vi
        .spyOn(MongoUserRepository.prototype, 'findPublicUsersByIds')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await friendRequestsRequest(recipientAccessToken).query({
        direction: 'incoming',
      });

      expectServerError(response);
      expect(findPublicUsersByIds).toHaveBeenCalledOnce();
    });
  });
});
