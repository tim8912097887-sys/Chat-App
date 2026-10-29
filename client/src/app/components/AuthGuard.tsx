import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../../features/auth/store/store";
import SessionLoading from "./SessionLoading.tsx";
import SessionError from "./SessionError.tsx";

const AuthGuard = () => {
  const status = useAuthStore((state) => state.status);

  if (status === "checking") {
    return <SessionLoading />;
  }

  if (status === "error") {
    return <SessionError />;
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default AuthGuard;
