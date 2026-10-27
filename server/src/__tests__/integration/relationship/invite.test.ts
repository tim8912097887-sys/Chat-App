import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoRelationshipRepository } from '../../../domain/relationship/relationship.repository.js';
import { signupAndLogin } from '../../utils/user/query.js';
import { friendshipModel, truncateAll, userModel } from '../../utils/common/query.js';
import { api, mockedRealtimePublisher } from '../../utils/common/app.js';
import { LOGOUT_ALL_URL } from '../../utils/auth/constants.js';
import {
  acceptRelationship,
  inviteFriend,
  rejectRelationship,
} from '../../utils/relationship/query.js';
import {
  expectAuthError,
  expectServerConflictError,
  expectServerError,
  expectSuccessMessageResponse,
  expectValidationError,
} from '../../utils/common/assertion.js';
import { RELATIONSHIP_INVITE_URL } from '../../utils/relationship/constants.js';
import { realtimeEventAssertion } from '../../utils/common/realtime.js';
import { FRIEND_REQUEST_CREATED_EVENT } from '../../../realtime/realtime.constants.js';

describe('invite friend', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  describe('success', () => {
    it('when invite friend should create a pending request and return 201 with message', async () => {
      const { accessToken } = await signupAndLogin();
      const requester = await userModel.findOne({});
      expect(requester).not.toBeNull();
      await signupAndLogin();
      const recipient = await userModel.findOne({ _id: { $ne: requester?._id } });
      expect(recipient).not.toBeNull();

      const response = await inviteFriend(accessToken, recipient!._id.toString());
      const friendship = await friendshipModel.findOne({});

      expectSuccessMessageResponse(response, 201, 'Friend request sent');
      expect(friendship).toMatchObject({
        userIds: [requester!._id.toString(), recipient!._id.toString()],
        requestedBy: requester!._id.toString(),
        status: 'PENDING',
      });
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledOnce();
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        recipient!._id.toString(),
        realtimeEventAssertion(FRIEND_REQUEST_CREATED_EVENT, {
          requestId: friendship?._id.toString(),
          requester: {
            id: requester!._id.toString(),
            name: requester!.name,
            imageUrl: requester!.imageUrl ?? null,
          },
        }),
      );
    });

    it('when invite friend that already been rejected should return 200 with message', async () => {
      const { accessToken: firstAccessToken } = await signupAndLogin();
      const firstUser = await userModel.findOne({});
      expect(firstUser?.tokenVersion).not.toBeNull();
      const { accessToken: secondAccessToken, email: secondEmail } = await signupAndLogin();
      const secondUser = await userModel.findOne({ email: secondEmail });
      expect(secondUser).not.toBeNull();
      await inviteFriend(secondAccessToken, firstUser?._id.toString() as string);
      const invite = await friendshipModel.findOne({});
      expect(invite?.status).toBe('PENDING');
      await rejectRelationship(firstAccessToken, invite?._id.toString() as string);

      const response = await inviteFriend(secondAccessToken, firstUser?._id.toString() as string);
      const updatedInvite = await friendshipModel.findOne({});

      expectSuccessMessageResponse(response, 201, 'Friend request sent');
      expect(updatedInvite?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(3);
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledWith(
        firstUser!._id.toString(),
        realtimeEventAssertion(FRIEND_REQUEST_CREATED_EVENT, {
          requestId: updatedInvite?._id.toString(),
          requester: {
            id: secondUser!._id.toString(),
            name: secondUser!.name,
            imageUrl: secondUser!.imageUrl ?? null,
          },
        }),
      );
    });

    it('when both users concurrently invite each other should create only one pending request', async () => {
      const { accessToken: firstAccessToken, email: firstEmail } = await signupAndLogin();
      const { accessToken: secondAccessToken, email: secondEmail } = await signupAndLogin();
      const firstUser = await userModel.findOne({ email: firstEmail });
      const secondUser = await userModel.findOne({ email: secondEmail });
      expect(firstUser).not.toBeNull();
      expect(secondUser).not.toBeNull();

      const responses = await Promise.all([
        inviteFriend(firstAccessToken, secondUser!._id.toString()),
        inviteFriend(secondAccessToken, firstUser!._id.toString()),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ServerConflictError',
      );
      expect(await friendshipModel.countDocuments()).toBe(1);
      expect((await friendshipModel.findOne({}))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledOnce();
    });

    it('when both users concurrently reopen a rejected request should reopen it only once', async () => {
      const { accessToken: firstAccessToken, email: firstEmail } = await signupAndLogin();
      const { accessToken: secondAccessToken, email: secondEmail } = await signupAndLogin();
      const firstUser = await userModel.findOne({ email: firstEmail });
      const secondUser = await userModel.findOne({ email: secondEmail });
      expect(firstUser).not.toBeNull();
      expect(secondUser).not.toBeNull();

      const initialResponse = await inviteFriend(firstAccessToken, secondUser!._id.toString());
      expect(initialResponse.status).toBe(201);
      const initialRequest = await friendshipModel.findOne({});
      expect(initialRequest).not.toBeNull();
      await rejectRelationship(secondAccessToken, initialRequest!._id.toString());

      const responses = await Promise.all([
        inviteFriend(firstAccessToken, secondUser!._id.toString()),
        inviteFriend(secondAccessToken, firstUser!._id.toString()),
      ]);

      expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
      expect(responses.find((response) => response.status === 409)?.body.error.code).toBe(
        'ServerConflictError',
      );
      expect(await friendshipModel.countDocuments()).toBe(1);
      expect((await friendshipModel.findById(initialRequest!._id))?.status).toBe('PENDING');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(3);
    });
  });

  describe('validation error', () => {
    it.each([
      { description: 'missing targetUserId', body: {} },
      { description: 'empty targetUserId', body: { targetUserId: '' } },
      { description: 'null targetUserId', body: { targetUserId: null } },
      { description: 'malformed targetUserId', body: { targetUserId: 'not-a-uuid' } },
    ])('when invite receives $description should return 400', async ({ body }) => {
      const { accessToken } = await signupAndLogin();

      const response = await api()
        .post(RELATIONSHIP_INVITE_URL)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);

      expectValidationError(response, 'targetUserId');
      expect(await friendshipModel.countDocuments()).toBe(0);
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
      'when invite receives $description should return 401',
      async ({ authorization, expectedDetail }) => {
        await signupAndLogin();
        const target = await userModel.findOne({});
        expect(target).not.toBeNull();

        const request = api().post(RELATIONSHIP_INVITE_URL).send({
          targetUserId: target!._id.toString(),
        });
        if (authorization) request.set('Authorization', authorization);

        const response = await request;

        expectAuthError(response, expectedDetail);
        expect(await friendshipModel.countDocuments()).toBe(0);
      },
    );

    it.each([
      { description: 'does not exist', userState: 'deleted' },
      { description: 'is inactive', userState: 'inactive' },
      { description: 'has a stale token version', userState: 'stale-token' },
    ])(
      'when invite uses an access token for a user that $description should return 401',
      async ({ userState }) => {
        const { accessToken, email, refreshCookie } = await signupAndLogin();
        await signupAndLogin();
        const target = await userModel.findOne({ email: { $ne: email } });
        expect(target).not.toBeNull();

        if (userState === 'deleted') {
          await userModel.deleteOne({ email });
        } else if (userState === 'inactive') {
          await userModel.updateOne({ email }, { $set: { status: 'DISABLED' } });
        } else {
          const logoutResponse = await api().post(LOGOUT_ALL_URL).set('Cookie', refreshCookie);
          expectSuccessMessageResponse(logoutResponse, 200, 'Logged out all sessions');
        }

        const response = await inviteFriend(accessToken, target!._id.toString());

        expectAuthError(response, 'Invalid user token');
        expect(await friendshipModel.countDocuments()).toBe(0);
      },
    );
  });

  describe('business logic error', () => {
    it.each([
      { description: 'requester repeats the invite', reciprocal: false },
      { description: 'invited user sends a reciprocal invite', reciprocal: true },
    ])(
      'when $description should return 409 and not create another request',
      async ({ reciprocal }) => {
        const { accessToken: requesterAccessToken } = await signupAndLogin();
        const requester = await userModel.findOne({});
        expect(requester).not.toBeNull();
        const { accessToken: recipientAccessToken } = await signupAndLogin();
        const recipient = await userModel.findOne({ _id: { $ne: requester?._id } });
        expect(recipient).not.toBeNull();
        await inviteFriend(requesterAccessToken, recipient!._id.toString());

        const response = await inviteFriend(
          reciprocal ? recipientAccessToken : requesterAccessToken,
          reciprocal ? requester!._id.toString() : recipient!._id.toString(),
        );

        expectServerConflictError(response, 'A friend request or friendship already exists');
        expect(await friendshipModel.countDocuments()).toBe(1);
        expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledOnce();
      },
    );

    it('when invite self should return 409 and not create a request', async () => {
      const { accessToken } = await signupAndLogin();
      const user = await userModel.findOne({});
      expect(user).not.toBeNull();

      const response = await inviteFriend(accessToken, user!._id.toString());

      expectServerConflictError(response, 'A user cannot send a friend request to themselves');
      expect(await friendshipModel.countDocuments()).toBe(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });

    it('when invite friend that already been accepted should return 409 with message', async () => {
      const { accessToken: firstAccessToken } = await signupAndLogin();
      const firstUser = await userModel.findOne({});
      expect(firstUser?.tokenVersion).not.toBeNull();
      const { accessToken: secondAccessToken } = await signupAndLogin();
      await inviteFriend(secondAccessToken, firstUser?._id.toString() as string);
      const invite = await friendshipModel.findOne({});
      expect(invite?.status).toBe('PENDING');
      await acceptRelationship(firstAccessToken, invite?._id.toString() as string);

      const response = await inviteFriend(secondAccessToken, firstUser?._id.toString() as string);

      expectServerConflictError(response, 'A friend request or friendship already exists');
      expect(mockedRealtimePublisher.publishToUser).toHaveBeenCalledTimes(2);
    });
  });

  describe('server error', () => {
    it('when friendship repository fails to create an invite should return 500 and not persist a friendship', async () => {
      const { accessToken } = await signupAndLogin();
      const requester = await userModel.findOne({});
      expect(requester).not.toBeNull();
      await signupAndLogin();
      const recipient = await userModel.findOne({ _id: { $ne: requester?._id } });
      expect(recipient).not.toBeNull();
      const createFriendRequestSpy = vi
        .spyOn(MongoRelationshipRepository.prototype, 'createFriendRequest')
        .mockRejectedValue(new Error('database unavailable'));

      const response = await inviteFriend(accessToken, recipient!._id.toString());

      expectServerError(response);
      expect(createFriendRequestSpy).toHaveBeenCalledOnce();
      expect(await friendshipModel.countDocuments()).toBe(0);
      expect(mockedRealtimePublisher.publishToUser).not.toHaveBeenCalled();
    });
  });
});
