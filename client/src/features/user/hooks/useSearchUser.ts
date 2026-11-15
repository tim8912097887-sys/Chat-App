import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { readQueryRetry } from "../../../common/query/retry";
import { userQuery } from "../api/query/query";
import { getSearchUserKey } from "../utils/key";

const useSearchUser = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const [searchResult, setSearchResult] = useState("");
  const [isFetch, setIsFetch] = useState(false);
  const query = useQuery({
    ...readQueryRetry,
    queryKey: getSearchUserKey(userId, searchResult),
    queryFn: () => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return userQuery.searchByCode(accessToken, searchResult);
    },
    enabled: isFetch && Boolean(accessToken) && Boolean(searchResult),
  });

  const searchUser = async (searchCode: string) => {
    if (searchCode === "" || !accessToken) {
      return;
    }

    if (searchCode === searchResult) {
      await query.refetch();
      return;
    }

    setSearchResult(searchCode);
    if (!isFetch) {
      setIsFetch(true);
    }
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
    hasSearch: isFetch && query.isFetched,
    searchUser,
  };
};

export default useSearchUser;
