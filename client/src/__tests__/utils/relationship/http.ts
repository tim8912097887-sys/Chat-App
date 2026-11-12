import { http, HttpResponse } from "msw";
import { successResponse } from "../common/response";

export const relationshipBasedUrl = `${import.meta.env.VITE_API_BASE_URL}/api/v1/friend-requests`;

export const relationshipHandlers = [
  http.get(relationshipBasedUrl, () => HttpResponse.json(successResponse([]))),
  http.get(`${relationshipBasedUrl}/`, () =>
    HttpResponse.json(successResponse([])),
  ),
  http.post(`${relationshipBasedUrl}/`, () =>
    HttpResponse.json(
      successResponse({
        message: "Successfully create",
      }),
    ),
  ),
];
