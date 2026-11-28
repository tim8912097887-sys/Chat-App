import { api } from '../common/app.js';
import { LOGIN_URL, LOGOUT_ALL_URL, LOGOUT_URL, REFRESH_URL, SIGNUP_URL } from './constants.js';

export interface SignupMultipartOptions {
  filePath: string;
  fields: {
    name?: string;
    email?: string;
    password?: string;
  };
}

export function signupRequest(payload: object) {
  return api().post(SIGNUP_URL).send(payload);
}

export function signupWithImageRequest({ filePath, fields }: SignupMultipartOptions) {
  const req = api().post(SIGNUP_URL).attach('image', filePath);

  if (fields.name !== undefined) req.field('name', fields.name);
  if (fields.email !== undefined) req.field('email', fields.email);
  if (fields.password !== undefined) req.field('password', fields.password);

  return req;
}

export function loginRequest(payload: object) {
  return api().post(LOGIN_URL).send(payload);
}

export function refreshRequest(cookie?: string) {
  const req = api().post(REFRESH_URL);
  if (cookie !== undefined) {
    req.set('Cookie', cookie);
  }
  return req;
}

export function logoutRequest(cookie?: string) {
  const req = api().post(LOGOUT_URL);
  if (cookie !== undefined) {
    req.set('Cookie', cookie);
  }
  return req;
}

export function logoutAllRequest(cookie?: string) {
  const req = api().post(LOGOUT_ALL_URL);
  if (cookie !== undefined) {
    req.set('Cookie', cookie);
  }
  return req;
}
