export const RELATIONSHIP_URL = '/api/v1/friend-requests';

export const RELATIONSHIP_INVITE_URL = `${RELATIONSHIP_URL}/`;

export const rejectRelationshipUrl = (requestId: string) =>
  `${RELATIONSHIP_URL}/${requestId}/reject`;

export const acceptRelationshipUrl = (requestId: string) =>
  `${RELATIONSHIP_URL}/${requestId}/accept`;
