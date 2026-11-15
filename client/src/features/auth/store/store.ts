import { create } from "zustand";
import type { AuthenticatedUser } from "../../user/types";

type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "error";

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  status: AuthStatus;

  setSession: (session: { accessToken: string; user: AuthenticatedUser }) => void;

  clearAuth: () => void;
  setStatus: (status: AuthStatus) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  status: "checking",

  setSession: ({ accessToken, user }) =>
    set({
      accessToken,
      user,
      status: "authenticated",
    }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      status: "unauthenticated",
    }),

  setStatus: (status) => set({ status }),
}));
