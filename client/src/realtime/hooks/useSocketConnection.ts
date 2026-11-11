import { useEffect } from "react";
import { useAuthStore } from "../../features/auth/store/store";
import { socket } from "../socket";

const useSocketConnection = () => {
  const accessToken = useAuthStore((s) => s.accessToken);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    socket.auth = { accessToken };
    if (!socket.connected) {
      socket.connect();
    } else {
      // If already connected with an old token, force reconnect
      socket.disconnect().connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [accessToken, status]);
};

export default useSocketConnection;
