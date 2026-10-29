import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import { userQuery } from "../../user/api/query/query";
import { ApiError } from "../../../common/error/api-error";
import { FRIEND_SEARCH_LIMIT } from "../constants/constants";
import type { FriendPhoto } from "../types";

const useGetFriends = (searchString = "") => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<FriendPhoto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
        setError(null);
        return userQuery.searchFriends(accessToken, {
          ...(searchString !== "" && { q: searchString }),
          limit: FRIEND_SEARCH_LIMIT,
        });
      })
      .then((friends) => {
        if (isCurrentRequest && friends !== undefined) {
          setData(friends);
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrentRequest) {
          let errorMessage;
          if (
            requestError instanceof ApiError ||
            requestError instanceof Error
          ) {
            errorMessage = requestError.message;
          } else {
            errorMessage = "Unknow error";
          }
          setError(errorMessage);
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
  }, [accessToken, searchString, retryCount]);

  return {
    data: accessToken ? data : null,
    error: accessToken ? error : null,
    loading: accessToken ? loading : false,
    retry,
  };
};

export default useGetFriends;
