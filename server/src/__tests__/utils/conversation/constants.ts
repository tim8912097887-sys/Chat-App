export const CONVERSATIONS_URL = '/api/v1/conversations';

export const conversationDetailsUrl = (conversationId: string): string =>
  `${CONVERSATIONS_URL}/${conversationId}`;

export const conversationMembersUrl = (conversationId: string): string =>
  `${CONVERSATIONS_URL}/${conversationId}/members`;

export const conversationMemberUrl = (conversationId: string, memberId: string): string =>
  `${CONVERSATIONS_URL}/${conversationId}/members/${memberId}`;

export const leaveConversationUrl = (conversationId: string): string =>
  `${CONVERSATIONS_URL}/${conversationId}/members/me`;

export const DEFAULT_GROUP_NAME = 'Engineering Team';
export const UPDATED_GROUP_NAME = 'Platform Team';
export const DEFAULT_GROUP_IMAGE_URL = 'https://cdn.example.com/group-avatar.png';
export const UPDATED_GROUP_IMAGE_URL = 'https://cdn.example.com/group-avatar-v2.png';

export const MAX_GROUP_NAME_LENGTH = 80;
export const MAX_IMAGE_URL_LENGTH = 2048;

export const DEFAULT_CONVERSATIONS_OFFSET = 0;
export const DEFAULT_CONVERSATIONS_LIMIT = 20;
export const MAX_CONVERSATIONS_OFFSET = 100000;
export const MAX_CONVERSATIONS_LIMIT = 100;

export const INVALID_UUID = 'not-a-valid-uuid';
