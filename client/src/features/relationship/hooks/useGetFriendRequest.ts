import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../common/error/api-error";
import { useAuthStore } from "../../auth/store/store";
import { FRIEND_REQUESTS_LIMIT } from "../constants/constants";
import { relationshipQuery } from "../api/query/query";
import type { FriendRequestDirection, FriendRequestItem } from "../types";

type UseGetFriendRequestProps = {
  direction: FriendRequestDirection;
};

const useGetFriendRequest = ({ direction }: UseGetFriendRequestProps) => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<FriendRequestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [retryCount, setRetryCount] = useState(0);

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;

    if (!accessToken) {
      return () => {
        isCurrentRequest = false;
      };
    }

    Promise.resolve()
      .then(() => {
        if (!isCurrentRequest) {
          return;
        }

        setLoading(true);
        return relationshipQuery.getFriendRequests(accessToken, {
          direction,
          page,
          limit: FRIEND_REQUESTS_LIMIT,
        });
      })
      .then((requests) => {
        if (isCurrentRequest && requests !== undefined) {
          setData(requests);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrentRequest) {
          const errorMessage =
            requestError instanceof ApiError || requestError instanceof Error
              ? requestError.message
              : "Unknown error";
          setError(errorMessage);
          setData(null);
        }
      })
      .finally(() => {
        if (isCurrentRequest) {
          setLoading(false);
        }
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [accessToken, direction, page, retryCount]);

  return {
    data,
    error,
    loading,
    page,
    setPage,
    retry,
  };
};

export default useGetFriendRequest;
