import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../auth/store/store";
import { relationshipQuery } from "../api/query/query";
import { toast } from "react-toastify";
import { getFriendRequestsKey } from "../utils/key";

const useAddFriend = () => {
  const queryClient = useQueryClient();
  const accessToken = useAuthStore((state) => state.accessToken);
  const userId = useAuthStore((state) => state.user?.id);
  const mutation = useMutation({
    mutationFn: (targetUserId: string) => {
      if (!accessToken) {
        throw new Error("Authentication required");
      }

      return relationshipQuery.createFriendRequest(accessToken, targetUserId);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({
        queryKey: getFriendRequestsKey(userId, "outgoing", 1),
      });
    },
    onError: (error) => {
      toast.error(error.message || "Unknown error");
    },
  });

  const addFriend = async (targetUserId: string) => {
    if (!accessToken || mutation.isPending) {
      return;
    }

    await mutation.mutateAsync(targetUserId).catch(() => undefined);
  };

  return {
    loading: accessToken ? mutation.isPending : false,
    addFriend,
  };
};

export default useAddFriend;
