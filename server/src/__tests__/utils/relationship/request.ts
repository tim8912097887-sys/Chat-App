import { api } from '../common/app.js';
import {
  ACCEPT_RELATIONSHIP_URL,
  REJECT_RELATIONSHIP_URL,
  RELATIONSHIP_INVITE_URL,
  RELATIONSHIP_URL,
} from './constants.js';

export interface RawRequestOptions {
  authHeader?: string;
  body?: Record<string, unknown>;
}

export async function inviteFriend(
  accessToken?: string,
  targetId?: string,
  options?: RawRequestOptions,
) {
  const req = api().post(RELATIONSHIP_INVITE_URL);

  if (options?.authHeader !== undefined) {
    req.set('Authorization', options.authHeader);
  } else if (accessToken) {
    req.set('Authorization', `Bearer ${accessToken}`);
  }

  return req.send(options?.body ?? (targetId !== undefined ? { targetUserId: targetId } : {}));
}

export async function rejectRelationship(
  accessToken?: string,
  requesterId?: string,
  options?: RawRequestOptions,
) {
  const req = api().post(REJECT_RELATIONSHIP_URL);

  if (options?.authHeader !== undefined) {
    req.set('Authorization', options.authHeader);
  } else if (accessToken) {
    req.set('Authorization', `Bearer ${accessToken}`);
  }

  return req.send(options?.body ?? (requesterId !== undefined ? { requesterId } : {}));
}

export async function acceptRelationship(
  accessToken?: string,
  requesterId?: string,
  options?: RawRequestOptions,
) {
  const req = api().post(ACCEPT_RELATIONSHIP_URL);

  if (options?.authHeader !== undefined) {
    req.set('Authorization', options.authHeader);
  } else if (accessToken) {
    req.set('Authorization', `Bearer ${accessToken}`);
  }

  return req.send(options?.body ?? (requesterId !== undefined ? { requesterId } : {}));
}

export function friendRequestsRequest(
  accessToken?: string,
  options?: { authHeader?: string; query?: Record<string, unknown> },
) {
  const request = api().get(RELATIONSHIP_URL);

  if (options?.authHeader !== undefined) {
    request.set('Authorization', options.authHeader);
  } else if (accessToken) {
    request.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options?.query) {
    request.query(options.query);
  }

  return request;
}
