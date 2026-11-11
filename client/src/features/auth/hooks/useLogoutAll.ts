import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { authQuery } from "../api/query/query";
import { toast } from "react-toastify";

const useLogoutAll = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => authQuery.logoutAll(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
    onError: (error) => {
      toast.error(error.message || "Unknown error");
    },
  });

  const logoutAllUser = async () => {
    if (!accessToken || mutation.isPending) {
      return;
    }

    await mutation.mutateAsync().catch(() => undefined);
  };

  return {
    loading: accessToken ? mutation.isPending : false,
    logoutAllUser,
  };
};

export default useLogoutAll;
