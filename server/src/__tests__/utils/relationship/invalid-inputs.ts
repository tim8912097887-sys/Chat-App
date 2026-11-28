import { OVER_MAX_LIMIT } from './constants.js';

export const invalidInviteFriendInputs: Array<{
  caseName: string;
  body: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'missing targetUserId',
    body: {},
    expectedDetail: 'targetUserId',
  },
  {
    caseName: 'empty targetUserId',
    body: { targetUserId: '' },
    expectedDetail: 'targetUserId must be a valid user id',
  },
  {
    caseName: 'non-uuid targetUserId',
    body: { targetUserId: 'not-a-valid-uuid' },
    expectedDetail: 'targetUserId must be a valid user id',
  },
  {
    caseName: 'null targetUserId',
    body: { targetUserId: null },
    expectedDetail: 'targetUserId',
  },
  {
    caseName: 'numeric targetUserId',
    body: { targetUserId: 12345 },
    expectedDetail: 'targetUserId',
  },
];

export const invalidUpdateFriendRequestInputs: Array<{
  caseName: string;
  body: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'missing requesterId',
    body: {},
    expectedDetail: 'requesterId',
  },
  {
    caseName: 'empty requesterId',
    body: { requesterId: '' },
    expectedDetail: 'requesterId must be a valid user id',
  },
  {
    caseName: 'non-uuid requesterId',
    body: { requesterId: 'not-a-valid-uuid' },
    expectedDetail: 'requesterId must be a valid user id',
  },
  {
    caseName: 'null requesterId',
    body: { requesterId: null },
    expectedDetail: 'requesterId',
  },
  {
    caseName: 'numeric requesterId',
    body: { requesterId: 12345 },
    expectedDetail: 'requesterId',
  },
];

export const invalidGetFriendRequestsQueries: Array<{
  caseName: string;
  query: Record<string, unknown>;
  expectedDetail: string;
}> = [
  {
    caseName: 'missing direction',
    query: {},
    expectedDetail: 'direction',
  },
  {
    caseName: 'invalid direction enum value',
    query: { direction: 'all' },
    expectedDetail: 'direction',
  },
  {
    caseName: 'empty direction',
    query: { direction: '' },
    expectedDetail: 'direction',
  },
  {
    caseName: 'non-numeric page',
    query: { direction: 'incoming', page: 'abc' },
    expectedDetail: 'page',
  },
  {
    caseName: 'zero page',
    query: { direction: 'incoming', page: 0 },
    expectedDetail: 'page',
  },
  {
    caseName: 'negative page',
    query: { direction: 'incoming', page: -1 },
    expectedDetail: 'page',
  },
  {
    caseName: 'decimal page',
    query: { direction: 'incoming', page: 1.5 },
    expectedDetail: 'page',
  },
  {
    caseName: 'non-numeric limit',
    query: { direction: 'incoming', limit: 'abc' },
    expectedDetail: 'limit',
  },
  {
    caseName: 'zero limit',
    query: { direction: 'incoming', limit: 0 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'negative limit',
    query: { direction: 'incoming', limit: -5 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'decimal limit',
    query: { direction: 'incoming', limit: 2.5 },
    expectedDetail: 'limit',
  },
  {
    caseName: 'limit exceeding max limit per page',
    query: { direction: 'incoming', limit: OVER_MAX_LIMIT },
    expectedDetail: 'limit',
  },
];
