import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../socket";
import {
  FRIEND_OFFLINE_EVENT,
  FRIEND_ONLINE_EVENT,
  FRIEND_REQUEST_ACCEPTED_EVENT,
  FRIEND_REQUEST_CREATED_EVENT,
  FRIEND_REQUEST_REJECTED_EVENT,
} from "../constants";
import type { RealtimeEvent } from "../types";
import {
  getFriendRequestsKey,
  getFriendsKey,
} from "../../features/relationship/utils/key";
import { useAuthStore } from "../../features/auth/store/store";
import { usePresenceStore } from "../../features/relationship/stores/store";

const useRealtimeEvents = () => {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const setPresence = usePresenceStore.getState().setPresence;

  useEffect(() => {
    const handleRealtimeEvent = (event: RealtimeEvent) => {
      switch (event.type) {
        case FRIEND_ONLINE_EVENT: {
          setPresence(event.data.userId, true);
          break;
        }

        case FRIEND_OFFLINE_EVENT: {
          setPresence(event.data.userId, false);
          break;
        }

        case FRIEND_REQUEST_CREATED_EVENT: {
          queryClient.invalidateQueries({
            queryKey: getFriendRequestsKey(userId, "incoming", 1),
          });
          break;
        }

        case FRIEND_REQUEST_ACCEPTED_EVENT: {
          queryClient.invalidateQueries({
            queryKey: getFriendRequestsKey(userId, "outgoing", 1),
          });
          queryClient.invalidateQueries({
            queryKey: getFriendsKey(userId, ""),
          });
          break;
        }

        case FRIEND_REQUEST_REJECTED_EVENT: {
          queryClient.invalidateQueries({
            queryKey: getFriendRequestsKey(userId, "outgoing", 1),
          });
          break;
        }

        default: {
          break;
        }
      }
    };

    socket.on("realtime:event", handleRealtimeEvent);

    return () => {
      socket.off("realtime:event", handleRealtimeEvent);
    };
  }, [queryClient, setPresence, userId]);
};

export default useRealtimeEvents;
