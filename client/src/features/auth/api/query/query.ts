import type { ApiSuccessResponse } from "../../../../common/types/response/response";
import { LOGIN_URL, SIGNUP_URL } from "../../constants/constants";
import type { LoginInput } from "../../input/login";
import type { SignupInput } from "../../input/signup";
import type { LoginResponse, SignupResponse } from "../../types";
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

export const authQuery = { signup, login };
