import { REFRESH_COOKIE_NAME } from './constants.js';
import { createLoginInput, createSignupInput } from './factory.js';

const validSignupInput = createSignupInput();

export interface InvalidPayloadCase {
  description: string;
  input: object;
  expectedDetail: string;
}

export const invalidSignupInputs: InvalidPayloadCase[] = [
  {
    description: 'when_signup_body_is_not_an_object_should_return_400_with_validation_error',
    input: [],
    expectedDetail: 'body:',
  },
  {
    description: 'when_signup_name_is_missing_should_return_400_with_validation_error',
    input: { email: validSignupInput.email, password: validSignupInput.password },
    expectedDetail: 'name:',
  },
  {
    description: 'when_signup_name_is_not_a_string_should_return_400_with_validation_error',
    input: { ...validSignupInput, name: null },
    expectedDetail: 'name should be a string',
  },
  {
    description: 'when_signup_name_is_blank_should_return_400_with_validation_error',
    input: { ...validSignupInput, name: '   ' },
    expectedDetail: 'name must be at least 2 characters',
  },
  {
    description:
      'when_signup_name_is_shorter_than_2_characters_should_return_400_with_validation_error',
    input: { ...validSignupInput, name: 'A' },
    expectedDetail: 'name must be at least 2 characters',
  },
  {
    description: 'when_signup_name_exceeds_100_characters_should_return_400_with_validation_error',
    input: { ...validSignupInput, name: 'a'.repeat(101) },
    expectedDetail: 'name must be less than 100 characters',
  },
  {
    description: 'when_signup_email_is_missing_should_return_400_with_validation_error',
    input: { name: validSignupInput.name, password: validSignupInput.password },
    expectedDetail: 'email:',
  },
  {
    description: 'when_signup_email_is_not_a_string_should_return_400_with_validation_error',
    input: { ...validSignupInput, email: null },
    expectedDetail: 'email should be a string',
  },
  {
    description: 'when_signup_email_is_blank_should_return_400_with_validation_error',
    input: { ...validSignupInput, email: '   ' },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when_signup_email_is_invalid_should_return_400_with_validation_error',
    input: { ...validSignupInput, email: 'not-an-email' },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when_signup_email_exceeds_254_characters_should_return_400_with_validation_error',
    input: {
      ...validSignupInput,
      email: `a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(61)}`,
    },
    expectedDetail: 'email is too long',
  },
  {
    description: 'when_signup_password_is_missing_should_return_400_with_validation_error',
    input: { name: validSignupInput.name, email: validSignupInput.email },
    expectedDetail: 'password:',
  },
  {
    description: 'when_signup_password_is_not_a_string_should_return_400_with_validation_error',
    input: { ...validSignupInput, password: null },
    expectedDetail: 'password should be a string',
  },
  {
    description:
      'when_signup_password_is_shorter_than_8_characters_should_return_400_with_validation_error',
    input: { ...validSignupInput, password: '1234567' },
    expectedDetail: 'password must be at least 8 characters',
  },
  {
    description:
      'when_signup_password_exceeds_72_characters_should_return_400_with_validation_error',
    input: { ...validSignupInput, password: 'a'.repeat(73) },
    expectedDetail: 'password must be less than 72 characters',
  },
];

const validLoginInput = createLoginInput();

export const invalidLoginInputs: InvalidPayloadCase[] = [
  {
    description: 'when_login_body_is_not_an_object_should_return_400_with_validation_error',
    input: [],
    expectedDetail: 'body:',
  },
  {
    description: 'when_login_email_is_missing_should_return_400_with_validation_error',
    input: { password: validLoginInput.password },
    expectedDetail: 'email:',
  },
  {
    description: 'when_login_email_is_not_a_string_should_return_400_with_validation_error',
    input: { email: null, password: validLoginInput.password },
    expectedDetail: 'email should be a string',
  },
  {
    description: 'when_login_email_is_blank_should_return_400_with_validation_error',
    input: { email: '   ', password: validLoginInput.password },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when_login_email_is_invalid_should_return_400_with_validation_error',
    input: { email: 'not-an-email', password: validLoginInput.password },
    expectedDetail: 'email is invalid',
  },
  {
    description: 'when_login_email_exceeds_254_characters_should_return_400_with_validation_error',
    input: {
      email: `a@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(63)}.${'e'.repeat(61)}`,
      password: validLoginInput.password,
    },
    expectedDetail: 'email is too long',
  },
  {
    description: 'when_login_password_is_missing_should_return_400_with_validation_error',
    input: { email: validLoginInput.email },
    expectedDetail: 'password:',
  },
  {
    description: 'when_login_password_is_not_a_string_should_return_400_with_validation_error',
    input: { email: validLoginInput.email, password: null },
    expectedDetail: 'password should be a string',
  },
  {
    description:
      'when_login_password_is_shorter_than_8_characters_should_return_400_with_validation_error',
    input: { email: validLoginInput.email, password: '1234567' },
    expectedDetail: 'password must be at least 8 characters',
  },
  {
    description:
      'when_login_password_exceeds_72_characters_should_return_400_with_validation_error',
    input: { email: validLoginInput.email, password: 'a'.repeat(73) },
    expectedDetail: 'password must be less than 72 characters',
  },
];

export type InvalidCookieKind =
  'missing' | 'empty' | 'wrong-name' | 'malformed' | 'expired' | 'wrong-token-type';

export interface InvalidRefreshCookieCase {
  description: string;
  kind: InvalidCookieKind;
  cookie?: string;
  expectedDetail: string;
}

export const invalidRefreshCookieCases: InvalidRefreshCookieCase[] = [
  {
    description: 'when_refresh_cookie_is_missing_should_return_401',
    kind: 'missing',
    cookie: undefined,
    expectedDetail: 'Missing refresh token',
  },
  {
    description: 'when_refresh_cookie_is_empty_should_return_401',
    kind: 'empty',
    cookie: `${REFRESH_COOKIE_NAME}=`,
    expectedDetail: 'Missing refresh token',
  },
  {
    description: 'when_refresh_token_uses_wrong_cookie_name_should_return_401',
    kind: 'wrong-name',
    cookie: 'other_refresh_token=some-token',
    expectedDetail: 'Missing refresh token',
  },
  {
    description: 'when_refresh_token_is_malformed_should_return_401',
    kind: 'malformed',
    cookie: `${REFRESH_COOKIE_NAME}=not-a-valid-token`,
    expectedDetail: 'Invalid refresh token',
  },
  {
    description: 'when_refresh_token_is_expired_should_return_401',
    kind: 'expired',
    expectedDetail: 'Invalid refresh token',
  },
  {
    description: 'when_access_token_is_sent_as_refresh_cookie_should_return_401',
    kind: 'wrong-token-type',
    expectedDetail: 'Invalid refresh token',
  },
];
