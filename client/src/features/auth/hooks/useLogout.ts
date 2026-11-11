import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { authQuery } from "../api/query/query";
import { toast } from "react-toastify";

const useLogout = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => authQuery.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
    },
    onError: (error) => {
      toast.error(error.message || "Unknown error");
    },
  });

  const logoutUser = async () => {
    if (!accessToken || mutation.isPending) {
      return;
    }

    await mutation.mutateAsync().catch(() => undefined);
  };

  return {
    loading: accessToken ? mutation.isPending : false,
    logoutUser,
  };
};

export default useLogout;
