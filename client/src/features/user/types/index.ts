import { RELATIONSHIP_STATE } from "../constants/constants";

export type PublicUser = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type AuthenticatedUser = PublicUser & {
  searchCode: string;
};

export type UserProfile = AuthenticatedUser & {
  email: string;
};

export type RelationshipState =
  (typeof RELATIONSHIP_STATE)[keyof typeof RELATIONSHIP_STATE];

export type SearchUserResponse = {
  user: PublicUser;
  state: RelationshipState;
} | null;

export type FriendSearchResult = PublicUser & {
  isOnline: boolean;
};

export type FriendSearchResponse = FriendSearchResult[];

export type FriendSearchQuery = {
  q?: string;
  page?: number;
  limit?: number;
};
