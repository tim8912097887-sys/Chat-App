import { http, HttpResponse } from "msw";
import { successResponse } from "../common/response";
import { loginResponse, signupResponse } from "./factory";

export const authBasedUrl = import.meta.env.VITE_API_BASE_URL + "/api/v1/auth";

export const authHandlers = [
  http.post(`${authBasedUrl}/login`, () => {
    return HttpResponse.json(successResponse(loginResponse()));
  }),

  http.post(`${authBasedUrl}/signup`, () => {
    return HttpResponse.json(successResponse(signupResponse()));
  }),
];
