import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { relationshipQuery } from "../api/query/query";
import { toast } from "react-toastify";
import { getFriendRequestsKey } from "../utils/key";

const useRejectFriend = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const mutation = useMutation({
    mutationFn: (requestId: string) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return relationshipQuery.rejectFriendRequest(accessToken, requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getFriendRequestsKey(userId, "incoming", 1),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Unknown error");
    },
  });

  const rejectFriend = async (requestId: string) => {
    if (!accessToken || mutation.isPending) {
      return;
    }

    await mutation.mutateAsync(requestId).catch(() => undefined);
  };

  return {
    loading: accessToken ? mutation.isPending : false,
    rejectFriend,
  };
};

export default useRejectFriend;
