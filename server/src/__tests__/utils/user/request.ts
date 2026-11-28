import type { Response } from 'supertest';
import { api } from '../common/app.js';
import { USER_FRIEND_SEARCH_URL, USER_PROFILE_URL, USER_SEARCH_URL } from './constants.js';

export interface AuthRequestOptions {
  accessToken?: string;
  authorizationHeader?: string;
}

function applyAuthHeader(
  req: ReturnType<ReturnType<typeof api>['get']>,
  options: AuthRequestOptions,
) {
  if (options.authorizationHeader !== undefined) {
    return req.set('Authorization', options.authorizationHeader);
  }
  if (options.accessToken !== undefined) {
    return req.set('Authorization', `Bearer ${options.accessToken}`);
  }
  return req;
}

export async function getProfileRequest(options: AuthRequestOptions = {}): Promise<Response> {
  const req = api().get(USER_PROFILE_URL);
  return applyAuthHeader(req, options);
}

export async function searchUserRequest(
  options: AuthRequestOptions & { query?: Record<string, unknown> } = {},
): Promise<Response> {
  const req = api().get(USER_SEARCH_URL);
  if (options.query) {
    req.query(options.query);
  }
  return applyAuthHeader(req, options);
}

export async function searchFriendsRequest(
  options: AuthRequestOptions & { query?: Record<string, unknown> } = {},
): Promise<Response> {
  const req = api().get(USER_FRIEND_SEARCH_URL);
  if (options.query) {
    req.query(options.query);
  }
  return applyAuthHeader(req, options);
}
