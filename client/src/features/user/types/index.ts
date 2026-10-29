export type PublicUser = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type SearchUserResponse = PublicUser | null;

export type FriendSearchResult = PublicUser & {
  isOnline: boolean;
};

export type FriendSearchResponse = FriendSearchResult[];

export type FriendSearchQuery = {
  q?: string;
  page?: number;
  limit?: number;
};
