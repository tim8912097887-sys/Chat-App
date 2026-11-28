import { MAX_LIMIT_PER_PAGE } from '../../../domain/user/user.constants.js';

export const RELATIONSHIP_URL = '/api/v1/friend-requests';

export const RELATIONSHIP_INVITE_URL = `${RELATIONSHIP_URL}/`;

export const REJECT_RELATIONSHIP_URL = `${RELATIONSHIP_URL}/reject`;

export const ACCEPT_RELATIONSHIP_URL = `${RELATIONSHIP_URL}/accept`;

export const DEFAULT_AVATAR_URL = 'https://cdn.example.com/avatar.png';

export const DEFAULT_PAGE_LIMIT = 20;

export const OVER_MAX_LIMIT = MAX_LIMIT_PER_PAGE + 1;
