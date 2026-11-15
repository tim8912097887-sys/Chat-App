import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { readQueryRetry } from "../../../common/query/retry";
import { userQuery } from "../api/query/query";
import { getUserProfileKey } from "../utils/key";

const useGetProfile = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const query = useQuery({
    ...readQueryRetry,
    queryKey: getUserProfileKey(userId),
    queryFn: () => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return userQuery.getProfile(accessToken);
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

export default useGetProfile;
