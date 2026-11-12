import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { renderAuthenticatedApp } from "../../utils/auth/renderAuthenticatedApp";
import { errorResponse, successResponse } from "../../utils/common/response";
import { server } from "../../utils/common/server";
import { relationshipBasedUrl } from "../../utils/relationship/http";

type FriendRequest = {
  requestId: string;
  name: string;
  imageUrl: string | null;
};

const mockFriendRequests = (
  incomingRequests: FriendRequest[],
  outgoingRequests: FriendRequest[],
) => {
  server.use(
    http.get(`${relationshipBasedUrl}/`, ({ request }) => {
      const direction = new URL(request.url).searchParams.get("direction");
      return HttpResponse.json(
        successResponse(
          direction === "incoming" ? incomingRequests : outgoingRequests,
        ),
      );
    }),
  );
};

const mockFriendRequestError = (direction: "incoming" | "outgoing") => {
  server.use(
    http.get(`${relationshipBasedUrl}/`, ({ request }) => {
      if (new URL(request.url).searchParams.get("direction") === direction) {
        return HttpResponse.json(
          errorResponse({
            code: "INTERNAL_SERVER_ERROR",
            detail: "Unable to load friend requests.",
          }),
          { status: 409 },
        );
      }

      return HttpResponse.json(successResponse([]));
    }),
  );
};

describe("Get friendship", () => {
  describe("Incoming friendship requests", () => {
    describe("Success Load", () => {
      it("when incoming friendship requests load successfully should display each request in the list", async () => {
        mockFriendRequests(
          [
            {
              requestId: "incoming-request-id",
              name: "incoming-user",
              imageUrl: null,
            },
          ],
          [],
        );
        renderAuthenticatedApp();

        const requestItem = await screen.findByRole("listitem");

        expect(requestItem).toHaveTextContent("incoming-user");
        expect(screen.queryByText(/No friend requests/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("Empty", () => {
      it("when there are no incoming friendship requests should display the empty component", async () => {
        mockFriendRequests([], []);
        renderAuthenticatedApp();

        expect(
          await screen.findByText(/No friend requests/i),
        ).toBeInTheDocument();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("Error", () => {
      it("when incoming friendship requests fail to load should display the error component", async () => {
        mockFriendRequestError("incoming");
        renderAuthenticatedApp();

        expect(
          await screen.findByRole(
            "alert",
            {},
            { timeout: 9000 },
          ),
        ).toHaveTextContent("Unable to load friend requests.");
        expect(screen.queryByText(/No friend requests/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
      }, 10000);
    });
  });

  describe("Outgoing friendship requests", () => {
    describe("Success Load", () => {
      it("when outgoing friendship requests load successfully should display each request in the list", async () => {
        mockFriendRequests(
          [],
          [
            {
              requestId: "outgoing-request-id",
              name: "outgoing-user",
              imageUrl: null,
            },
          ],
        );
        const { user } = renderAuthenticatedApp();
        await user.click(await screen.findByRole("button", { name: /Sent/i }));

        const requestItem = await screen.findByRole("listitem");

        expect(requestItem).toHaveTextContent("outgoing-user");
        expect(screen.queryByText(/No sent requests/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("Empty", () => {
      it("when there are no outgoing friendship requests should display the empty component", async () => {
        mockFriendRequests([], []);
        const { user } = renderAuthenticatedApp();
        await user.click(await screen.findByRole("button", { name: /Sent/i }));

        expect(
          await screen.findByText(/No sent requests/i),
        ).toBeInTheDocument();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    describe("Error", () => {
      it("when outgoing friendship requests fail to load should display the error component", async () => {
        mockFriendRequestError("outgoing");
        const { user } = renderAuthenticatedApp();
        await user.click(await screen.findByRole("button", { name: /Sent/i }));

        expect(
          await screen.findByRole(
            "alert",
            {},
            { timeout: 9000 },
          ),
        ).toHaveTextContent("Unable to load friend requests.");
        expect(screen.queryByText(/No sent requests/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
      }, 10000);
    });
  });
});