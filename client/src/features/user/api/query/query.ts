import type { ApiSuccessResponse } from "../../../../common/types/response/response";
import { FRIEND_SEARCH_URL, USER_SEARCH_URL } from "../../constants/constants";
import type {
  FriendSearchQuery,
  FriendSearchResponse,
  SearchUserResponse,
} from "../../types";
import { userClient } from "../client/client";

const searchByCode = async (
  accessToken: string,
  searchCode: string,
): Promise<SearchUserResponse> => {
  const res = await userClient.get<ApiSuccessResponse<SearchUserResponse>>(
    USER_SEARCH_URL,
    {
      params: { q: searchCode },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return res.data.data;
};

const searchFriends = async (
  accessToken: string,
  query: FriendSearchQuery = {},
): Promise<FriendSearchResponse> => {
  const res = await userClient.get<ApiSuccessResponse<FriendSearchResponse>>(
    FRIEND_SEARCH_URL,
    {
      params: query,
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  return res.data.data;
};

export const userQuery = { searchByCode, searchFriends };
