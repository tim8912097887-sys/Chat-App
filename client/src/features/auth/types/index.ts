import type { PublicUser } from "../../user/types";

export type SignupResponse = {
  message: string;
};

export type LoginResponse = {
  accessToken: string;
  user: PublicUser;
};

export type RefreshResponse = {
  accessToken: string;
  user: PublicUser;
};

export type LogoutResponse = {
  message: string;
};
