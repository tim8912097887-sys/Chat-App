import type { FriendRequestDirection } from "../types";

export const getFriendsKey = (
  userId: string | undefined,
  searchString: string,
) => {
  return ["friends", userId, searchString];
};

export const getFriendRequestsKey = (
  userId: string | undefined,
  direction: FriendRequestDirection,
  page: number,
) => {
  return ["friend-requests", userId, direction, page];
};
