import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { userQuery } from "../api/query/query";

const useSearchUser = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hasSearch, setHasSearch] = useState(false);
  const mutation = useMutation({
    mutationFn: (searchResult: string) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return userQuery.searchByCode(accessToken, searchResult);
    },
  });

  const searchUser = async (searchResult: string) => {
    if (
      typeof searchResult !== "string" ||
      searchResult === "" ||
      !accessToken
    ) {
      return;
    }

    await mutation.mutateAsync(searchResult).catch(() => undefined);
    setHasSearch(true);
  };

  return {
    data: mutation.data ?? null,
    error: mutation.error
      ? mutation.error instanceof Error
        ? mutation.error.message
        : "Unknown error"
      : null,
    loading: mutation.isPending,
    hasSearch,
    searchUser,
  };
};

export default useSearchUser;
