import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { FRIEND_REQUESTS_LIMIT } from "../constants/constants";
import { relationshipQuery } from "../api/query/query";
import type { FriendRequestDirection } from "../types";
import { getFriendRequestsKey } from "../utils/key";

type UseGetFriendRequestProps = {
  direction: FriendRequestDirection;
};

const useGetFriendRequest = ({ direction }: UseGetFriendRequestProps) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: getFriendRequestsKey(userId, direction, page),
    queryFn: () => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return relationshipQuery.getFriendRequests(accessToken, {
        direction,
        page,
        limit: FRIEND_REQUESTS_LIMIT,
      });
    },
    enabled: Boolean(accessToken),
  });

  const retry = () => {
    void query.refetch();
  };

  return {
    data: accessToken && !query.error ? (query.data ?? null) : null,
    error:
      accessToken && query.error
        ? query.error instanceof Error
          ? query.error.message
          : "Unknown error"
        : null,
    loading: accessToken ? query.isFetching : false,
    page,
    setPage,
    retry,
  };
};

export default useGetFriendRequest;
