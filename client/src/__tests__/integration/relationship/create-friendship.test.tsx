import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import {
  errorResponse,
  successResponse,
} from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { userBasedUrl } from "../../utils/user/http";
import { relationshipBasedUrl } from "../../utils/relationship/http";

describe("Create friendship", () => {
  describe("Success Load and Create", () => {
    it("when send the friend invite success should add newone in send request section", async () => {
      const { user } = renderAuthenticatedApp();
      server.use(
        http.get(`${userBasedUrl}/search`, () =>
          HttpResponse.json(
            successResponse({
              id: "test-id",
              name: "test-name",
              imageUrl: null,
            }),
          ),
        ),
        http.get(`${relationshipBasedUrl}/`, () =>
          HttpResponse.json(
            successResponse([
              {
                requestId: "test-request-id",
                name: "test-name",
                imageUrl: null,
              },
            ]),
          ),
        ),
      );

      await user.type(
        screen.getByRole("textbox", { name: /8-character search code/i }),
        "AICMEOWQ",
      );
      await user.click(screen.getByRole("button", { name: /Find user/i }));
      expect(
        await screen.findByRole("button", { name: /Send Request/i }),
      ).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /Send Request/i }));
      await user.click(screen.getByRole("button", { name: /Sent/i }));

      expect(
        await screen.findByText(/Pending confirmation/i),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/test-name/i)).toHaveLength(2);
    });
  });

  describe("Auth Fail", () => {
    it("when the server rejects an invalid user token should not send the friend invite", async () => {
      server.use(
        http.get(`${userBasedUrl}/search`, () =>
          HttpResponse.json(
            successResponse({
              id: "test-id",
              name: "test-name",
              imageUrl: null,
            }),
          ),
        ),
        http.get(`${relationshipBasedUrl}/`, ({ request }) =>
          HttpResponse.json(
            successResponse(
              new URL(request.url).searchParams.get("direction") === "incoming"
                ? [
                    {
                      requestId: "test-request-id",
                      name: "existing-request",
                      imageUrl: null,
                    },
                  ]
                : [],
            ),
          ),
        ),
        http.post(`${relationshipBasedUrl}/`, () =>
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

      await user.type(
        screen.getByRole("textbox", { name: /8-character search code/i }),
        "AICMEOWQ",
      );
      await user.click(screen.getByRole("button", { name: /Find user/i }));
      const sendRequestButton = await screen.findByRole("button", {
        name: /Send Request/i,
      });
      await user.click(sendRequestButton);
      await waitFor(() => expect(sendRequestButton).toBeEnabled());

      await user.click(screen.getByRole("button", { name: /Sent/i }));

      expect(await screen.findByText(/No sent requests/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Send Request/i })).toBeEnabled();
    });
  });
});
