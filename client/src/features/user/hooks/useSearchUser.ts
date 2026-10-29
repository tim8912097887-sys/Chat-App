import { useRef, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import type { SearchUserResponse } from "../types";
import { userQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";

const useSearchUser = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [data, setData] = useState<SearchUserResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearch, setHasSearch] = useState(false);
  const latestRequestIdRef = useRef(0);

  const searchUser = async (searchResult: string) => {
    if (typeof searchResult !== "string" || searchResult === "") {
      return;
    }
    const currentRequestId = ++latestRequestIdRef.current;

    setLoading(true);

    try {
      const user = await userQuery.searchByCode(
        accessToken as string,
        searchResult,
      );

      // Only update state if this is still the latest request
      if (currentRequestId === latestRequestIdRef.current) {
        setError(null);
        setData(user);
      }
    } catch (requestError: unknown) {
      // Only update error if this is still the latest request
      if (currentRequestId === latestRequestIdRef.current) {
        let errorMessage;
        if (requestError instanceof ApiError || requestError instanceof Error) {
          errorMessage = requestError.message;
        } else {
          errorMessage = "Unknown error";
        }

        setData(null);
        setError(errorMessage);
      }
    } finally {
      // Ensure loading state only turns off if no newer request has started
      if (currentRequestId === latestRequestIdRef.current) {
        if (!hasSearch) {
          setHasSearch(true);
        }
        setLoading(false);
      }
    }
  };
  return {
    data,
    error,
    loading,
    hasSearch,
    searchUser,
  };
};

export default useSearchUser;
