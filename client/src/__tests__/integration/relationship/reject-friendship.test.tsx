import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  errorResponse,
  successResponse,
} from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { relationshipBasedUrl } from "../../utils/relationship/http";

describe("Reject friendship", () => {
  describe("Success Load and Reject", () => {
    it("when reject the friend invite success should remove the one from recieve section", async () => {
      let incomingRequests = [
        {
          requestId: "test-request-id",
          name: "test-name",
          imageUrl: null,
        },
      ];
      server.use(
        http.get(`${relationshipBasedUrl}/`, ({ request }) =>
          HttpResponse.json(
            successResponse(
              new URL(request.url).searchParams.get("direction") === "incoming"
                ? incomingRequests
                : [],
            ),
          ),
        ),
        http.post(`${relationshipBasedUrl}/test-request-id/reject`, () => {
          incomingRequests = [];
          return HttpResponse.json(successResponse({ message: "Rejected" }));
        }),
      );
      const { user } = renderAuthenticatedApp();

      await user.click(await screen.findByRole("button", { name: /Reject/i }));

      expect(await screen.findByText(/No friend requests/i)).toBeInTheDocument();
      expect(screen.queryByText("test-name")).not.toBeInTheDocument();
    });
  });

  describe("Auth Fail", () => {
    it("when the server rejects an invalid user token should keep the friend invite", async () => {
      server.use(
        http.get(`${relationshipBasedUrl}/`, ({ request }) =>
          HttpResponse.json(
            successResponse(
              new URL(request.url).searchParams.get("direction") === "incoming"
                ? [
                    {
                      requestId: "test-request-id",
                      name: "test-name",
                      imageUrl: null,
                    },
                  ]
                : [],
            ),
          ),
        ),
        http.post(`${relationshipBasedUrl}/test-request-id/reject`, () =>
          HttpResponse.json(
            errorResponse({
              code: "UnauthenticationError",
              detail: "Invalid user token",
            }),
            { status: 401 },
          ),
        ),
      );
      const { user } = renderAuthenticatedApp();

      await user.click(await screen.findByRole("button", { name: /Reject/i }));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /Reject/i })).toBeEnabled(),
      );

      expect(screen.getByText("test-name")).toBeInTheDocument();
    });
  });
});
