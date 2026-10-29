import { ApiError } from "../../../../common/error/api-error";
// import type { ApiSuccessResponse } from "../../../../common/types/response/response";
// import { FRIEND_SEARCH_URL } from "../../constants/constants";
import type {
  FriendSearchQuery,
  FriendSearchResponse,
  SearchUserResponse,
} from "../../types";
// import { userClient } from "../client/client";

const searchByCode = async (
  accessToken: string,
  searchCode: string,
): Promise<SearchUserResponse> => {
  // const res = await userClient.get<ApiSuccessResponse<SearchUserResponse>>(
  //   USER_SEARCH_URL,
  //   { params: { q: searchCode } },
  // );
  // return res.data.data;
  await new Promise((resolve) => setTimeout(() => resolve(""), 3000));
  console.log(searchCode, accessToken);
  const randomNum = Math.random();
  if (randomNum > 0.7) {
    return null;
  } else {
    // return {
    //   id: "sdfosdjf",
    //   name: "John",
    //   imageUrl: null,
    // };
    throw new ApiError("osdfj", {
      status: 404,
    });
  }
};

const searchFriends = async (
  accessToken: string,
  query: FriendSearchQuery = {},
): Promise<FriendSearchResponse> => {
  // const res = await userClient.get<ApiSuccessResponse<FriendSearchResponse>>(
  //   FRIEND_SEARCH_URL,
  //   {
  //     params: query,
  //     headers: { Authorization: `Bearer ${accessToken}` },
  //   },
  // );
  // return res.data.data;
  await new Promise((resolve) => setTimeout(() => resolve(""), 3000));
  console.log(accessToken, query);
  const randomNum = Math.random();
  if (randomNum > 0.7) {
    return [];
  } else {
    throw new ApiError("osdfj", {
      status: 404,
    });
  }
};

export const userQuery = { searchByCode, searchFriends };
