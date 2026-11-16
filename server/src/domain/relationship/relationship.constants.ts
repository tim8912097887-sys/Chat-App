export const RELATIONSHIP_STATE = {
  SELF: 'self',
  NONE: 'none',
  INVITE: 'invite',
  RECIPIENT: 'recipient',
  FRIEND: 'friend',
} as const;

export type RelationshipState = (typeof RELATIONSHIP_STATE)[keyof typeof RELATIONSHIP_STATE];
