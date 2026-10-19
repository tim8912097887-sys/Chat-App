export type FriendRequestDirection = 'incoming' | 'outgoing';

export interface FriendRequestIdentity {
  userId: string;
  tokenVersion: number;
}

export interface FriendRequestPagination {
  direction: FriendRequestDirection;
  page: number;
  limit: number;
}

export interface CreateFriendRequestInput {
  targetUserId: string;
}

export interface FriendRequestListItem {
  id: string;
  name: string;
  imageUrl: string | null;
}
