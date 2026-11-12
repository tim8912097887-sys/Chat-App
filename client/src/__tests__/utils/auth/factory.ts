import type { LoginResponse } from "../../../features/auth/types";

export const signupResponse = () => {
  return {
    message: "Signed up",
  };
};
export const logoutResponse = () => {
  return {
    message: "Log out",
  };
};
export const logoutAllResponse = () => {
  return {
    message: "Log out all",
  };
};

export const loginResponse = (): LoginResponse => {
  return {
    accessToken: "token",
    user: {
      id: "test-id",
      name: "test-name",
      imageUrl: null,
    },
  };
};
