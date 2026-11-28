export const AUTH_URL = '/api/v1/auth';

export const SIGNUP_URL = `${AUTH_URL}/signup`;
export const LOGIN_URL = `${AUTH_URL}/login`;
export const REFRESH_URL = `${AUTH_URL}/refresh`;
export const LOGOUT_URL = `${AUTH_URL}/logout`;
export const LOGOUT_ALL_URL = `${AUTH_URL}/logout-all`;

export const REFRESH_COOKIE_NAME = 'refresh_token';

export const DEFAULT_USER_NAME = 'Test User';
export const DEFAULT_USER_EMAIL = 'test@example.com';
export const DEFAULT_USER_PASSWORD = 'Password123!';

export const TEST_PASSWORD_HASH_COST = 5;
export const DEFAULT_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
