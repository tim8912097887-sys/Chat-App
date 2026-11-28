import { MAX_FRIEND_SEARCH_LIMIT } from './constants.js';

export interface InvalidAuthHeaderCase {
  description: string;
  authorizationHeader?: string;
  expectedDetail: string;
}

export interface InvalidQueryCase {
  description: string;
  query: Record<string, unknown>;
  expectedDetail: string;
}

export const invalidSearchCodeQueries: InvalidQueryCase[] = [
  {
    description: 'q is missing',
    query: {},
    expectedDetail: 'q: q must be a string',
  },
  {
    description: 'q is empty string',
    query: { q: '' },
    expectedDetail: 'q: q must be 8 characters',
  },
  {
    description: 'q is whitespace only',
    query: { q: '        ' },
    expectedDetail: 'q: q must be 8 characters',
  },
  {
    description: 'q is shorter than 8 characters',
    query: { q: 'Ab12345' },
    expectedDetail: 'q: q must be 8 characters',
  },
  {
    description: 'q is shorter than 8 characters after trimming',
    query: { q: '  Ab1234  ' },
    expectedDetail: 'q: q must be 8 characters',
  },
  {
    description: 'q is longer than 8 characters',
    query: { q: 'Ab1234567' },
    expectedDetail: 'q: q must be 8 characters',
  },
  {
    description: 'q contains hyphen',
    query: { q: 'Ab12-345' },
    expectedDetail: 'q: q must contain only letters and numbers',
  },
  {
    description: 'q contains underscore',
    query: { q: 'Ab12_345' },
    expectedDetail: 'q: q must contain only letters and numbers',
  },
  {
    description: 'q contains internal whitespace',
    query: { q: 'Ab12 345' },
    expectedDetail: 'q: q must contain only letters and numbers',
  },
  {
    description: 'q is an array of strings',
    query: { q: ['Ab123456', 'Cd789012'] },
    expectedDetail: 'q: q must be a string',
  },
];

export const invalidFriendSearchQueries: InvalidQueryCase[] = [
  {
    description: 'q is empty string',
    query: { q: '' },
    expectedDetail: 'q: q must not be empty',
  },
  {
    description: 'q is whitespace only',
    query: { q: '   ' },
    expectedDetail: 'q: q must not be empty',
  },
  {
    description: 'q is an array of strings',
    query: { q: ['alice', 'bob'] },
    expectedDetail: 'q: q must be a string',
  },
  {
    description: 'page is zero',
    query: { page: 0 },
    expectedDetail: 'page: page must be at least 1',
  },
  {
    description: 'page is negative',
    query: { page: -1 },
    expectedDetail: 'page: page must be at least 1',
  },
  {
    description: 'page is empty string',
    query: { page: '' },
    expectedDetail: 'page: page must be at least 1',
  },
  {
    description: 'page is a decimal number',
    query: { page: 1.5 },
    expectedDetail: 'page: page must be an integer',
  },
  {
    description: 'page is non-numeric',
    query: { page: 'abc' },
    expectedDetail: 'page: page must be a number',
  },
  {
    description: 'limit is zero',
    query: { limit: 0 },
    expectedDetail: 'limit: limit must be at least 1',
  },
  {
    description: 'limit is negative',
    query: { limit: -5 },
    expectedDetail: 'limit: limit must be at least 1',
  },
  {
    description: 'limit is empty string',
    query: { limit: '' },
    expectedDetail: 'limit: limit must be at least 1',
  },
  {
    description: 'limit exceeds maximum allowed per page',
    query: { limit: MAX_FRIEND_SEARCH_LIMIT + 1 },
    expectedDetail: `limit: limit must be at most ${MAX_FRIEND_SEARCH_LIMIT}`,
  },
  {
    description: 'limit is a decimal number',
    query: { limit: 2.5 },
    expectedDetail: 'limit: limit must be an integer',
  },
  {
    description: 'limit is non-numeric',
    query: { limit: 'abc' },
    expectedDetail: 'limit: limit must be a number',
  },
];
