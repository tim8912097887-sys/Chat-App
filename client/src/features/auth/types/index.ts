import type { AuthenticatedUser } from "../../user/types";

export type SignupResponse = {
  message: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

export type RefreshResponse = {
  accessToken: string;
  user: AuthenticatedUser;
};

export type LogoutResponse = {
  message: string;
};
