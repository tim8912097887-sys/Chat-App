import type { FriendRequestDirection } from "../types";

export const getFriendsKey = (
  userId: string | undefined,
  searchString?: string,
) => {
  if (searchString) {
    return ["friends", userId, searchString];
  }

  return ["friends", userId];
};

export const getFriendRequestsKey = (
  userId: string | undefined,
  direction: FriendRequestDirection,
  page?: number,
) => {
  if (page) {
    return ["friend-requests", userId, direction, page];
  }
  return ["friend-requests", userId, direction];
};
