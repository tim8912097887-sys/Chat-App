import type { ApiSuccessResponse } from "../../../../common/types/response/response";
import {
  ACCEPT_FRIEND_REQUEST_URL,
  FRIEND_REQUESTS_URL,
  REJECT_FRIEND_REQUEST_URL,
} from "../../constants/constants";
import type {
  FriendRequestActionResponse,
  FriendRequestDirection,
  FriendRequestItem,
} from "../../types";
import { relationshipClient } from "../client/client";

type AuthConfig = {
  headers: { Authorization: string };
};

const authConfig = (accessToken: string): AuthConfig => ({
  headers: { Authorization: `Bearer ${accessToken}` },
});

const getFriendRequests = async (
  accessToken: string,
  query: {
    direction: FriendRequestDirection;
    page?: number;
    limit?: number;
  },
): Promise<FriendRequestItem[]> => {
  const res = await relationshipClient.get<
    ApiSuccessResponse<FriendRequestItem[]>
  >(FRIEND_REQUESTS_URL, { ...authConfig(accessToken), params: query });
  return res.data.data;
};

const createFriendRequest = async (
  accessToken: string,
  targetUserId: string,
): Promise<FriendRequestActionResponse> => {
  const res = await relationshipClient.post<
    ApiSuccessResponse<FriendRequestActionResponse>
  >(FRIEND_REQUESTS_URL, { targetUserId }, authConfig(accessToken));
  return res.data.data;
};

const acceptFriendRequest = async (
  accessToken: string,
  requestId: string,
): Promise<FriendRequestActionResponse> => {
  const res = await relationshipClient.post<
    ApiSuccessResponse<FriendRequestActionResponse>
  >(
    ACCEPT_FRIEND_REQUEST_URL(encodeURIComponent(requestId)),
    undefined,
    authConfig(accessToken),
  );
  return res.data.data;
};

const rejectFriendRequest = async (
  accessToken: string,
  requestId: string,
): Promise<FriendRequestActionResponse> => {
  const res = await relationshipClient.post<
    ApiSuccessResponse<FriendRequestActionResponse>
  >(
    REJECT_FRIEND_REQUEST_URL(encodeURIComponent(requestId)),
    undefined,
    authConfig(accessToken),
  );
  return res.data.data;
};

export const relationshipQuery = {
  getFriendRequests,
  createFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
};
