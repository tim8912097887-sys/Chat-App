import { randomUUID } from 'crypto';
import {
  DEFAULT_GROUP_NAME,
  INVALID_UUID,
  MAX_CONVERSATIONS_LIMIT,
  MAX_CONVERSATIONS_OFFSET,
  MAX_GROUP_NAME_LENGTH,
  MAX_IMAGE_URL_LENGTH,
} from './constants.js';

const overMaxName = 'a'.repeat(MAX_GROUP_NAME_LENGTH + 1);
const overMaxImageUrl = `https://cdn.example.com/${'a'.repeat(MAX_IMAGE_URL_LENGTH)}`;

export const invalidCreateConversationInputs: Array<{
  caseName: string;
  payload: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'empty body',
    payload: {},
    expectedDetail: 'type',
  },
  {
    caseName: 'unsupported conversation type',
    payload: { type: 'CHANNEL', name: DEFAULT_GROUP_NAME },
    expectedDetail: 'type',
  },
  {
    caseName: 'DIRECT without targetUserId',
    payload: { type: 'DIRECT' },
    expectedDetail: 'targetUserId',
  },
  {
    caseName: 'DIRECT with invalid targetUserId',
    payload: { type: 'DIRECT', targetUserId: INVALID_UUID },
    expectedDetail: 'targetUserId',
  },
  {
    caseName: 'DIRECT with extra unknown field',
    payload: { type: 'DIRECT', targetUserId: randomUUID(), name: DEFAULT_GROUP_NAME },
    expectedDetail: 'Unrecognized key',
  },
  {
    caseName: 'GROUP without name',
    payload: { type: 'GROUP' },
    expectedDetail: 'name',
  },
  {
    caseName: 'GROUP with empty name',
    payload: { type: 'GROUP', name: '' },
    expectedDetail: 'name',
  },
  {
    caseName: 'GROUP with whitespace-only name',
    payload: { type: 'GROUP', name: '   ' },
    expectedDetail: 'name',
  },
  {
    caseName: 'GROUP with name exceeding max length',
    payload: { type: 'GROUP', name: overMaxName },
    expectedDetail: 'name',
  },
  {
    caseName: 'GROUP with invalid imageUrl format',
    payload: { type: 'GROUP', name: DEFAULT_GROUP_NAME, imageUrl: 'not-a-url' },
    expectedDetail: 'imageUrl',
  },
  {
    caseName: 'GROUP with imageUrl exceeding max length',
    payload: { type: 'GROUP', name: DEFAULT_GROUP_NAME, imageUrl: overMaxImageUrl },
    expectedDetail: 'imageUrl',
  },
  {
    caseName: 'GROUP with null imageUrl',
    payload: { type: 'GROUP', name: DEFAULT_GROUP_NAME, imageUrl: null },
    expectedDetail: 'imageUrl',
  },
  {
    caseName: 'GROUP with extra unknown field',
    payload: { type: 'GROUP', name: DEFAULT_GROUP_NAME, extra: 'unexpected' },
    expectedDetail: 'Unrecognized key',
  },
];

export const invalidGetConversationsQueries: Array<{
  caseName: string;
  query: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'negative offset',
    query: { offset: -1 },
    expectedDetail: 'offset',
  },
  {
    caseName: 'non-integer offset',
    query: { offset: 1.5 },
    expectedDetail: 'offset',
  },
  {
    caseName: 'non-numeric offset',
    query: { offset: 'abc' },
    expectedDetail: 'offset',
  },
  {
    caseName: 'offset exceeding maximum',
    query: { offset: MAX_CONVERSATIONS_OFFSET + 1 },
    expectedDetail: 'offset',
  },
  {
    caseName: 'zero limit',
    query: { limit: 0 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'negative limit',
    query: { limit: -5 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'limit exceeding maximum',
    query: { limit: MAX_CONVERSATIONS_LIMIT + 1 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'non-integer limit',
    query: { limit: 2.5 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'non-numeric limit',
    query: { limit: 'abc' },
    expectedDetail: 'limit',
  },
  {
    caseName: 'extra unknown query parameter',
    query: { unknownParam: 'value' },
    expectedDetail: 'Unrecognized key',
  },
];

export const invalidUpdateConversationInputs: Array<{
  caseName: string;
  payload: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'empty body',
    payload: {},
    expectedDetail: 'At least one field must be provided',
  },
  {
    caseName: 'empty name string',
    payload: { name: '' },
    expectedDetail: 'name',
  },
  {
    caseName: 'whitespace-only name',
    payload: { name: '   ' },
    expectedDetail: 'name',
  },
  {
    caseName: 'name exceeding max length',
    payload: { name: overMaxName },
    expectedDetail: 'name',
  },
  {
    caseName: 'invalid imageUrl format',
    payload: { imageUrl: 'invalid-url' },
    expectedDetail: 'imageUrl',
  },
  {
    caseName: 'imageUrl exceeding max length',
    payload: { imageUrl: overMaxImageUrl },
    expectedDetail: 'imageUrl',
  },
  {
    caseName: 'extra unknown field',
    payload: { name: DEFAULT_GROUP_NAME, unknownField: true },
    expectedDetail: 'Unrecognized key',
  },
];

export const invalidUpdateMemberRoleInputs: Array<{
  caseName: string;
  payload: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'empty body',
    payload: {},
    expectedDetail: 'role',
  },
  {
    caseName: 'OWNER role is forbidden in body',
    payload: { role: 'OWNER' },
    expectedDetail: 'role',
  },
  {
    caseName: 'unsupported role string',
    payload: { role: 'MODERATOR' },
    expectedDetail: 'role',
  },
  {
    caseName: 'non-string role',
    payload: { role: 123 },
    expectedDetail: 'role',
  },
  {
    caseName: 'extra unknown field',
    payload: { role: 'ADMIN', extra: 'value' },
    expectedDetail: 'Unrecognized key',
  },
];

export const invalidInviteMemberInputs: Array<{
  caseName: string;
  payload: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'empty body',
    payload: {},
    expectedDetail: 'userId',
  },
  {
    caseName: 'invalid userId UUID',
    payload: { userId: INVALID_UUID },
    expectedDetail: 'userId',
  },
  {
    caseName: 'non-string userId',
    payload: { userId: 12345 },
    expectedDetail: 'userId',
  },
  {
    caseName: 'extra unknown field',
    payload: { userId: randomUUID(), role: 'ADMIN' },
    expectedDetail: 'Unrecognized key',
  },
];
