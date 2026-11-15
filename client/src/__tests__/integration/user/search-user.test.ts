import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { errorResponse, successResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { userBasedUrl } from "../../utils/user/http";

describe("Search user", () => {
  describe("Success Search", () => {
    it("when a user is found by search code should display the user and send request action", async () => {
      server.use(
        http.get(`${userBasedUrl}/search`, () =>
          HttpResponse.json(
            successResponse({
              user: {
                id: "found-user-id",
                name: "found-user",
                imageUrl: null,
              },
              state: "none",
            }),
          ),
        ),
      );
      const { user } = renderAuthenticatedApp();

      await user.type(
        screen.getByRole("textbox", { name: /8-character search code/i }),
        "A7BC2DEF",
      );
      await user.click(screen.getByRole("button", { name: /Find user/i }));

      expect(await screen.findByText("found-user")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Send Request/i }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it.each([
      ["self", "This is you"],
      ["invite", "Request sent"],
      ["friend", "Already friends"],
    ] as const)(
      "when relationship state is %s should display its related text",
      async (state, relatedText) => {
        server.use(
          http.get(`${userBasedUrl}/search`, () =>
            HttpResponse.json(
              successResponse({
                user: {
                  id: "found-user-id",
                  name: "found-user",
                  imageUrl: null,
                },
                state,
              }),
            ),
          ),
        );
        const { user } = renderAuthenticatedApp();

        await user.type(
          screen.getByRole("textbox", { name: /8-character search code/i }),
          "A7BC2DEF",
        );
        await user.click(screen.getByRole("button", { name: /Find user/i }));

        expect(await screen.findByText(relatedText)).toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /Send Request/i }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("button", { name: /Accept/i }),
        ).not.toBeInTheDocument();
      },
    );

    it.each([["accept"], ["reject"]] as const)(
      "when relationship state is recipient should allow the user to %s",
      async (action) => {
        server.use(
          http.get(`${userBasedUrl}/search`, () =>
            HttpResponse.json(
              successResponse({
                user: {
                  id: "requester-id",
                  name: "requester",
                  imageUrl: null,
                },
                state: "recipient",
              }),
            ),
          ),
        );
        const { user } = renderAuthenticatedApp();

        await user.type(
          screen.getByRole("textbox", { name: /8-character search code/i }),
          "A7BC2DEF",
        );
        await user.click(screen.getByRole("button", { name: /Find user/i }));

        expect(
          await screen.findByRole("button", { name: new RegExp(action, "i") }),
        ).toBeInTheDocument();
      },
    );
  });

  describe("Empty Search", () => {
    it("when no user matches the search code should display the not-found component", async () => {
      server.use(
        http.get(`${userBasedUrl}/search`, () =>
          HttpResponse.json(successResponse(null)),
        ),
      );
      const { user } = renderAuthenticatedApp();

      await user.type(
        screen.getByRole("textbox", { name: /8-character search code/i }),
        "A7BC2DEF",
      );
      await user.click(screen.getByRole("button", { name: /Find user/i }));

      expect(await screen.findByRole("status")).toHaveTextContent(
        "No user found",
      );
      expect(
        screen.queryByRole("button", { name: /Send Request/i }),
      ).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Error Search", () => {
    it("when the server rejects an invalid user token should display the error component", async () => {
      server.use(
        http.get(`${userBasedUrl}/search`, () =>
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
        "A7BC2DEF",
      );
      await user.click(screen.getByRole("button", { name: /Find user/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Invalid user token",
      );
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Send Request/i }),
      ).not.toBeInTheDocument();
    });
  });
});
