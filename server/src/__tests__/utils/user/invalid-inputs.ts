export const invalidSearchQueries: Array<{
  description: string;
  query: Record<string, string | string[]>;
  field: string;
}> = [
  { description: 'missing q', query: {}, field: 'q' },
  { description: 'empty q', query: { q: '' }, field: 'q' },
  { description: 'whitespace-only q', query: { q: '   ' }, field: 'q' },
  { description: 'q shorter than 8 characters', query: { q: '1234567' }, field: 'q' },
  { description: 'q longer than 8 characters', query: { q: '123456789' }, field: 'q' },
  {
    description: 'q containing non-alphanumeric characters',
    query: { q: '1234-678' },
    field: 'q',
  },
  { description: 'repeated q parameters', query: { q: ['12345678', '87654321'] }, field: 'q' },
];

export const invalidFriendSearchQueries: Array<{
  description: string;
  query: Record<string, string | string[]>;
  field: string;
}> = [
  { description: 'empty q', query: { q: '' }, field: 'q' },
  { description: 'whitespace-only q', query: { q: '   ' }, field: 'q' },
  { description: 'repeated q parameters', query: { q: ['first', 'second'] }, field: 'q' },
  { description: 'non-integer page', query: { page: '1.5' }, field: 'page' },
  { description: 'non-numeric page', query: { page: 'abc' }, field: 'page' },
  { description: 'empty page', query: { page: '' }, field: 'page' },
  { description: 'zero page', query: { page: '0' }, field: 'page' },
  { description: 'negative page', query: { page: '-1' }, field: 'page' },
  { description: 'repeated page parameters', query: { page: ['1', '2'] }, field: 'page' },
  { description: 'non-integer limit', query: { limit: '1.5' }, field: 'limit' },
  { description: 'non-numeric limit', query: { limit: 'abc' }, field: 'limit' },
  { description: 'empty limit', query: { limit: '' }, field: 'limit' },
  { description: 'zero limit', query: { limit: '0' }, field: 'limit' },
  { description: 'negative limit', query: { limit: '-1' }, field: 'limit' },
  { description: 'limit above 50', query: { limit: '51' }, field: 'limit' },
  { description: 'repeated limit parameters', query: { limit: ['1', '2'] }, field: 'limit' },
];
