import { SignJWT } from "jose";
import { LoginInput } from "../../../domain/auth/dto/login.js";
import type { SignupInput } from "../../../domain/auth/dto/signup.js";
import { api } from "./app.js";
import { LOGIN_URL, REFRESH_COOKIE_NAME, SIGNUP_URL } from "./constants.js";
import { authModel } from "./query.js";
import { config } from "../../../config/env/index.js";

export function signupUserInput(props: Partial<SignupInput> = {}): SignupInput {
  const baseUser: SignupInput = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
  };

  if (props.name) {
    baseUser.name = props.name.trim().toLowerCase();
  }

  if (props.email) {
    baseUser.email = props.email.trim().toLowerCase();
  }

  if (props.password) {
    baseUser.password = props.password.trim();
  }

  if (props.imageUrl) {
    baseUser.imageUrl = props.imageUrl.trim();
  }

  return baseUser;
}

export function loginUserInput(props: Partial<LoginInput> = {}): LoginInput {
  const baseUser: LoginInput = {
    email: "test@example.com",
    password: "Password123!",
  };

  if (props.email) {
    baseUser.email = props.email.trim().toLowerCase();
  }

  if (props.password) {
    baseUser.password = props.password.trim();
  }

  return baseUser;
}

export async function createRefreshCookie(): Promise<{
  cookie: string;
  recordId: string;
}> {
  const input = signupUserInput();
  await api().post(SIGNUP_URL).send(input);
  const loginRes = await api()
    .post(LOGIN_URL)
    .send(loginUserInput({ email: input.email, password: input.password }));
  const setCookieHeader = loginRes.headers["set-cookie"];
  const setCookie = Array.isArray(setCookieHeader)
    ? setCookieHeader.find((value) =>
        value.startsWith(`${REFRESH_COOKIE_NAME}=`),
      )
    : setCookieHeader?.startsWith(`${REFRESH_COOKIE_NAME}=`)
      ? setCookieHeader
      : undefined;

  if (!setCookie) {
    throw new Error("Login response did not set a refresh token cookie");
  }

  const record = await authModel.findOne({});
  if (!record) {
    throw new Error("Login did not create a refresh token record");
  }

  return {
    cookie: setCookie.split(";")[0]!,
    recordId: record._id,
  };
}

export async function createExpiredRefreshCookie(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({ ver: 0, typ: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("expired-user")
    .setIssuer(config.jwt.issuer)
    .setIssuedAt(now - 3600)
    .setExpirationTime(now - 1)
    .sign(new TextEncoder().encode(config.jwt.refreshSecret));

  return `${REFRESH_COOKIE_NAME}=${token}`;
}
