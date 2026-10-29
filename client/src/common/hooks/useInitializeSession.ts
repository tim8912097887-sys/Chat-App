import { useEffect } from "react";
import { useAuthStore } from "../../features/auth/store/store";
import { authQuery } from "../../features/auth/api/query/query";
import { isRefreshTokenRejected } from "../error/refresh-token-rejected";

// Use closure to prevent concurrent refresh overide
let initializationPromise: Promise<void> | null = null;

export const initializeSession = (): Promise<void> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const { setSession, clearAuth, setStatus } = useAuthStore.getState();

    setStatus("checking");

    try {
      const session = await authQuery.refresh();

      setSession({
        accessToken: session.accessToken,
        user: session.user,
      });
    } catch (error) {
      // An invalid/expired refresh token means the
      // session cannot be restored.
      if (isRefreshTokenRejected(error)) {
        clearAuth();
      } else {
        // Network errors and server failures are not
        // proof that the user has logged out.
        setStatus("error");
      }
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

export const useInitializeSession = () => {
  useEffect(() => {
    void initializeSession();
  }, []);
};
