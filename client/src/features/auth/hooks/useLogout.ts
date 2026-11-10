import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import { authQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import { toast } from "react-toastify";

const useLogout = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [loading, setLoading] = useState(false);
  const logoutInProgressRef = useRef(false);

  const logoutUser = useCallback(async () => {
    if (!accessToken || logoutInProgressRef.current) {
      return;
    }

    logoutInProgressRef.current = true;

    try {
      setLoading(true);

      await authQuery.logout();

      clearAuth();
    } catch (requestError: unknown) {
      let errorMessage;
      if (requestError instanceof ApiError || requestError instanceof Error) {
        errorMessage = requestError.message;
      } else {
        errorMessage = "Unknow error";
      }
      toast.error(errorMessage);
    } finally {
      logoutInProgressRef.current = false;
      setLoading(false);
    }
  }, [accessToken, clearAuth]);

  return {
    loading: accessToken ? loading : false,
    logoutUser,
  };
};

export default useLogout;
