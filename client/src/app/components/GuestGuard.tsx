import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "../../features/auth/store/store";
import SessionLoading from "./SessionLoading.tsx";
import SessionError from "./SessionError.tsx";

const GuestGuard = () => {
  const status = useAuthStore((state) => state.status);

  if (status === "checking") {
    return <SessionLoading />;
  }

  if (status === "error") {
    return <SessionError />;
  }

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default GuestGuard;
