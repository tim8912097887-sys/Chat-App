import { create } from "zustand";

type PresenceState = {
  onlineUsers: Record<string, boolean>;
  setPresence: (userId: string, isOnline: boolean) => void;
};

export const usePresenceStore = create<PresenceState>((set) => ({
  onlineUsers: {},

  setPresence: (userId, isOnline) =>
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: isOnline,
      },
    })),
}));
