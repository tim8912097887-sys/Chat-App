import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import { relationshipQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import { toast } from "react-toastify";

const useAddFriend = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState(false);
  const addFriendInProgressRef = useRef(false);

  const addFriend = useCallback(
    async (targetUserId: string) => {
      if (!accessToken || addFriendInProgressRef.current) {
        return;
      }

      addFriendInProgressRef.current = true;

      try {
        setLoading(true);

        const data = await relationshipQuery.createFriendRequest(
          accessToken,
          targetUserId,
        );
        toast.success(data.message);
      } catch (requestError: unknown) {
        let errorMessage;
        if (requestError instanceof ApiError || requestError instanceof Error) {
          errorMessage = requestError.message;
        } else {
          errorMessage = "Unknow error";
        }
        toast.error(errorMessage);
      } finally {
        addFriendInProgressRef.current = false;
        setLoading(false);
      }
    },
    [accessToken],
  );

  return {
    loading: accessToken ? loading : false,
    addFriend,
  };
};

export default useAddFriend;
