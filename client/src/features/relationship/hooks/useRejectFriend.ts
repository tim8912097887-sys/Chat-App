import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import { relationshipQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import { toast } from "react-toastify";

const useRejectFriend = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState(false);
  const rejectFriendInProgressRef = useRef(false);

  const rejectFriend = useCallback(
    async (requestId: string) => {
      if (!accessToken || rejectFriendInProgressRef.current) {
        return;
      }

      rejectFriendInProgressRef.current = true;

      try {
        setLoading(true);

        await relationshipQuery.rejectFriendRequest(accessToken, requestId);
      } catch (requestError: unknown) {
        let errorMessage;
        if (requestError instanceof ApiError || requestError instanceof Error) {
          errorMessage = requestError.message;
        } else {
          errorMessage = "Unknow error";
        }
        toast.error(errorMessage);
      } finally {
        rejectFriendInProgressRef.current = false;
        setLoading(false);
      }
    },
    [accessToken],
  );

  return {
    loading: accessToken ? loading : false,
    rejectFriend,
  };
};

export default useRejectFriend;
