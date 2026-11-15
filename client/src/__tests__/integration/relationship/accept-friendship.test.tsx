import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { errorResponse, successResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { userBasedUrl } from "../../utils/user/http";
import { relationshipBasedUrl } from "../../utils/relationship/http";

describe("Accept friendship", () => {
  describe("Success Load and Accept", () => {
    it("when accept the friend invite success should remove the one from recieve section and refetch friend list", async () => {
      let incomingRequests = [
        {
          requestId: "test-request-id",
          userId: "test-user-id",
          name: "test-name",
          imageUrl: null,
        },
      ];
      let acceptedRequesterId: string | undefined;
      let accepted = false;
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
        http.get(`${userBasedUrl}/friend/search`, () =>
          HttpResponse.json(
            successResponse(
              accepted
                ? [
                    {
                      id: "test-user-id",
                      name: "test-name",
                      imageUrl: null,
                    },
                  ]
                : [],
            ),
          ),
        ),
        http.get(`${userBasedUrl}/search`, () =>
          HttpResponse.json(
            successResponse({
              user: {
                id: "test-user-id",
                name: "test-name",
                imageUrl: null,
              },
              state: accepted ? "friend" : "recipient",
            }),
          ),
        ),
        http.post(`${relationshipBasedUrl}/accept`, async ({ request }) => {
          acceptedRequesterId = (
            (await request.json()) as { requesterId: string }
          ).requesterId;
          incomingRequests = [];
          accepted = true;
          return HttpResponse.json(successResponse({ message: "Accepted" }));
        }),
      );
      const { user } = renderAuthenticatedApp();

      await user.type(
        screen.getByRole("textbox", { name: /8-character search code/i }),
        "A7BC2DEF",
      );
      await user.click(screen.getByRole("button", { name: /Find user/i }));
      const acceptButton = await screen.findByRole("button", {
        name: "Accept test-name",
      });
      await user.click(acceptButton);

      expect(acceptedRequesterId).toBe("test-user-id");
      expect(await screen.findByText(/Online/i)).toBeInTheDocument();
      expect(await screen.findByText("Already friends")).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: /Accept/i }),
        ).not.toBeInTheDocument(),
      );
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
                      userId: "test-user-id",
                      name: "test-name",
                      imageUrl: null,
                    },
                  ]
                : [],
            ),
          ),
        ),
        http.post(`${relationshipBasedUrl}/accept`, () =>
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

      await user.click(await screen.findByRole("button", { name: /Accept/i }));

      expect(screen.getByText("test-name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Accept/i })).toBeEnabled();
    });
  });
});
