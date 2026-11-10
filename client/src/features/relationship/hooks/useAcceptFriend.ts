import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import { relationshipQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import { toast } from "react-toastify";

const useAcceptFriend = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [loading, setLoading] = useState(false);
  const acceptFriendInProgressRef = useRef(false);

  const acceptFriend = useCallback(
    async (requestId: string) => {
      if (!accessToken || acceptFriendInProgressRef.current) {
        return;
      }

      acceptFriendInProgressRef.current = true;

      try {
        setLoading(true);

        await relationshipQuery.acceptFriendRequest(accessToken, requestId);
      } catch (requestError: unknown) {
        let errorMessage;
        if (requestError instanceof ApiError || requestError instanceof Error) {
          errorMessage = requestError.message;
        } else {
          errorMessage = "Unknow error";
        }
        toast.error(errorMessage);
      } finally {
        acceptFriendInProgressRef.current = false;
        setLoading(false);
      }
    },
    [accessToken],
  );

  return {
    loading: accessToken ? loading : false,
    acceptFriend,
  };
};

export default useAcceptFriend;
