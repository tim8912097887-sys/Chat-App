import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { relationshipQuery } from "../api/query/query";
import { toast } from "react-toastify";
import { getFriendRequestsKey, getFriendsKey } from "../utils/key";

const useAcceptFriend = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const mutation = useMutation({
    mutationFn: (requestId: string) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return relationshipQuery.acceptFriendRequest(accessToken, requestId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getFriendRequestsKey(userId, "incoming", 1),
      });
      queryClient.invalidateQueries({
        queryKey: getFriendsKey(userId, ""),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Unknown error");
    },
  });

  const acceptFriend = async (requestId: string) => {
    if (!accessToken || mutation.isPending) {
      return;
    }

    await mutation.mutateAsync(requestId).catch(() => undefined);
  };

  return {
    loading: accessToken ? mutation.isPending : false,
    acceptFriend,
  };
};

export default useAcceptFriend;
