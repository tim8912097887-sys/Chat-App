import { expect } from 'vitest';
import { LOGIN_URL, REFRESH_COOKIE_NAME, SIGNUP_URL } from '../auth/constants.js';
import { loginUserInput, signupUserInput } from '../auth/factory.js';
import { api } from '../common/app.js';
import { FRIEND_SEARCH_URL } from './constants.js';

export async function signupAndLogin() {
  const input = signupUserInput({ email: `search-${crypto.randomUUID()}@example.com` });
  const signupResponse = await api().post(SIGNUP_URL).send(input);
  expect(signupResponse.status).toBe(201);

  const loginResponse = await api()
    .post(LOGIN_URL)
    .send(loginUserInput({ email: input.email, password: input.password }));
  expect(loginResponse.status).toBe(200);

  const loginBody = loginResponse.body;
  expect(loginBody).toMatchObject({
    state: 'success',
    error: null,
    data: expect.objectContaining({
      accessToken: expect.any(String),
    }),
  });
  const accessToken = loginBody.data.accessToken;

  const responseHeaders = loginResponse.headers;

  const setCookieHeader = responseHeaders['set-cookie'];
  const refreshCookie = Array.isArray(setCookieHeader)
    ? setCookieHeader.find((value) => value.startsWith(`${REFRESH_COOKIE_NAME}=`))
    : setCookieHeader?.startsWith(`${REFRESH_COOKIE_NAME}=`)
      ? setCookieHeader
      : undefined;
  if (!refreshCookie) {
    throw new Error('Login response did not include a refresh token cookie');
  }

  return {
    email: input.email,
    accessToken,
    refreshCookie,
  };
}

export function friendSearchRequest(accessToken?: string) {
  const request = api().get(FRIEND_SEARCH_URL);
  if (accessToken) request.set('Authorization', `Bearer ${accessToken}`);
  return request;
}
