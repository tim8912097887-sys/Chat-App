import { useCallback, useRef, useState } from "react";
import { useAuthStore } from "../../auth/store/store";
import { authQuery } from "../api/query/query";
import { ApiError } from "../../../common/error/api-error";
import { toast } from "react-toastify";

const useLogoutAll = () => {
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const [loading, setLoading] = useState(false);
  const logoutAllInProgressRef = useRef(false);

  const logoutAllUser = useCallback(async () => {
    if (!accessToken || logoutAllInProgressRef.current) {
      return;
    }

    logoutAllInProgressRef.current = true;

    try {
      setLoading(true);

      await authQuery.logoutAll();

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
      logoutAllInProgressRef.current = false;
      setLoading(false);
    }
  }, [accessToken, clearAuth]);

  return {
    loading: accessToken ? loading : false,
    logoutAllUser,
  };
};

export default useLogoutAll;
