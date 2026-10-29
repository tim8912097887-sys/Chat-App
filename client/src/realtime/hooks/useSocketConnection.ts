import { useEffect } from "react";
import { useAuthStore } from "../../features/auth/store/store";
import { socket } from "../socket";

const useSocketConnection = () => {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      socket.disconnect();
      return;
    }
    socket.auth = { accessToken };
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [accessToken]);
  return;
};

export default useSocketConnection;
