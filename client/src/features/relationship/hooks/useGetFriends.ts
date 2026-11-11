import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { userQuery } from "../../user/api/query/query";
import { FRIEND_SEARCH_LIMIT } from "../constants/constants";
import { getFriendsKey } from "../utils/key";

const useGetFriends = (searchString = "") => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    queryKey: getFriendsKey(userId, searchString),
    queryFn: () => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return userQuery.searchFriends(accessToken, {
        ...(searchString !== "" && { q: searchString }),
        limit: FRIEND_SEARCH_LIMIT,
      });
    },
    enabled: Boolean(accessToken),
  });

  const retry = () => {
    void query.refetch();
  };

  return {
    data: accessToken ? (query.data ?? null) : null,
    error:
      accessToken && query.error
        ? query.error instanceof Error
          ? query.error.message
          : "Unknown error"
        : null,
    loading: accessToken ? query.isFetching : false,
    retry,
  };
};

export default useGetFriends;
