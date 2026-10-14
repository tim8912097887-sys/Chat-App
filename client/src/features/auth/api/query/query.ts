import type { ApiSuccessResponse } from "../../../../common/types/response/response";
import { LOGIN_URL, SIGNUP_URL } from "../../constants/constants";
import type { LoginInput } from "../../input/login";
import type { SignupInput } from "../../input/signup";
import type { LoginResponse, SignupResponse } from "../../types";
import { authClient } from "../client/client";

const signup = async (input: SignupInput): Promise<SignupResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const res = await authClient.post<ApiSuccessResponse<SignupResponse>>(
    SIGNUP_URL,
    input,
  );
  return res.data.data;
};

const login = async (input: LoginInput): Promise<LoginResponse> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const res = await authClient.post<ApiSuccessResponse<LoginResponse>>(
    LOGIN_URL,
    input,
  );
  return res.data.data;
};

export const authQuery = { signup, login };
