import { expect } from 'vitest';
import { api } from '../common/app.js';
import { friendshipModel, userModel } from '../common/query.js';
import {
  acceptRelationshipUrl,
  rejectRelationshipUrl,
  RELATIONSHIP_INVITE_URL,
  RELATIONSHIP_URL,
} from './constants.js';
import { signupAndLogin } from '../user/query.js';

export async function inviteFriend(accessToken: string, targetId: string) {
  const response = await api()
    .post(RELATIONSHIP_INVITE_URL)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ targetUserId: targetId });
  return response;
}

export async function rejectRelationship(accessToken: string, requestId: string) {
  const response = await api()
    .post(rejectRelationshipUrl(requestId))
    .set('Authorization', `Bearer ${accessToken}`);
  return response;
}

export async function acceptRelationship(accessToken: string, requestId: string) {
  const response = await api()
    .post(acceptRelationshipUrl(requestId))
    .set('Authorization', `Bearer ${accessToken}`);
  return response;
}

export async function createPendingRequest() {
  const { accessToken: requesterAccessToken, email: requesterEmail } = await signupAndLogin();
  const requester = await userModel.findOne({ email: requesterEmail });
  expect(requester).not.toBeNull();
  const {
    accessToken: recipientAccessToken,
    email: recipientEmail,
    refreshCookie: recipientRefreshCookie,
  } = await signupAndLogin();
  const recipient = await userModel.findOne({ email: recipientEmail });
  expect(recipient).not.toBeNull();

  await inviteFriend(requesterAccessToken, recipient!._id.toString());
  const relationship = await friendshipModel.findOne({
    userIds: { $all: [requester!._id.toString(), recipient!._id.toString()], $size: 2 },
  });
  expect(relationship?.status).toBe('PENDING');

  return {
    requester: requester!,
    recipient: recipient!,
    requesterAccessToken,
    requesterEmail,
    recipientAccessToken,
    recipientEmail,
    recipientRefreshCookie,
    requestId: relationship!._id.toString(),
  };
}

export function friendRequestsRequest(accessToken?: string) {
  const request = api().get(RELATIONSHIP_URL);
  if (accessToken) request.set('Authorization', `Bearer ${accessToken}`);
  return request;
}
