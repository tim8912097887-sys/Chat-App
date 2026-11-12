import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { errorResponse, successResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { userBasedUrl } from "../../utils/user/http";

describe("Search friends", () => {
  describe("Success Search", () => {
    it("when matching friends are found should display the matching friend", async () => {
      let searched = false;
      server.use(
        http.get(`${userBasedUrl}/friend/search`, ({ request }) => {
          if (new URL(request.url).searchParams.get("q") === "friend-name") {
            searched = true;
            return HttpResponse.json(
              successResponse([
                {
                  id: "friend-id",
                  name: "friend-name",
                  imageUrl: null,
                  isOnline: true,
                },
              ]),
            );
          }

          return HttpResponse.json(successResponse([]));
        }),
      );
      const { user } = renderAuthenticatedApp();

      await user.type(
        screen.getByRole("searchbox", { name: /Search friends by name/i }),
        "friend-name",
      );
      await waitFor(() => expect(searched).toBe(true), { timeout: 5000 });

      expect(await screen.findByText("friend-name")).toBeInTheDocument();
      expect(screen.getByRole("listitem")).toBeInTheDocument();
      expect(screen.queryByText("No friends yet")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Empty Search", () => {
    it("when no friends match the search should display the empty component", async () => {
      let searched = false;
      server.use(
        http.get(`${userBasedUrl}/friend/search`, ({ request }) => {
          if (new URL(request.url).searchParams.get("q") === "unknown-friend") {
            searched = true;
          }

          return HttpResponse.json(successResponse([]));
        }),
      );
      const { user } = renderAuthenticatedApp();

      await user.type(
        screen.getByRole("searchbox", { name: /Search friends by name/i }),
        "unknown-friend",
      );
      await waitFor(() => expect(searched).toBe(true), { timeout: 5000 });

      expect(await screen.findByText("No friends yet")).toBeInTheDocument();
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Error Search", () => {
    it("when the server rejects an invalid user token should display the error component", async () => {
      let searched = false;
      server.use(
        http.get(`${userBasedUrl}/friend/search`, ({ request }) => {
          if (new URL(request.url).searchParams.has("q")) {
            searched = true;
            return HttpResponse.json(
              errorResponse({
                code: "UnauthenticationError",
                detail: "Invalid user token",
              }),
              { status: 401 },
            );
          }

          return HttpResponse.json(successResponse([]));
        }),
      );
      const { user } = renderAuthenticatedApp();

      await user.type(
        screen.getByRole("searchbox", { name: /Search friends by name/i }),
        "friend-name",
      );
      await waitFor(() => expect(searched).toBe(true), { timeout: 5000 });

      expect(
        await screen.findByRole("alert", {}, { timeout: 9000 }),
      ).toHaveTextContent("Invalid user token");
      expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
      expect(screen.queryByText("No friends yet")).not.toBeInTheDocument();
    }, 10000);
  });
});