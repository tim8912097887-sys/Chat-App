import { ApiError } from "../../../../common/error/api-error";
import type { ApiSuccessResponse } from "../../../../common/types/response/response";
import {
  LOGIN_URL,
  LOGOUT_ALL_URL,
  LOGOUT_URL,
  // REFRESH_URL,
  SIGNUP_URL,
} from "../../constants/constants";
import type { LoginInput } from "../../input/login";
import type { SignupInput } from "../../input/signup";
import type {
  LoginResponse,
  LogoutResponse,
  RefreshResponse,
  SignupResponse,
} from "../../types";
import { authClient } from "../client/client";

const signup = async (input: SignupInput): Promise<SignupResponse> => {
  const formData = new FormData();

  formData.append("name", input.name);
  formData.append("email", input.email);
  formData.append("password", input.password);

  if (input.image) {
    formData.append("image", input.image);
  }

  const res = await authClient.post<ApiSuccessResponse<SignupResponse>>(
    SIGNUP_URL,
    formData,
  );

  return res.data.data;
};

const login = async (input: LoginInput): Promise<LoginResponse> => {
  const res = await authClient.post<ApiSuccessResponse<LoginResponse>>(
    LOGIN_URL,
    input,
  );
  return res.data.data;
};

const logout = async (): Promise<LogoutResponse> => {
  const res =
    await authClient.post<ApiSuccessResponse<LogoutResponse>>(LOGOUT_URL);
  return res.data.data;
};

const logoutAll = async (): Promise<LogoutResponse> => {
  const res =
    await authClient.post<ApiSuccessResponse<LogoutResponse>>(LOGOUT_ALL_URL);
  return res.data.data;
};

const refresh = async (): Promise<RefreshResponse> => {
  // const res =
  //   await authClient.post<ApiSuccessResponse<RefreshResponse>>(REFRESH_URL);
  // return res.data.data;
  await new Promise((resolve) => setTimeout(() => resolve(""), 3000));
  if (Math.random() > 0.6) {
    return {
      accessToken: "osdfjosdf",
      user: {
        id: "1",
        name: "john",
        imageUrl: null,
      },
    };
  } else {
    throw new ApiError("Network Error", {
      status: 500,
    });
  }
};

export const authQuery = { signup, login, logout, logoutAll, refresh };
