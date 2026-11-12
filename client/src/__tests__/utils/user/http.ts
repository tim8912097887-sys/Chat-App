import { http, HttpResponse } from "msw";
import { successResponse } from "../common/response";

export const userBasedUrl = `${import.meta.env.VITE_API_BASE_URL}/api/v1/users`;

export const userHandlers = [
  http.get(`${userBasedUrl}/search`, () =>
    HttpResponse.json(successResponse(null)),
  ),
  http.get(`${userBasedUrl}/friend/search`, () =>
    HttpResponse.json(successResponse([])),
  ),
];
